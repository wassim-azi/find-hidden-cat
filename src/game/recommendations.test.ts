import { describe, expect, it } from 'vitest';
import {
  getRecommendation,
  isRecommendationDismissed,
  RECOMMENDATION_DISMISS_DAYS,
  RecommendationInput,
} from './recommendations';
import { applySkillEvent, classify, EMPTY_SKILL_PROFILE, SkillProfile } from './skillProfile';
import type { LevelProgress, LogicalTechnique } from './gameTypes';
import type { GameEvent, PuzzleCompletedEvent } from './progressStats';

let seq = 0;
function completed(hints: number, mistakes: number, elapsedSec: number): PuzzleCompletedEvent {
  seq += 1;
  return {
    type: 'puzzle_completed',
    id: `L1:${seq}`,
    at: seq,
    dateKey: '2026-11-26',
    weekKey: '2026-W48',
    source: 'campaign',
    puzzleKey: 'L1',
    levelId: 1,
    worldId: 1,
    mode: 'classic',
    firstCompletion: true,
    stars: 3,
    previousBestStars: 0,
    hintsUsed: hints,
    mistakesCount: mistakes,
    elapsedSec,
    previousBestTimeSec: null,
    firstNoHint: false,
    firstNoMistake: false,
    improvedBest: false,
    catsFound: 6,
    techniques: [],
    tier: 'easy',
    parTimeSec: 60,
  };
}

function hint(technique: LogicalTechnique): GameEvent {
  seq += 1;
  return {
    type: 'hint_used',
    id: `hint:${seq}`,
    at: seq,
    dateKey: '2026-11-26',
    weekKey: '2026-W48',
    puzzleKey: 'L1',
    technique,
    stage: 1,
  };
}

const fold = (events: GameEvent[]): SkillProfile => events.reduce(applySkillEvent, EMPTY_SKILL_PROFILE);
const times = <T>(n: number, make: () => T): T[] => Array.from({ length: n }, make);

// #23 synthetic profiles
const STRUGGLING = fold(times(5, () => completed(3, 0, 60)));
const CRUISING = fold(times(6, () => completed(0, 0, 42)));
const STEADY = fold(times(5, () => completed(1, 1, 84)));

function lp(levelId: number, stars: number, bestHintsUsed: number | null): LevelProgress {
  return {
    levelId,
    completed: true,
    bestTimeSec: 50,
    stars,
    bestHintsUsed,
    bestMistakes: 0,
    attempts: 1,
    lastResult: null,
  };
}

function input(overrides: Partial<RecommendationInput>): RecommendationInput {
  return {
    profile: EMPTY_SKILL_PROFILE,
    levelProgress: {},
    preferredMode: 'classic',
    goldenSolvedThisWeek: false,
    dismissed: {},
    todayKey: '2026-11-26',
    ...overrides,
  };
}

describe('getRecommendation (#24)', () => {
  it('uses the #23 synthetic profiles as expected', () => {
    expect(classify(STRUGGLING)).toBe('struggling');
    expect(classify(CRUISING)).toBe('cruising');
    expect(classify(STEADY)).toBe('steady');
  });

  it('returns null while the profile is unknown', () => {
    expect(getRecommendation(input({ levelProgress: { 1: lp(1, 1, 2) } }))).toBeNull();
  });

  it('rule 1: struggling Classic player → practice_mode', () => {
    expect(getRecommendation(input({ profile: STRUGGLING }))).toEqual({ kind: 'practice_mode' });
  });

  it('rule 2: struggling (already in Practice) with ≥ 3 hints on a rank 1–4 technique → technique_tip for the most-hinted one', () => {
    const profile = fold([
      ...times(5, () => completed(3, 0, 60)),
      ...times(3, () => hint('region_line_intersection')),
      ...times(4, () => hint('naked_pair_regions')),
      ...times(9, () => hint('naked_region_single')), // rank 0: never tipped
    ]);
    expect(getRecommendation(input({ profile, preferredMode: 'practice' }))).toEqual({
      kind: 'technique_tip',
      technique: 'naked_pair_regions',
    });
  });

  it('rule 3: struggling without a tip-worthy technique → relaxed_daily', () => {
    const profile = fold([...times(5, () => completed(3, 0, 60)), hint('naked_pair_regions')]);
    expect(getRecommendation(input({ profile, preferredMode: 'practice' }))).toEqual({
      kind: 'relaxed_daily',
    });
  });

  it('rule 4: cruising and no Golden solve this week → golden_trial', () => {
    expect(getRecommendation(input({ profile: CRUISING }))).toEqual({ kind: 'golden_trial' });
  });

  it('rule 5: cruising with a hinted completed level → no_hint_replay (lowest id)', () => {
    const levelProgress = { 4: lp(4, 3, 2), 2: lp(2, 3, 1), 1: lp(1, 3, 0) };
    expect(
      getRecommendation(input({ profile: CRUISING, goldenSolvedThisWeek: true, levelProgress }))
    ).toEqual({ kind: 'no_hint_replay', levelId: 2 });
  });

  it('rule 6: cruising or steady with a < 3-star level → three_star_replay (lowest id)', () => {
    const levelProgress = { 5: lp(5, 2, 0), 3: lp(3, 1, 0), 1: lp(1, 3, 0) };
    expect(
      getRecommendation(input({ profile: CRUISING, goldenSolvedThisWeek: true, levelProgress }))
    ).toEqual({ kind: 'three_star_replay', levelId: 3 });
    expect(getRecommendation(input({ profile: STEADY, levelProgress }))).toEqual({
      kind: 'three_star_replay',
      levelId: 3,
    });
  });

  it('rule 7: nothing applicable → null', () => {
    expect(
      getRecommendation(
        input({ profile: CRUISING, goldenSolvedThisWeek: true, levelProgress: { 1: lp(1, 3, 0) } })
      )
    ).toBeNull();
    expect(getRecommendation(input({ profile: STEADY }))).toBeNull();
  });

  it('a dismissed kind is skipped for 3 days, falling through to the next rule, then returns', () => {
    expect(RECOMMENDATION_DISMISS_DAYS).toBe(3);
    const dismissed = { practice_mode: '2026-11-26' };
    for (const todayKey of ['2026-11-26', '2026-11-27', '2026-11-28']) {
      expect(isRecommendationDismissed('practice_mode', dismissed, todayKey)).toBe(true);
      expect(getRecommendation(input({ profile: STRUGGLING, dismissed, todayKey }))).toEqual({
        kind: 'relaxed_daily',
      });
    }
    expect(isRecommendationDismissed('practice_mode', dismissed, '2026-11-29')).toBe(false);
    expect(
      getRecommendation(input({ profile: STRUGGLING, dismissed, todayKey: '2026-11-29' }))
    ).toEqual({ kind: 'practice_mode' });
  });
});
