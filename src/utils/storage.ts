import {
  ActivePuzzleSave,
  Difficulty,
  LevelProgress,
  LogicalTechnique,
  PlayerAchievements,
  PlayerSettings,
} from '../game/gameTypes';
import {
  BoosterInventory,
  INITIAL_BOOSTERS,
  INITIAL_FISH_COINS,
} from '../game/economy';
import { DailyLoginState, INITIAL_DAILY_LOGIN, MAX_STREAK_FREEZES } from '../game/dailyRewards';
import { getWeekKey } from '../game/dateKeys';
import { getLevelPuzzle, getPuzzleAnalysis, TOTAL_LEVELS } from '../game/levels';
import { DailyMissionsState } from '../game/missions';
import {
  backfillProgressStats,
  EMPTY_PROGRESS_STATS,
  MAX_BY_DAY_KEYS,
  MAX_BY_WEEK_KEYS,
  MAX_PROCESSED_EVENT_IDS,
  PeriodStats,
  ProgressStats,
} from '../game/progressStats';
import { dateFromKey } from '../services/reminderPlanner';
import { idbDelete, idbGet, idbPut, STORE_GAME_STATE } from './idbStorage';

const STORAGE_KEY_V2 = 'meowdoku_state_v2';
const LEGACY_STORAGE_KEY_V1 = 'meowdoku_state_v1';
export const CURRENT_SCHEMA_VERSION = 2;

export interface PersistedGameData {
  schemaVersion: number;
  currentLevelId: number;
  unlockedLevelId: number;
  levelProgress: Record<number, LevelProgress>;
  settings: PlayerSettings;
  selectedDifficulty: Difficulty | 'all';
  hasSeenTutorial: boolean;
  /** Legacy single campaign save slot (read-only for migration; always written as null). */
  activePuzzle: ActivePuzzleSave | null;
  /** Per-level in-progress campaign boards keyed by levelId string (bounded to 5 most recent). */
  activeCampaignPuzzles: Record<string, ActivePuzzleSave>;
  /** In-progress Daily Kitty / Golden Cat boards keyed by dailyDateKey */
  activeSpecialPuzzles: Record<string, ActivePuzzleSave & { dailyDateKey: string }>;
  achievements: PlayerAchievements;
  completedDailyDates: string[];

  // V2 Gamification, Economy & Engagement Data
  fishCoins: number;
  boosters: BoosterInventory;
  dailyLogin: DailyLoginState;
  dailyMissions: DailyMissionsState | null;
  unlockedAchievementIds: string[];
  claimedAchievementIds: string[];
  unlockedCatIds: string[];
  activeMascotCatId: string;
  claimedEventIds: string[];
  zeroMistakeSolves: number;
  specialLevelsCompleted: number;
  totalStarsEarnedEver: number;
  progressStats: ProgressStats;
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  musicEnabled: false,
  reducedMotion: false,
  showRegionSymbols: false,
  autoMarkX: true,
  controlMode: 'tap-confirm',
  gameMode: 'classic',
  highlightRowCol: true,
  highlightNeighbors: true,
  highlightRegion: true,
  highlightCompletedRegions: true,
  fadeCompletedRegions: false,
  showCandidates: true,
  highContrast: false,
  largeText: false,
};

export const DEFAULT_ACHIEVEMENTS: PlayerAchievements = {
  totalCatsFound: 0,
  perfectLevels: 0,
  currentStreak: 0,
  bestStreak: 0,
};

export const DEFAULT_PERSISTED_DATA: PersistedGameData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  currentLevelId: 1,
  unlockedLevelId: 1,
  levelProgress: {},
  settings: DEFAULT_SETTINGS,
  selectedDifficulty: 'all',
  hasSeenTutorial: false,
  activePuzzle: null,
  activeCampaignPuzzles: {},
  activeSpecialPuzzles: {},
  achievements: DEFAULT_ACHIEVEMENTS,
  completedDailyDates: [],

  fishCoins: INITIAL_FISH_COINS,
  boosters: { ...INITIAL_BOOSTERS },
  dailyLogin: { ...INITIAL_DAILY_LOGIN },
  dailyMissions: null,
  unlockedAchievementIds: [],
  claimedAchievementIds: [],
  unlockedCatIds: ['mochi'],
  activeMascotCatId: 'mochi',
  claimedEventIds: [],
  zeroMistakeSolves: 0,
  specialLevelsCompleted: 0,
  totalStarsEarnedEver: 0,
  progressStats: EMPTY_PROGRESS_STATS,
};

