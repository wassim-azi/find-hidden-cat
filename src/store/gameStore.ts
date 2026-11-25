import { create } from 'zustand';
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
  clearPersistedState,
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_SETTINGS,
  loadPersistedState,
  savePersistedState,
} from '../utils/storage';
import { soundManager } from '../utils/sound';
import { triggerHaptic } from '../utils/haptics';
import { particleBus } from '../components/Effects/ParticleCanvas';
import { getRegionTheme } from '../styles/theme';

export type ScreenName = 'welcome' | 'levels' | 'game';

export interface VictorySummary {
  levelId: number;
  dailyDateKey?: string;
  elapsedSec: number;
  hintsUsed: number;
  stars: number;
  isNewBestTime: boolean;
  bestTimeSec: number;
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
  victorySummary: VictorySummary | null;

  // Progression
  currentLevelId: number;
  unlockedLevelId: number;
  levelProgress: Record<number, LevelProgress>;
  completedDailyDates: string[];
  selectedDifficulty: Difficulty | 'all';
  hasSeenTutorial: boolean;
  achievements: PlayerAchievements;

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
  shakeNonce: number;

  // Settings
  settings: PlayerSettings;

  // Navigation Actions
  goToScreen: (screen: ScreenName) => void;
  startLevel: (levelId: number, resumeIfSaved?: boolean) => void;
  startDailyChallenge: () => void;
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
  applyActiveHint: () => void;
  dismissHint: () => void;
  restartLevel: () => void;
  tickTimer: () => void;

