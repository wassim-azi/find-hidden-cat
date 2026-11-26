import { describe, expect, it } from 'vitest';
import {
  applyGameEvent,
  EMPTY_PROGRESS_STATS,
  getDayStats,
  getWeekStats,
  MAX_BY_DAY_KEYS,
  MAX_BY_WEEK_KEYS,
  PuzzleCompletedEvent,
} from './progressStats';

function makePuzzleEvent(
  overrides: Partial<PuzzleCompletedEvent> = {}
): PuzzleCompletedEvent {
  return {
    type: 'puzzle_completed',
    id: 'L2:1000',
    at: 1000,
    dateKey: '2026-11-25',
    weekKey: '2026-W48',
    source: 'campaign',
    puzzleKey: 'L2',
    levelId: 2,
    worldId: 1,
    mode: 'classic',
    firstCompletion: true,
    stars: 3,
    previousBestStars: 0,
    hintsUsed: 0,
    mistakesCount: 0,
    elapsedSec: 45,
    previousBestTimeSec: null,
    firstNoHint: true,
    firstNoMistake: true,
    improvedBest: false,
    catsFound: 5,
    techniques: ['naked_region_single', 'naked_row_single'],
    tier: 'easy',
    parTimeSec: 60,
    ...overrides,
  };
}

describe('progressStats reducer (#11)', () => {
  it('is idempotent when the same event id is applied twice', () => {
    const ev = makePuzzleEvent({ id: 'L2:1001' });
    const once = applyGameEvent(EMPTY_PROGRESS_STATS, ev);
    const twice = applyGameEvent(once, ev);
    expect(twice).toEqual(once);
  });

  it('Practice completion only increments puzzlesCompleted (and campaignFirstClears if first)', () => {
    const firstPractice = applyGameEvent(
      EMPTY_PROGRESS_STATS,
      makePuzzleEvent({
        id: 'L2:2001',
        mode: 'practice',
        firstCompletion: true,
        stars: 1,
        firstNoHint: false,
        firstNoMistake: false,
        improvedBest: false,
      })
    );

    expect(firstPractice.lifetime.puzzlesCompleted).toBe(1);
    expect(firstPractice.lifetime.campaignFirstClears).toBe(1);
    expect(firstPractice.lifetime.classicCompleted).toBe(0);
    expect(firstPractice.lifetime.threeStarWins).toBe(0);
    expect(firstPractice.lifetime.noHintWins).toBe(0);
    expect(firstPractice.lifetime.noMistakeWins).toBe(0);
    expect(firstPractice.lifetime.catsFound).toBe(0);
    expect(firstPractice.lifetime.worldsPlayed).toEqual([]);
    expect(firstPractice.lifetime.techniquesSeen).toEqual([]);
    expect(firstPractice.lifetime.starsGained).toBe(1);

    const replayPractice = applyGameEvent(
      firstPractice,
      makePuzzleEvent({
        id: 'L2:2002',
        mode: 'practice',
        firstCompletion: false,
        stars: 1,
        firstNoHint: false,
        firstNoMistake: false,
        improvedBest: false,
      })
    );
    expect(replayPractice.lifetime.puzzlesCompleted).toBe(2);
    expect(replayPractice.lifetime.campaignFirstClears).toBe(1);
    expect(replayPractice.lifetime.starsGained).toBe(1);
  });

  it('increments unique counters on Classic first clear and keeps them unchanged on replay', () => {
    const first = applyGameEvent(EMPTY_PROGRESS_STATS, makePuzzleEvent({ id: 'L2:3001' }));
    expect(first.lifetime.threeStarWins).toBe(1);
    expect(first.lifetime.noHintWins).toBe(1);
    expect(first.lifetime.noMistakeWins).toBe(1);
    expect(first.lifetime.uniqueNoHintPuzzles).toBe(1);
    expect(first.lifetime.uniqueNoMistakePuzzles).toBe(1);

    const replay = applyGameEvent(
      first,
      makePuzzleEvent({
        id: 'L2:3002',
        firstCompletion: false,
        previousBestStars: 3,
        previousBestTimeSec: 45,
        elapsedSec: 30,
        firstNoHint: false,
        firstNoMistake: false,
        improvedBest: true,
      })
    );
    expect(replay.lifetime.classicCompleted).toBe(2);
    expect(replay.lifetime.noHintWins).toBe(2);
    expect(replay.lifetime.noMistakeWins).toBe(2);
    expect(replay.lifetime.personalBests).toBe(1);
    expect(replay.lifetime.uniqueNoHintPuzzles).toBe(1);
    expect(replay.lifetime.uniqueNoMistakePuzzles).toBe(1);
  });

  it('bounds byDay to 14 newest keys and byWeek to 6 newest keys', () => {
    let stats = EMPTY_PROGRESS_STATS;
    for (let i = 1; i <= 20; i++) {
      const day = String(i).padStart(2, '0');
      const week = String(i).padStart(2, '0');
      stats = applyGameEvent(
        stats,
        makePuzzleEvent({
          id: `L2:${i}`,
          dateKey: `2026-11-${day}`,
          weekKey: `2026-W${week}`,
        })
      );
    }

    const dayKeys = Object.keys(stats.byDay).sort();
    expect(dayKeys).toHaveLength(MAX_BY_DAY_KEYS);
    expect(dayKeys[0]).toBe('2026-11-07');
    expect(dayKeys[dayKeys.length - 1]).toBe('2026-11-20');
    expect(getDayStats(stats, '2026-11-01').puzzlesCompleted).toBe(0);
    expect(getDayStats(stats, '2026-11-20').puzzlesCompleted).toBe(1);

    const weekKeys = Object.keys(stats.byWeek).sort();
    expect(weekKeys).toHaveLength(MAX_BY_WEEK_KEYS);
    expect(weekKeys[0]).toBe('2026-W15');
    expect(weekKeys[weekKeys.length - 1]).toBe('2026-W20');
    expect(getWeekStats(stats, '2026-W01').puzzlesCompleted).toBe(0);
    expect(getWeekStats(stats, '2026-W20').puzzlesCompleted).toBe(1);
  });

  it('keeps worldsPlayed distinct and sorted', () => {
    let stats = EMPTY_PROGRESS_STATS;
    stats = applyGameEvent(stats, makePuzzleEvent({ id: 'a', worldId: 3 }));
    stats = applyGameEvent(stats, makePuzzleEvent({ id: 'b', worldId: 1 }));
    stats = applyGameEvent(stats, makePuzzleEvent({ id: 'c', worldId: 3 }));
    stats = applyGameEvent(stats, makePuzzleEvent({ id: 'd', worldId: 2 }));
    stats = applyGameEvent(stats, makePuzzleEvent({ id: 'e', worldId: null, source: 'daily' }));

    expect(stats.lifetime.worldsPlayed).toEqual([1, 2, 3]);
    expect(getDayStats(stats, '2026-11-25').worldsPlayed).toEqual([1, 2, 3]);
  });
});
