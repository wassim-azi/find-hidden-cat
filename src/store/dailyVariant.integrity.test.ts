import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import { isResumableSave } from './sessionGuards';
import { getDailyPuzzle, getTodayDateKey } from '../game/levels';
import { createInitialBoard } from '../game/puzzleEngine';

const S = () => useGameStore.getState();

/** Solves the active puzzle with the clock pinned so stars (and coins) are comparable. */
function solveAtElapsed(elapsedSec: number): void {
  const { puzzle } = S();
  const remaining = puzzle.solution.filter((c) => S().board[c.row]![c.col] !== 'cat');
  remaining.forEach((cat, idx) => {
    if (idx === remaining.length - 1) useGameStore.setState({ elapsedSec });
    S().attemptPlaceCat(cat);
  });
}

describe('Daily variants in the store (#24)', () => {
  beforeEach(() => {
    S().resetAllProgress();
  });

  it('locks the first chosen variant for the day; later calls ignore the argument', () => {
    const today = getTodayDateKey();
    S().startDailyChallenge('relaxed');
    expect(S().dailyVariant).toEqual({ dateKey: today, variant: 'relaxed' });
    expect(S().puzzle.dailyVariant).toBe('relaxed');
    expect(S().puzzle.initialCats).toHaveLength(1);

    S().goToScreen('map');
    S().startDailyChallenge('tricky');
    expect(S().dailyVariant).toEqual({ dateKey: today, variant: 'relaxed' });
    expect(S().puzzle.dailyVariant).toBe('relaxed');

    S().goToScreen('map');
    S().startDailyChallenge();
    expect(S().puzzle.dailyVariant).toBe('relaxed');
  });

  it('defaults to standard (deep link) and keeps the standard puzzle unchanged', () => {
    S().startDailyChallenge();
    expect(S().dailyVariant?.variant).toBe('standard');
    expect(S().puzzle).toEqual(getDailyPuzzle(getTodayDateKey()));
    expect(S().puzzle.dailyVariant).toBeUndefined();
  });

  it('ignores a lock from another day', () => {
    useGameStore.setState({ dailyVariant: { dateKey: '2000-01-01', variant: 'tricky' } });
    S().startDailyChallenge('relaxed');
    expect(S().dailyVariant).toEqual({ dateKey: getTodayDateKey(), variant: 'relaxed' });
  });

  it('a relaxed Daily counts as today’s Daily and pays exactly what standard pays', () => {
    const today = getTodayDateKey();
    S().startDailyChallenge('relaxed');
    const before = S().fishCoins;
    solveAtElapsed(5);
    const relaxed = S().victorySummary!;
    expect(S().completedDailyDates).toContain(today);
    const relaxedPaid = S().fishCoins - before;

    S().resetAllProgress();
    S().startDailyChallenge('standard');
    const beforeStd = S().fishCoins;
    solveAtElapsed(5);
    const standard = S().victorySummary!;
    expect(S().completedDailyDates).toContain(today);

    expect(relaxed.stars).toBe(standard.stars);
    expect(relaxed.rewardBreakdown).toEqual(standard.rewardBreakdown);
    expect(relaxedPaid).toBe(S().fishCoins - beforeStd);
    expect(relaxedPaid).toBe(relaxed.coinsAwarded);
  });

  it('rejects resuming a board saved on another variant', () => {
    const today = getTodayDateKey();
    const standard = getDailyPuzzle(today, 'standard');
    const relaxed = getDailyPuzzle(today, 'relaxed');
    const standardSave = {
      levelId: 0,
      board: createInitialBoard(standard),
      elapsedSec: 10,
      hintsUsed: 0,
    };
    expect(isResumableSave(standardSave, standard)).toBe(true);
    expect(isResumableSave(standardSave, relaxed)).toBe(false);
    const relaxedSave = { ...standardSave, board: createInitialBoard(relaxed), dailyVariant: 'relaxed' as const };
    expect(isResumableSave(relaxedSave, relaxed)).toBe(true);
    expect(isResumableSave(relaxedSave, standard)).toBe(false);
  });

  it('dismissRecommendation records today and resetAllProgress clears it', () => {
    S().dismissRecommendation('golden_trial');
    expect(S().recommendationDismissed).toEqual({ golden_trial: getTodayDateKey() });
    S().resetAllProgress();
    expect(S().recommendationDismissed).toEqual({});
    expect(S().dailyVariant).toBeNull();
  });
});
