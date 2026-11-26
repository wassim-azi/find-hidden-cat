import type { AchievementEvalContext } from './achievements';
import type { CatUnlockContext } from './collectibleCats';
import type { LevelProgress } from './gameTypes';
import type { ProgressStats } from './progressStats';
import { getSpecialNodeInfo } from './worlds';

/**
 * Single source of truth for building Cat and Achievement unlock evaluation contexts
 * from store state + ProgressStats.
 */
export function buildUnlockContext(s: {
  levelProgress: Record<number, LevelProgress>;
  unlockedLevelId: number;
  progressStats: ProgressStats;
  unlockedAchievementIds: string[];
  unlockedCatIds: string[];
}): CatUnlockContext & AchievementEvalContext {
  const totalStars = Object.values(s.levelProgress).reduce(
    (sum, p) => sum + p.stars,
    0
  );
  const specialLevelsCompleted = Object.values(s.levelProgress).filter(
    (p) => p.completed && getSpecialNodeInfo(p.levelId).type !== 'normal'
  ).length;

  return {
    levelProgress: s.levelProgress,
    unlockedLevelId: s.unlockedLevelId,
    totalStars,
    noHintSolves: s.progressStats.lifetime.uniqueNoHintPuzzles,
    zeroMistakeSolves: s.progressStats.lifetime.uniqueNoMistakePuzzles,
    specialLevelsCompleted,
    completedDailyCount: s.progressStats.lifetime.dailySolved,
    unlockedCatsCount: s.unlockedCatIds.length,
    unlockedAchievementsCount: s.unlockedAchievementIds.length,
  };
}