function isValidBoard(board: unknown): boolean {
  if (!Array.isArray(board) || (board.length !== 6 && board.length !== 8)) {
    return false;
  }
  const size = board.length;
  return board.every(
    (row) =>
      Array.isArray(row) &&
      row.length === size &&
      row.every((cell) => cell === 'empty' || cell === 'cat' || cell === 'x')
  );
}

function sanitizeBoosters(raw: unknown): BoosterInventory {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Partial<BoosterInventory>;
  const safeNum = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback;

  return {
    hint: safeNum(b.hint, INITIAL_BOOSTERS.hint),
    superHint: safeNum(b.superHint, INITIAL_BOOSTERS.superHint),
    revealCat: safeNum(b.revealCat, INITIAL_BOOSTERS.revealCat),
    undoToken: safeNum(b.undoToken, INITIAL_BOOSTERS.undoToken),
    mistakeShield: safeNum(b.mistakeShield, INITIAL_BOOSTERS.mistakeShield),
    revealRegion: safeNum(b.revealRegion, INITIAL_BOOSTERS.revealRegion),
  };
}

function sanitizeDailyLogin(raw: unknown): DailyLoginState {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<DailyLoginState>;
  const lastClaimDateKey =
    typeof d.lastClaimDateKey === 'string' ? d.lastClaimDateKey : null;

  let weekClaims: DailyLoginState['weekClaims'] = {
    ...INITIAL_DAILY_LOGIN.weekClaims,
  };
  const rawWeek = d.weekClaims;
  if (
    rawWeek &&
    typeof rawWeek === 'object' &&
    typeof rawWeek.weekKey === 'string' &&
    typeof rawWeek.count === 'number' &&
    Number.isFinite(rawWeek.count) &&
    rawWeek.count >= 0
  ) {
    weekClaims = {
      weekKey: rawWeek.weekKey,
      count: Math.floor(rawWeek.count),
    };
  } else if (lastClaimDateKey && /^\d{4}-\d{2}-\d{2}$/.test(lastClaimDateKey)) {
    const parsed = dateFromKey(lastClaimDateKey);
    if (!Number.isNaN(parsed.getTime())) {
      const currentWeek = getWeekKey(new Date());
      if (getWeekKey(parsed) === currentWeek) {
        weekClaims = { weekKey: currentWeek, count: 1 };
      }
    }
  }

  const claimedStreakMilestones = Array.isArray(d.claimedStreakMilestones)
    ? Array.from(
        new Set(
          d.claimedStreakMilestones.filter(
            (n): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0
          )
        )
      ).sort((a, b) => a - b)
    : [];

  const adBonusDateKey =
    typeof d.adBonusDateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.adBonusDateKey)
      ? d.adBonusDateKey
      : null;

  const streakCount =
    typeof d.streakCount === 'number' ? Math.max(0, Math.floor(d.streakCount)) : 0;

  const longestStreak =
    typeof d.longestStreak === 'number' && Number.isFinite(d.longestStreak)
      ? Math.max(streakCount, Math.floor(d.longestStreak))
      : streakCount;

  const rawRec = d.recoverable;
  const recoverable =
    rawRec &&
    typeof rawRec === 'object' &&
    typeof rawRec.value === 'number' &&
    Number.isFinite(rawRec.value) &&
    rawRec.value >= 1 &&
    typeof rawRec.brokenOn === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(rawRec.brokenOn)
      ? { value: Math.floor(rawRec.value), brokenOn: rawRec.brokenOn }
      : null;

  const lastRecoveryDateKey =
    typeof d.lastRecoveryDateKey === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(d.lastRecoveryDateKey)
      ? d.lastRecoveryDateKey
      : null;

  return {
    currentDayIndex:
      typeof d.currentDayIndex === 'number'
        ? Math.max(0, Math.min(6, Math.floor(d.currentDayIndex)))
        : 0,
    lastClaimDateKey,
    streakCount,
    longestStreak,
    streakShields:
      typeof d.streakShields === 'number'
        ? Math.max(0, Math.min(MAX_STREAK_FREEZES, Math.floor(d.streakShields)))
        : INITIAL_DAILY_LOGIN.streakShields,
    totalClaims:
      typeof d.totalClaims === 'number' ? Math.max(0, Math.floor(d.totalClaims)) : 0,
    weekClaims,
    claimedStreakMilestones,
    adBonusDateKey,
    recoverable,
    lastRecoveryDateKey,
  };
}

