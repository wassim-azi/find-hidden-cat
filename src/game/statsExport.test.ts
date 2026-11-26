import { describe, expect, it } from 'vitest';
import { buildStatsExport } from './statsExport';
import { INITIAL_DAILY_LOGIN } from './dailyRewards';
import { createEmptyLifetimeStats, createEmptyPeriodStats, ProgressStats } from './progressStats';
import { EMPTY_SKILL_PROFILE } from './skillProfile';
import { formatDuration } from '../utils/format';

describe('statsExport & formatDuration (#30)', () => {
  it('formats durations as h:mm', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(59)).toBe('0:00');
    expect(formatDuration(60)).toBe('0:01');
    expect(formatDuration(3725)).toBe('1:02');
  });

  it('produces exact top-level keys, matching numbers, and zero personal data', () => {
    const now = new Date(2026, 10, 26, 14, 35, 12).getTime(); // 2026-11-26 local
    const dayStats = { ...createEmptyPeriodStats(), puzzlesCompleted: 3, classicCompleted: 2 };
    const weekStats = { ...createEmptyPeriodStats(), puzzlesCompleted: 5 };
    const progressStats: ProgressStats = {
      version: 1,
      lifetime: {
        ...createEmptyLifetimeStats(),
        puzzlesCompleted: 7,
        campaignFirstClears: 4,
        dailySolved: 2,
        goldenSolved: 1,
        threeStarWins: 5,
        uniqueNoHintPuzzles: 4,
        uniqueNoMistakePuzzles: 6,
        playTimeSec: 3725,
        techniquesSeen: ['naked_region_single', 'region_line_intersection'],
      },
      byDay: { '2026-11-26': dayStats, '2026-11-20': { ...createEmptyPeriodStats(), puzzlesCompleted: 1 } },
      byWeek: { '2026-W48': weekStats },
      processedEventIds: ['evt-1'],
    };

    const exported = buildStatsExport({
      progressStats,
      skillProfile: {
        ...EMPTY_SKILL_PROFILE,
        classic: {
          easy: { samples: 4, timeRatio: 0.85, hints: 0.1, mistakes: 0.2, successRate: 1 },
        },
        recent: [{ at: now, success: 1 }],
      },
      dailyLogin: { ...INITIAL_DAILY_LOGIN, streakCount: 3, longestStreak: 9 },
      unlockedCatIds: ['mochi', 'biscuit', 'luna'],
      levelProgress: {
        2: {
          levelId: 2,
          completed: true,
          bestTimeSec: 84,
          stars: 3,
          bestHintsUsed: 0,
          bestMistakes: 0,
          attempts: 2,
          lastResult: null,
        },
        1: {
          levelId: 1,
          completed: true,
          bestTimeSec: 42,
          stars: 3,
          bestHintsUsed: 0,
          bestMistakes: 0,
          attempts: 1,
          lastResult: null,
        },
      },
      now,
    });

    expect(Object.keys(exported).sort()).toEqual([
      'app',
      'catsCollected',
      'exportedOn',
      'formatVersion',
      'last14Days',
      'levels',
      'lifetime',
      'longestStreak',
      'skill',
      'weeks',
    ]);
    expect(exported.app).toBe('meowdoku');
    expect(exported.formatVersion).toBe(1);
    expect(exported.exportedOn).toBe('2026-11-26');
    expect(exported.lifetime.puzzlesCompleted).toBe(7);
    expect(exported.last14Days).toHaveLength(14);
    expect(exported.last14Days[13]).toEqual({ date: '2026-11-26', puzzlesCompleted: 3 });
    expect(exported.last14Days[7]).toEqual({ date: '2026-11-20', puzzlesCompleted: 1 });
    expect(exported.weeks['2026-W48']?.puzzlesCompleted).toBe(5);
    expect(exported.levels).toEqual([
      { id: 1, stars: 3, bestTimeSec: 42, attempts: 1 },
      { id: 2, stars: 3, bestTimeSec: 84, attempts: 2 },
    ]);
    expect(exported.skill.level).toBe('cruising');
    expect(exported.skill.byTier.easy?.samples).toBe(4);
    expect(exported.longestStreak).toBe(9);
    expect(exported.catsCollected).toBe(3);

    const serialized = JSON.stringify(exported);
    expect(serialized).not.toMatch(/settings|lang|pin|sessionStarts/);
    expect(serialized).not.toMatch(/T\d\d:/);
  });
});
