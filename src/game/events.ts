import { BoosterId, calculateLevelCoinReward } from './economy';
import { getWeekKey } from './dateKeys';
import { PuzzleDefinition } from './gameTypes';
import { generateValidatedPuzzle } from './puzzleGenerator';

export type WorldEventId =
  | 'daily_cat'
  | 'treasure_hunt'
  | 'golden_cat'
  | 'perfect_week';

export const GOLDEN_CAT_BONUS_COINS = 35;
export const GOLDEN_CAT_BONUS_BOOSTER: BoosterId = 'superHint';

export interface WorldEventCard {
  id: WorldEventId;
  title: string;
  subtitle: string;
  badge: string;
  /** Applies only to `milestone_chest` events; playable puzzles use `getEventRewardPreview`. */
  rewardCoins: number;
  /** Applies only to `milestone_chest` events; playable puzzles use `getEventRewardPreview`. */
  rewardBooster?: BoosterId;
  accentGradient: string;
  type: 'playable_puzzle' | 'milestone_chest';
  targetCount: number;
}

export interface EventRewardPreview {
  minCoins: number;
  maxCoins: number;
  booster?: BoosterId;
  classicOnly: boolean;
}

export const WORLD_EVENTS: readonly WorldEventCard[] = [
  {
    id: 'daily_cat',
    title: 'Daily Kitty Challenge',
    subtitle: 'A fresh 8×8 unique-solution puzzle every day.',
    badge: 'Daily',
    // Playable puzzle: payout is computed via calculateLevelCoinReward (see getEventRewardPreview)
    rewardCoins: 0,
    accentGradient: 'from-[#FFF4DA] to-[#FFE3CC]',
    type: 'playable_puzzle',
    targetCount: 1,
  },
  {
    id: 'treasure_hunt',
    title: 'Village Treasure Hunt',
    subtitle: 'Complete 3 campaign levels to open the golden chest.',
    badge: 'Chest',
    rewardCoins: 75,
    rewardBooster: 'revealCat',
    accentGradient: 'from-[#E9F7EF] to-[#D9F0E3]',
    type: 'milestone_chest',
    targetCount: 3,
  },
  {
    id: 'golden_cat',
    title: 'Golden Cat Trial',
    subtitle: 'A special tricky 8×8 weekly puzzle for bold detectives.',
    badge: 'Weekly',
    // Playable puzzle: payout is computed via calculateLevelCoinReward + GOLDEN_CAT_BONUS_*
    rewardCoins: 0,
    accentGradient: 'from-[#F6ECFE] to-[#FFEBF2]',
    type: 'playable_puzzle',
    targetCount: 1,
  },
  {
    id: 'perfect_week',
    title: 'Cozy Streak Week',
    subtitle: 'Claim 3 Daily Login Rewards this week to earn a Booster Bundle.',
    badge: 'Weekly',
    rewardCoins: 60,
    rewardBooster: 'revealRegion',
    accentGradient: 'from-[#EBF4FC] to-[#F2ECFC]',
    type: 'milestone_chest',
    targetCount: 3,
  },
] as const;

/**
 * Computes the exact reward preview for any event card from the same constants
 * and reward formula used when granting payouts.
 */
export function getEventRewardPreview(ev: WorldEventCard): EventRewardPreview {
  if (ev.id === 'daily_cat') {
    const minCoins = calculateLevelCoinReward({
      difficulty: 'medium',
      stars: 1,
      isFirstCompletion: true,
      specialNodeBonus: 0,
      worldMilestoneBonus: 0,
      isDaily: true,
    }).totalCoins;
    const maxCoins = calculateLevelCoinReward({
      difficulty: 'medium',
      stars: 3,
      isFirstCompletion: true,
      specialNodeBonus: 0,
      worldMilestoneBonus: 0,
      isDaily: true,
    }).totalCoins;
    return { minCoins, maxCoins, classicOnly: true };
  }

  if (ev.id === 'golden_cat') {
    const minCoins = calculateLevelCoinReward({
      difficulty: 'hard',
      stars: 1,
      isFirstCompletion: true,
      specialNodeBonus: GOLDEN_CAT_BONUS_COINS,
      worldMilestoneBonus: 0,
      isDaily: true,
    }).totalCoins;
    const maxCoins = calculateLevelCoinReward({
      difficulty: 'hard',
      stars: 3,
      isFirstCompletion: true,
      specialNodeBonus: GOLDEN_CAT_BONUS_COINS,
      worldMilestoneBonus: 0,
      isDaily: true,
    }).totalCoins;
    return {
      minCoins,
      maxCoins,
      booster: GOLDEN_CAT_BONUS_BOOSTER,
      classicOnly: true,
    };
  }

  return {
    minCoins: ev.rewardCoins,
    maxCoins: ev.rewardCoins,
    booster: ev.rewardBooster,
    classicOnly: false,
  };
}

let cachedGoldenPuzzle: { weekKey: string; puzzle: PuzzleDefinition } | null = null;

export function getCurrentWeekKey(now: Date = new Date()): string {
  return getWeekKey(now);
}

export function getGoldenCatPuzzle(weekKey = getCurrentWeekKey()): PuzzleDefinition {
  if (cachedGoldenPuzzle && cachedGoldenPuzzle.weekKey === weekKey) {
    return cachedGoldenPuzzle.puzzle;
  }

  let hash = 13371337;
  for (let i = 0; i < weekKey.length; i++) {
    hash ^= weekKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const seed = (hash >>> 0) || 55119;

  const puzzle = generateValidatedPuzzle({
    id: -1,
    title: `Golden Cat • ${weekKey}`,
    difficulty: 'hard',
    size: 8,
    seed,
    starterCatsCount: 0,
  });

  const golden: PuzzleDefinition = {
    ...puzzle,
    dailyDateKey: `golden-${weekKey}`,
  };

  cachedGoldenPuzzle = { weekKey, puzzle: golden };
  return golden;
}
