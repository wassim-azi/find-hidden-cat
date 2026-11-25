import {
  ActivePuzzleSave,
  Difficulty,
  LevelProgress,
  PlayerAchievements,
  PlayerSettings,
} from '../game/gameTypes';
import {
  BoosterInventory,
  INITIAL_BOOSTERS,
  INITIAL_FISH_COINS,
} from '../game/economy';
import { DailyLoginState, INITIAL_DAILY_LOGIN } from '../game/dailyRewards';
import { DailyMissionsState } from '../game/missions';

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
  activePuzzle: ActivePuzzleSave | null;
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
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  musicEnabled: false,
  reducedMotion: false,
  showRegionSymbols: false,
  autoMarkX: true,
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
  return {
    currentDayIndex:
      typeof d.currentDayIndex === 'number'
        ? Math.max(0, Math.min(6, Math.floor(d.currentDayIndex)))
        : 0,
    lastClaimDateKey:
      typeof d.lastClaimDateKey === 'string' ? d.lastClaimDateKey : null,
    streakCount:
      typeof d.streakCount === 'number' ? Math.max(0, Math.floor(d.streakCount)) : 0,
    streakShields:
      typeof d.streakShields === 'number'
        ? Math.max(0, Math.floor(d.streakShields))
        : INITIAL_DAILY_LOGIN.streakShields,
    totalClaims:
      typeof d.totalClaims === 'number' ? Math.max(0, Math.floor(d.totalClaims)) : 0,
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
        levelProgress[id] = {
          levelId: id,
          completed: Boolean(v.completed),
          bestTimeSec: typeof v.bestTimeSec === 'number' ? v.bestTimeSec : null,
          stars: typeof v.stars === 'number' ? Math.max(0, Math.min(3, v.stars)) : 0,
          bestHintsUsed: typeof v.bestHintsUsed === 'number' ? v.bestHintsUsed : null,
        };
      }
    }

    let activePuzzle: ActivePuzzleSave | null = null;
    if (
      parsed.activePuzzle &&
      typeof parsed.activePuzzle === 'object' &&
      typeof parsed.activePuzzle.levelId === 'number' &&
      isValidBoard(parsed.activePuzzle.board)
    ) {
      activePuzzle = {
        levelId: parsed.activePuzzle.levelId,
        board: parsed.activePuzzle.board,
        elapsedSec:
          typeof parsed.activePuzzle.elapsedSec === 'number'
            ? Math.max(0, parsed.activePuzzle.elapsedSec)
            : 0,
        hintsUsed:
          typeof parsed.activePuzzle.hintsUsed === 'number'
            ? Math.max(0, parsed.activePuzzle.hintsUsed)
            : 0,
      };
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

    const migrated: PersistedGameData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      currentLevelId,
      unlockedLevelId,
      levelProgress,
      settings,
      selectedDifficulty,
      hasSeenTutorial: Boolean(parsed.hasSeenTutorial),
      activePuzzle,
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
      zeroMistakeSolves:
        typeof parsed.zeroMistakeSolves === 'number'
          ? Math.max(0, Math.floor(parsed.zeroMistakeSolves))
          : 0,
      specialLevelsCompleted:
        typeof parsed.specialLevelsCompleted === 'number'
          ? Math.max(0, Math.floor(parsed.specialLevelsCompleted))
          : 0,
      totalStarsEarnedEver:
        typeof parsed.totalStarsEarnedEver === 'number'
          ? Math.max(0, Math.floor(parsed.totalStarsEarnedEver))
          : Object.values(levelProgress).reduce((sum, p) => sum + p.stars, 0),
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
}

export function clearPersistedState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_V2);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY_V1);
  } catch {
    // Ignore
  }
}
