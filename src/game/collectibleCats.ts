import i18n from '../i18n';
import { CatBreed } from '../styles/theme';
import { LevelProgress } from './gameTypes';

export type CatRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CollectibleCat {
  id: string;
  name: string;
  title: string;
  breed: CatBreed;
  rarity: CatRarity;
  personality: string;
  unlockRequirementText: string;
  isUnlocked: (ctx: CatUnlockContext) => boolean;
  getProgress: (ctx: CatUnlockContext) => { current: number; target: number };
  progressHint: (ctx: CatUnlockContext) => string;
}

export interface CatUnlockContext {
  levelProgress: Record<number, LevelProgress>;
  unlockedLevelId: number;
  totalStars: number;
  noHintSolves: number;
  completedDailyCount: number;
  unlockedAchievementsCount: number;
}

export const COLLECTIBLE_CATS: readonly CollectibleCat[] = [
  {
    id: 'mochi',
    name: 'Mochi',
    title: 'Tuxedo Detective',
    breed: 'tuxedo',
    rarity: 'common',
    personality: 'Polite, curious, and always inspects every corner first.',
    unlockRequirementText: 'Starter companion',
    isUnlocked: () => true,
    getProgress: () => ({ current: 1, target: 1 }),
    progressHint: () => i18n.t('cats.progress.unlocked'),
  },
  {
    id: 'marmalade',
    name: 'Marmalade',
    title: 'Sunbeam Napper',
    breed: 'ginger',
    rarity: 'common',
    personality: 'Warm-hearted ginger tabby who loves morning puzzles.',
    unlockRequirementText: 'Complete Level 1',
    isUnlocked: (ctx) => Boolean(ctx.levelProgress[1]?.completed),
    getProgress: (ctx) => ({
      current: ctx.levelProgress[1]?.completed ? 1 : 0,
      target: 1,
    }),
    progressHint: () => i18n.t('cats.progress.completeLvl1'),
  },
  {
    id: 'pebble',
    name: 'Pebble',
    title: 'Cloud Paws',
    breed: 'gray',
    rarity: 'common',
    personality: 'Calm British Shorthair who never rushes a deduction.',
    unlockRequirementText: 'Earn 6 total stars',
    isUnlocked: (ctx) => ctx.totalStars >= 6,
    getProgress: (ctx) => ({
      current: Math.min(Math.max(0, ctx.totalStars), 6),
      target: 6,
    }),
    progressHint: (ctx) =>
      i18n.t('cats.progress.moreStars', { count: Math.max(0, 6 - ctx.totalStars) }),
  },
  {
    id: 'biscuit',
    name: 'Biscuit',
    title: 'Treasure Sniffer',
    breed: 'honey',
    rarity: 'rare',
    personality: 'Golden kitten with an uncanny nose for hidden treasure chests.',
    unlockRequirementText: 'Complete Level 4 (Treasure Chest)',
    isUnlocked: (ctx) => Boolean(ctx.levelProgress[4]?.completed),
    getProgress: (ctx) => ({
      current: ctx.levelProgress[4]?.completed ? 1 : 0,
      target: 1,
    }),
    progressHint: () => i18n.t('cats.progress.clearLvl4'),
  },
  {
    id: 'cleo',
    name: 'Cleo',
    title: 'Velvet Scholar',
    breed: 'cream',
    rarity: 'rare',
    personality: 'Graceful Siamese who adores clean logic and tidy rows.',
    unlockRequirementText: 'Unlock World 2: Candy Garden',
    isUnlocked: (ctx) => ctx.unlockedLevelId >= 7,
    getProgress: (ctx) => ({
      current: Math.min(Math.max(0, ctx.unlockedLevelId - 1), 6),
      target: 6,
    }),
    progressHint: (ctx) =>
      i18n.t('cats.progress.untilWorld2', {
        count: Math.max(0, 7 - ctx.unlockedLevelId),
      }),
  },
  {
    id: 'luna',
    name: 'Luna',
    title: 'Ribbon Dreamer',
    breed: 'lilac',
    rarity: 'rare',
    personality: 'Wears her favorite pink bow for every Daily Kitty puzzle.',
    unlockRequirementText: 'Complete 1 Daily Kitty Challenge',
    isUnlocked: (ctx) => ctx.completedDailyCount >= 1,
    getProgress: (ctx) => ({
      current: Math.min(Math.max(0, ctx.completedDailyCount), 1),
      target: 1,
    }),
    progressHint: () => i18n.t('cats.progress.solveDaily'),
  },
  {
    id: 'patches',
    name: 'Patches',
    title: 'Candy Acrobat',
    breed: 'calico',
    rarity: 'epic',
    personality: 'Playful calico rescued in the heart of Candy Garden.',
    unlockRequirementText: 'Complete Level 9 (Cat Rescue)',
    isUnlocked: (ctx) => Boolean(ctx.levelProgress[9]?.completed),
    getProgress: (ctx) => ({
      current: ctx.levelProgress[9]?.completed ? 1 : 0,
      target: 1,
    }),
    progressHint: () => i18n.t('cats.progress.rescueLvl9'),
  },
  {
    id: 'snowbell',
    name: 'Snowbell',
    title: 'Pure Logic Sage',
    breed: 'ragdoll',
    rarity: 'epic',
    personality: 'Serene blue-eyed Ragdoll who solves puzzles with zero hints.',
    unlockRequirementText: 'Solve 3 levels without hints',
    isUnlocked: (ctx) => ctx.noHintSolves >= 3,
    getProgress: (ctx) => ({
      current: Math.min(Math.max(0, ctx.noHintSolves), 3),
      target: 3,
    }),
    progressHint: (ctx) =>
      i18n.t('cats.progress.noHintSolves', {
        count: Math.max(0, 3 - ctx.noHintSolves),
      }),
  },
  {
    id: 'nori',
    name: 'Nori',
    title: 'Moonlight Scout',
    breed: 'tuxedo',
    rarity: 'epic',
    personality: 'Agile rooftop explorer who guides travelers through 8×8 grids.',
    unlockRequirementText: 'Unlock World 3: Moonlit Valley',
    isUnlocked: (ctx) => ctx.unlockedLevelId >= 13,
    getProgress: (ctx) => ({
      current: Math.min(Math.max(0, ctx.unlockedLevelId - 1), 12),
      target: 12,
    }),
    progressHint: (ctx) =>
      i18n.t('cats.progress.untilWorld3', {
        count: Math.max(0, 13 - ctx.unlockedLevelId),
      }),
  },
  {
    id: 'aurelia',
    name: 'Aurelia',
    title: 'Grand Meowster',
    breed: 'lilac',
    rarity: 'legendary',
    personality: 'Legendary guardian of Starlight Castle and master of all grids.',
    unlockRequirementText: 'Unlock 5 achievements or clear Level 24',
    isUnlocked: (ctx) =>
      ctx.unlockedAchievementsCount >= 5 || Boolean(ctx.levelProgress[24]?.completed),
    getProgress: (ctx) => ({
      current: ctx.levelProgress[24]?.completed
        ? 5
        : Math.min(Math.max(0, ctx.unlockedAchievementsCount), 5),
      target: 5,
    }),
    progressHint: (ctx) =>
      i18n.t('cats.progress.moreAch', {
        count: Math.max(0, 5 - ctx.unlockedAchievementsCount),
      }),
  },
] as const;

export function getCollectibleCat(id: string): CollectibleCat {
  return COLLECTIBLE_CATS.find((c) => c.id === id) ?? COLLECTIBLE_CATS[0]!;
}

export function getNewlyUnlockedCats(
  ctx: CatUnlockContext,
  alreadyUnlockedIds: readonly string[]
): CollectibleCat[] {
  const existing = new Set(alreadyUnlockedIds);
  return COLLECTIBLE_CATS.filter((cat) => !existing.has(cat.id) && cat.isUnlocked(ctx));
}
