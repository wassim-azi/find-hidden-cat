import { create } from 'zustand';
import i18n from '../i18n';
import {
  BoardGrid,
  CellCoord,
  Difficulty,
  HintResult,
  LevelProgress,
  MoveSnapshot,
  PlayerAchievements,
  PlayerSettings,
  PuzzleDefinition,
  ValidationResult,
  cellKey,
  coordsEqual,
} from '../game/gameTypes';
import {
  getDailyPuzzle,
  getLevelPuzzle,
  getTodayDateKey,
  TOTAL_LEVELS,
} from '../game/levels';
import {
  cloneBoard,
  createInitialBoard,
  getEliminatedCellsForCat,
  isLockedCell,
  setCellValue,
} from '../game/puzzleEngine';
import { calculateStars, getPlacedCats, validateBoard } from '../game/validation';
import { getNextHint } from '../game/hintEngine';
import {
  BoosterId,
  BoosterInventory,
  calculateLevelCoinReward,
  getShopItem,
  INITIAL_BOOSTERS,
  INITIAL_FISH_COINS,
  LevelRewardBreakdown,
} from '../game/economy';
import {
  canClaimDailyReward,
  claimDailyRewardPure,
  DailyLoginState,
  DailyRewardSlot,
  INITIAL_DAILY_LOGIN,
} from '../game/dailyRewards';
import {
  applyMissionEvent,
  DailyMissionsState,
  ensureTodaysMissions,
} from '../game/missions';
import {
  ACHIEVEMENTS,
  getNewlyUnlockedAchievements,
} from '../game/achievements';
import {
  CollectibleCat,
  getNewlyUnlockedCats,
} from '../game/collectibleCats';
import {
  getNextWorldAfter,
  getSpecialNodeInfo,
  isWorldFinalLevel,
  WorldDefinition,
} from '../game/worlds';
import {
  getCurrentWeekKey,
  getGoldenCatPuzzle,
  WORLD_EVENTS,
  WorldEventId,
} from '../game/events';
import {
  RewardedAdPlacement,
  RewardedAdResult,
  rewardedAdService,
} from '../services/rewardedAds';
import {
  clearPersistedState,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_SETTINGS,
  loadPersistedState,
  savePersistedState,
} from '../utils/storage';
import { soundManager } from '../utils/sound';
import { triggerHaptic } from '../utils/haptics';
import { particleBus } from '../components/Effects/ParticleCanvas';
import { getRegionTheme } from '../styles/theme';

export type ScreenName =
  | 'welcome'
  | 'map'
  | 'cats'
  | 'missions'
  | 'shop'
  | 'profile'
  | 'game';

export interface VictorySummary {
  levelId: number;
  dailyDateKey?: string;
  elapsedSec: number;
  hintsUsed: number;
  mistakesCount: number;
  stars: number;
  previousBestStars: number;
  isNewBestTime: boolean;
  bestTimeSec: number;
  coinsAwarded: number;
  rewardBreakdown: LevelRewardBreakdown;
  unlockedNextWorld: WorldDefinition | null;
  newlyUnlockedCats: CollectibleCat[];
}

export interface ChestRevealModalData {
  title: string;
  subtitle: string;
  coins: number;
  boosterLabel?: string;
}

interface DragPaintSession {
  targetValue: 'x' | 'empty';
  snapshotTaken: boolean;
  stepCount: number;
}

interface GameStoreState {
  screen: ScreenName;
  previousScreen: ScreenName;

  // Modals / Overlays
  isPaused: boolean;
  isSettingsOpen: boolean;
  isTutorialOpen: boolean;
  isCelebratingBoard: boolean;
  isDailyCalendarOpen: boolean;
  rewardedAdPlacement: RewardedAdPlacement | null;
  lastAdFeedback: string | null;
  unlockedWorldModal: WorldDefinition | null;
  unlockedCatModal: CollectibleCat | null;
  chestRevealModal: ChestRevealModalData | null;
  toastMessage: string | null;
  victorySummary: VictorySummary | null;

  // Progression & Economy
  currentLevelId: number;
  unlockedLevelId: number;
  levelProgress: Record<number, LevelProgress>;
  completedDailyDates: string[];
  selectedDifficulty: Difficulty | 'all';
  hasSeenTutorial: boolean;
  achievements: PlayerAchievements;
  fishCoins: number;
  boosters: BoosterInventory;
  dailyLogin: DailyLoginState;
  dailyMissions: DailyMissionsState;
  unlockedAchievementIds: string[];
  claimedAchievementIds: string[];
  unlockedCatIds: string[];
  activeMascotCatId: string;
  claimedEventIds: string[];
  zeroMistakeSolves: number;
  specialLevelsCompleted: number;
  totalStarsEarnedEver: number;

  // Active Puzzle Session
  puzzle: PuzzleDefinition;
  board: BoardGrid;
  validation: ValidationResult;
  selectedCell: CellCoord | null;
  pencilMode: boolean;
  undoStack: MoveSnapshot[];
  redoStack: MoveSnapshot[];
  activeHint: HintResult | null;
  elapsedSec: number;
  hintsUsed: number;
  mistakesCount: number;
  isMistakeShieldActive: boolean;
  shakeNonce: number;

  // Settings
  settings: PlayerSettings;

  // Navigation Actions
  goToScreen: (screen: ScreenName) => void;
  startLevel: (levelId: number, resumeIfSaved?: boolean) => void;
  startDailyChallenge: () => void;
  startGoldenCatTrial: () => void;
  continueGame: () => void;
  startNextLevel: () => void;

  // Gameplay Actions
  tapCell: (coord: CellCoord) => void;
  placeOrToggleDirect: (coord: CellCoord, mode: 'cat' | 'x') => void;
  beginDragMark: (coord: CellCoord) => void;
  dragMarkCell: (coord: CellCoord) => void;
  endDragMark: () => void;
  togglePencilMode: () => void;
  undo: () => void;
  redo: () => void;
  requestHint: () => void;
  useBooster: (boosterId: BoosterId) => boolean;
  applyActiveHint: () => void;
  dismissHint: () => void;
  restartLevel: () => void;
  tickTimer: () => void;

  // Economy, Shop, Daily, Missions, Cats, Achievements, Events, Ads
  purchaseBooster: (boosterId: BoosterId) => boolean;
  claimTodaysDailyReward: () => {
    claimed: boolean;
    reward: DailyRewardSlot | null;
    usedStreakShield: boolean;
  };
  claimMissionReward: (missionId: string) => boolean;
  claimAchievementReward: (achievementId: string) => boolean;
  claimEventChest: (eventId: WorldEventId) => boolean;
  selectMascotCat: (catId: string) => void;
  openRewardedAdPrompt: (placement: RewardedAdPlacement) => void;
  closeRewardedAdPrompt: () => void;
  attemptWatchRewardedAd: (placement: RewardedAdPlacement) => Promise<RewardedAdResult>;