const MAX_CAMPAIGN_SAVES = 5;

function sanitizeActivePuzzle(raw: unknown, fallbackMode: PlayerSettings['gameMode']): ActivePuzzleSave | null {
  const validGameModes = new Set(['classic', 'practice']);
  const ap = raw as Partial<ActivePuzzleSave> | null | undefined;
  if (!ap || typeof ap !== 'object' || typeof ap.levelId !== 'number' || !isValidBoard(ap.board)) {
    return null;
  }
  const manualXKeys = Array.isArray(ap.manualXKeys)
    ? ap.manualXKeys.filter((k): k is string => typeof k === 'string')
    : undefined;
  const candidateMarks: Record<string, 'possible' | 'priority'> = {};
  if (ap.candidateMarks && typeof ap.candidateMarks === 'object') {
    for (const [ck, cv] of Object.entries(ap.candidateMarks)) {
      if (cv === 'possible' || cv === 'priority') candidateMarks[ck] = cv;
    }
  }
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback;
  const savedAt =
    typeof ap.savedAt === 'number' && Number.isFinite(ap.savedAt) ? ap.savedAt : undefined;
  return {
    levelId: ap.levelId,
    board: ap.board as ActivePuzzleSave['board'],
    manualXKeys,
    candidateMarks,
    elapsedSec: num(ap.elapsedSec, 0),
    hintsUsed: num(ap.hintsUsed, 0),
    mistakesCount: num(ap.mistakesCount, 0),
    hearts: Math.min(3, num(ap.hearts, 3)),
    gameMode:
      typeof ap.gameMode === 'string' && validGameModes.has(ap.gameMode)
        ? ap.gameMode
        : fallbackMode,
    ...(savedAt !== undefined ? { savedAt } : {}),
  };
}

function sanitizeActiveCampaignPuzzles(
  raw: unknown,
  legacyActivePuzzle: ActivePuzzleSave | null,
  fallbackMode: PlayerSettings['gameMode']
): Record<string, ActivePuzzleSave> {
  const entries: Array<[string, ActivePuzzleSave]> = [];
  if (raw && typeof raw === 'object') {
    for (const [key, val] of Object.entries(raw)) {
      if (!/^\d{1,3}$/.test(key)) continue;
      const clean = sanitizeActivePuzzle(val, fallbackMode);
      if (!clean || Number(key) !== clean.levelId) continue;
      entries.push([key, clean]);
    }
  }

  entries.sort((a, b) => (b[1].savedAt ?? 0) - (a[1].savedAt ?? 0));
  const result: Record<string, ActivePuzzleSave> = {};
  for (const [key, save] of entries.slice(0, MAX_CAMPAIGN_SAVES)) {
    result[key] = save;
  }

  // Migrate legacy single-slot activePuzzle when activeCampaignPuzzles is missing/empty
  if (
    Object.keys(result).length === 0 &&
    legacyActivePuzzle &&
    Number.isInteger(legacyActivePuzzle.levelId) &&
    legacyActivePuzzle.levelId >= 1
  ) {
    result[String(legacyActivePuzzle.levelId)] = {
      ...legacyActivePuzzle,
      savedAt: legacyActivePuzzle.savedAt ?? 0,
    };
  }

  return result;
}

const VALID_TECHNIQUES = new Set<LogicalTechnique>([
  'naked_region_single',
  'naked_row_single',
  'naked_col_single',
  'region_line_intersection',
  'line_region_intersection',
  'region_adjacency_exclusion',
  'line_adjacency_exclusion',
  'naked_pair_regions',
  'line_group_confinement',
  'contradiction_chain',
]);

