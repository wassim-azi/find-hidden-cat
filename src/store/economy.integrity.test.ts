import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import { calculateLevelCoinReward } from '../game/economy';
import { canClaimDailyReward, claimDailyRewardPure, INITIAL_DAILY_LOGIN } from '../game/dailyRewards';
import { coordsEqual } from '../game/gameTypes';

const S = () => useGameStore.getState();

function solveCurrentPuzzle(): void {
  for (const cat of S().puzzle.solution) {
    if (S().board[cat.row]![cat.col] !== 'cat') S().attemptPlaceCat(cat);
  }
}

describe('Economy integrity', () => {
  beforeEach(() => {
    S().resetAllProgress();
  });

  it('pays the Daily Kitty reward only once per day', () => {
    S().startDailyChallenge();
    solveCurrentPuzzle();
    const first = S().victorySummary!;
    expect(first.coinsAwarded).toBeGreaterThanOrEqual(45);
    const coinsAfterFirst = S().fishCoins;

    S().goToScreen('map');
    S().startDailyChallenge();
    solveCurrentPuzzle();
    expect(S().victorySummary!.coinsAwarded).toBe(0);
    expect(S().fishCoins).toBe(coinsAfterFirst);
  });

  it('daily repeat breakdown is all zero, first daily clear unchanged', () => {
    const repeat = calculateLevelCoinReward({ difficulty: 'medium', stars: 3, isFirstCompletion: false, specialNodeBonus: 35, worldMilestoneBonus: 0, isDaily: true });
    expect(repeat.totalCoins).toBe(0);
    const first = calculateLevelCoinReward({ difficulty: 'medium', stars: 3, isFirstCompletion: true, specialNodeBonus: 0, worldMilestoneBonus: 0, isDaily: true });
    expect(first.totalCoins).toBe(45 + 15 + 15);
  });

  it('Stage-4 auto-place consumes exactly one Hint token, and asks for one when none are owned', () => {
    S().startLevel(1, false);
    useGameStore.setState({ boosters: { ...S().boosters, hint: 1 } });

    for (let i = 0; i < 4; i++) S().requestHint();
    expect(S().activeHint?.stage).toBe(4);
    const target = S().activeHint!.targetCell;
    S().applyActiveHint();
    expect(S().board[target.row]![target.col]).toBe('cat');
    expect(S().boosters.hint).toBe(0);

    for (let i = 0; i < 4; i++) S().requestHint();
    expect(S().activeHint?.stage).toBe(4);
    const target2 = S().activeHint!.targetCell;
    S().applyActiveHint();
    expect(S().board[target2.row]![target2.col]).not.toBe('cat');
    expect(S().rewardedAdPlacement).toBe('free_hint');
    expect(S().boosters.hint).toBe(0);
  });

  it('Reveal Cat counts as assistance (no 3 stars, no perfect-level credit)', () => {
    S().startLevel(1, false);
    const perfectBefore = S().achievements.perfectLevels;
    expect(S().useBooster('revealCat')).toBe(true);
    expect(S().hintsUsed).toBe(1);
    solveCurrentPuzzle();
    const summary = S().victorySummary!;
    expect(summary.stars).toBeLessThan(3);
    expect(S().achievements.perfectLevels).toBe(perfectBefore);
  });

  it('Reveal Region counts as assistance', () => {
    S().startLevel(1, false);
    expect(S().useBooster('revealRegion')).toBe(true);
    expect(S().hintsUsed).toBe(1);
  });

  it('never grants a daily login reward for a date at or before the last claim', () => {
    const claimed = claimDailyRewardPure(INITIAL_DAILY_LOGIN, '2026-11-25').nextState;
    expect(canClaimDailyReward(claimed, '2026-11-25')).toBe(false);
    expect(canClaimDailyReward(claimed, '2026-11-24')).toBe(false);
    expect(claimDailyRewardPure(claimed, '2026-11-24').claimed).toBe(false);
    expect(canClaimDailyReward(claimed, '2026-11-26')).toBe(true);
  });

  it('a revealed cat is always a correct, conflict-free placement', () => {
    S().startLevel(24, false);
    useGameStore.setState({ unlockedLevelId: 24 });
    S().startLevel(24, false);
    S().useBooster('revealCat');
    const cats = S().puzzle.solution.filter((s) => S().board[s.row]![s.col] === 'cat');
    expect(cats.length).toBe(1);
    expect(S().validation.isValid).toBe(true);
    expect(S().puzzle.solution.some((s) => coordsEqual(s, cats[0]!))).toBe(true);
  });
});
