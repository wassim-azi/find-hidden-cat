import {
  ActivePuzzleSave,
  Difficulty,
  LevelProgress,
  PlayerAchievements,
  PlayerSettings,
} from '../game/gameTypes';

const STORAGE_KEY = 'meowdoku_state_v1';

export interface PersistedGameData {
  currentLevelId: number;
  unlockedLevelId: number;
  levelProgress: Record<number, LevelProgress>;
  settings: PlayerSettings;
  selectedDifficulty: Difficulty | 'all';
  hasSeenTutorial: boolean;
  activePuzzle: ActivePuzzleSave | null;
  achievements: PlayerAchievements;
  completedDailyDates: string[];
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
  currentLevelId: 1,
  unlockedLevelId: 1,
  levelProgress: {},
  settings: DEFAULT_SETTINGS,
  selectedDifficulty: 'all',
  hasSeenTutorial: false,
  activePuzzle: null,
  achievements: DEFAULT_ACHIEVEMENTS,
  completedDailyDates: [],
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

/**
 * Safely loads and validates persisted state from LocalStorage.
 */
export function loadPersistedState(): PersistedGameData {
  if (typeof window === 'undefined') return DEFAULT_PERSISTED_DATA;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Respect OS prefers-reduced-motion on first visit
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

    return {
      currentLevelId,
      unlockedLevelId,
      levelProgress,
      settings,
      selectedDifficulty,
      hasSeenTutorial: Boolean(parsed.hasSeenTutorial),
      activePuzzle,
      achievements,
      completedDailyDates,
    };
  } catch {
    return DEFAULT_PERSISTED_DATA;
  }
}

export function savePersistedState(data: PersistedGameData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota or private mode errors
  }
}

export function clearPersistedState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