function sanitizePeriodStats(raw: unknown): PeriodStats | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<PeriodStats>;
  const count = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  const worldsPlayed = Array.isArray(p.worldsPlayed)
    ? Array.from(
        new Set(
          p.worldsPlayed
            .filter((w): w is number => typeof w === 'number' && Number.isInteger(w) && w >= 1)
        )
      ).sort((a, b) => a - b)
    : [];
  return {
    puzzlesCompleted: count(p.puzzlesCompleted),
    classicCompleted: count(p.classicCompleted),
    threeStarWins: count(p.threeStarWins),
    noHintWins: count(p.noHintWins),
    noMistakeWins: count(p.noMistakeWins),
    personalBests: count(p.personalBests),
    dailySolved: count(p.dailySolved),
    goldenSolved: count(p.goldenSolved),
    worldsPlayed,
    catsFound: count(p.catsFound),
    rewardsClaimed: count(p.rewardsClaimed),
    sessions: count(p.sessions),
  };
}

function sanitizeProgressStats(raw: unknown): ProgressStats {
  if (!raw || typeof raw !== 'object') return EMPTY_PROGRESS_STATS;
  const r = raw as Partial<ProgressStats>;
  if (r.version !== 1 || !r.lifetime || typeof r.lifetime !== 'object') {
    return EMPTY_PROGRESS_STATS;
  }
  const baseLifetime = sanitizePeriodStats(r.lifetime);
  if (!baseLifetime) return EMPTY_PROGRESS_STATS;

  const lt = r.lifetime as Partial<ProgressStats['lifetime']>;
  const count = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

  const techniquesSeen = Array.isArray(lt.techniquesSeen)
    ? Array.from(
        new Set(
          lt.techniquesSeen.filter(
            (t): t is LogicalTechnique =>
              typeof t === 'string' && VALID_TECHNIQUES.has(t as LogicalTechnique)
          )
        )
      ).sort()
    : [];

  const sanitizeMap = (
    input: unknown,
    keyPattern: RegExp,
    maxKeys: number
  ): Record<string, PeriodStats> => {
    const out: Record<string, PeriodStats> = {};
    if (!input || typeof input !== 'object') return out;
    const validEntries: Array<[string, PeriodStats]> = [];
    for (const [k, v] of Object.entries(input)) {
      if (!keyPattern.test(k)) continue;
      const clean = sanitizePeriodStats(v);
      if (clean) validEntries.push([k, clean]);
    }
    validEntries.sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));
    for (const [k, v] of validEntries.slice(0, maxKeys)) {
      out[k] = v;
    }
    return out;
  };

  const processedEventIds = Array.isArray(r.processedEventIds)
    ? r.processedEventIds
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
        .slice(-MAX_PROCESSED_EVENT_IDS)
    : [];

  return {
    version: 1,
    lifetime: {
      ...baseLifetime,
      campaignFirstClears: count(lt.campaignFirstClears),
      uniqueNoHintPuzzles: count(lt.uniqueNoHintPuzzles),
      uniqueNoMistakePuzzles: count(lt.uniqueNoMistakePuzzles),
      starsGained: count(lt.starsGained),
      playTimeSec: count(lt.playTimeSec),
      techniquesSeen,
    },
    byDay: sanitizeMap(r.byDay, /^\d{4}-\d{2}-\d{2}$/, MAX_BY_DAY_KEYS),
    byWeek: sanitizeMap(r.byWeek, /^\d{4}-W\d{2}$/, MAX_BY_WEEK_KEYS),
    processedEventIds,
  };
}

/**
 * Safely loads and migrates persisted state from LocalStorage.
 * Automatically migrates v1 saves into v2 without ever losing existing progress!
 */
