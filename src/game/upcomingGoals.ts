import { COLLECTIBLE_CATS } from './collectibleCats';
import { DailyLoginState, getWeeklyClaimCount } from './dailyRewards';
import {
  BoosterId,
  SHOP_ITEMS,
  STAR_IMPROVEMENT_COINS_PER_STAR,
} from './economy';
import { getEventRewardPreview, WORLD_EVENTS } from './events';
import type { LevelProgress } from './gameTypes';
import { TOTAL_LEVELS } from './levels';
import type { DailyMissionsState } from './missions';
import type { ProgressStats } from './progressStats';
import { buildUnlockContext } from './unlockContext';
import { getNextWorldAfter, getWorldForLevel } from './worlds';

export type GoalKind =
  | 'mission'
  | 'event_chest'
  | 'next_world'
  | 'cat_unlock'
  | 'coins_for_item'
  | 'three_stars';

export interface UpcomingGoal {
  kind: GoalKind;
  id: string;
  current: number; // integer, 0 <= current < target
  target: number; // integer > 0
  labelKey: string;
  labelParams: Record<string, string | number>;
  reward?: { coins?: number; booster?: BoosterId; catId?: string };
  action: 'map' | 'missions' | 'shop' | 'cats' | 'level';
  levelId?: number;
}

export interface GoalsInput {
  levelProgress: Record<number, LevelProgress>;
  unlockedLevelId: number;
  fishCoins: number;
  dailyMissions: DailyMissionsState;
  claimedEventIds: string[];
  dailyLogin: DailyLoginState;
  progressStats: ProgressStats;
  unlockedCatIds: string[];
  unlockedAchievementIds: string[];
  weekKey: string;
}

const KIND_ORDER: Record<GoalKind, number> = {
  mission: 0,
  event_chest: 1,
  next_world: 2,
  cat_unlock: 3,
  coins_for_item: 4,
  three_stars: 5,
};

function produceMissionGoal(input: GoalsInput): UpcomingGoal | null {
  let best: DailyMissionsState['missions'][number] | null = null;
  let bestRatio = -1;
  for (const m of input.dailyMissions.missions) {
    if (m.claimed || m.progress >= m.target || m.target <= 0) continue;
    const ratio = m.progress / m.target;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = m;
    }
  }
  if (!best) return null;

  return {
    kind: 'mission',
    id: `mission:${best.id}`,
    current: Math.max(0, Math.floor(best.progress)),
    target: Math.floor(best.target),
    labelKey: 'goals.mission',
    labelParams: { metric: best.metric },
    reward: {
      coins: best.rewardCoins,
      ...(best.rewardBooster ? { booster: best.rewardBooster } : {}),
    },
    action: 'missions',
  };
}

function produceEventChestGoal(input: GoalsInput): UpcomingGoal | null {
  const completedCount = Object.values(input.levelProgress).filter(
    (p) => p.completed
  ).length;
  const treasureEv = WORLD_EVENTS.find((e) => e.id === 'treasure_hunt');
  if (
    treasureEv &&
    !input.claimedEventIds.includes('treasure_hunt') &&
    completedCount < treasureEv.targetCount
  ) {
    const preview = getEventRewardPreview(treasureEv);
    return {
      kind: 'event_chest',
      id: 'event_chest:treasure_hunt',
      current: completedCount,
      target: treasureEv.targetCount,
      labelKey: 'goals.treasureChest',
      labelParams: { count: treasureEv.targetCount - completedCount },
      reward: {
        coins: preview.maxCoins,
        ...(preview.booster ? { booster: preview.booster } : {}),
      },
      action: 'missions',
    };
  }

  const weeklyEv = WORLD_EVENTS.find((e) => e.id === 'perfect_week');
  const weeklyKey = `perfect_week-${input.weekKey}`;
  const weeklyCount = getWeeklyClaimCount(input.dailyLogin, input.weekKey);
  if (
    weeklyEv &&
    !input.claimedEventIds.includes(weeklyKey) &&
    weeklyCount < weeklyEv.targetCount
  ) {
    const preview = getEventRewardPreview(weeklyEv);
    return {
      kind: 'event_chest',
      id: `event_chest:${weeklyKey}`,
      current: weeklyCount,
      target: weeklyEv.targetCount,
      labelKey: 'goals.weeklyChest',
      labelParams: { count: weeklyEv.targetCount - weeklyCount },
      reward: {
        coins: preview.maxCoins,
        ...(preview.booster ? { booster: preview.booster } : {}),
      },
      action: 'missions',
    };
  }

  return null;
}

