import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import { CAMPAIGN_CHEST_LEVELS, PERFECT_LEVEL_BONUS_COINS } from '../game/bonusConfig';
import { CHEST_EVERY } from '../game/chests';

const S = () => useGameStore.getState();

function solveCurrentPuzzle(): void {
  for (const cat of S().puzzle.solution) {
    if (S().board[cat.row]![cat.col] !== 'cat') S().attemptPlaceCat(cat);
  }
}

/** Solves a level and returns the victory summary plus the coins actually added. */
function playLevel(levelId: number, opts: { hint?: boolean } = {}) {
  S().startLevel(levelId, false);
  if (opts.hint) S().requestHint();
  const before = S().fishCoins;
  solveCurrentPuzzle();
  const summary = S().victorySummary!;
  expect(summary).not.toBeNull();
  return { summary, added: S().fishCoins - before };
}

describe('Perfect-level bonus (#22)', () => {
  beforeEach(() => {
    S().resetAllProgress();
    useGameStore.setState({ unlockedLevelId: 24 });
  });

  it('pays once per level for a perfect Classic solve, first clear or replay', () => {
    const first = playLevel(2);
    expect(PERFECT_LEVEL_BONUS_COINS).toBe(10);
    expect(first.summary.rewardBreakdown.perfectBonus).toBe(PERFECT_LEVEL_BONUS_COINS);
    expect(S().perfectBonusLevels).toContain(2);
    expect(first.added).toBe(first.summary.rewardBreakdown.totalCoins);
    expect(first.summary.coinsAwarded).toBe(first.summary.rewardBreakdown.totalCoins);

    const second = playLevel(2);
    expect(second.summary.rewardBreakdown.perfectBonus).toBe(0);
    expect(second.added).toBe(second.summary.rewardBreakdown.totalCoins);
    expect(S().perfectBonusLevels).toEqual([2]);
  });

  it('pays nothing for a run with a hint, then pays on a later perfect replay', () => {
    const hinted = playLevel(3, { hint: true });
    expect(hinted.summary.hintsUsed).toBeGreaterThan(0);
    expect(hinted.summary.rewardBreakdown.perfectBonus).toBe(0);
    expect(S().perfectBonusLevels).not.toContain(3);

    const perfectReplay = playLevel(3);
    expect(perfectReplay.summary.rewardBreakdown.perfectBonus).toBe(PERFECT_LEVEL_BONUS_COINS);
    expect(perfectReplay.added).toBe(perfectReplay.summary.rewardBreakdown.totalCoins);
  });

  it('never pays in Practice', () => {
    S().updateSetting('gameMode', 'practice');
    const practice = playLevel(4);
    expect(practice.summary.isPracticeMode).toBe(true);
    expect(practice.summary.rewardBreakdown.perfectBonus).toBe(0);
    expect(S().perfectBonusLevels).toEqual([]);
  });

  it('never pays on Daily puzzles', () => {
    S().startDailyChallenge();
    solveCurrentPuzzle();
    expect(S().victorySummary!.rewardBreakdown.perfectBonus).toBe(0);
  });
});

describe('Campaign chest milestones (#22)', () => {
  beforeEach(() => {
    S().resetAllProgress();
    useGameStore.setState({ unlockedLevelId: 24 });
  });

  it('grants one extra chest on the first clear of level 5, and none on replay', () => {
    expect(CAMPAIGN_CHEST_LEVELS).toEqual([5, 10, 15, 20]);
    const first = playLevel(5);
    expect(first.summary.chestMilestone).toBe(true);
    expect(S().chests.pending).toHaveLength(1);
    expect(S().chests.progress).toBe(1);

    const replay = playLevel(5);
    expect(replay.summary.chestMilestone).toBe(false);
    expect(S().chests.pending).toHaveLength(1);
  });

  it('stacks with the normal 3-count chest', () => {
    useGameStore.setState({ chests: { ...S().chests, progress: CHEST_EVERY - 1 } });
    playLevel(10);
    expect(S().chests.pending).toHaveLength(2);
    expect(S().chests.progress).toBe(0);
  });

  it('also grants the milestone chest on a Practice first clear', () => {
    S().updateSetting('gameMode', 'practice');
    const res = playLevel(15);
    expect(res.summary.chestMilestone).toBe(true);
    expect(S().chests.pending).toHaveLength(1);
    expect(S().chests.progress).toBe(0);
  });

  it('does not grant a milestone chest for other levels', () => {
    const res = playLevel(6);
    expect(res.summary.chestMilestone).toBe(false);
    expect(S().chests.pending).toHaveLength(0);
  });
});