export function loadPersistedState(): PersistedGameData {
  if (typeof window === 'undefined') return DEFAULT_PERSISTED_DATA;

  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    const rawV1 = rawV2 ? null : window.localStorage.getItem(LEGACY_STORAGE_KEY_V1);
    const raw = rawV2 ?? rawV1;

    if (!raw) {
      const prefersReduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return {
        ...DEFAULT_PERSISTED_DATA,
        settings: {
          ...DEFAULT_SETTINGS,
          reducedMotion: prefersReduced,
        },
      };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedGameData>;
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_PERSISTED_DATA;
    }

    const currentLevelId =
      typeof parsed.currentLevelId === 'number' && parsed.currentLevelId >= 1
        ? Math.floor(parsed.currentLevelId)
        : 1;

    const unlockedLevelId =
      typeof parsed.unlockedLevelId === 'number' && parsed.unlockedLevelId >= 1
        ? Math.floor(parsed.unlockedLevelId)
        : 1;

    const validControlModes = new Set(['tap-confirm', 'double-tap', 'long-press']);
    const validGameModes = new Set(['classic', 'practice']);

    const settings: PlayerSettings = {
      soundEnabled:
        typeof parsed.settings?.soundEnabled === 'boolean'
          ? parsed.settings.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
      hapticsEnabled:
        typeof parsed.settings?.hapticsEnabled === 'boolean'
          ? parsed.settings.hapticsEnabled
          : DEFAULT_SETTINGS.hapticsEnabled,
      musicEnabled:
        typeof parsed.settings?.musicEnabled === 'boolean'
          ? parsed.settings.musicEnabled
          : DEFAULT_SETTINGS.musicEnabled,
      reducedMotion:
        typeof parsed.settings?.reducedMotion === 'boolean'
          ? parsed.settings.reducedMotion
          : DEFAULT_SETTINGS.reducedMotion,
      showRegionSymbols:
        typeof parsed.settings?.showRegionSymbols === 'boolean'
          ? parsed.settings.showRegionSymbols
          : DEFAULT_SETTINGS.showRegionSymbols,
      autoMarkX:
        typeof parsed.settings?.autoMarkX === 'boolean'
          ? parsed.settings.autoMarkX
          : DEFAULT_SETTINGS.autoMarkX,
      controlMode:
        typeof parsed.settings?.controlMode === 'string' &&
        validControlModes.has(parsed.settings.controlMode)
          ? parsed.settings.controlMode
          : DEFAULT_SETTINGS.controlMode,
      gameMode:
        typeof parsed.settings?.gameMode === 'string' &&
        validGameModes.has(parsed.settings.gameMode)
          ? parsed.settings.gameMode
          : DEFAULT_SETTINGS.gameMode,
      highlightRowCol:
        typeof parsed.settings?.highlightRowCol === 'boolean'
          ? parsed.settings.highlightRowCol
          : DEFAULT_SETTINGS.highlightRowCol,
      highlightNeighbors:
        typeof parsed.settings?.highlightNeighbors === 'boolean'
          ? parsed.settings.highlightNeighbors
          : DEFAULT_SETTINGS.highlightNeighbors,
      highlightRegion:
        typeof parsed.settings?.highlightRegion === 'boolean'
          ? parsed.settings.highlightRegion
          : DEFAULT_SETTINGS.highlightRegion,
      highlightCompletedRegions:
        typeof parsed.settings?.highlightCompletedRegions === 'boolean'
          ? parsed.settings.highlightCompletedRegions
          : DEFAULT_SETTINGS.highlightCompletedRegions,
      fadeCompletedRegions:
        typeof parsed.settings?.fadeCompletedRegions === 'boolean'
          ? parsed.settings.fadeCompletedRegions
          : DEFAULT_SETTINGS.fadeCompletedRegions,
      showCandidates:
        typeof parsed.settings?.showCandidates === 'boolean'
          ? parsed.settings.showCandidates
          : DEFAULT_SETTINGS.showCandidates,
      highContrast:
        typeof parsed.settings?.highContrast === 'boolean'
          ? parsed.settings.highContrast
          : DEFAULT_SETTINGS.highContrast,
      largeText:
        typeof parsed.settings?.largeText === 'boolean'
          ? parsed.settings.largeText
          : DEFAULT_SETTINGS.largeText,
    };

    const validDifficulties = new Set(['all', 'easy', 'medium', 'hard']);
    const selectedDifficulty =
      typeof parsed.selectedDifficulty === 'string' &&
      validDifficulties.has(parsed.selectedDifficulty)
        ? (parsed.selectedDifficulty as Difficulty | 'all')
        : 'all';

    const levelProgress: Record<number, LevelProgress> = {};
    if (parsed.levelProgress && typeof parsed.levelProgress === 'object') {
      for (const [k, v] of Object.entries(parsed.levelProgress)) {
        const id = Number(k);
        if (!Number.isFinite(id) || !v || typeof v !== 'object') continue;
        const completed = Boolean(v.completed);
        const rawLast = (v as Partial<LevelProgress>).lastResult;
        const lastResult: LevelProgress['lastResult'] =
          rawLast &&
          typeof rawLast === 'object' &&
          typeof rawLast.stars === 'number' &&
          Number.isFinite(rawLast.stars) &&
          typeof rawLast.timeSec === 'number' &&
          Number.isFinite(rawLast.timeSec) &&
          typeof rawLast.hintsUsed === 'number' &&
          Number.isFinite(rawLast.hintsUsed) &&
          typeof rawLast.mistakes === 'number' &&
          Number.isFinite(rawLast.mistakes) &&
          (rawLast.mode === 'classic' || rawLast.mode === 'practice') &&
          typeof rawLast.at === 'number' &&
          Number.isFinite(rawLast.at)
            ? {
                stars: Math.max(0, Math.min(3, Math.floor(rawLast.stars))),
                timeSec: Math.max(0, Math.floor(rawLast.timeSec)),
                hintsUsed: Math.max(0, Math.floor(rawLast.hintsUsed)),
                mistakes: Math.max(0, Math.floor(rawLast.mistakes)),
                mode: rawLast.mode,
                at: rawLast.at,
              }
            : null;
        const rawAttempts = (v as Partial<LevelProgress>).attempts;
        const attempts =
          typeof rawAttempts === 'number' && Number.isFinite(rawAttempts) && rawAttempts >= 0
            ? Math.floor(rawAttempts)
            : completed
              ? 1
              : 0;
        levelProgress[id] = {
          levelId: id,
          completed,
          bestTimeSec: typeof v.bestTimeSec === 'number' ? v.bestTimeSec : null,
          stars: typeof v.stars === 'number' ? Math.max(0, Math.min(3, v.stars)) : 0,
          bestHintsUsed: typeof v.bestHintsUsed === 'number' ? v.bestHintsUsed : null,
          bestMistakes:
            typeof v.bestMistakes === 'number' ? Math.max(0, Math.floor(v.bestMistakes)) : null,
          attempts,
          lastResult,
        };
      }
    }

    const legacyActivePuzzle = sanitizeActivePuzzle(parsed.activePuzzle, settings.gameMode);
    const activeCampaignPuzzles = sanitizeActiveCampaignPuzzles(
      parsed.activeCampaignPuzzles,
      legacyActivePuzzle,
      settings.gameMode
    );
    const activeSpecialPuzzles: PersistedGameData['activeSpecialPuzzles'] = {};
    if (parsed.activeSpecialPuzzles && typeof parsed.activeSpecialPuzzles === 'object') {
      for (const [key, raw] of Object.entries(parsed.activeSpecialPuzzles).slice(0, 4)) {
        const clean = sanitizeActivePuzzle(raw, settings.gameMode);
        if (clean && /^(golden-)?\d{4}-(W)?\d{2}(-\d{2})?$/.test(key)) {
          activeSpecialPuzzles[key] = { ...clean, dailyDateKey: key };
        }
      }
    }

    const achievements: PlayerAchievements = {
      totalCatsFound:
        typeof parsed.achievements?.totalCatsFound === 'number'
          ? Math.max(0, parsed.achievements.totalCatsFound)
          : 0,
      perfectLevels:
        typeof parsed.achievements?.perfectLevels === 'number'
          ? Math.max(0, parsed.achievements.perfectLevels)
          : 0,
      currentStreak:
        typeof parsed.achievements?.currentStreak === 'number'
          ? Math.max(0, parsed.achievements.currentStreak)
          : 0,
      bestStreak:
        typeof parsed.achievements?.bestStreak === 'number'
          ? Math.max(0, parsed.achievements.bestStreak)
          : 0,
    };

    const completedDailyDates = Array.isArray(parsed.completedDailyDates)
      ? parsed.completedDailyDates.filter((d): d is string => typeof d === 'string').slice(-60)
      : [];

    const stringArray = (v: unknown, fallback: string[]): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : fallback;

    const unlockedCatIds = Array.from(
      new Set(['mochi', ...stringArray(parsed.unlockedCatIds, ['mochi'])])
    );

    const activeMascotCatId =
      typeof parsed.activeMascotCatId === 'string' &&
      unlockedCatIds.includes(parsed.activeMascotCatId)
        ? parsed.activeMascotCatId
        : 'mochi';

    const zeroMistakeSolves =
      typeof parsed.zeroMistakeSolves === 'number'
        ? Math.max(0, Math.floor(parsed.zeroMistakeSolves))
        : 0;

    const progressStats: ProgressStats =
      parsed.progressStats !== undefined
        ? sanitizeProgressStats(parsed.progressStats)
        : backfillProgressStats({
            levelProgress,
            completedDailyDates,
            achievements,
            zeroMistakeSolves,
            getTechniquesForLevel: (levelId) =>
              levelId >= 1 && levelId <= TOTAL_LEVELS
                ? getPuzzleAnalysis(getLevelPuzzle(levelId)).techniquesUsed
                : [],
          });

    const migrated: PersistedGameData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      currentLevelId,
      unlockedLevelId,
      levelProgress,
      settings,
      selectedDifficulty,
      hasSeenTutorial: Boolean(parsed.hasSeenTutorial),
      activePuzzle: null,
      activeCampaignPuzzles,
      activeSpecialPuzzles,
      achievements,
      completedDailyDates,
      fishCoins:
        typeof parsed.fishCoins === 'number' && Number.isFinite(parsed.fishCoins)
          ? Math.max(0, Math.floor(parsed.fishCoins))
          : INITIAL_FISH_COINS,
      boosters: sanitizeBoosters(parsed.boosters),
      dailyLogin: sanitizeDailyLogin(parsed.dailyLogin),
      dailyMissions:
        parsed.dailyMissions &&
        typeof parsed.dailyMissions === 'object' &&
        typeof parsed.dailyMissions.dateKey === 'string' &&
        Array.isArray(parsed.dailyMissions.missions)
          ? parsed.dailyMissions
          : null,
      unlockedAchievementIds: stringArray(parsed.unlockedAchievementIds, []),
      claimedAchievementIds: stringArray(parsed.claimedAchievementIds, []),
      unlockedCatIds,
      activeMascotCatId,
      claimedEventIds: stringArray(parsed.claimedEventIds, []),
      zeroMistakeSolves,
      specialLevelsCompleted:
        typeof parsed.specialLevelsCompleted === 'number'
          ? Math.max(0, Math.floor(parsed.specialLevelsCompleted))
          : 0,
      totalStarsEarnedEver:
        typeof parsed.totalStarsEarnedEver === 'number'
          ? Math.max(0, Math.floor(parsed.totalStarsEarnedEver))
          : Object.values(levelProgress).reduce((sum, p) => sum + p.stars, 0),
      progressStats,
    };

    // If migrated from v1, immediately write v2 copy so future loads are instant
    if (!rawV2 && rawV1) {
      savePersistedState(migrated);
    }

    return migrated;
  } catch {
    return DEFAULT_PERSISTED_DATA;
  }
}

