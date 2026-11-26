import { describe, expect, it } from 'vitest';
import {
  applySkillEvent,
  classify,
  EMA_ALPHA,
  EMPTY_SKILL_PROFILE,
  MAX_RECENT_OUTCOMES,
  SkillProfile,
} from './skillProfile';
import type { DifficultyTier, GameMode } from './gameTypes';
import type { GameEvent, PuzzleCompletedEvent } from './progressStats';

let seq = 0;

function completed(opts: {
  mode?: GameMode;
  tier?: DifficultyTier;
  elapsedSec?: number;
  parTimeSec?: number;
  hints?: number;
  mistakes?: number;
}): PuzzleCompletedEvent {
  seq += 1;
  return {
    type: 'puzzle_completed',
    id: `L1:${seq}`,
    at: 1_000 + seq,
    dateKey: '2026-11-26',
    weekKey: '2026-W48',
    source: 'campaign',
    puzzleKey: 'L1',
    levelId: 1,
    worldId: 1,
    mode: opts.mode ?? 'classic',
    firstCompletion: true,
    stars: 3,
    previousBestStars: 0,
    hintsUsed: opts.hints ?? 0,
    mistakesCount: opts.mistakes ?? 0,
    elapsedSec: opts.elapsedSec ?? 60,
    previousBestTimeSec: null,
    firstNoHint: false,
    firstNoMistake: false,
    improvedBest: false,
    catsFound: 6,
    techniques: [],
    tier: opts.tier ?? 'easy',
    parTimeSec: opts.parTimeSec ?? 60,
  };
}

function failed(tier: DifficultyTier = 'easy'): GameEvent {
  seq += 1;
  return {
    type: 'puzzle_failed',
    id: `failed:L1:${seq}`,
    at: 1_000 + seq,
    dateKey: '2026-11-26',
    weekKey: '2026-W48',
    puzzleKey: 'L1',
    tier,
    elapsedSec: 90,
  };
}

function fold(events: GameEvent[], start: SkillProfile = EMPTY_SKILL_PROFILE): SkillProfile {
  return events.reduce(applySkillEvent, start);
}

const repeat = <T>(n: number, make: () => T): T[] => Array.from({ length: n }, make);

describe('skill profile classification (#23)', () => {
  it('struggling: 5 Classic completions with 3 hints each', () => {
    const p = fold(repeat(5, () => completed({ hints: 3 })));
    expect(classify(p)).toBe('struggling');
  });

  it('struggling: 4 failures + 1 completion', () => {
    const p = fold([failed(), failed(), failed(), failed(), completed({})]);
    expect(classify(p)).toBe('struggling');
  });

  it('cruising: 6 completions, 0 hints, 0 mistakes, timeRatio 0.7', () => {
    const p = fold(repeat(6, () => completed({ elapsedSec: 42, parTimeSec: 60 })));
    expect(p.classic.easy!.timeRatio).toBeCloseTo(0.7, 10);
    expect(classify(p)).toBe('cruising');
  });

  it('steady: 1 hint, 1 mistake, timeRatio 1.4', () => {
    const p = fold(repeat(5, () => completed({ hints: 1, mistakes: 1, elapsedSec: 84 })));
    expect(classify(p)).toBe('steady');
  });

  it('unknown with fewer than 3 Classic samples', () => {
    expect(classify(EMPTY_SKILL_PROFILE)).toBe('unknown');
    expect(classify(fold([completed({}), completed({})]))).toBe('unknown');
  });

  it('ignores Practice completions for classification (tracked separately)', () => {
    const p = fold(repeat(6, () => completed({ mode: 'practice', hints: 5 })));
    expect(p.practice.easy!.samples).toBe(6);
    expect(p.classic).toEqual({});
    expect(p.recent).toEqual([]);
    expect(classify(p)).toBe('unknown');

    const cruising = fold(repeat(6, () => completed({ elapsedSec: 42 })));
    const withPractice = fold(repeat(6, () => completed({ mode: 'practice', hints: 5 })), cruising);
    expect(classify(withPractice)).toBe('cruising');
  });

  it('classifies a single tier bucket when a tier is given', () => {
    const p = fold([
      ...repeat(4, () => completed({ tier: 'easy', elapsedSec: 42 })),
      ...repeat(4, () => completed({ tier: 'hard', hints: 4 })),
    ]);
    expect(classify(p, 'easy')).toBe('cruising');
    expect(classify(p, 'hard')).toBe('struggling');
    expect(classify(p, 'expert')).toBe('unknown');
  });
});

describe('skill profile EMA math (#23)', () => {
  it('matches hand-computed values for a 3-sample sequence', () => {
    expect(EMA_ALPHA).toBe(0.3);
    const p = fold([
      completed({ elapsedSec: 60, parTimeSec: 60, hints: 2, mistakes: 1 }), // sets directly
      completed({ elapsedSec: 120, parTimeSec: 60, hints: 0, mistakes: 3 }),
      completed({ elapsedSec: 30, parTimeSec: 60, hints: 1, mistakes: 0 }),
    ]);
    const b = p.classic.easy!;
    expect(b.samples).toBe(3);
    // timeRatio: 1 → 1 + 0.3·(2 − 1) = 1.3 → 1.3 + 0.3·(0.5 − 1.3) = 1.06
    expect(b.timeRatio).toBeCloseTo(1.06, 10);
    // hints: 2 → 2 + 0.3·(0 − 2) = 1.4 → 1.4 + 0.3·(1 − 1.4) = 1.28
    expect(b.hints).toBeCloseTo(1.28, 10);
    // mistakes: 1 → 1 + 0.3·(3 − 1) = 1.6 → 1.6 + 0.3·(0 − 1.6) = 1.12
    expect(b.mistakes).toBeCloseTo(1.12, 10);
    expect(b.successRate).toBe(1);
  });

  it('moves successRate toward 0 on failures and restarts, keeping the last 10 outcomes', () => {
    const p = fold([completed({}), failed()]);
    expect(p.classic.easy!.successRate).toBeCloseTo(0.7, 10);
    expect(p.classic.easy!.samples).toBe(2);
    expect(p.recent.map((r) => r.success)).toEqual([1, 0]);

    const long = fold(repeat(15, () => completed({})));
    expect(long.recent).toHaveLength(MAX_RECENT_OUTCOMES);
  });

  it('counts hint techniques and ignores technique-less hints', () => {
    const hint = (technique: 'naked_pair_regions' | null): GameEvent => ({
      type: 'hint_used',
      id: `hint:${(seq += 1)}`,
      at: seq,
      dateKey: '2026-11-26',
      weekKey: '2026-W48',
      puzzleKey: 'L1',
      technique,
      stage: 1,
    });
    const p = fold([hint('naked_pair_regions'), hint('naked_pair_regions'), hint(null)]);
    expect(p.hintTechniqueCounts).toEqual({ naked_pair_regions: 2 });
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(EMPTY_SKILL_PROFILE);
    fold([completed({}), failed()]);
    expect(JSON.stringify(EMPTY_SKILL_PROFILE)).toBe(before);
  });
});