  // Overlays & Settings
  setPaused: (paused: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setTutorialOpen: (open: boolean) => void;
  setDailyCalendarOpen: (open: boolean) => void;
  dismissUnlockedWorld: () => void;
  dismissUnlockedCat: () => void;
  dismissChestReveal: () => void;
  showToast: (msg: string) => void;
  markTutorialSeen: () => void;
  setDifficultyFilter: (difficulty: Difficulty | 'all') => void;
  updateSetting: <K extends keyof PlayerSettings>(
    key: K,
    value: PlayerSettings[K]
  ) => void;
  resetAllProgress: () => void;
}

let activeDragSession: DragPaintSession | null = null;
let celebrationTimer: number | null = null;
let toastTimer: number | null = null;

function clearCelebrationTimer(): void {
  if (celebrationTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(celebrationTimer);
    celebrationTimer = null;
  }
}

const persisted = loadPersistedState();
const initialTodayKey = getTodayDateKey();
const initialLevelId = Math.min(persisted.currentLevelId, TOTAL_LEVELS);
const initialPuzzle = getLevelPuzzle(initialLevelId);
const initialBoard =
  persisted.activePuzzle &&
  persisted.activePuzzle.levelId === initialLevelId &&
  persisted.activePuzzle.board.length === initialPuzzle.size
    ? cloneBoard(persisted.activePuzzle.board)
    : createInitialBoard(initialPuzzle);

const initialValidation = validateBoard(initialPuzzle, initialBoard);
const initialMissions = ensureTodaysMissions(persisted.dailyMissions, initialTodayKey);

function persistFromState(state: GameStoreState): void {
  savePersistedState({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    currentLevelId: state.currentLevelId,
    unlockedLevelId: state.unlockedLevelId,
    levelProgress: state.levelProgress,
    settings: state.settings,
    selectedDifficulty: state.selectedDifficulty,
    hasSeenTutorial: state.hasSeenTutorial,
    activePuzzle:
      state.victorySummary || state.isCelebratingBoard || state.puzzle.dailyDateKey
        ? null
        : {
            levelId: state.currentLevelId,
            board: state.board,
            elapsedSec: state.elapsedSec,
            hintsUsed: state.hintsUsed,
          },
    achievements: state.achievements,
    completedDailyDates: state.completedDailyDates,
    fishCoins: state.fishCoins,
    boosters: state.boosters,
    dailyLogin: state.dailyLogin,
    dailyMissions: state.dailyMissions,
    unlockedAchievementIds: state.unlockedAchievementIds,
    claimedAchievementIds: state.claimedAchievementIds,
    unlockedCatIds: state.unlockedCatIds,
    activeMascotCatId: state.activeMascotCatId,
    claimedEventIds: state.claimedEventIds,
    zeroMistakeSolves: state.zeroMistakeSolves,
    specialLevelsCompleted: state.specialLevelsCompleted,
    totalStarsEarnedEver: state.totalStarsEarnedEver,
  });
}

function applyAutoXForCat(
  puzzle: PuzzleDefinition,
  board: BoardGrid,
  catCoord: CellCoord
): BoardGrid {
  const next = cloneBoard(board);
  const eliminated = getEliminatedCellsForCat(puzzle, catCoord);
  for (const c of eliminated) {
    if (next[c.row]?.[c.col] === 'empty') {
      next[c.row]![c.col] = 'x';
    }
  }
  return next;
}

function clearOrphanedAutoX(
  puzzle: PuzzleDefinition,
  board: BoardGrid,
  removedCat: CellCoord
): BoardGrid {
  const next = cloneBoard(board);
  const remainingCats = getPlacedCats(next);
  const stillEliminated = new Set<string>();

  for (const cat of remainingCats) {
    for (const e of getEliminatedCellsForCat(puzzle, cat)) {
      stillEliminated.add(`${e.row},${e.col}`);
    }
  }

  for (const c of getEliminatedCellsForCat(puzzle, removedCat)) {
    if (next[c.row]?.[c.col] === 'x' && !stillEliminated.has(`${c.row},${c.col}`)) {
      next[c.row]![c.col] = 'empty';
    }
  }

  return next;
}

function computeTotalStars(progress: Record<number, LevelProgress>): number {
  return Object.values(progress).reduce((sum, p) => sum + p.stars, 0);
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  screen: 'welcome',
  previousScreen: 'welcome',

  isPaused: false,
  isSettingsOpen: false,
  isTutorialOpen: false,
  isCelebratingBoard: false,
  isDailyCalendarOpen: false,
  rewardedAdPlacement: null,
  lastAdFeedback: null,
  unlockedWorldModal: null,
  unlockedCatModal: null,
  chestRevealModal: null,
  toastMessage: null,
  victorySummary: null,

  currentLevelId: initialLevelId,
  unlockedLevelId: Math.min(persisted.unlockedLevelId, TOTAL_LEVELS),
  levelProgress: persisted.levelProgress,
  completedDailyDates: persisted.completedDailyDates,
  selectedDifficulty: persisted.selectedDifficulty,
  hasSeenTutorial: persisted.hasSeenTutorial,
  achievements: persisted.achievements,
  fishCoins: persisted.fishCoins,
  boosters: persisted.boosters,
  dailyLogin: persisted.dailyLogin,
  dailyMissions: initialMissions,
  unlockedAchievementIds: persisted.unlockedAchievementIds,
  claimedAchievementIds: persisted.claimedAchievementIds,
  unlockedCatIds: persisted.unlockedCatIds,
  activeMascotCatId: persisted.activeMascotCatId,
  claimedEventIds: persisted.claimedEventIds,
  zeroMistakeSolves: persisted.zeroMistakeSolves,
  specialLevelsCompleted: persisted.specialLevelsCompleted,
  totalStarsEarnedEver: persisted.totalStarsEarnedEver,

  puzzle: initialPuzzle,
  board: initialBoard,
  validation: initialValidation,
  selectedCell: null,
  pencilMode: false,
  undoStack: [],
  redoStack: [],
  activeHint: null,
  elapsedSec:
    persisted.activePuzzle?.levelId === initialLevelId
      ? persisted.activePuzzle.elapsedSec
      : 0,
  hintsUsed:
    persisted.activePuzzle?.levelId === initialLevelId
      ? persisted.activePuzzle.hintsUsed
      : 0,
  mistakesCount: 0,
  isMistakeShieldActive: false,
  shakeNonce: 0,

  settings: persisted.settings,

  showToast: (msg) => {
    if (toastTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(toastTimer);
    }
    set({ toastMessage: msg });
    if (typeof window !== 'undefined') {
      toastTimer = window.setTimeout(() => {
        toastTimer = null;
        set({ toastMessage: null });
      }, 2800);
    }
  },

  goToScreen: (screen) => {
    clearCelebrationTimer();
    activeDragSession = null;
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);

    const todayKey = getTodayDateKey();
    const freshMissions = ensureTodaysMissions(state.dailyMissions, todayKey);

    set({
      previousScreen: state.screen,
      screen,
      dailyMissions: freshMissions,
      isPaused: false,
      isCelebratingBoard: false,
      victorySummary: screen === 'game' ? state.victorySummary : null,
    });
  },