export function savePersistedState(data: PersistedGameData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(data));
  } catch {
    // Ignore storage quota or private mode errors
  }
  // Mirror asynchronously to IndexedDB for durable offline storage
  void idbPut(STORE_GAME_STATE, 'current', data);
}

export function clearPersistedState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_V2);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY_V1);
  } catch {
    // Ignore
  }
  void idbDelete(STORE_GAME_STATE, 'current');
}

function hasUsableLocalSave(): boolean {
  const raw =
    window.localStorage.getItem(STORAGE_KEY_V2) ??
    window.localStorage.getItem(LEGACY_STORAGE_KEY_V1);
  if (raw === null) return false;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Boolean(parsed) && typeof parsed === 'object';
  } catch {
    // Keep the damaged copy for manual recovery before it can be overwritten
    try {
      window.localStorage.setItem(`${STORAGE_KEY_V2}_corrupt_backup`, raw);
    } catch {
      // Ignore quota errors
    }
    return false;
  }
}

/**
 * If LocalStorage was evicted by browser storage pressure (or its save is corrupted) while the
 * IndexedDB mirror survived, restores the player's progress from IndexedDB.
 *
 * MUST complete before the game store module is evaluated (see main.tsx): the store reads
 * LocalStorage synchronously at import time, so a late recovery would be overwritten by the
 * first save of the default state.
 */
export async function recoverPersistedStateFromIDB(): Promise<PersistedGameData | null> {
  if (typeof window === 'undefined') return null;
  try {
    if (hasUsableLocalSave()) return null;

    const fromIdb = await idbGet<PersistedGameData>(STORE_GAME_STATE, 'current');
    if (!fromIdb || typeof fromIdb !== 'object') return null;
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(fromIdb));
    return loadPersistedState();
  } catch {
    return null;
  }
}
