import { describe, expect, it } from 'vitest';
import { BoardGrid } from './gameTypes';
import {
  buildWelcomeBackContent,
  shouldShowWelcomeBack,
  WELCOME_BACK_GAP_MS,
  WelcomeBackStateInput,
} from './welcomeBack';
import { INITIAL_DAILY_LOGIN } from './dailyRewards';
import { getCurrentWeekKey } from './events';
import { getSeasonForDate } from './seasons';
import { toDateKey } from '../services/reminderPlanner';

const NOW = new Date(2026, 10, 26, 12, 0).getTime(); // 2026-11-26

function baseState(): WelcomeBackStateInput {
  const today = toDateKey(new Date(NOW));
  const week = getCurrentWeekKey(new Date(NOW));
  return {
    currentLevelId: 4,
    unlockedLevelId: 5,
    campaignSaveLevelIds: [],
    campaignSaves: {},
    dailyLogin: { ...INITIAL_DAILY_LOGIN },
    completedDailyDates: [],
    dailyMissions: {
      dateKey: today,
      rerollUsed: false,
      missions: [
        { id: 'd1', scope: 'daily', metric: 'levels_completed', target: 5, progress: 3, rewardCoins: 30, claimed: false },
        { id: 'd2', scope: 'daily', metric: 'place_cats', target: 8, progress: 0, rewardCoins: 20, claimed: false },
      ],
    },
    weeklyMissions: {
      weekKey: week,
      missions: [
        { id: 'w1', scope: 'weekly', metric: 'three_star_wins', target: 6, progress: 5, rewardCoins: 80, claimed: false },
        { id: 'w2', scope: 'weekly', metric: 'daily_solved', target: 4, progress: 4, rewardCoins: 90, claimed: true },
      ],
    },
    unlockedAchievementIds: [],
    claimedAchievementIds: [],
  };
}

describe('shouldShowWelcomeBack (#25)', () => {
  const ok = {
    prevStart: NOW - WELCOME_BACK_GAP_MS - 1000,
    now: NOW,
    hasSeenTutorial: true,
    hadAction: false,
    askKeepReminders: false,
    alreadyShown: false,
  };

  it('returns true only when all 6 rules hold', () => {
    expect(shouldShowWelcomeBack(ok)).toBe(true);
    expect(shouldShowWelcomeBack({ ...ok, prevStart: NOW - WELCOME_BACK_GAP_MS })).toBe(true);
  });

  it('returns false if any single rule fails', () => {
    expect(shouldShowWelcomeBack({ ...ok, prevStart: null })).toBe(false);
    expect(shouldShowWelcomeBack({ ...ok, prevStart: NOW - WELCOME_BACK_GAP_MS + 1 })).toBe(false);
    expect(shouldShowWelcomeBack({ ...ok, hasSeenTutorial: false })).toBe(false);
    expect(shouldShowWelcomeBack({ ...ok, hadAction: true })).toBe(false);
    expect(shouldShowWelcomeBack({ ...ok, askKeepReminders: true })).toBe(false);
    expect(shouldShowWelcomeBack({ ...ok, alreadyShown: true })).toBe(false);
  });
});

describe('buildWelcomeBackContent (#25)', () => {
  it('picks newest campaign save when available, else next unlocked level', () => {
    const s = baseState();
    expect(buildWelcomeBackContent(s, null, NOW).continueCard).toEqual({
      kind: 'next',
      levelId: 4,
    });

    const board6: BoardGrid = Array.from({ length: 6 }, () =>
      Array.from({ length: 6 }, () => 'empty')
    );
    board6[0]![0] = 'cat';
    board6[2]![3] = 'cat';
    const board8: BoardGrid = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => 'empty')
    );
    board8[1]![1] = 'cat';

    s.campaignSaveLevelIds = [2, 13];
    s.campaignSaves = {
      2: { levelId: 2, board: board6, elapsedSec: 10, hintsUsed: 0, savedAt: 100 },
      13: { levelId: 13, board: board8, elapsedSec: 20, hintsUsed: 0, savedAt: 500 },
    };
    expect(buildWelcomeBackContent(s, null, NOW).continueCard).toEqual({
      kind: 'saved',
      levelId: 13,
      found: 1,
      total: 8,
    });
  });

  it('reflects daily reward, daily kitty, top 2 active missions, and whatsNew changes', () => {
    const s = baseState();
    s.unlockedAchievementIds = ['a1', 'a2', 'a3'];
    s.claimedAchievementIds = ['a1'];

    const lastVisit = {
      at: NOW - 8 * 86_400_000,
      dateKey: '2026-11-18',
      weekKey: '2026-W46',
      seasonKey: 'summer-2026',
    };

    const content = buildWelcomeBackContent(s, lastVisit, NOW);
    expect(content.rewardReady).toBe(true);
    expect(content.dailyKittyReady).toBe(true);
    expect(content.missions.map((m) => m.id)).toEqual(['w1', 'd1']);
    expect(content.whatsNew).toEqual({
      newWeek: true,
      newSeason: getSeasonForDate(new Date(NOW)).season,
      badgesReadyCount: 2,
    });

    // When daily is already claimed & solved, and lastVisit matches current week & season:
    const today = toDateKey(new Date(NOW));
    const currentWeek = getCurrentWeekKey(new Date(NOW));
    const currentSeasonKey = getSeasonForDate(new Date(NOW)).seasonKey;
    s.dailyLogin = { ...s.dailyLogin, lastClaimDateKey: today };
    s.completedDailyDates = [today];
    s.claimedAchievementIds = ['a1', 'a2', 'a3'];
    const quiet = buildWelcomeBackContent(
      s,
      { at: NOW - 7 * 3600_000, dateKey: today, weekKey: currentWeek, seasonKey: currentSeasonKey },
      NOW
    );
    expect(quiet.rewardReady).toBe(false);
    expect(quiet.dailyKittyReady).toBe(false);
    expect(quiet.whatsNew).toEqual({
      newWeek: false,
      newSeason: null,
      badgesReadyCount: 0,
    });
  });
});