  startLevel: (levelId, resumeIfSaved = false) => {
    clearCelebrationTimer();
    activeDragSession = null;
    const state = get();
    const clampedId = Math.max(1, Math.min(TOTAL_LEVELS, levelId));

    // Strict Candy Crush progression guard: never allow launching locked levels!
    const isUnlocked =
      clampedId <= state.unlockedLevelId || Boolean(state.levelProgress[clampedId]?.completed);
    if (!isUnlocked) {
      soundManager.play('error', state.settings.soundEnabled);
      triggerHaptic('error', state.settings.hapticsEnabled);
      state.showToast(
        i18n.t('map.lockedToast', { prev: clampedId - 1, next: clampedId })
      );
      return;
    }

    const puzzle = getLevelPuzzle(clampedId);
    const canResume =
      resumeIfSaved &&
      !state.puzzle.dailyDateKey &&
      state.currentLevelId === clampedId &&
      !state.validation.isSolved &&
      state.board.length === puzzle.size;

    const board = canResume ? cloneBoard(state.board) : createInitialBoard(puzzle);
    const validation = validateBoard(puzzle, board);

    soundManager.play('button', state.settings.soundEnabled);
    if (state.settings.musicEnabled) {
      soundManager.setMusic(true);
    }

    set({
      screen: 'game',
      previousScreen: state.screen,
      currentLevelId: clampedId,
      puzzle,
      board,
      validation,
      selectedCell: null,
      pencilMode: false,
      undoStack: canResume ? state.undoStack : [],
      redoStack: canResume ? state.redoStack : [],
      activeHint: null,
      elapsedSec: canResume ? state.elapsedSec : 0,
      hintsUsed: canResume ? state.hintsUsed : 0,
      mistakesCount: canResume ? state.mistakesCount : 0,
      isMistakeShieldActive: false,
      isPaused: false,
      isCelebratingBoard: false,
      victorySummary: null,
      isTutorialOpen: !state.hasSeenTutorial && clampedId === 1,
    });

    persistFromState(get());
  },

  startDailyChallenge: () => {
    clearCelebrationTimer();
    activeDragSession = null;
    const state = get();
    const todayKey = getTodayDateKey();
    const dailyPuzzle = getDailyPuzzle(todayKey);
    const board = createInitialBoard(dailyPuzzle);
    const validation = validateBoard(dailyPuzzle, board);

    soundManager.play('button', state.settings.soundEnabled);
    if (state.settings.musicEnabled) {
      soundManager.setMusic(true);
    }

    set({
      screen: 'game',
      previousScreen: state.screen,
      puzzle: dailyPuzzle,
      board,
      validation,
      selectedCell: null,
      pencilMode: false,
      undoStack: [],
      redoStack: [],
      activeHint: null,
      elapsedSec: 0,
      hintsUsed: 0,
      mistakesCount: 0,
      isMistakeShieldActive: false,
      isPaused: false,
      isCelebratingBoard: false,
      victorySummary: null,
    });
  },

  startGoldenCatTrial: () => {
    clearCelebrationTimer();
    activeDragSession = null;
    const state = get();
    const goldenPuzzle = getGoldenCatPuzzle(getCurrentWeekKey());
    const board = createInitialBoard(goldenPuzzle);
    const validation = validateBoard(goldenPuzzle, board);

    soundManager.play('button', state.settings.soundEnabled);
    set({
      screen: 'game',
      previousScreen: state.screen,
      puzzle: goldenPuzzle,
      board,
      validation,
      selectedCell: null,
      pencilMode: false,
      undoStack: [],
      redoStack: [],
      activeHint: null,
      elapsedSec: 0,
      hintsUsed: 0,
      mistakesCount: 0,
      isMistakeShieldActive: false,
      isPaused: false,
      isCelebratingBoard: false,
      victorySummary: null,
    });
  },

  continueGame: () => {
    const state = get();
    const targetLevel = Math.min(state.currentLevelId, state.unlockedLevelId, TOTAL_LEVELS);
    state.startLevel(targetLevel, true);
  },

  startNextLevel: () => {
    const state = get();
    if (state.puzzle.dailyDateKey) {
      state.goToScreen('map');
      return;
    }
    const completedId = state.victorySummary?.levelId ?? state.currentLevelId;
    const nextId = completedId < TOTAL_LEVELS ? completedId + 1 : 1;
    state.startLevel(nextId, false);
  },

  beginDragMark: (coord) => {
    const state = get();
    if (!state.pencilMode || state.isPaused || state.victorySummary || state.isCelebratingBoard) {
      return;
    }
    if (isLockedCell(state.puzzle, coord)) return;
    const currentVal = state.board[coord.row]?.[coord.col];
    if (!currentVal || currentVal === 'cat') {
      soundManager.play('select', state.settings.soundEnabled);
      set({ selectedCell: coord });
      return;
    }

    const targetValue: 'x' | 'empty' = currentVal === 'x' ? 'empty' : 'x';
    activeDragSession = {
      targetValue,
      snapshotTaken: true,
      stepCount: 0,
    };

    const nextBoard = setCellValue(state.board, coord, targetValue);
    const nextValidation = validateBoard(state.puzzle, nextBoard);

    soundManager.playDragX(0, state.settings.soundEnabled);
    triggerHaptic('x', state.settings.hapticsEnabled);

    set({
      board: nextBoard,
      validation: nextValidation,
      selectedCell: coord,
      undoStack: [
        ...state.undoStack.slice(-49),
        { board: cloneBoard(state.board), selectedCell: state.selectedCell },
      ],
      redoStack: [],
      activeHint: null,
    });
  },

