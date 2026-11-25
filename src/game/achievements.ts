import { BoosterId } from './economy';
import { LevelProgress } from './gameTypes';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardBooster?: BoosterId;
  icon: 'paw' | 'sparkles' | 'star' | 'trophy' | 'shield' | 'compass' | 'gem' | 'heart';
  target: number;
  getProgress: (ctx: AchievementEvalContext) => number;
}

export interface AchievementEvalContext {
  levelProgress: Record<number, LevelProgress>;
  unlockedLevelId: number;
  noHintSolves: number;
  zeroMistakeSolves: number;
  specialLevelsCompleted: number;
  unlockedCatsCount: number;
  completedDailyCount: number;
  totalStars: number;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first_purr',
    title: 'First Purr',
    description: 'Complete your very first puzzle level.',
    rewardCoins: 25,
    icon: 'paw',
    target: 1,
    getProgress: (ctx) =>
      Object.values(ctx.levelProgress).filter((p) => p.completed).length,
  },
  {
    id: 'perfect_paws',
    title: 'Perfect Paws',
    description: 'Complete a level with zero mistakes.',
    rewardCoins: 35,
    rewardBooster: 'mistakeShield',
    icon: 'shield',
    target: 1,
    getProgress: (ctx) => ctx.zeroMistakeSolves,
  },
  {
    id: 'sharp_whiskers',
    title: 'Sharp Whiskers',
    description: 'Solve 5 levels without using any hints.',
    rewardCoins: 60,
    rewardBooster: 'superHint',
    icon: 'sparkles',
    target: 5,
    getProgress: (ctx) => ctx.noHintSolves,
  },
  {
    id: 'treasure_hunter',
    title: 'Treasure Hunter',
    description: 'Complete a special Treasure, Rescue, or Boss level.',
    rewardCoins: 45,
    icon: 'gem',
    target: 1,
    getProgress: (ctx) => ctx.specialLevelsCompleted,
  },
  {
    id: 'world_traveler',
    title: 'World Traveler',
    description: 'Unlock World 2: Candy Garden.',
    rewardCoins: 50,
    rewardBooster: 'revealRegion',
    icon: 'compass',
    target: 1,
    getProgress: (ctx) => (ctx.unlockedLevelId >= 7 ? 1 : 0),
  },
  {
    id: 'star_gazer',
    title: 'Star Gazer',
    description: 'Collect 15 total stars across the map.',
    rewardCoins: 55,
    icon: 'star',
    target: 15,
    getProgress: (ctx) => ctx.totalStars,
  },
  {
    id: 'cat_collector',
    title: 'Cat Collector',
    description: 'Unlock 5 adorable cat companions.',
    rewardCoins: 70,
    rewardBooster: 'revealCat',
    icon: 'heart',
    target: 5,
    getProgress: (ctx) => ctx.unlockedCatsCount,
  },
  {
    id: 'puzzle_master',
    title: 'Puzzle Master',
    description: 'Earn 30 total stars across your journey.',
    rewardCoins: 100,
    rewardBooster: 'revealCat',
    icon: 'trophy',
    target: 30,
    getProgress: (ctx) => ctx.totalStars,
  },
] as const;

export function getNewlyUnlockedAchievements(
  ctx: AchievementEvalContext,
  alreadyUnlockedIds: readonly string[]
): AchievementDefinition[] {
  const existing = new Set(alreadyUnlockedIds);
  return ACHIEVEMENTS.filter(
    (ach) => !existing.has(ach.id) && ach.getProgress(ctx) >= ach.target
  );
}
