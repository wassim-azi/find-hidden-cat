import { ActivePuzzleSave, LastVisitSnapshot } from './gameTypes';
import { canClaimDailyReward, DailyLoginState } from './dailyRewards';
import { getCurrentWeekKey } from './events';
import { TOTAL_LEVELS } from './levels';
import { DailyMissionsState, Mission, WeeklyMissionsState } from './missions';
import { getSeasonForDate, Season } from './seasons';
import { getPlacedCats } from './validation';
import { toDateKey } from '../services/reminderPlanner';

export const WELCOME_BACK_GAP_MS = 6 * 60 * 60 * 1000;

export interface ShouldShowWelcomeBackInput {
  prevStart: number | null;
  now: number;
  hasSeenTutorial: boolean;
  hadAction: boolean;
  askKeepReminders: boolean;
  alreadyShown: boolean;
}

export function shouldShowWelcomeBack(input: ShouldShowWelcomeBackInput): boolean {
  if (input.prevStart === null) return false;
  if (input.now - input.prevStart < WELCOME_BACK_GAP_MS) return false;
  if (!input.hasSeenTutorial) return false;
  if (input.hadAction) return false;
  if (input.askKeepReminders) return false;
  if (input.alreadyShown) return false;
  return true;
}

export interface WelcomeBackStateInput {
  currentLevelId: number;
  unlockedLevelId: number;
  campaignSaveLevelIds: readonly number[];
  campaignSaves: Record<number, ActivePuzzleSave>;
  dailyLogin: DailyLoginState;
  completedDailyDates: readonly string[];
  dailyMissions: DailyMissionsState;
  weeklyMissions: WeeklyMissionsState;
  unlockedAchievementIds: readonly string[];
  claimedAchievementIds: readonly string[];
}

export type WelcomeBackContinueCard =
  | { kind: 'saved'; levelId: number; found: number; total: number }
  | { kind: 'next'; levelId: number };

export interface WelcomeBackContent {
  continueCard: WelcomeBackContinueCard;
  rewardReady: boolean;
  dailyKittyReady: boolean;
  missions: Mission[];
  whatsNew: {
    newWeek: boolean;
    newSeason: Season | null;
    badgesReadyCount: number;
  };
}

export function buildWelcomeBackContent(
  state: WelcomeBackStateInput,
  lastVisit: LastVisitSnapshot | null,
  now: number
): WelcomeBackContent {
  const nowDate = new Date(now);
  const todayKey = toDateKey(nowDate);
  const currentWeekKey = getCurrentWeekKey(nowDate);
  const currentSeason = getSeasonForDate(nowDate);

  let newestSave: ActivePuzzleSave | null = null;
  if (state.campaignSaveLevelIds.length > 0) {
    for (const id of state.campaignSaveLevelIds) {
      const save = state.campaignSaves[id];
      if (!save) continue;
      if (!newestSave || (save.savedAt ?? 0) > (newestSave.savedAt ?? 0)) {
        newestSave = save;
      }
    }
  }

  const continueCard: WelcomeBackContinueCard = newestSave
    ? {
        kind: 'saved',
        levelId: newestSave.levelId,
        found: getPlacedCats(newestSave.board).length,
        total: newestSave.board.length,
      }
    : {
        kind: 'next',
        levelId: Math.max(
          1,
          Math.min(state.currentLevelId, state.unlockedLevelId, TOTAL_LEVELS)
        ),
      };

  const rewardReady = canClaimDailyReward(state.dailyLogin, todayKey);
  const dailyKittyReady = !state.completedDailyDates.includes(todayKey);

  const candidateMissions = [
    ...state.dailyMissions.missions,
    ...state.weeklyMissions.missions,
  ]
    .filter((m) => !m.claimed && m.progress > 0 && m.target > 0)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)
    .slice(0, 2);

  const newWeek = lastVisit !== null && lastVisit.weekKey !== currentWeekKey;
  const newSeason =
    lastVisit !== null &&
    currentSeason.seasonKey !== null &&
    lastVisit.seasonKey !== currentSeason.seasonKey
      ? currentSeason.season
      : null;

  const badgesReadyCount = state.unlockedAchievementIds.filter(
    (id) => !state.claimedAchievementIds.includes(id)
  ).length;

  return {
    continueCard,
    rewardReady,
    dailyKittyReady,
    missions: candidateMissions,
    whatsNew: {
      newWeek,
      newSeason,
      badgesReadyCount,
    },
  };
}