  dragMarkCell: (coord) => {
    if (!activeDragSession) return;
    const state = get();
    if (!state.pencilMode || state.isPaused || state.victorySummary || state.isCelebratingBoard) {
      return;
    }
    if (isLockedCell(state.puzzle, coord)) return;

    const currentVal = state.board[coord.row]?.[coord.col];
    if (!currentVal || currentVal === 'cat' || currentVal === activeDragSession.targetValue) {
      return;
    }

    activeDragSession.stepCount += 1;
    const nextBoard = setCellValue(state.board, coord, activeDragSession.targetValue);
    const nextValidation = validateBoard(state.puzzle, nextBoard);

    soundManager.playDragX(activeDragSession.stepCount, state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    set({
      board: nextBoard,
      validation: nextValidation,
      selectedCell: coord,
      activeHint: null,
    });
  },

  endDragMark: () => {
    if (activeDragSession) {
      activeDragSession = null;
      persistFromState(get());
    }
  },

  tapCell: (coord) => {
    const state = get();
    if (state.isPaused || state.victorySummary || state.isCelebratingBoard) return;
    if (isLockedCell(state.puzzle, coord)) {
      soundManager.play('select', state.settings.soundEnabled);
      set({ selectedCell: coord });
      return;
    }

    const currentVal = state.board[coord.row]?.[coord.col];
    if (!currentVal) return;

    // Pencil mode single tap fallback
    if (state.pencilMode) {
      if (currentVal === 'cat') {
        soundManager.play('select', state.settings.soundEnabled);
        set({ selectedCell: coord });
        return;
      }
      const nextVal = currentVal === 'x' ? 'empty' : 'x';
      const nextBoard = setCellValue(state.board, coord, nextVal);
      const nextValidation = validateBoard(state.puzzle, nextBoard);

      soundManager.play('markX', state.settings.soundEnabled);
      triggerHaptic('x', state.settings.hapticsEnabled);

      set({
        board: nextBoard,
        validation: nextValidation,
        selectedCell: coord,
        undoStack: [
          ...state.undoStack.slice(-49),
          { board: cloneBoard(state.board), selectedCell: state.selectedCell },
        ],
        redoStack: [],
        activeHint: null,
      });
      persistFromState(get());
      return;
    }

    // Normal mode:
    // 1. Tap occupied cat cell to remove it
    if (currentVal === 'cat') {
      let nextBoard = setCellValue(state.board, coord, 'empty');
      if (state.settings.autoMarkX) {
        nextBoard = clearOrphanedAutoX(state.puzzle, nextBoard, coord);
      }
      const nextValidation = validateBoard(state.puzzle, nextBoard);

      soundManager.play('removeCat', state.settings.soundEnabled);
      triggerHaptic('select', state.settings.hapticsEnabled);

      set({
        board: nextBoard,
        validation: nextValidation,
        selectedCell: coord,
        undoStack: [
          ...state.undoStack.slice(-49),
          { board: cloneBoard(state.board), selectedCell: state.selectedCell },
        ],
        redoStack: [],
        activeHint: null,
      });
      persistFromState(get());
      return;
    }

    // 2. Tap unselected cell to select
    if (!coordsEqual(state.selectedCell, coord)) {
      soundManager.play('select', state.settings.soundEnabled);
      triggerHaptic('select', state.settings.hapticsEnabled);
      set({ selectedCell: coord });
      return;
    }

    // 3. Tap selected cell to place a cat!
    let nextBoard = setCellValue(state.board, coord, 'cat');
    let nextValidation = validateBoard(state.puzzle, nextBoard);

    if (nextValidation.isValid && state.settings.autoMarkX) {
      nextBoard = applyAutoXForCat(state.puzzle, nextBoard, coord);
      nextValidation = validateBoard(state.puzzle, nextBoard);
    }

    const hasNewConflict = !nextValidation.isValid;
    let nextMistakes = state.mistakesCount;
    let nextShieldActive = state.isMistakeShieldActive;

    if (hasNewConflict) {
      if (nextShieldActive) {
        // Mistake Shield absorbs the conflict penalty cleanly!
        nextShieldActive = false;
        soundManager.play('hint', state.settings.soundEnabled);
        triggerHaptic('hint', state.settings.hapticsEnabled);
        state.showToast(i18n.t('toasts.shieldAbsorbed'));
        // Automatically revert the conflicting cat so player stays clean
        set({
          isMistakeShieldActive: false,
          selectedCell: coord,
          shakeNonce: state.shakeNonce + 1,
        });
        return;
      }
      nextMistakes += 1;
      soundManager.play('error', state.settings.soundEnabled);
      triggerHaptic('error', state.settings.hapticsEnabled);
    }

    const regionId = state.puzzle.regions[coord.row]?.[coord.col] ?? 0;
    const theme = getRegionTheme(regionId);

    // Update daily mission counter on valid cat placement
    const todayKey = getTodayDateKey();
    let updatedMissions = ensureTodaysMissions(state.dailyMissions, todayKey);
    if (!hasNewConflict) {
      updatedMissions = applyMissionEvent(updatedMissions, { type: 'cat_placed' });
    }

    if (!hasNewConflict && !nextValidation.isSolved) {
      soundManager.play('placeCat', state.settings.soundEnabled);
      triggerHaptic('cat', state.settings.hapticsEnabled);
      if (typeof document !== 'undefined') {
        particleBus.burstElement(
          document.getElementById(`cell-${coord.row}-${coord.col}`),
          theme.bg,
          16
        );
      }
    }

    // Handle Victory!
    if (nextValidation.isSolved) {
      soundManager.play('victory', state.settings.soundEnabled);
      triggerHaptic('victory', state.settings.hapticsEnabled);
      if (typeof document !== 'undefined') {
        particleBus.burstElement(
          document.getElementById(`cell-${coord.row}-${coord.col}`),
          theme.bg,
          24
        );
      }
      particleBus.victoryFountain();

      const stars = calculateStars(
        state.elapsedSec,
        state.hintsUsed,
        state.puzzle.parTimeSec,
        nextMistakes
      );

      const isDailyOrEvent = Boolean(state.puzzle.dailyDateKey);
      const isGoldenTrial = Boolean(state.puzzle.dailyDateKey?.startsWith('golden-'));
      let updatedLevelProgress = state.levelProgress;
      let nextUnlocked = state.unlockedLevelId;
      let nextCurrentLevel = state.currentLevelId;
      let isNewBestTime = true;
      let bestTimeSec = state.elapsedSec;
      let previousBestStars = 0;
      let nextDailyDates = state.completedDailyDates;
      let isFirstCompletion = true;
      let unlockedNextWorld: WorldDefinition | null = null;
      let worldMilestoneBonus = 0;
      let specialNodeBonus = 0;
      let nextSpecialCompleted = state.specialLevelsCompleted;
      let nextBoosters = { ...state.boosters };

      if (isDailyOrEvent && state.puzzle.dailyDateKey) {
        isFirstCompletion = !state.completedDailyDates.includes(state.puzzle.dailyDateKey);
        if (isFirstCompletion) {
          nextDailyDates = [...state.completedDailyDates, state.puzzle.dailyDateKey];
          if (isGoldenTrial) {
            specialNodeBonus = 35;
            nextBoosters.superHint += 1;
          }
        }
      } else {
        const prevProg = state.levelProgress[state.puzzle.id];
        isFirstCompletion = !prevProg?.completed;
        previousBestStars = prevProg?.stars ?? 0;

        isNewBestTime =
          !prevProg?.bestTimeSec || state.elapsedSec < prevProg.bestTimeSec;
        bestTimeSec = isNewBestTime
          ? state.elapsedSec
          : (prevProg?.bestTimeSec ?? state.elapsedSec);

        const updatedProg: LevelProgress = {
          levelId: state.puzzle.id,
          completed: true,
          bestTimeSec,
          stars: Math.max(previousBestStars, stars),
          bestHintsUsed:
            prevProg?.bestHintsUsed === null || prevProg?.bestHintsUsed === undefined
              ? state.hintsUsed
              : Math.min(prevProg.bestHintsUsed, state.hintsUsed),
        };

        updatedLevelProgress = {
          ...state.levelProgress,
          [state.puzzle.id]: updatedProg,
        };

        // Sequential Candy Crush unlock: never regresses on replay!
        const prevUnlocked = state.unlockedLevelId;
        nextUnlocked = Math.min(
          TOTAL_LEVELS,
          Math.max(prevUnlocked, state.puzzle.id + 1)
        );
        nextCurrentLevel = Math.min(TOTAL_LEVELS, Math.max(state.currentLevelId, nextUnlocked));

        // Special node bonus
        const special = getSpecialNodeInfo(state.puzzle.id);
        if (special.type !== 'normal' && isFirstCompletion) {
          specialNodeBonus = special.bonusCoins;
          nextSpecialCompleted += 1;
          if (special.type === 'mystery') {
            nextBoosters.superHint += 1;
          }
        }

        // World completion milestone check
        const completedWorld = isWorldFinalLevel(state.puzzle.id);
        if (completedWorld && isFirstCompletion) {
          worldMilestoneBonus = completedWorld.milestoneCoins;
          unlockedNextWorld = getNextWorldAfter(completedWorld.id);
        }
      }

      const rewardBreakdown = calculateLevelCoinReward({
        difficulty: state.puzzle.difficulty,
        stars,
        isFirstCompletion,
        specialNodeBonus,
        worldMilestoneBonus,
        isDaily: isDailyOrEvent,
      });

      const nextCoins = state.fishCoins + rewardBreakdown.totalCoins;
      const nextZeroMistakes = state.zeroMistakeSolves + (nextMistakes === 0 ? 1 : 0);
      const newStreak = state.achievements.currentStreak + 1;
      const updatedAchievements: PlayerAchievements = {
        totalCatsFound: state.achievements.totalCatsFound + state.puzzle.size,
        perfectLevels:
          state.achievements.perfectLevels + (state.hintsUsed === 0 ? 1 : 0),
        currentStreak: newStreak,
        bestStreak: Math.max(state.achievements.bestStreak, newStreak),
      };

      const totalStarsNow = computeTotalStars(updatedLevelProgress);
      const improvedBest = isNewBestTime || stars > previousBestStars;

      // Update Daily Missions from real level-completed event
      updatedMissions = applyMissionEvent(updatedMissions, {
        type: 'level_completed',
        starsEarned: stars,
        hintsUsed: state.hintsUsed,
        mistakesCount: nextMistakes,
        elapsedSec: state.elapsedSec,
        improvedBest,
      });

      // Evaluate Achievements & Collectible Cats!
      const dailyOnlyCount = nextDailyDates.filter((d) => !d.startsWith('golden-')).length;
      const newlyUnlockedCats = getNewlyUnlockedCats(
        {
          levelProgress: updatedLevelProgress,
          unlockedLevelId: nextUnlocked,
          totalStars: totalStarsNow,
          noHintSolves: updatedAchievements.perfectLevels,
          completedDailyCount: dailyOnlyCount,
          unlockedAchievementsCount: state.unlockedAchievementIds.length,
        },
        state.unlockedCatIds
      );
      const nextUnlockedCats = [
        ...state.unlockedCatIds,
        ...newlyUnlockedCats.map((c) => c.id),
      ];

      const newlyUnlockedAchs = getNewlyUnlockedAchievements(
        {
          levelProgress: updatedLevelProgress,
          unlockedLevelId: nextUnlocked,
          noHintSolves: updatedAchievements.perfectLevels,
          zeroMistakeSolves: nextZeroMistakes,
          specialLevelsCompleted: nextSpecialCompleted,
          unlockedCatsCount: nextUnlockedCats.length,
          completedDailyCount: dailyOnlyCount,
          totalStars: totalStarsNow,
        },
        state.unlockedAchievementIds
      );
      const nextUnlockedAchs = [
        ...state.unlockedAchievementIds,
        ...newlyUnlockedAchs.map((a) => a.id),
      ];

      const summary: VictorySummary = {
        levelId: state.puzzle.id,
        dailyDateKey: state.puzzle.dailyDateKey,
        elapsedSec: state.elapsedSec,
        hintsUsed: state.hintsUsed,
        mistakesCount: nextMistakes,
        stars,
        previousBestStars,
        isNewBestTime,
        bestTimeSec,
        coinsAwarded: rewardBreakdown.totalCoins,
        rewardBreakdown,
        unlockedNextWorld,
        newlyUnlockedCats,
      };

      set({
        board: nextBoard,
        validation: nextValidation,
        selectedCell: null,
        undoStack: [
          ...state.undoStack.slice(-49),
          { board: cloneBoard(state.board), selectedCell: state.selectedCell },
        ],
        redoStack: [],
        activeHint: null,
        currentLevelId: nextCurrentLevel,
        unlockedLevelId: nextUnlocked,
        levelProgress: updatedLevelProgress,
        completedDailyDates: nextDailyDates,
        achievements: updatedAchievements,
        fishCoins: nextCoins,
        boosters: nextBoosters,
        dailyMissions: updatedMissions,
        unlockedAchievementIds: nextUnlockedAchs,
        unlockedCatIds: nextUnlockedCats,
        zeroMistakeSolves: nextZeroMistakes,
        specialLevelsCompleted: nextSpecialCompleted,
        totalStarsEarnedEver: state.totalStarsEarnedEver + stars,
        mistakesCount: nextMistakes,
        isMistakeShieldActive: false,
        isCelebratingBoard: true,
        victorySummary: null,
      });

      persistFromState(get());

      const delayMs = state.settings.reducedMotion ? 120 : 620;
      clearCelebrationTimer();
      celebrationTimer = window.setTimeout(() => {
        celebrationTimer = null;
        set({ isCelebratingBoard: false, victorySummary: summary });
        if (newlyUnlockedAchs.length > 0) {
          const achTitle = i18n.t(`achievements.${newlyUnlockedAchs[0]!.id}.title`);
          get().showToast(i18n.t('achievements.unlockedToast', { title: achTitle }));
        }
      }, delayMs);

      return;
    }

    set({
      board: nextBoard,
      validation: nextValidation,
      selectedCell: coord,
      undoStack: [
        ...state.undoStack.slice(-49),
        { board: cloneBoard(state.board), selectedCell: state.selectedCell },
      ],
      redoStack: [],
      activeHint: null,
      mistakesCount: nextMistakes,
      isMistakeShieldActive: nextShieldActive,
      dailyMissions: updatedMissions,
      shakeNonce: hasNewConflict ? state.shakeNonce + 1 : state.shakeNonce,
    });
    persistFromState(get());
  },

  placeOrToggleDirect: (coord, mode) => {
    const state = get();
    if (state.isPaused || state.victorySummary || state.isCelebratingBoard) return;
    if (isLockedCell(state.puzzle, coord)) return;

    const currentVal = state.board[coord.row]?.[coord.col];
    if (!currentVal) return;

    if (mode === 'x') {
      if (currentVal === 'cat') return;
      const nextVal = currentVal === 'x' ? 'empty' : 'x';
      const nextBoard = setCellValue(state.board, coord, nextVal);
      const nextValidation = validateBoard(state.puzzle, nextBoard);
      soundManager.play('markX', state.settings.soundEnabled);
      triggerHaptic('x', state.settings.hapticsEnabled);
      set({
        board: nextBoard,
        validation: nextValidation,
        selectedCell: coord,
        undoStack: [
          ...state.undoStack.slice(-49),
          { board: cloneBoard(state.board), selectedCell: state.selectedCell },
        ],
        redoStack: [],
        activeHint: null,
      });
      persistFromState(get());
      return;
    }

    set({ selectedCell: coord });
    get().tapCell(coord);
  },

  togglePencilMode: () => {
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);
    set({ pencilMode: !state.pencilMode });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0 || state.victorySummary || state.isCelebratingBoard) return;