  // Overlays & Settings
  setPaused: (paused: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setTutorialOpen: (open: boolean) => void;
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

function clearCelebrationTimer(): void {
  if (celebrationTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(celebrationTimer);
    celebrationTimer = null;
  }
}

const persisted = loadPersistedState();
const initialLevelId = Math.min(persisted.currentLevelId, TOTAL_LEVELS);
const initialPuzzle = getLevelPuzzle(initialLevelId);
const initialBoard =
  persisted.activePuzzle &&
  persisted.activePuzzle.levelId === initialLevelId &&
  persisted.activePuzzle.board.length === initialPuzzle.size
    ? cloneBoard(persisted.activePuzzle.board)
    : createInitialBoard(initialPuzzle);

const initialValidation = validateBoard(initialPuzzle, initialBoard);

function persistFromState(state: GameStoreState): void {
  savePersistedState({
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

export const useGameStore = create<GameStoreState>((set, get) => ({
  screen: 'welcome',
  previousScreen: 'welcome',

  isPaused: false,
  isSettingsOpen: false,
  isTutorialOpen: false,
  isCelebratingBoard: false,
  victorySummary: null,

  currentLevelId: initialLevelId,
  unlockedLevelId: Math.min(persisted.unlockedLevelId, TOTAL_LEVELS),
  levelProgress: persisted.levelProgress,
  completedDailyDates: persisted.completedDailyDates,
  selectedDifficulty: persisted.selectedDifficulty,
  hasSeenTutorial: persisted.hasSeenTutorial,
  achievements: persisted.achievements,

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
  shakeNonce: 0,

  settings: persisted.settings,

  goToScreen: (screen) => {
    clearCelebrationTimer();
    activeDragSession = null;
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    set({
      previousScreen: state.screen,
      screen,
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
      isPaused: false,
      isCelebratingBoard: false,
      victorySummary: null,
    });
  },

  continueGame: () => {
    const state = get();
    const targetLevel = Math.min(state.currentLevelId, TOTAL_LEVELS);
    state.startLevel(targetLevel, true);
  },

  startNextLevel: () => {
    const state = get();
    if (state.puzzle.dailyDateKey) {
      state.startLevel(state.currentLevelId, false);
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

    // Pencil mode single tap fallback (keyboard/click)
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
    // 1. Tapping an occupied cat cell removes the cat (and cleans orphaned auto-X if enabled)
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

    // 2. Tapping an unselected empty/X cell selects it first
    if (!coordsEqual(state.selectedCell, coord)) {
      soundManager.play('select', state.settings.soundEnabled);
      triggerHaptic('select', state.settings.hapticsEnabled);
      set({ selectedCell: coord });
      return;
    }

    // 3. Tapping an already-selected cell places a cat!
    let nextBoard = setCellValue(state.board, coord, 'cat');
    let nextValidation = validateBoard(state.puzzle, nextBoard);

    // If valid & autoMarkX is ON, sweep soft X marks along eliminated cells!
    if (nextValidation.isValid && state.settings.autoMarkX) {
      nextBoard = applyAutoXForCat(state.puzzle, nextBoard, coord);
      nextValidation = validateBoard(state.puzzle, nextBoard);
    }

    const hasNewConflict = !nextValidation.isValid;
    const regionId = state.puzzle.regions[coord.row]?.[coord.col] ?? 0;
    const theme = getRegionTheme(regionId);

    if (hasNewConflict) {
      soundManager.play('error', state.settings.soundEnabled);
      triggerHaptic('error', state.settings.hapticsEnabled);
    } else if (nextValidation.isSolved) {
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
    } else {
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

    // Handle Victory with celebratory board wave!
    if (nextValidation.isSolved) {
      const stars = calculateStars(
        state.elapsedSec,
        state.hintsUsed,
        state.puzzle.parTimeSec
      );
      const isDaily = Boolean(state.puzzle.dailyDateKey);

      let updatedLevelProgress = state.levelProgress;
      let nextUnlocked = state.unlockedLevelId;
      let nextCurrentLevel = state.currentLevelId;
      let isNewBestTime = true;
      let bestTimeSec = state.elapsedSec;
      let nextDailyDates = state.completedDailyDates;

      if (isDaily && state.puzzle.dailyDateKey) {
        if (!state.completedDailyDates.includes(state.puzzle.dailyDateKey)) {
          nextDailyDates = [...state.completedDailyDates, state.puzzle.dailyDateKey];
        }
      } else {
        const prevProg = state.levelProgress[state.puzzle.id];
        isNewBestTime =
          !prevProg?.bestTimeSec || state.elapsedSec < prevProg.bestTimeSec;
        bestTimeSec = isNewBestTime
          ? state.elapsedSec
          : (prevProg?.bestTimeSec ?? state.elapsedSec);

        const updatedProg: LevelProgress = {
          levelId: state.puzzle.id,
          completed: true,
          bestTimeSec,
          stars: Math.max(prevProg?.stars ?? 0, stars),
          bestHintsUsed:
            prevProg?.bestHintsUsed === null || prevProg?.bestHintsUsed === undefined
              ? state.hintsUsed
              : Math.min(prevProg.bestHintsUsed, state.hintsUsed),
        };

        updatedLevelProgress = {
          ...state.levelProgress,
          [state.puzzle.id]: updatedProg,
        };

        nextUnlocked = Math.min(
          TOTAL_LEVELS,
          Math.max(state.unlockedLevelId, state.puzzle.id + 1)
        );
        nextCurrentLevel = nextUnlocked;
      }

      const newStreak = state.achievements.currentStreak + 1;
      const updatedAchievements: PlayerAchievements = {
        totalCatsFound: state.achievements.totalCatsFound + state.puzzle.size,
        perfectLevels:
          state.achievements.perfectLevels + (state.hintsUsed === 0 ? 1 : 0),
        currentStreak: newStreak,
        bestStreak: Math.max(state.achievements.bestStreak, newStreak),
      };

      const summary: VictorySummary = {
        levelId: state.puzzle.id,
        dailyDateKey: state.puzzle.dailyDateKey,
        elapsedSec: state.elapsedSec,
        hintsUsed: state.hintsUsed,
        stars,
        isNewBestTime,
        bestTimeSec,
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
        isCelebratingBoard: true,
        victorySummary: null,
      });

      persistFromState(get());

      const delayMs = state.settings.reducedMotion ? 120 : 620;
      clearCelebrationTimer();
      celebrationTimer = window.setTimeout(() => {
        celebrationTimer = null;
        set({ isCelebratingBoard: false, victorySummary: summary });
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

    set({
      activeHint: hint,
      selectedCell: hint.targetCell,
      hintsUsed: state.hintsUsed + 1,
    });
    persistFromState(get());
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
      state.victorySummary !== null
    ) {
      return;
    }
    const nextElapsed = state.elapsedSec + 1;
    set({ elapsedSec: nextElapsed });
    if (nextElapsed % 5 === 0) {
      persistFromState(get());
    }
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

    set({
      screen: 'welcome',
      isPaused: false,
      isSettingsOpen: false,
      isTutorialOpen: false,
      isCelebratingBoard: false,
      victorySummary: null,
      currentLevelId: 1,
      unlockedLevelId: 1,
      levelProgress: {},
      completedDailyDates: [],
      selectedDifficulty: 'all',
      hasSeenTutorial: false,
      achievements: DEFAULT_ACHIEVEMENTS,
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
      settings: DEFAULT_SETTINGS,
    });
  },
}));
