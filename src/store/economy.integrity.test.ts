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

  function solveWithElapsed(elapsedSec: number): void {
    const remaining = S().puzzle.solution.filter(
      (cat) => S().board[cat.row]![cat.col] !== 'cat'
    );
    for (let i = 0; i < remaining.length; i++) {
      if (i === remaining.length - 1) {
        useGameStore.setState({ elapsedSec });
      }
      S().attemptPlaceCat(remaining[i]!);
    }
  }

  it('pays > 0 on level 2 Classic first clear and 0 on same-stars replay with isReplay === true', () => {
    useGameStore.setState({ unlockedLevelId: 2 });
    S().startLevel(2, false);
    solveWithElapsed(1);

    const first = S().victorySummary!;
    expect(first.coinsAwarded).toBeGreaterThan(0);
    expect(first.isReplay).toBe(false);
    expect(first.stars).toBe(3);
    const coinsAfterFirst = S().fishCoins;

    S().startLevel(2, false);
    solveWithElapsed(1);

    const replay = S().victorySummary!;
    expect(replay.coinsAwarded).toBe(0);
    expect(replay.isReplay).toBe(true);
    expect(S().fishCoins).toBe(coinsAfterFirst);
  });

  it('pays exactly +20 coins when improving a Classic level from 1 star to 3 stars', () => {
    useGameStore.setState({ unlockedLevelId: 2 });
    S().startLevel(2, false);
    solveWithElapsed(S().puzzle.parTimeSec * 2 + 1);
    expect(S().victorySummary!.stars).toBe(1);
    const coinsAfter1Star = S().fishCoins;

    S().startLevel(2, false);
    solveWithElapsed(1);
    const replay = S().victorySummary!;
    expect(replay.stars).toBe(3);
    expect(replay.previousBestStars).toBe(1);
    expect(replay.coinsAwarded).toBe(20);
    expect(replay.rewardBreakdown.starImprovementBonus).toBe(20);
    expect(S().fishCoins).toBe(coinsAfter1Star + 20);
  });

  it('pays +8 on Practice first clear and +0 on Practice replay of a completed level', () => {
    useGameStore.setState({ unlockedLevelId: 2 });
    S().updateSetting('gameMode', 'practice');
    S().startLevel(2, false);
    const coinsBefore = S().fishCoins;
    solveWithElapsed(1);

    expect(S().victorySummary!.coinsAwarded).toBe(8);
    expect(S().victorySummary!.isReplay).toBe(false);
    expect(S().fishCoins).toBe(coinsBefore + 8);

    S().startLevel(2, false);
    solveWithElapsed(1);

    expect(S().victorySummary!.coinsAwarded).toBe(0);
    expect(S().victorySummary!.isReplay).toBe(true);
    expect(S().fishCoins).toBe(coinsBefore + 8);
  });

  it('increments achievements.perfectLevels at most once per level across no-hint Classic solves', () => {
    useGameStore.setState({ unlockedLevelId: 2 });
    const perfectBefore = S().achievements.perfectLevels;

    S().startLevel(2, false);
    solveWithElapsed(1);
    expect(S().achievements.perfectLevels).toBe(perfectBefore + 1);

    S().startLevel(2, false);
    solveWithElapsed(1);
    expect(S().achievements.perfectLevels).toBe(perfectBefore + 1);
  });

  it('increments zeroMistakeSolves at most once per level across zero-mistake Classic solves', () => {
    useGameStore.setState({ unlockedLevelId: 2 });
    const zeroBefore = S().zeroMistakeSolves;

    S().startLevel(2, false);
    solveWithElapsed(1);
    expect(S().zeroMistakeSolves).toBe(zeroBefore + 1);
    expect(S().levelProgress[2]?.bestMistakes).toBe(0);

    S().startLevel(2, false);
    solveWithElapsed(1);
    expect(S().zeroMistakeSolves).toBe(zeroBefore + 1);
  });

  it('does not change totalStarsEarnedEver on a same-stars replay', () => {
    useGameStore.setState({ unlockedLevelId: 2 });
    S().startLevel(2, false);
    solveWithElapsed(1);
    const starsAfterFirst = S().totalStarsEarnedEver;
    expect(starsAfterFirst).toBe(3);

    S().startLevel(2, false);
    solveWithElapsed(1);
    expect(S().totalStarsEarnedEver).toBe(starsAfterFirst);
  });
});