    const prev = state.undoStack[state.undoStack.length - 1]!;
    const nextUndo = state.undoStack.slice(0, -1);
    const nextValidation = validateBoard(state.puzzle, prev.board);

    soundManager.play('button', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    set({
      board: cloneBoard(prev.board),
      validation: nextValidation,
      selectedCell: prev.selectedCell,
      undoStack: nextUndo,
      redoStack: [
        ...state.redoStack.slice(-49),
        { board: cloneBoard(state.board), selectedCell: state.selectedCell },
      ],
      activeHint: null,
    });
    persistFromState(get());
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0 || state.victorySummary || state.isCelebratingBoard) return;

    const nextSnap = state.redoStack[state.redoStack.length - 1]!;
    const nextRedo = state.redoStack.slice(0, -1);
    const nextValidation = validateBoard(state.puzzle, nextSnap.board);

    soundManager.play('button', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    set({
      board: cloneBoard(nextSnap.board),
      validation: nextValidation,
      selectedCell: nextSnap.selectedCell,
      undoStack: [
        ...state.undoStack.slice(-49),
        { board: cloneBoard(state.board), selectedCell: state.selectedCell },
      ],
      redoStack: nextRedo,
      activeHint: null,
    });
    persistFromState(get());
  },

  requestHint: () => {
    const state = get();
    if (state.isPaused || state.victorySummary || state.isCelebratingBoard) return;

    const hint = getNextHint(state.puzzle, state.board);
    if (!hint) return;

    soundManager.play('hint', state.settings.soundEnabled);
    triggerHaptic('hint', state.settings.hapticsEnabled);

    // Consume 1 hint token if owned; core hint still remains accessible so game never blocks!
    const nextBoosters = { ...state.boosters };
    if (nextBoosters.hint > 0) {
      nextBoosters.hint -= 1;
    }

    set({
      activeHint: hint,
      selectedCell: hint.targetCell,
      hintsUsed: state.hintsUsed + 1,
      boosters: nextBoosters,
    });
    persistFromState(get());
  },

