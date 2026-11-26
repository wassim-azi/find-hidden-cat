import { describe, expect, it, vi } from 'vitest';
import { COLLECTIBLE_CATS, CatUnlockContext } from './collectibleCats';
import { INITIAL_DAILY_LOGIN } from './dailyRewards';
import { INITIAL_FISH_COINS, SHOP_ITEMS } from './economy';
import { getCurrentWeekKey } from './events';
import { LevelProgress } from './gameTypes';
import { generateDailyMissions } from './missions';
import { EMPTY_PROGRESS_STATS } from './progressStats';
import { getUpcomingGoals, GoalsInput } from './upcomingGoals';
import { getNextWorldAfter, getWorldForLevel } from './worlds';
import { useGameStore } from '../store/gameStore';

const S = () => useGameStore.getState();

function makeFreshInput(overrides: Partial<GoalsInput> = {}): GoalsInput {
  return {
    levelProgress: {},
    unlockedLevelId: 1,
    fishCoins: INITIAL_FISH_COINS,
    dailyMissions: generateDailyMissions('2026-11-25'),
    claimedEventIds: [],
    dailyLogin: { ...INITIAL_DAILY_LOGIN },
    progressStats: EMPTY_PROGRESS_STATS,
    unlockedCatIds: ['mochi'],
    unlockedAchievementIds: [],
    weekKey: '2026-W48',
    ...overrides,
  };
}

function solveCurrentPuzzle(): void {
  const { puzzle } = S();
  for (const cat of puzzle.solution) {
    if (S().board[cat.row]![cat.col] !== 'cat') S().attemptPlaceCat(cat);
  }
}

describe('COLLECTIBLE_CATS.getProgress parity with isUnlocked (#13)', () => {
  it('satisfies current >= target iff isUnlocked(ctx) across 200 deterministic random contexts', () => {
    let seed = 421337;
    const rand = (max: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % max;
    };

    for (let i = 0; i < 200; i++) {
      const levelProgress: Record<number, LevelProgress> = {};
      for (const lvl of [1, 4, 9, 24]) {
        if (rand(2) === 1) {
          levelProgress[lvl] = {
            levelId: lvl,
            completed: true,
            bestTimeSec: 30,
            stars: 1 + rand(3),
            bestHintsUsed: 0,
            bestMistakes: 0,
            attempts: 1,
            lastResult: null,
          };
        }
      }
      const ctx: CatUnlockContext = {
        levelProgress,
        unlockedLevelId: 1 + rand(24),
        totalStars: rand(12),
        noHintSolves: rand(6),
        completedDailyCount: rand(3),
        unlockedAchievementsCount: rand(8),
      };

      for (const cat of COLLECTIBLE_CATS) {
        const { current, target } = cat.getProgress(ctx);
        expect(target).toBeGreaterThan(0);
        expect(current >= target).toBe(cat.isUnlocked(ctx));
      }
    }
  });
});

