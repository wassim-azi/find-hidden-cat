import type { TFunction } from 'i18next';
import { BoosterId } from './economy';
import { LevelProgress } from './gameTypes';
import { TECHNIQUE_RANK } from './logicalSolver';
import { EMPTY_PROGRESS_STATS, ProgressStats } from './progressStats';
import { WORLDS } from './worlds';

export type AchievementGroup = 'progress' | 'skill' | 'daily' | 'world' | 'technique';

export const ACHIEVEMENT_GROUP_ORDER: readonly AchievementGroup[] = [
  'progress',
  'skill',
  'daily',
  'world',
  'technique',
] as const;

export interface AchievementDefinition {
  id: string;
  group: AchievementGroup;
  tier?: 1 | 2 | 3;
  worldId?: number;
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
  progressStats?: ProgressStats;
}

function getStats(ctx: AchievementEvalContext): ProgressStats {
  return ctx.progressStats ?? EMPTY_PROGRESS_STATS;
}

function countWorldCompleted(
  ctx: AchievementEvalContext,
  levelStart: number,
  levelEnd: number
): number {
  let count = 0;
  for (let id = levelStart; id <= levelEnd; id++) {
    if (ctx.levelProgress[id]?.completed) count++;
  }
  return count;
}

function countWorldThreeStars(
  ctx: AchievementEvalContext,
  levelStart: number,
  levelEnd: number
): number {
  let count = 0;
  for (let id = levelStart; id <= levelEnd; id++) {
    const p = ctx.levelProgress[id];
    if (p?.completed && p.stars >= 3) count++;
  }
  return count;
}

function hasTechniqueRank(ctx: AchievementEvalContext, rank: number): number {
  const seen = getStats(ctx).lifetime.techniquesSeen;
  return seen.some((tech) => TECHNIQUE_RANK[tech] === rank) ? 1 : 0;
}

const WORLD_CLEAR_REWARDS = [50, 75, 100, 150] as const;
const WORLD_STAR_REWARDS: readonly { coins: number; booster: BoosterId }[] = [
  { coins: 100, booster: 'hint' },
  { coins: 125, booster: 'superHint' },
  { coins: 150, booster: 'revealCat' },
  { coins: 200, booster: 'revealRegion' },
] as const;

const WORLD_CLEAR_ACHIEVEMENTS: AchievementDefinition[] = WORLDS.map((w, idx) => ({
  id: `world_${w.id}_clear`,
  group: 'world',
  worldId: w.id,
  title: `${w.name} Explorer`,
  description: `Complete every level in ${w.name}.`,
  rewardCoins: WORLD_CLEAR_REWARDS[idx] ?? 100,
  icon: 'compass',
  target: w.levelEnd - w.levelStart + 1,
  getProgress: (ctx) => countWorldCompleted(ctx, w.levelStart, w.levelEnd),
}));