  useBooster: (boosterId) => {
    const state = get();
    if (state.isPaused || state.victorySummary || state.isCelebratingBoard) return false;

    if (state.boosters[boosterId] <= 0) {
      const placementMap: Record<BoosterId, RewardedAdPlacement> = {
        hint: 'free_hint',
        superHint: 'challenge_retry',
        revealCat: 'free_hint',
        undoToken: 'extra_undo',
        mistakeShield: 'booster_pack',
        revealRegion: 'booster_pack',
      };
      set({ rewardedAdPlacement: placementMap[boosterId], lastAdFeedback: null });
      return false;
    }

    const consume = (): BoosterInventory => ({
      ...state.boosters,
      [boosterId]: Math.max(0, state.boosters[boosterId] - 1),
    });

    if (boosterId === 'hint') {
      state.requestHint();
      return true;
    }

    if (boosterId === 'mistakeShield') {
      if (state.isMistakeShieldActive) {
        state.showToast(i18n.t('toasts.shieldAlreadyActive'));
        return false;
      }
      soundManager.play('hint', state.settings.soundEnabled);
      triggerHaptic('hint', state.settings.hapticsEnabled);
      set({
        boosters: consume(),
        isMistakeShieldActive: true,
      });
      state.showToast(i18n.t('toasts.shieldArmed'));
      persistFromState(get());
      return true;
    }

    if (boosterId === 'undoToken') {
      // Rewind to the most recent clean (0-conflict) snapshot
      let cleanIdx = -1;
      for (let i = state.undoStack.length - 1; i >= 0; i--) {
        if (validateBoard(state.puzzle, state.undoStack[i]!.board).isValid) {
          cleanIdx = i;
          break;
        }
      }
      if (cleanIdx === -1) {
        state.showToast(i18n.t('toasts.boardAlreadyClean'));
        return false;
      }
      const targetSnap = state.undoStack[cleanIdx]!;
      soundManager.play('hint', state.settings.soundEnabled);
      set({
        boosters: consume(),
        board: cloneBoard(targetSnap.board),
        validation: validateBoard(state.puzzle, targetSnap.board),
        selectedCell: targetSnap.selectedCell,
        undoStack: state.undoStack.slice(0, cleanIdx),
        redoStack: [],
        activeHint: null,
      });
      state.showToast(i18n.t('toasts.smartRewindDone'));
      persistFromState(get());
      return true;
    }

    if (boosterId === 'superHint') {
      // Auto-mark X around all valid cats currently on board + highlight deduced spot!
      let nextBoard = cloneBoard(state.board);
      const validCats = getPlacedCats(nextBoard).filter(
        (c) => !state.validation.conflictingCellKeys.has(cellKey(c.row, c.col))
      );
      for (const cat of validCats) {
        nextBoard = applyAutoXForCat(state.puzzle, nextBoard, cat);
      }
      const hint = getNextHint(state.puzzle, nextBoard);
      if (!hint) return false;
      soundManager.play('hint', state.settings.soundEnabled);
      triggerHaptic('hint', state.settings.hapticsEnabled);
      set({
        boosters: consume(),
        board: nextBoard,
        validation: validateBoard(state.puzzle, nextBoard),
        activeHint: hint,
        selectedCell: hint.targetCell,
        hintsUsed: state.hintsUsed + 1,
        undoStack: [
          ...state.undoStack.slice(-49),
          { board: cloneBoard(state.board), selectedCell: state.selectedCell },
        ],
        redoStack: [],
      });
      persistFromState(get());
      return true;
    }

    if (boosterId === 'revealRegion') {
      // Find first unsolved region and mark all non-solution cells in that region with X
      const unsolvedReg = Array.from({ length: state.puzzle.size }, (_, i) => i).find(
        (regId) => !state.validation.completedRegions.has(regId)
      );
      if (unsolvedReg === undefined) return false;

      const solSet = new Set(state.puzzle.solution.map((c) => cellKey(c.row, c.col)));
      const nextBoard = cloneBoard(state.board);
      let targetCatCell: CellCoord | null = null;
      for (let r = 0; r < state.puzzle.size; r++) {
        for (let c = 0; c < state.puzzle.size; c++) {
          if (state.puzzle.regions[r]![c] === unsolvedReg) {
            if (solSet.has(cellKey(r, c))) {
              targetCatCell = { row: r, col: c };
            } else if (nextBoard[r]![c] !== 'cat') {
              nextBoard[r]![c] = 'x';
            }
          }
        }
      }

      soundManager.play('hint', state.settings.soundEnabled);
      triggerHaptic('hint', state.settings.hapticsEnabled);
      const regionName = i18n.t(`regions.${Math.abs(unsolvedReg) % 8}`);
      set({
        boosters: consume(),
        board: nextBoard,
        validation: validateBoard(state.puzzle, nextBoard),
        selectedCell: targetCatCell,
        undoStack: [
          ...state.undoStack.slice(-49),
          { board: cloneBoard(state.board), selectedCell: state.selectedCell },
        ],
        redoStack: [],
      });
      state.showToast(i18n.t('toasts.regionCleared', { region: regionName }));
      persistFromState(get());
      return true;
    }

    if (boosterId === 'revealCat') {
      const placedSet = new Set(getPlacedCats(state.board).map((c) => cellKey(c.row, c.col)));
      const missing = state.puzzle.solution.find((s) => !placedSet.has(cellKey(s.row, s.col)));
      if (!missing) return false;

      // Consume token, ensure normal mode, select & tap target to place cat + celebrate!
      set({
        boosters: consume(),
        pencilMode: false,
        selectedCell: missing,
        activeHint: null,
      });
      get().tapCell(missing);
      return true;
    }

    return false;
  },