describe('getUpcomingGoals engine (#13)', () => {
  it('produces next_world (0/6), cat_unlock (Marmalade 0/1), mission, and no three_stars on fresh state', () => {
    const goals = getUpcomingGoals(makeFreshInput());
    expect(goals.every((g) => g.current >= 0 && g.current < g.target)).toBe(true);

    const nextWorld = goals.find((g) => g.kind === 'next_world');
    expect(nextWorld).toBeDefined();
    expect(nextWorld?.current).toBe(0);
    expect(nextWorld?.target).toBe(6);

    const catGoal = goals.find((g) => g.kind === 'cat_unlock');
    expect(catGoal).toBeDefined();
    expect(catGoal?.labelParams.catId).toBe('marmalade');
    expect(catGoal?.current).toBe(0);
    expect(catGoal?.target).toBe(1);

    expect(goals.some((g) => g.kind === 'mission')).toBe(true);
    expect(goals.some((g) => g.kind === 'three_stars')).toBe(false);
  });

  it('coins_for_item targets the cheapest SHOP_ITEMS entry strictly above fishCoins', () => {
    const sortedPrices = [...SHOP_ITEMS].sort((a, b) => a.priceCoins - b.priceCoins);
    const minPrice = sortedPrices[0]!.priceCoins;
    const maxPrice = sortedPrices[sortedPrices.length - 1]!.priceCoins;

    for (const coins of [0, minPrice, minPrice + 1, maxPrice - 1]) {
      const expected = sortedPrices.find((i) => i.priceCoins > coins)!;
      const goals = getUpcomingGoals(makeFreshInput({ fishCoins: coins }));
      const coinGoal = goals.find((g) => g.kind === 'coins_for_item');
      expect(coinGoal).toBeDefined();
      expect(coinGoal?.labelParams.itemId).toBe(expected.id);
      expect(coinGoal?.current).toBe(coins);
      expect(coinGoal?.target).toBe(expected.priceCoins);
    }

    // When all items are affordable, no coins_for_item goal is emitted
    const richGoals = getUpcomingGoals(makeFreshInput({ fishCoins: maxPrice }));
    expect(richGoals.some((g) => g.kind === 'coins_for_item')).toBe(false);
  });

  it('truth tests against live store: next_world, coins_for_item, and event_chest match real unlock/purchase/claim', () => {
    S().resetAllProgress();
    const weekKey = getCurrentWeekKey();

    const goalsNow = () =>
      getUpcomingGoals({
        levelProgress: S().levelProgress,
        unlockedLevelId: S().unlockedLevelId,
        fishCoins: S().fishCoins,
        dailyMissions: S().dailyMissions,
        claimedEventIds: S().claimedEventIds,
        dailyLogin: S().dailyLogin,
        progressStats: S().progressStats,
        unlockedCatIds: S().unlockedCatIds,
        unlockedAchievementIds: S().unlockedAchievementIds,
        weekKey,
      });

    // 1. next_world truth test: completing (target - current) more levels unlocks next.levelStart
    const nwGoal = goalsNow().find((g) => g.kind === 'next_world')!;
    const currentWorld = getWorldForLevel(S().unlockedLevelId);
    const nextWorld = getNextWorldAfter(currentWorld.id)!;
    const remaining = nwGoal.target - nwGoal.current;
    for (let i = 0; i < remaining; i++) {
      S().startLevel(S().unlockedLevelId, false);
      solveCurrentPuzzle();
    }
    expect(S().unlockedLevelId).toBe(nextWorld.levelStart);

    // 2. event_chest truth test: treasure_hunt chest (target 3) is now claimable!
    expect(S().claimEventChest('treasure_hunt')).toBe(true);

    // Next event_chest goal should now be perfect_week; reaching its target makes claimEventChest return true
    const weeklyGoal = goalsNow().find((g) => g.kind === 'event_chest')!;
    expect(weeklyGoal.id).toBe(`event_chest:perfect_week-${weekKey}`);
    useGameStore.setState({
      dailyLogin: {
        ...S().dailyLogin,
        weekClaims: { weekKey, count: weeklyGoal.target },
      },
    });
    expect(S().claimEventChest('perfect_week')).toBe(true);

    // 3. coins_for_item truth test: setting fishCoins = target lets purchaseBooster(itemId) succeed
    vi.useFakeTimers();
    try {
      vi.advanceTimersByTime(500);
      useGameStore.setState({ fishCoins: 5 });
      const coinGoal = goalsNow().find((g) => g.kind === 'coins_for_item')!;
      const itemId = coinGoal.labelParams.itemId as typeof SHOP_ITEMS[number]['id'];
      useGameStore.setState({ fishCoins: coinGoal.target });
      vi.advanceTimersByTime(500);
      expect(S().purchaseBooster(itemId)).toBe(true);
    } finally {
      vi.useRealTimers();
    }

    // Invariant: no returned goal ever has current >= target
    for (const g of goalsNow()) {
      expect(g.current).toBeLessThan(g.target);
    }
  });
});