const WORLD_STAR_ACHIEVEMENTS: AchievementDefinition[] = WORLDS.map((w, idx) => ({
  id: `world_${w.id}_stars`,
  group: 'world',
  worldId: w.id,
  title: `${w.name} Star`,
  description: `Get 3 stars on every level in ${w.name}.`,
  rewardCoins: WORLD_STAR_REWARDS[idx]?.coins ?? 150,
  rewardBooster: WORLD_STAR_REWARDS[idx]?.booster,
  icon: 'gem',
  target: w.levelEnd - w.levelStart + 1,
  getProgress: (ctx) => countWorldThreeStars(ctx, w.levelStart, w.levelEnd),
}));

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  // ── 8 Legacy Achievements (ids & targets preserved) ────────────────────────
  {
    id: 'first_purr',
    group: 'progress',
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
    group: 'skill',
    tier: 1,
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
    group: 'skill',
    tier: 1,
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
    group: 'progress',
    title: 'Treasure Hunter',
    description: 'Complete a special Treasure, Rescue, or Boss level.',
    rewardCoins: 45,
    icon: 'gem',
    target: 1,
    getProgress: (ctx) => ctx.specialLevelsCompleted,
  },
  {
    id: 'world_traveler',
    group: 'progress',
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
    group: 'progress',
    title: 'Star Gazer',
    description: 'Collect 15 total stars across the map.',
    rewardCoins: 55,
    icon: 'star',
    target: 15,
    getProgress: (ctx) => ctx.totalStars,
  },
  {
    id: 'cat_collector',
    group: 'progress',
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
    group: 'progress',
    title: 'Puzzle Master',
    description: 'Earn 30 total stars across your journey.',
    rewardCoins: 100,
    rewardBooster: 'revealCat',
    icon: 'trophy',
    target: 30,
    getProgress: (ctx) => ctx.totalStars,
  },

  // ── 20 New Achievements (#17): Skill Tiers, Daily/Weekly, Worlds, Techniques ─
  {
    id: 'sharp_whiskers_2',
    group: 'skill',
    tier: 2,
    title: 'Keen Whiskers',
    description: 'Solve 15 different puzzles without hints.',
    rewardCoins: 90,
    rewardBooster: 'superHint',
    icon: 'sparkles',
    target: 15,
    getProgress: (ctx) => getStats(ctx).lifetime.uniqueNoHintPuzzles,
  },
  {
    id: 'sharp_whiskers_3',
    group: 'skill',
    tier: 3,
    title: 'Master Whiskers',
    description: 'Solve 40 different puzzles without hints.',
    rewardCoins: 150,
    rewardBooster: 'revealCat',
    icon: 'sparkles',
    target: 40,
    getProgress: (ctx) => getStats(ctx).lifetime.uniqueNoHintPuzzles,
  },
  {
    id: 'perfect_paws_2',
    group: 'skill',
    tier: 2,
    title: 'Steady Paws',
    description: 'Solve 10 different puzzles with zero mistakes.',
    rewardCoins: 70,
    rewardBooster: 'mistakeShield',
    icon: 'shield',
    target: 10,
    getProgress: (ctx) => getStats(ctx).lifetime.uniqueNoMistakePuzzles,
  },
  {
    id: 'perfect_paws_3',
    group: 'skill',
    tier: 3,
    title: 'Flawless Paws',
    description: 'Solve 30 different puzzles with zero mistakes.',
    rewardCoins: 140,
    rewardBooster: 'mistakeShield',
    icon: 'shield',
    target: 30,
    getProgress: (ctx) => getStats(ctx).lifetime.uniqueNoMistakePuzzles,
  },
  {
    id: 'daily_devotee_1',
    group: 'daily',
    tier: 1,
    title: 'Daily Friend',
    description: 'Solve 7 Daily Kitty puzzles.',
    rewardCoins: 50,
    icon: 'star',
    target: 7,
    getProgress: (ctx) => getStats(ctx).lifetime.dailySolved,
  },
  {
    id: 'daily_devotee_2',
    group: 'daily',
    tier: 2,
    title: 'Daily Devotee',
    description: 'Solve 30 Daily Kitty puzzles.',
    rewardCoins: 150,
    rewardBooster: 'superHint',
    icon: 'star',
    target: 30,
    getProgress: (ctx) => getStats(ctx).lifetime.dailySolved,
  },
  {
    id: 'daily_devotee_3',
    group: 'daily',
    tier: 3,
    title: 'Daily Legend',
    description: 'Solve 100 Daily Kitty puzzles.',
    rewardCoins: 300,
    rewardBooster: 'revealCat',
    icon: 'star',
    target: 100,
    getProgress: (ctx) => getStats(ctx).lifetime.dailySolved,
  },
  {
    id: 'golden_hunter',
    group: 'daily',
    tier: 1,
    title: 'Golden Hunter',
    description: 'Solve 3 Golden Cat Trials.',
    rewardCoins: 100,
    rewardBooster: 'revealRegion',
    icon: 'trophy',
    target: 3,
    getProgress: (ctx) => getStats(ctx).lifetime.goldenSolved,
  },
  ...WORLD_CLEAR_ACHIEVEMENTS,
  ...WORLD_STAR_ACHIEVEMENTS,
  {
    id: 'tech_rank_1',
    group: 'technique',
    tier: 1,
    title: 'Region Reader',
    description: 'Solve a puzzle that needs a region–line intersection.',
    rewardCoins: 30,
    icon: 'sparkles',
    target: 1,
    getProgress: (ctx) => hasTechniqueRank(ctx, 1),
  },
  {
    id: 'tech_rank_2',
    group: 'technique',
    tier: 2,
    title: 'Blocker Spotter',
    description: 'Solve a puzzle that needs blocking exclusion.',
    rewardCoins: 40,
    icon: 'sparkles',
    target: 1,
    getProgress: (ctx) => hasTechniqueRank(ctx, 2),
  },
  {
    id: 'tech_rank_3',
    group: 'technique',
    tier: 3,
    title: 'Pigeonhole Pro',
    description: 'Solve a puzzle that needs group confinement.',
    rewardCoins: 50,
    icon: 'sparkles',
    target: 1,
    getProgress: (ctx) => hasTechniqueRank(ctx, 3),
  },
  {
    id: 'tech_rank_4',
    group: 'technique',
    tier: 3,
    title: 'What-If Wizard',
    description: 'Solve a puzzle that needs a "what if" test.',
    rewardCoins: 60,
    rewardBooster: 'superHint',
    icon: 'sparkles',
    target: 1,
    getProgress: (ctx) => hasTechniqueRank(ctx, 4),
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

/** Back-fills any newly satisfied achievements without auto-claiming them. */
export function backfillAchievements(
  ctx: AchievementEvalContext,
  alreadyUnlockedIds: readonly string[]
): { nextUnlockedIds: string[]; addedCount: number } {
  const newly = getNewlyUnlockedAchievements(ctx, alreadyUnlockedIds);
  if (newly.length === 0) {
    return { nextUnlockedIds: [...alreadyUnlockedIds], addedCount: 0 };
  }
  return {
    nextUnlockedIds: [...alreadyUnlockedIds, ...newly.map((a) => a.id)],
    addedCount: newly.length,
  };
}

/** Resolves localized title & description, mapping world_N_clear/stars to shared world keys. */
export function getAchievementCopy(
  ach: AchievementDefinition,
  t: TFunction
): { title: string; desc: string } {
  if (ach.worldId !== undefined) {
    const world = t(`worlds.${ach.worldId}.name`);
    const baseKey = ach.id.endsWith('_stars') ? 'world_stars' : 'world_clear';
    return {
      title: t(`achievements.${baseKey}.title`, { world }),
      desc: t(`achievements.${baseKey}.desc`, { world }),
    };
  }
  return {
    title: t(`achievements.${ach.id}.title`),
    desc: t(`achievements.${ach.id}.desc`),
  };
}

/** Formats the victory toast for newly unlocked achievements (singular vs plural). */
export function formatAchievementUnlockToast(
  newlyUnlocked: readonly AchievementDefinition[],
  t: TFunction
): string | null {
  if (newlyUnlocked.length === 0) return null;
  if (newlyUnlocked.length === 1) {
    const { title } = getAchievementCopy(newlyUnlocked[0]!, t);
    return t('achievements.unlockedToast', { title });
  }
  return t('achievements.unlockedManyToast', { count: newlyUnlocked.length });
}