  applyActiveHint: () => {
    const state = get();
    const hint = state.activeHint;
    if (!hint || !hint.canApply || state.victorySummary || state.isCelebratingBoard) return;

    if (hint.applyValue === 'cat') {
      set({ pencilMode: false, selectedCell: hint.targetCell, activeHint: null });
      get().tapCell(hint.targetCell);
      return;
    }

    let nextBoard = setCellValue(state.board, hint.targetCell, hint.applyValue);
    if (hint.applyValue === 'empty' && state.settings.autoMarkX) {
      nextBoard = clearOrphanedAutoX(state.puzzle, nextBoard, hint.targetCell);
    }
    const nextValidation = validateBoard(state.puzzle, nextBoard);
    soundManager.play('removeCat', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    set({
      board: nextBoard,
      validation: nextValidation,
      selectedCell: hint.targetCell,
      undoStack: [
        ...state.undoStack.slice(-49),
        { board: cloneBoard(state.board), selectedCell: state.selectedCell },
      ],
      redoStack: [],
      activeHint: null,
    });
    persistFromState(get());
  },

  dismissHint: () => {
    set({ activeHint: null });
  },

  restartLevel: () => {
    clearCelebrationTimer();
    activeDragSession = null;
    const state = get();
    const freshBoard = createInitialBoard(state.puzzle);
    const freshValidation = validateBoard(state.puzzle, freshBoard);

    soundManager.play('button', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    set({
      currentLevelId: state.puzzle.dailyDateKey ? state.currentLevelId : state.puzzle.id,
      board: freshBoard,
      validation: freshValidation,
      selectedCell: null,
      pencilMode: false,
      undoStack: [],
      redoStack: [],
      activeHint: null,
      elapsedSec: 0,
      hintsUsed: 0,
      mistakesCount: 0,
      isMistakeShieldActive: false,
      isPaused: false,
      isCelebratingBoard: false,
      victorySummary: null,
    });
    persistFromState(get());
  },

  tickTimer: () => {
    const state = get();
    if (
      state.screen !== 'game' ||
      state.isPaused ||
      state.isSettingsOpen ||
      state.isTutorialOpen ||
      state.isCelebratingBoard ||
      state.victorySummary !== null ||
      state.rewardedAdPlacement !== null
    ) {
      return;
    }
    const nextElapsed = state.elapsedSec + 1;
    set({ elapsedSec: nextElapsed });
    if (nextElapsed % 5 === 0) {
      persistFromState(get());
    }
  },

  purchaseBooster: (boosterId) => {
    const state = get();
    const item = getShopItem(boosterId);
    const localizedName = i18n.t(`shop.items.${boosterId}.name`);
    if (state.fishCoins < item.priceCoins) {
      soundManager.play('error', state.settings.soundEnabled);
      triggerHaptic('error', state.settings.hapticsEnabled);
      state.showToast(
        i18n.t('toasts.needMoreCoins', { diff: item.priceCoins - state.fishCoins })
      );
      return false;
    }

    soundManager.play('placeCat', state.settings.soundEnabled);
    triggerHaptic('cat', state.settings.hapticsEnabled);

    set({
      fishCoins: state.fishCoins - item.priceCoins,
      boosters: {
        ...state.boosters,
        [boosterId]: state.boosters[boosterId] + 1,
      },
    });
    state.showToast(i18n.t('toasts.boughtBooster', { name: localizedName }));
    persistFromState(get());
    return true;
  },

  claimTodaysDailyReward: () => {
    const state = get();
    const todayKey = getTodayDateKey();
    const result = claimDailyRewardPure(state.dailyLogin, todayKey);
    if (!result.claimed || !result.reward) {
      return result;
    }

    const nextBoosters = { ...state.boosters };
    for (const [k, qty] of Object.entries(result.reward.boosters)) {
      if (qty) {
        const id = k as BoosterId;
        nextBoosters[id] = (nextBoosters[id] ?? 0) + qty;
      }
    }

    soundManager.play('victory', state.settings.soundEnabled);
    triggerHaptic('victory', state.settings.hapticsEnabled);
    particleBus.victoryFountain();

    set({
      dailyLogin: result.nextState,
      fishCoins: state.fishCoins + result.reward.coins,
      boosters: nextBoosters,
    });
    persistFromState(get());
    return result;
  },

  claimMissionReward: (missionId) => {
    const state = get();
    const target = state.dailyMissions.missions.find((m) => m.id === missionId);
    if (!target || target.claimed || target.progress < target.target) return false;

    const nextBoosters = { ...state.boosters };
    if (target.rewardBooster) {
      nextBoosters[target.rewardBooster] += 1;
    }

    const nextMissions: DailyMissionsState = {
      ...state.dailyMissions,
      missions: state.dailyMissions.missions.map((m) =>
        m.id === missionId ? { ...m, claimed: true } : m
      ),
    };

    soundManager.play('victory', state.settings.soundEnabled);
    triggerHaptic('cat', state.settings.hapticsEnabled);
    particleBus.victoryFountain();

    set({
      dailyMissions: nextMissions,
      fishCoins: state.fishCoins + target.rewardCoins,
      boosters: nextBoosters,
    });
    state.showToast(i18n.t('toasts.claimedCoins', { coins: target.rewardCoins }));
    persistFromState(get());
    return true;
  },

  claimAchievementReward: (achievementId) => {
    const state = get();
    if (
      !state.unlockedAchievementIds.includes(achievementId) ||
      state.claimedAchievementIds.includes(achievementId)
    ) {
      return false;
    }
    const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!def) return false;

    const nextBoosters = { ...state.boosters };
    if (def.rewardBooster) {
      nextBoosters[def.rewardBooster] += 1;
    }

    soundManager.play('victory', state.settings.soundEnabled);
    triggerHaptic('victory', state.settings.hapticsEnabled);
    particleBus.victoryFountain();

    set({
      claimedAchievementIds: [...state.claimedAchievementIds, achievementId],
      fishCoins: state.fishCoins + def.rewardCoins,
      boosters: nextBoosters,
    });
    state.showToast(
      `${i18n.t(`achievements.${def.id}.title`)} : +${def.rewardCoins} ${i18n.t('common.fishCoinsLabel')}`
    );
    persistFromState(get());
    return true;
  },

  claimEventChest: (eventId) => {
    const state = get();
    const ev = WORLD_EVENTS.find((e) => e.id === eventId);
    if (!ev || ev.type !== 'milestone_chest') return false;

    const claimKey =
      eventId === 'perfect_week'
        ? `${eventId}-${getCurrentWeekKey()}`
        : eventId;
    if (state.claimedEventIds.includes(claimKey)) return false;

    const solvedCount = Object.values(state.levelProgress).filter((p) => p.completed).length;
    const progress =
      eventId === 'treasure_hunt' ? solvedCount : state.dailyLogin.totalClaims;
    if (progress < ev.targetCount) return false;

    const nextBoosters = { ...state.boosters };
    let boosterLabel: string | undefined;
    if (ev.rewardBooster) {
      nextBoosters[ev.rewardBooster] += 1;
      boosterLabel = `1 ${i18n.t(`shop.items.${ev.rewardBooster}.name`)}`;
    }

    soundManager.play('victory', state.settings.soundEnabled);
    triggerHaptic('victory', state.settings.hapticsEnabled);
    particleBus.victoryFountain();

    const evTitle = i18n.t(`events.${ev.id}.title`);
    const evSub = i18n.t(`events.${ev.id}.subtitle`);

    set({
      claimedEventIds: [...state.claimedEventIds, claimKey],
      fishCoins: state.fishCoins + ev.rewardCoins,
      boosters: nextBoosters,
      chestRevealModal: {
        title: i18n.t('events.chestOpenedTitle', { title: evTitle }),
        subtitle: evSub,
        coins: ev.rewardCoins,
        boosterLabel,
      },
    });
    persistFromState(get());
    return true;
  },

  selectMascotCat: (catId) => {
    const state = get();
    if (!state.unlockedCatIds.includes(catId)) return;
    soundManager.play('placeCat', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);
    set({ activeMascotCatId: catId });
    persistFromState(get());
  },

  openRewardedAdPrompt: (placement) => {
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    set({ rewardedAdPlacement: placement, lastAdFeedback: null });
  },

  closeRewardedAdPrompt: () => {
    set({ rewardedAdPlacement: null, lastAdFeedback: null });
  },

  attemptWatchRewardedAd: async (placement) => {
    const result = await rewardedAdService.requestReward(placement);
    // Strictly NEVER grant reward unless a real ad provider confirms completion!
    if (result.status === 'COMPLETED' && result.granted) {
      const state = get();
      const nextBoosters = { ...state.boosters };
      let nextCoins = state.fishCoins;
      if (placement === 'free_hint') nextBoosters.hint += 1;
      else if (placement === 'extra_undo') nextBoosters.undoToken += 1;
      else if (placement === 'booster_pack') nextBoosters.mistakeShield += 1;
      else if (placement === 'challenge_retry') nextBoosters.superHint += 1;
      else nextCoins += 30;
      set({
        boosters: nextBoosters,
        fishCoins: nextCoins,
        rewardedAdPlacement: null,
        lastAdFeedback: null,
      });
      persistFromState(get());
    } else {
      set({ lastAdFeedback: result.message });
    }
    return result;
  },

  setPaused: (paused) => {
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    set({ isPaused: paused });
  },

  setSettingsOpen: (open) => {
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    set({ isSettingsOpen: open });
  },

  setTutorialOpen: (open) => {
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    set({ isTutorialOpen: open });
  },

  setDailyCalendarOpen: (open) => {
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    set({ isDailyCalendarOpen: open });
  },

  dismissUnlockedWorld: () => set({ unlockedWorldModal: null }),
  dismissUnlockedCat: () => set({ unlockedCatModal: null }),
  dismissChestReveal: () => set({ chestRevealModal: null }),

  markTutorialSeen: () => {
    set({ hasSeenTutorial: true, isTutorialOpen: false });
    persistFromState(get());
  },

  setDifficultyFilter: (difficulty) => {
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    set({ selectedDifficulty: difficulty });
    persistFromState(get());
  },

  updateSetting: (key, value) => {
    const state = get();
    const nextSettings: PlayerSettings = {
      ...state.settings,
      [key]: value,
    };

    if (key === 'musicEnabled') {
      soundManager.setMusic(Boolean(value));
    }
    if (key !== 'soundEnabled' || value === true) {
      soundManager.play('button', nextSettings.soundEnabled);
    }

    set({ settings: nextSettings });
    persistFromState(get());
  },

  resetAllProgress: () => {
    clearCelebrationTimer();
    activeDragSession = null;
    clearPersistedState();
    soundManager.setMusic(false);
    const level1 = getLevelPuzzle(1);
    const board = createInitialBoard(level1);
    const validation = validateBoard(level1, board);
    const todayKey = getTodayDateKey();

    set({
      screen: 'welcome',
      isPaused: false,
      isSettingsOpen: false,
      isTutorialOpen: false,
      isDailyCalendarOpen: false,
      rewardedAdPlacement: null,
      lastAdFeedback: null,
      unlockedWorldModal: null,
      unlockedCatModal: null,
      chestRevealModal: null,
      isCelebratingBoard: false,
      victorySummary: null,
      currentLevelId: 1,
      unlockedLevelId: 1,
      levelProgress: {},
      completedDailyDates: [],
      selectedDifficulty: 'all',
      hasSeenTutorial: false,
      achievements: DEFAULT_ACHIEVEMENTS,
      fishCoins: INITIAL_FISH_COINS,
      boosters: { ...INITIAL_BOOSTERS },
      dailyLogin: { ...INITIAL_DAILY_LOGIN },
      dailyMissions: ensureTodaysMissions(null, todayKey),
      unlockedAchievementIds: [],
      claimedAchievementIds: [],
      unlockedCatIds: ['mochi'],
      activeMascotCatId: 'mochi',
      claimedEventIds: [],
      zeroMistakeSolves: 0,
      specialLevelsCompleted: 0,
      totalStarsEarnedEver: 0,
      puzzle: level1,
      board,
      validation,
      selectedCell: null,
      pencilMode: false,
      undoStack: [],
      redoStack: [],
      activeHint: null,
      elapsedSec: 0,
      hintsUsed: 0,
      mistakesCount: 0,
      isMistakeShieldActive: false,
      settings: DEFAULT_SETTINGS,
    });
  },
}));

export function hasClaimableDailyOrMission(state: GameStoreState): {
  dailyClaimable: boolean;
  missionsClaimableCount: number;
  achievementsClaimableCount: number;
} {
  const dailyClaimable = canClaimDailyReward(state.dailyLogin, getTodayDateKey());
  const missionsClaimableCount = state.dailyMissions.missions.filter(
    (m) => !m.claimed && m.progress >= m.target
  ).length;
  const achievementsClaimableCount = state.unlockedAchievementIds.filter(
    (id) => !state.claimedAchievementIds.includes(id)
  ).length;
  return { dailyClaimable, missionsClaimableCount, achievementsClaimableCount };
}

i18n.on('languageChanged', () => {
  const state = useGameStore.getState();
  const nextValidation = validateBoard(state.puzzle, state.board);
  const nextHint = state.activeHint ? getNextHint(state.puzzle, state.board) : null;
  useGameStore.setState({
    validation: nextValidation,
    activeHint: nextHint,
  });
});
