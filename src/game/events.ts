import { BoosterId } from './economy';
import { PuzzleDefinition } from './gameTypes';
import { generateValidatedPuzzle } from './puzzleGenerator';

export type WorldEventId =
  | 'daily_cat'
  | 'treasure_hunt'
  | 'golden_cat'
  | 'perfect_week';

export interface WorldEventCard {
  id: WorldEventId;
  title: string;
  subtitle: string;
  badge: string;
  rewardSummary: string;
  rewardCoins: number;
  rewardBooster?: BoosterId;
  accentGradient: string;
  type: 'playable_puzzle' | 'milestone_chest';
  targetCount: number;
}

export const WORLD_EVENTS: readonly WorldEventCard[] = [
  {
    id: 'daily_cat',
    title: 'Daily Kitty Challenge',
    subtitle: 'A fresh 8×8 unique-solution puzzle every day.',
    badge: 'Daily',
    rewardSummary: '+45 Fish Coins & Luna progress',
    rewardCoins: 45,
    accentGradient: 'from-[#FFF4DA] to-[#FFE3CC]',
    type: 'playable_puzzle',
    targetCount: 1,
  },
  {
    id: 'treasure_hunt',
    title: 'Village Treasure Hunt',
    subtitle: 'Complete 3 campaign levels to open the golden chest.',
    badge: 'Chest',
    rewardSummary: '+75 Fish Coins + 1 Reveal Cat',
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
    rewardSummary: '+80 Fish Coins + 1 Super Hint',
    rewardCoins: 80,
    rewardBooster: 'superHint',
    accentGradient: 'from-[#F6ECFE] to-[#FFEBF2]',
    type: 'playable_puzzle',
    targetCount: 1,
  },
  {
    id: 'perfect_week',
    title: 'Cozy Streak Week',
    subtitle: 'Claim 3 Daily Login Rewards to earn a Booster Bundle.',
    badge: 'Weekly',
    rewardSummary: '+60 Fish Coins + 1 Reveal Region',
    rewardCoins: 60,
    rewardBooster: 'revealRegion',
    accentGradient: 'from-[#EBF4FC] to-[#F2ECFC]',
    type: 'milestone_chest',
    targetCount: 3,
  },
] as const;

let cachedGoldenPuzzle: { weekKey: string; puzzle: PuzzleDefinition } | null = null;

export function getCurrentWeekKey(now: Date = new Date()): string {
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
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