function produceNextWorldGoal(input: GoalsInput): UpcomingGoal | null {
  const completedAll =
    Object.values(input.levelProgress).filter((p) => p.completed).length >= TOTAL_LEVELS;
  if (completedAll) return null;

  const w = getWorldForLevel(input.unlockedLevelId);
  const next = getNextWorldAfter(w.id);
  if (!next) return null;

  const current = Math.max(0, input.unlockedLevelId - w.levelStart);
  const target = w.levelEnd - w.levelStart + 1;
  if (current >= target || target <= 0) return null;

  return {
    kind: 'next_world',
    id: `next_world:${next.id}`,
    current,
    target,
    labelKey: 'goals.nextWorld',
    labelParams: { count: target - current, worldId: next.id },
    reward: { coins: w.milestoneCoins },
    action: 'map',
  };
}

function produceCatUnlockGoal(input: GoalsInput): UpcomingGoal | null {
  const ctx = buildUnlockContext({
    levelProgress: input.levelProgress,
    unlockedLevelId: input.unlockedLevelId,
    progressStats: input.progressStats,
    unlockedAchievementIds: input.unlockedAchievementIds,
    unlockedCatIds: input.unlockedCatIds,
  });

  let bestCatId: string | null = null;
  let bestCurrent = 0;
  let bestTarget = 1;
  let bestRatio = -1;

  for (const cat of COLLECTIBLE_CATS) {
    if (input.unlockedCatIds.includes(cat.id)) continue;
    const { current, target } = cat.getProgress(ctx);
    if (target <= 0 || current >= target) continue;
    const ratio = current / target;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestCatId = cat.id;
      bestCurrent = Math.max(0, Math.floor(current));
      bestTarget = Math.floor(target);
    }
  }

  if (!bestCatId) return null;

  return {
    kind: 'cat_unlock',
    id: `cat_unlock:${bestCatId}`,
    current: bestCurrent,
    target: bestTarget,
    labelKey: 'goals.catUnlock',
    labelParams: { catId: bestCatId },
    reward: { catId: bestCatId },
    action: 'cats',
  };
}

function produceCoinsForItemGoal(input: GoalsInput): UpcomingGoal | null {
  const coins = Math.max(0, Math.floor(input.fishCoins));
  const candidates = SHOP_ITEMS.filter((item) => item.priceCoins > coins);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.priceCoins - b.priceCoins);
  const item = candidates[0]!;

  return {
    kind: 'coins_for_item',
    id: `coins_for_item:${item.id}`,
    current: coins,
    target: item.priceCoins,
    labelKey: 'goals.coinsForItem',
    labelParams: { count: item.priceCoins - coins, itemId: item.id },
    reward: { booster: item.id },
    action: 'shop',
  };
}

function produceThreeStarsGoal(input: GoalsInput): UpcomingGoal | null {
  const candidates = Object.values(input.levelProgress)
    .filter((p) => p.completed && p.stars < 3)
    .sort((a, b) => a.levelId - b.levelId);
  if (candidates.length === 0) return null;

  const prog = candidates[0]!;
  const current = Math.max(0, Math.min(2, Math.floor(prog.stars)));
  const target = 3;

  return {
    kind: 'three_stars',
    id: `three_stars:${prog.levelId}`,
    current,
    target,
    labelKey: 'goals.threeStars',
    labelParams: { id: prog.levelId },
    reward: { coins: STAR_IMPROVEMENT_COINS_PER_STAR * (target - current) },
    action: 'level',
    levelId: prog.levelId,
  };
}

/**
 * Pure "next goal" engine deriving accurate, actionable goals from live player state.
 * Never returns goals where `current >= target`.
 */
export function getUpcomingGoals(input: GoalsInput): UpcomingGoal[] {
  const raw = [
    produceMissionGoal(input),
    produceEventChestGoal(input),
    produceNextWorldGoal(input),
    produceCatUnlockGoal(input),
    produceCoinsForItemGoal(input),
    produceThreeStarsGoal(input),
  ].filter((g): g is UpcomingGoal => g !== null && g.target > 0 && g.current < g.target);

  raw.sort((a, b) => {
    const ratioDiff = b.current / b.target - a.current / a.target;
    if (Math.abs(ratioDiff) > 1e-9) return ratioDiff;
    return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  });

  return raw;
}
