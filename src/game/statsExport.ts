import { DailyLoginState } from './dailyRewards';
import { DifficultyTier, LevelProgress } from './gameTypes';
import { LifetimeStats, PeriodStats, ProgressStats } from './progressStats';
import { classify, DIFFICULTY_TIERS, SkillLevel, SkillProfile, TierStats } from './skillProfile';
import { addDays, toDateKey } from '../services/reminderPlanner';

export interface StatsExportData {
  app: 'meowdoku';
  formatVersion: 1;
  exportedOn: string;
  lifetime: LifetimeStats;
  last14Days: Array<{ date: string; puzzlesCompleted: number }>;
  weeks: Record<string, PeriodStats>;
  levels: Array<{ id: number; stars: number; bestTimeSec: number | null; attempts: number }>;
  skill: { level: SkillLevel; byTier: Partial<Record<DifficultyTier, TierStats>> };
  longestStreak: number;
  catsCollected: number;
}

export function buildLast14Days(
  byDay: Record<string, PeriodStats>,
  now: number
): Array<{ date: string; puzzlesCompleted: number }> {
  const todayKey = toDateKey(new Date(now));
  const out: Array<{ date: string; puzzlesCompleted: number }> = [];
  for (let offset = -13; offset <= 0; offset++) {
    const date = addDays(todayKey, offset);
    out.push({
      date,
      puzzlesCompleted: byDay[date]?.puzzlesCompleted ?? 0,
    });
  }
  return out;
}

function clonePeriodStats(p: PeriodStats): PeriodStats {
  return {
    puzzlesCompleted: p.puzzlesCompleted,
    classicCompleted: p.classicCompleted,
    threeStarWins: p.threeStarWins,
    noHintWins: p.noHintWins,
    noMistakeWins: p.noMistakeWins,
    personalBests: p.personalBests,
    dailySolved: p.dailySolved,
    goldenSolved: p.goldenSolved,
    worldsPlayed: [...p.worldsPlayed],
    catsFound: p.catsFound,
    rewardsClaimed: p.rewardsClaimed,
    sessions: p.sessions,
  };
}

export function buildStatsExport(input: {
  progressStats: ProgressStats;
  skillProfile: SkillProfile;
  dailyLogin: DailyLoginState;
  unlockedCatIds: string[];
  levelProgress: Record<number, LevelProgress>;
  now: number;
}): StatsExportData {
  const { progressStats, skillProfile, dailyLogin, unlockedCatIds, levelProgress, now } = input;
  const lt = progressStats.lifetime;

  const weeks: Record<string, PeriodStats> = {};
  for (const [weekKey, stats] of Object.entries(progressStats.byWeek)) {
    weeks[weekKey] = clonePeriodStats(stats);
  }

  const levels = Object.values(levelProgress)
    .map((lp) => ({
      id: lp.levelId,
      stars: lp.stars,
      bestTimeSec: lp.bestTimeSec,
      attempts: lp.attempts,
    }))
    .sort((a, b) => a.id - b.id);

  const byTier: Partial<Record<DifficultyTier, TierStats>> = {};
  for (const tier of DIFFICULTY_TIERS) {
    const stats = skillProfile.classic[tier];
    if (stats) {
      byTier[tier] = { ...stats };
    }
  }

  return {
    app: 'meowdoku',
    formatVersion: 1,
    exportedOn: toDateKey(new Date(now)),
    lifetime: {
      ...clonePeriodStats(lt),
      campaignFirstClears: lt.campaignFirstClears,
      uniqueNoHintPuzzles: lt.uniqueNoHintPuzzles,
      uniqueNoMistakePuzzles: lt.uniqueNoMistakePuzzles,
      starsGained: lt.starsGained,
      playTimeSec: lt.playTimeSec,
      techniquesSeen: [...lt.techniquesSeen],
    },
    last14Days: buildLast14Days(progressStats.byDay, now),
    weeks,
    levels,
    skill: {
      level: classify(skillProfile),
      byTier,
    },
    longestStreak: Math.max(dailyLogin.longestStreak, dailyLogin.streakCount),
    catsCollected: unlockedCatIds.length,
  };
}
