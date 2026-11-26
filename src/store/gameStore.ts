import { create } from 'zustand';
import i18n from '../i18n';
import {
  ActivePuzzleSave,
  BoardGrid,
  CandidateMark,
  CellCoord,
  Difficulty,
  GameMode,
  HintResult,
  HintStage,
  LevelLastResult,
  LevelProgress,
  MAX_CLASSIC_HEARTS,
  MoveActionType,
  MoveSnapshot,
  PencilSubMode,
  PlayerAchievements,
  PlayerSettings,
  PuzzleDefinition,
  RuleViolationType,
  ValidationResult,
  cellKey,
} from '../game/gameTypes';
import {
  getDailyPuzzle,
  getLevelPuzzle,
  getPuzzleAnalysis,
  getTodayDateKey,
  TOTAL_LEVELS,
} from '../game/levels';
import {
  cloneBoard,
  createInitialBoard,
  getEliminatedCellsForCat,
  isLockedCell,
} from '../game/puzzleEngine';
import {
  calculateStars,
  evaluateCatPlacement,
  getPlacedCats,
  validateBoard,
} from '../game/validation';
import { getProgressiveHint } from '../game/hintEngine';
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
  getWeeklyClaimCount,
  grantStreakFreeze,
  INITIAL_DAILY_LOGIN,
  StreakMilestone,
  tryRecoverStreak,
} from '../game/dailyRewards';
import {
  applyMissionEvent,
  DailyMissionsState,
  ensureTodaysMissions,
  ensureWeeklyMissions,
  getMilestoneProgress,
  MILESTONE_LADDER,
  MissionEligibilityContext,
  rerollDailyMission as rerollDailyMissionPure,
  WeeklyMissionsState,
} from '../game/missions';
import {
  ACHIEVEMENTS,
  backfillAchievements,
  formatAchievementUnlockToast,
  getAchievementCopy,
  getNewlyUnlockedAchievements,
} from '../game/achievements';
import { AccessoryId } from '../game/accessories';
import { CAT_SETS, CatSetId, getSetProgress } from '../game/catSets';
import {
  CatUnlockEntry,
  CollectibleCat,
  getCollectibleCat,
  getNewlyUnlockedCats,
  VALID_CAT_IDS,
} from '../game/collectibleCats';
import {
  getNextWorldAfter,
  getSpecialNodeInfo,
  getWorldForLevel,
  isWorldFinalLevel,
  WorldDefinition,
} from '../game/worlds';
import {
  getCurrentWeekKey,
  getGoldenCatPuzzle,
  GOLDEN_CAT_BONUS_BOOSTER,
  GOLDEN_CAT_BONUS_COINS,
  WORLD_EVENTS,
  WorldEventId,
} from '../game/events';
import { getWeekKey } from '../game/dateKeys';
import {
  applyGameEvent,
  EMPTY_PROGRESS_STATS,
  GameEvent,
  ProgressStats,
  PuzzleCompletedEvent,
  PuzzleSource,
} from '../game/progressStats';
import { emitToListeners } from '../game/gameEvents';
import { buildUnlockContext } from '../game/unlockContext';
import { toDateKey } from '../services/reminderPlanner';
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
import { isResumableSave, resolveSessionGameMode } from './sessionGuards';
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

export function canUseHeartRefill(s: {
  gameMode: GameMode;
  hearts: number;
  validation: { isSolved: boolean };
}): 'ok' | 'practice' | 'full' | 'solved' {
  if (s.validation.isSolved) return 'solved';
  if (s.gameMode !== 'classic') return 'practice';
  if (s.hearts >= MAX_CLASSIC_HEARTS) return 'full';
  return 'ok';
}

function heartRefillBlockedToastKey(
  why: Exclude<ReturnType<typeof canUseHeartRefill>, 'ok'>
): string {
  if (why === 'practice') return 'toasts.heartRefillClassicOnly';
  if (why === 'full') return 'toasts.heartsFull';
  return 'toasts.boardAlreadyClean';
}

export interface MistakeFlash {
  cells: CellCoord[];
  message: string;
  rule: RuleViolationType;
  nonce: number;
}

export type Improvement =
  | { kind: 'stars'; from: number; to: number }
  | { kind: 'time'; fromSec: number; toSec: number }
  | { kind: 'firstNoHint' }
  | { kind: 'firstNoMistake' };

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
  isPracticeMode?: boolean;
  isReplay: boolean;
  improvements: Improvement[];
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
  outOfHearts: boolean;
  pendingBoosterConfirm: BoosterId | null;
  rewardedAdPlacement: RewardedAdPlacement | null;
  lastAdFeedback: string | null;
  unlockedWorldModal: WorldDefinition | null;
  unlockedCatQueue: string[];
  unlockedCatModal: CollectibleCat | null;
  chestRevealModal: ChestRevealModalData | null;
  toastMessage: string | null;
  victorySummary: VictorySummary | null;

  // Progression & Economy
  currentLevelId: number;
  unlockedLevelId: number;
  levelProgress: Record<number, LevelProgress>;
  campaignSaveLevelIds: number[];
  completedDailyDates: string[];
  selectedDifficulty: Difficulty | 'all';
  hasSeenTutorial: boolean;
  achievements: PlayerAchievements;
  fishCoins: number;
  boosters: BoosterInventory;
  dailyLogin: DailyLoginState;
  dailyMissions: DailyMissionsState;
  weeklyMissions: WeeklyMissionsState;
  milestoneIndex: number;
  unlockedAchievementIds: string[];
  claimedAchievementIds: string[];
  pendingAchievementBackfillCount: number;
  unlockedCatIds: string[];
  activeMascotCatId: string;
  catUnlockLog: Record<string, CatUnlockEntry>;
  favouriteCatIds: string[];
  unlockedAccessoryIds: AccessoryId[];
  activeAccessoryId: AccessoryId | null;
  claimedSetIds: string[];
  claimedEventIds: string[];
  zeroMistakeSolves: number;
  specialLevelsCompleted: number;
  totalStarsEarnedEver: number;
  progressStats: ProgressStats;

  // Active Puzzle Session
  puzzle: PuzzleDefinition;
  board: BoardGrid;
  manualXKeys: string[];
  autoXKeys: string[];
  candidateMarks: Record<string, CandidateMark>;
  validation: ValidationResult;
  selectedCell: CellCoord | null;
  pencilMode: boolean;
  pencilSubMode: PencilSubMode;
  gameMode: GameMode;
  hearts: number;
  mistakeFlash: MistakeFlash | null;
  undoStack: MoveSnapshot[];
  redoStack: MoveSnapshot[];
  activeHint: HintResult | null;
  hintStage: HintStage;
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

  // Gameplay & Control Actions
  tapCell: (coord: CellCoord) => void;
  doubleTapCell: (coord: CellCoord) => void;
  longPressCell: (coord: CellCoord) => void;
  attemptPlaceCat: (coord: CellCoord) => boolean;
  removeCatAt: (coord: CellCoord) => void;
  toggleManualX: (coord: CellCoord) => void;
  toggleCandidate: (coord: CellCoord) => void;
  clearCellMarks: (coord: CellCoord) => void;
  clearAllMarks: () => void;
  placeOrToggleDirect: (coord: CellCoord, mode: 'cat' | 'x') => void;
  beginDragMark: (coord: CellCoord) => void;
  dragMarkCell: (coord: CellCoord) => void;
  endDragMark: () => void;
  togglePencilMode: () => void;
  setPencilSubMode: (sub: PencilSubMode) => void;
  setGameMode: (mode: GameMode) => void;
  continueInPracticeMode: () => void;
  undo: () => void;
  redo: () => void;
  requestHint: () => void;
  escalateHint: () => void;
  requestUseBooster: (boosterId: BoosterId) => void;
  confirmUseBooster: () => boolean;
  cancelUseBooster: () => void;
  useBooster: (boosterId: BoosterId) => boolean;
  useHeartRefillFromOutOfHearts: () => boolean;
  applyActiveHint: () => void;
  dismissHint: () => void;
  restartLevel: () => void;
  tickTimer: () => void;
  recordSessionStart: () => void;

  // Economy, Shop, Daily, Missions, Cats, Achievements, Events, Ads
  purchaseBooster: (boosterId: BoosterId) => boolean;
  claimTodaysDailyReward: () => {
    claimed: boolean;
    reward: DailyRewardSlot | null;
    usedStreakShield: boolean;
    streakBroken: boolean;
    luckyBonusCoins: number;
    milestone: StreakMilestone | null;
  };
  claimMissionReward: (missionId: string) => boolean;
  rerollDailyMission: (missionId: string) => boolean;
  claimMilestone: () => boolean;
  claimAchievementReward: (achievementId: string) => boolean;
  claimEventChest: (eventId: WorldEventId) => boolean;
  selectMascotCat: (catId: string) => void;
  toggleFavouriteCat: (catId: string) => void;
  claimCatSet: (setId: CatSetId) => boolean;
  selectAccessory: (id: AccessoryId | null) => boolean;
  enqueueUnlockedCats: (catIds: string[]) => void;
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
let mistakeFlashTimer: number | null = null;
let lastPurchaseTimestamp = 0;

function clearCelebrationTimer(): void {
  if (celebrationTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(celebrationTimer);
    celebrationTimer = null;
  }
}

/** Mirrors the `.rotate-hint` CSS rule: the board is covered, so the clock must not run. */
function isBoardHiddenByOrientation(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches
  );
}

function clearMistakeFlashTimer(): void {
  if (mistakeFlashTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(mistakeFlashTimer);
    mistakeFlashTimer = null;
  }
}

/**
 * Computes auto-eliminated cell keys from all placed cats on `board` when `autoMarkX` is enabled,
 * and returns a synchronized `BoardGrid` + `autoXKeys` WITHOUT ever modifying `manualXKeys` or `candidateMarks`.
 */
function syncBoardMarks(
  puzzle: PuzzleDefinition,
  rawBoard: BoardGrid,
  manualXKeys: string[],
  autoMarkX: boolean
): { board: BoardGrid; autoXKeys: string[]; manualXKeys: string[] } {
  const size = puzzle.size;
  const catSet = new Set<string>();
  const placedCats = getPlacedCats(rawBoard);
  for (const c of placedCats) {
    catSet.add(cellKey(c.row, c.col));
  }

  // Filter manual X keys so they never collide with placed cats
  const cleanManualSet = new Set<string>();
  for (const k of manualXKeys) {
    if (!catSet.has(k)) cleanManualSet.add(k);
  }

  // Compute Auto-X keys purely from placed cats
  const autoSet = new Set<string>();
  if (autoMarkX) {
    for (const cat of placedCats) {
      const eliminated = getEliminatedCellsForCat(puzzle, cat);
      for (const e of eliminated) {
        const ek = cellKey(e.row, e.col);
        if (!catSet.has(ek)) {
          autoSet.add(ek);
        }
      }
    }
  }

  const nextBoard: BoardGrid = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const k = cellKey(r, c);
      if (catSet.has(k)) return 'cat';
      if (cleanManualSet.has(k) || autoSet.has(k)) return 'x';
      return 'empty';
    })
  );

  return {
    board: nextBoard,
    autoXKeys: Array.from(autoSet),
    manualXKeys: Array.from(cleanManualSet),
  };
}

/**
 * Extracts manual X keys when migrating a legacy board that didn't store `manualXKeys` separately.
 */
function extractLegacyManualXKeys(
  puzzle: PuzzleDefinition,
  board: BoardGrid,
  autoMarkX: boolean
): string[] {
  const autoSet = new Set<string>();
  if (autoMarkX) {
    for (const cat of getPlacedCats(board)) {
      for (const e of getEliminatedCellsForCat(puzzle, cat)) {
        autoSet.add(cellKey(e.row, e.col));
      }
    }
  }
  const manual: string[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r]!.length; c++) {
      const k = cellKey(r, c);
      if (board[r]![c] === 'x' && !autoSet.has(k)) {
        manual.push(k);
      }
    }
  }
  return manual;
}

function makeSnapshot(
  state: Pick<GameStoreState, 'board' | 'manualXKeys' | 'candidateMarks' | 'selectedCell'>,
  actionType: MoveActionType
): MoveSnapshot {
  return {
    board: cloneBoard(state.board),
    manualXKeys: [...state.manualXKeys],
    candidateMarks: { ...state.candidateMarks },
    selectedCell: state.selectedCell ? { ...state.selectedCell } : null,
    actionType,
  };
}

const persisted = loadPersistedState();
const initialTodayKey = getTodayDateKey();
const initialLevelId = Math.min(persisted.currentLevelId, TOTAL_LEVELS);
const initialPuzzle = getLevelPuzzle(initialLevelId);

const MAX_CAMPAIGN_SAVES = 5;

/**
 * Per-level in-progress CAMPAIGN saves (at most 5 most recently touched).
 * Replaying another campaign level or Daily/Golden puzzle never clobbers other slots.
 */
let campaignSaves: Record<number, ActivePuzzleSave> = {};
for (const [key, save] of Object.entries(persisted.activeCampaignPuzzles)) {
  const id = Number(key);
  if (Number.isInteger(id) && id >= 1 && id === save.levelId) {
    campaignSaves[id] = save;
  }
}

function getCampaignSaveLevelIds(): number[] {
  return Object.keys(campaignSaves)
    .map(Number)
    .sort((a, b) => a - b);
}

function pruneCampaignSaves(): void {
  const entries = Object.entries(campaignSaves);
  if (entries.length <= MAX_CAMPAIGN_SAVES) return;
  entries.sort((a, b) => (b[1].savedAt ?? 0) - (a[1].savedAt ?? 0));
  const next: Record<number, ActivePuzzleSave> = {};
  for (const [k, v] of entries.slice(0, MAX_CAMPAIGN_SAVES)) {
    next[Number(k)] = v;
  }
  campaignSaves = next;
}

const initialCampaignSave = campaignSaves[initialLevelId] ?? null;
const hasMatchingSave = isResumableSave(initialCampaignSave, initialPuzzle);

type DailySessionSave = ActivePuzzleSave & { dailyDateKey: string };
/** In-progress Daily Kitty / Golden Cat sessions, keyed by their dailyDateKey. */
let specialSaves: Record<string, DailySessionSave> = { ...persisted.activeSpecialPuzzles };

const rawInitialBoard = hasMatchingSave
  ? cloneBoard(initialCampaignSave!.board)
  : createInitialBoard(initialPuzzle);

const initialManualX = hasMatchingSave
  ? (initialCampaignSave!.manualXKeys ??
    extractLegacyManualXKeys(initialPuzzle, rawInitialBoard, persisted.settings.autoMarkX))
  : [];

const initialSynced = syncBoardMarks(
  initialPuzzle,
  rawInitialBoard,
  initialManualX,
  persisted.settings.autoMarkX
);

const initialCandidates: Record<string, CandidateMark> = hasMatchingSave
  ? { ...(initialCampaignSave!.candidateMarks ?? {}) }
  : {};

function missionEligibilityFromState(
  levelProgress: Record<number, LevelProgress>,
  unlockedLevelId: number
): MissionEligibilityContext {
  const completedLevelCount = Object.values(levelProgress).filter((p) => p.completed).length;
  return { completedLevelCount, unlockedLevelId };
}

const initialEligibility = missionEligibilityFromState(
  persisted.levelProgress,
  Math.min(persisted.unlockedLevelId, TOTAL_LEVELS)
);
const initialValidation = validateBoard(initialPuzzle, initialSynced.board);
const initialMissions = ensureTodaysMissions(
  persisted.dailyMissions,
  initialTodayKey,
  initialEligibility
);
const initialWeeklyMissions = ensureWeeklyMissions(
  persisted.weeklyMissions,
  getCurrentWeekKey(),
  initialEligibility
);
const initialAchBackfill = backfillAchievements(
  buildUnlockContext({
    levelProgress: persisted.levelProgress,
    unlockedLevelId: Math.min(persisted.unlockedLevelId, TOTAL_LEVELS),
    progressStats: persisted.progressStats,
    unlockedAchievementIds: persisted.unlockedAchievementIds,
    unlockedCatIds: persisted.unlockedCatIds,
  }),
  persisted.unlockedAchievementIds
);
if (initialAchBackfill.addedCount > 0) {
  savePersistedState({
    ...persisted,
    unlockedAchievementIds: initialAchBackfill.nextUnlockedIds,
  });
}

type ResumeSource =
  | { kind: 'live' }
  | { kind: 'saved'; save: ActivePuzzleSave }
  | { kind: 'fresh' };

/**
 * Builds the complete active-session fields for starting (or resuming) `puzzle`.
 * Centralised so campaign, Daily and Golden puzzles all restore the same state shape.
 */
function buildSessionFields(
  state: GameStoreState,
  puzzle: PuzzleDefinition,
  source: ResumeSource
): Partial<GameStoreState> {
  const autoMarkX = state.settings.autoMarkX;
  let rawBoard: BoardGrid;
  let manualX: string[];
  let candidates: Record<string, CandidateMark>;
  if (source.kind === 'live') {
    rawBoard = cloneBoard(state.board);
    manualX = [...state.manualXKeys];
    candidates = { ...state.candidateMarks };
  } else if (source.kind === 'saved') {
    rawBoard = cloneBoard(source.save.board);
    manualX =
      source.save.manualXKeys ?? extractLegacyManualXKeys(puzzle, rawBoard, autoMarkX);
    candidates = { ...(source.save.candidateMarks ?? {}) };
  } else {
    rawBoard = createInitialBoard(puzzle);
    manualX = [];
    candidates = {};
  }
  const synced = syncBoardMarks(puzzle, rawBoard, manualX, autoMarkX);

  const saved = source.kind === 'saved' ? source.save : null;
  const live = source.kind === 'live';
  return {
    screen: 'game',
    previousScreen: state.screen === 'game' ? state.previousScreen : state.screen,
    puzzle,
    board: synced.board,
    manualXKeys: synced.manualXKeys,
    autoXKeys: synced.autoXKeys,
    candidateMarks: candidates,
    validation: validateBoard(puzzle, synced.board),
    selectedCell: null,
    pencilMode: false,
    pencilSubMode: 'x',
    gameMode: live
      ? state.gameMode
      : (saved?.gameMode ?? state.settings.gameMode),
    hearts: live ? state.hearts : (saved?.hearts ?? MAX_CLASSIC_HEARTS),
    outOfHearts: false,
    mistakeFlash: null,
    pendingBoosterConfirm: null,
    undoStack: live ? state.undoStack : [],
    redoStack: live ? state.redoStack : [],
    activeHint: null,
    hintStage: 1,
    elapsedSec: live ? state.elapsedSec : (saved?.elapsedSec ?? 0),
    hintsUsed: live ? state.hintsUsed : (saved?.hintsUsed ?? 0),
    mistakesCount: live ? state.mistakesCount : (saved?.mistakesCount ?? 0),
    isMistakeShieldActive: false,
    isPaused: false,
    isCelebratingBoard: false,
    victorySummary: null,
  };
}

/** True when the in-memory session for `puzzle` can simply continue. */
function canContinueLiveSession(state: GameStoreState, puzzle: PuzzleDefinition): boolean {
  return (
    state.puzzle.id === puzzle.id &&
    state.puzzle.dailyDateKey === puzzle.dailyDateKey &&
    !state.validation.isSolved &&
    !state.victorySummary &&
    !state.isCelebratingBoard &&
    !state.outOfHearts &&
    (state.gameMode === 'practice' || state.hearts > 0) &&
    state.board.length === puzzle.size
  );
}

/** Daily/Golden puzzles resume the live board or today's saved board, never another day's. */
function resolveSpecialSource(state: GameStoreState, puzzle: PuzzleDefinition): ResumeSource {
  if (canContinueLiveSession(state, puzzle)) return { kind: 'live' };
  const saved = puzzle.dailyDateKey ? specialSaves[puzzle.dailyDateKey] : undefined;
  if (saved && isResumableSave(saved, puzzle)) {
    return { kind: 'saved', save: saved };
  }
  return { kind: 'fresh' };
}

/**
 * Applies a Classic/Practice request: the preference always updates (it applies to new
 * puzzles), but an in-progress puzzle can only be downgraded to Practice. Upgrading mid-puzzle
 * is deferred so Practice mistakes can never be laundered into Classic stars or refilled hearts.
 */
function applyGameModeRequest(
  state: GameStoreState,
  mode: GameMode,
  set: (partial: Partial<GameStoreState>) => void
): void {
  const { sessionMode, deferred } = resolveSessionGameMode(
    {
      gameMode: state.gameMode,
      elapsedSec: state.elapsedSec,
      mistakesCount: state.mistakesCount,
      hintsUsed: state.hintsUsed,
      undoStackLength: state.undoStack.length,
      isSolved: state.validation.isSolved,
    },
    mode
  );
  set({
    settings: { ...state.settings, gameMode: mode },
    gameMode: sessionMode,
    outOfHearts: sessionMode === 'practice' ? false : state.outOfHearts,
    hearts:
      sessionMode === 'classic' && state.gameMode !== 'classic'
        ? MAX_CLASSIC_HEARTS
        : state.hearts,
  });
  if (deferred) {
    state.showToast(i18n.t('toasts.classicNextPuzzle'));
  }
}

function buildSessionSave(state: GameStoreState): ActivePuzzleSave {
  return {
    levelId: state.puzzle.id,
    board: state.board,
    manualXKeys: state.manualXKeys,
    candidateMarks: state.candidateMarks,
    elapsedSec: state.elapsedSec,
    hintsUsed: state.hintsUsed,
    mistakesCount: state.mistakesCount,
    hearts: state.hearts,
    gameMode: state.gameMode,
  };
}

let lastEventAt = 0;
function nextEventAt(): number {
  const now = Date.now();
  lastEventAt = now > lastEventAt ? now : lastEventAt + 1;
  return lastEventAt;
}

function recordEvent(e: GameEvent): void {
  useGameStore.setState((s) => ({
    progressStats: applyGameEvent(s.progressStats, e),
  }));
  emitToListeners(e);
}

function persistFromState(state: GameStoreState): void {
  const finished = Boolean(
    state.victorySummary || state.isCelebratingBoard || state.validation.isSolved
  );
  const dailyKey = state.puzzle.dailyDateKey;
  if (dailyKey) {
    const next: Record<string, DailySessionSave> = {};
    // Keep only sessions that can still be resumed: today's Daily and this week's Golden Cat
    const liveKeys = new Set([getTodayDateKey(), `golden-${getCurrentWeekKey()}`, dailyKey]);
    for (const [k, v] of Object.entries(specialSaves)) {
      if (liveKeys.has(k) && k !== dailyKey) next[k] = v;
    }
    if (!finished) next[dailyKey] = { ...buildSessionSave(state), dailyDateKey: dailyKey };
    specialSaves = next;
  } else if (finished) {
    delete campaignSaves[state.puzzle.id];
  } else {
    campaignSaves[state.puzzle.id] = {
      ...buildSessionSave(state),
      savedAt: Date.now(),
    };
    pruneCampaignSaves();
  }

  const activeCampaignPuzzles: Record<string, ActivePuzzleSave> = {};
  for (const [id, save] of Object.entries(campaignSaves)) {
    activeCampaignPuzzles[String(id)] = save;
  }

  savePersistedState({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    currentLevelId: state.currentLevelId,
    unlockedLevelId: state.unlockedLevelId,
    levelProgress: state.levelProgress,
    settings: state.settings,
    selectedDifficulty: state.selectedDifficulty,
    hasSeenTutorial: state.hasSeenTutorial,
    activePuzzle: null,
    activeCampaignPuzzles,
    activeSpecialPuzzles: specialSaves,
    achievements: state.achievements,
    completedDailyDates: state.completedDailyDates,
    fishCoins: state.fishCoins,
    boosters: state.boosters,
    dailyLogin: state.dailyLogin,
    dailyMissions: state.dailyMissions,
    weeklyMissions: state.weeklyMissions,
    milestoneIndex: state.milestoneIndex,
    unlockedAchievementIds: state.unlockedAchievementIds,
    claimedAchievementIds: state.claimedAchievementIds,
    unlockedCatIds: state.unlockedCatIds,
    activeMascotCatId: state.activeMascotCatId,
    catUnlockLog: state.catUnlockLog,
    favouriteCatIds: state.favouriteCatIds,
    unlockedAccessoryIds: state.unlockedAccessoryIds,
    activeAccessoryId: state.activeAccessoryId,
    claimedSetIds: state.claimedSetIds,
    claimedEventIds: state.claimedEventIds,
    zeroMistakeSolves: state.zeroMistakeSolves,
    specialLevelsCompleted: state.specialLevelsCompleted,
    totalStarsEarnedEver: state.totalStarsEarnedEver,
    progressStats: state.progressStats,
  });

  const nextIds = getCampaignSaveLevelIds();
  const prevIds = useGameStore.getState().campaignSaveLevelIds;
  if (
    nextIds.length !== prevIds.length ||
    nextIds.some((id, idx) => id !== prevIds[idx])
  ) {
    useGameStore.setState({ campaignSaveLevelIds: nextIds });
  }
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  screen: 'welcome',
  previousScreen: 'welcome',

  isPaused: false,
  isSettingsOpen: false,
  isTutorialOpen: false,
  isCelebratingBoard: false,
  isDailyCalendarOpen: false,
  outOfHearts: false,
  pendingBoosterConfirm: null,
  rewardedAdPlacement: null,
  lastAdFeedback: null,
  unlockedWorldModal: null,
  unlockedCatQueue: [],
  unlockedCatModal: null,
  chestRevealModal: null,
  toastMessage: null,
  victorySummary: null,

  currentLevelId: initialLevelId,
  unlockedLevelId: Math.min(persisted.unlockedLevelId, TOTAL_LEVELS),
  levelProgress: persisted.levelProgress,
  campaignSaveLevelIds: getCampaignSaveLevelIds(),
  completedDailyDates: persisted.completedDailyDates,
  selectedDifficulty: persisted.selectedDifficulty,
  hasSeenTutorial: persisted.hasSeenTutorial,
  achievements: persisted.achievements,
  fishCoins: persisted.fishCoins,
  boosters: persisted.boosters,
  dailyLogin: persisted.dailyLogin,
  dailyMissions: initialMissions,
  weeklyMissions: initialWeeklyMissions,
  milestoneIndex: persisted.milestoneIndex,
  unlockedAchievementIds: initialAchBackfill.nextUnlockedIds,
  claimedAchievementIds: persisted.claimedAchievementIds,
  pendingAchievementBackfillCount: initialAchBackfill.addedCount,
  unlockedCatIds: persisted.unlockedCatIds,
  activeMascotCatId: persisted.activeMascotCatId,
  catUnlockLog: persisted.catUnlockLog,
  favouriteCatIds: persisted.favouriteCatIds,
  unlockedAccessoryIds: persisted.unlockedAccessoryIds,
  activeAccessoryId: persisted.activeAccessoryId,
  claimedSetIds: persisted.claimedSetIds,
  claimedEventIds: persisted.claimedEventIds,
  zeroMistakeSolves: persisted.zeroMistakeSolves,
  specialLevelsCompleted: persisted.specialLevelsCompleted,
  totalStarsEarnedEver: persisted.totalStarsEarnedEver,
  progressStats: persisted.progressStats,

  puzzle: initialPuzzle,
  board: initialSynced.board,
  manualXKeys: initialSynced.manualXKeys,
  autoXKeys: initialSynced.autoXKeys,
  candidateMarks: initialCandidates,
  validation: initialValidation,
  selectedCell: null,
  pencilMode: false,
  pencilSubMode: 'x',
  gameMode: hasMatchingSave
    ? (initialCampaignSave!.gameMode ?? persisted.settings.gameMode)
    : persisted.settings.gameMode,
  hearts: hasMatchingSave
    ? Math.max(0, initialCampaignSave!.hearts ?? MAX_CLASSIC_HEARTS)
    : MAX_CLASSIC_HEARTS,
  mistakeFlash: null,
  undoStack: [],
  redoStack: [],
  activeHint: null,
  hintStage: 1,
  elapsedSec: hasMatchingSave ? initialCampaignSave!.elapsedSec : 0,
  hintsUsed: hasMatchingSave ? initialCampaignSave!.hintsUsed : 0,
  mistakesCount: hasMatchingSave ? (initialCampaignSave!.mistakesCount ?? 0) : 0,
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
    clearMistakeFlashTimer();
    activeDragSession = null;
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);

    const todayKey = getTodayDateKey();
    const eligibility = missionEligibilityFromState(
      state.levelProgress,
      state.unlockedLevelId
    );
    const freshMissions = ensureTodaysMissions(state.dailyMissions, todayKey, eligibility);
    const freshWeekly = ensureWeeklyMissions(
      state.weeklyMissions,
      getCurrentWeekKey(),
      eligibility
    );

    const backfillToNotify =
      screen === 'missions' && state.pendingAchievementBackfillCount > 0
        ? state.pendingAchievementBackfillCount
        : 0;

    set({
      previousScreen: state.screen,
      screen,
      dailyMissions: freshMissions,
      weeklyMissions: freshWeekly,
      ...(backfillToNotify > 0 ? { pendingAchievementBackfillCount: 0 } : {}),
      isPaused: false,
      outOfHearts: false,
      pendingBoosterConfirm: null,
      mistakeFlash: null,
      isCelebratingBoard: false,
      victorySummary: screen === 'game' ? state.victorySummary : null,
    });

    if (backfillToNotify > 0) {
      get().showToast(
        i18n.t('achievements.backfillToast', { count: backfillToNotify })
      );
    }
  },

  startLevel: (levelId, resumeIfSaved = false) => {
    clearCelebrationTimer();
    clearMistakeFlashTimer();
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
    const savedSlot = campaignSaves[clampedId];
    const source: ResumeSource = !resumeIfSaved
      ? { kind: 'fresh' }
      : canContinueLiveSession(state, puzzle)
        ? { kind: 'live' }
        : savedSlot && isResumableSave(savedSlot, puzzle)
          ? { kind: 'saved', save: savedSlot }
          : { kind: 'fresh' };

    soundManager.play('button', state.settings.soundEnabled);
    if (state.settings.musicEnabled) {
      soundManager.setMusic(true);
    }

    set({
      ...buildSessionFields(state, puzzle, source),
      currentLevelId: clampedId,
      isTutorialOpen: !state.hasSeenTutorial && clampedId === 1,
    });

    persistFromState(get());
  },

  startDailyChallenge: () => {
    clearCelebrationTimer();
    clearMistakeFlashTimer();
    activeDragSession = null;
    const state = get();
    const todayKey = getTodayDateKey();
    const dailyPuzzle = getDailyPuzzle(todayKey);

    soundManager.play('button', state.settings.soundEnabled);
    if (state.settings.musicEnabled) {
      soundManager.setMusic(true);
    }

    set(buildSessionFields(state, dailyPuzzle, resolveSpecialSource(state, dailyPuzzle)));
    persistFromState(get());
  },

  startGoldenCatTrial: () => {
    clearCelebrationTimer();
    clearMistakeFlashTimer();
    activeDragSession = null;
    const state = get();
    const goldenPuzzle = getGoldenCatPuzzle(getCurrentWeekKey());

    soundManager.play('button', state.settings.soundEnabled);
    set(buildSessionFields(state, goldenPuzzle, resolveSpecialSource(state, goldenPuzzle)));
    persistFromState(get());
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

  setGameMode: (mode) => {
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    applyGameModeRequest(state, mode, set);
    persistFromState(get());
  },

  continueInPracticeMode: () => {
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    set({
      gameMode: 'practice',
      outOfHearts: false,
      mistakeFlash: null,
    });
    state.showToast(i18n.t('toasts.switchedPractice'));
    persistFromState(get());
  },

  beginDragMark: (coord) => {
    const state = get();
    if (
      !state.pencilMode ||
      state.pencilSubMode !== 'x' ||
      state.isPaused ||
      state.outOfHearts ||
      state.victorySummary ||
      state.isCelebratingBoard
    ) {
      return;
    }
    if (isLockedCell(state.puzzle, coord)) return;
    const currentVal = state.board[coord.row]?.[coord.col];
    if (!currentVal || currentVal === 'cat') {
      soundManager.play('select', state.settings.soundEnabled);
      set({ selectedCell: coord });
      return;
    }

    const key = cellKey(coord.row, coord.col);
    const hasManualX = state.manualXKeys.includes(key);
    const targetValue: 'x' | 'empty' = hasManualX ? 'empty' : 'x';

    activeDragSession = {
      targetValue,
      snapshotTaken: true,
      stepCount: 0,
    };

    const nextManual =
      targetValue === 'x'
        ? Array.from(new Set([...state.manualXKeys, key]))
        : state.manualXKeys.filter((k) => k !== key);

    const synced = syncBoardMarks(
      state.puzzle,
      state.board,
      nextManual,
      state.settings.autoMarkX
    );
    const nextValidation = validateBoard(state.puzzle, synced.board);

    soundManager.playDragX(0, state.settings.soundEnabled);
    triggerHaptic('x', state.settings.hapticsEnabled);

    set({
      board: synced.board,
      manualXKeys: synced.manualXKeys,
      autoXKeys: synced.autoXKeys,
      validation: nextValidation,
      selectedCell: coord,
      undoStack: [...state.undoStack.slice(-49), makeSnapshot(state, 'drag-x')],
      redoStack: [],
      activeHint: null,
      hintStage: 1,
      mistakeFlash: null,
    });
  },

  dragMarkCell: (coord) => {
    if (!activeDragSession) return;
    const state = get();
    if (
      !state.pencilMode ||
      state.pencilSubMode !== 'x' ||
      state.isPaused ||
      state.outOfHearts ||
      state.victorySummary ||
      state.isCelebratingBoard
    ) {
      return;
    }
    if (isLockedCell(state.puzzle, coord)) return;

    const currentVal = state.board[coord.row]?.[coord.col];
    if (!currentVal || currentVal === 'cat') return;

    const key = cellKey(coord.row, coord.col);
    const hasManualX = state.manualXKeys.includes(key);
    if (
      (activeDragSession.targetValue === 'x' && hasManualX) ||
      (activeDragSession.targetValue === 'empty' && !hasManualX)
    ) {
      return;
    }

    activeDragSession.stepCount += 1;
    const nextManual =
      activeDragSession.targetValue === 'x'
        ? Array.from(new Set([...state.manualXKeys, key]))
        : state.manualXKeys.filter((k) => k !== key);

    const synced = syncBoardMarks(
      state.puzzle,
      state.board,
      nextManual,
      state.settings.autoMarkX
    );
    const nextValidation = validateBoard(state.puzzle, synced.board);

    soundManager.playDragX(activeDragSession.stepCount, state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    set({
      board: synced.board,
      manualXKeys: synced.manualXKeys,
      autoXKeys: synced.autoXKeys,
      validation: nextValidation,
      selectedCell: coord,
      activeHint: null,
      hintStage: 1,
    });
  },

  endDragMark: () => {
    if (activeDragSession) {
      activeDragSession = null;
      persistFromState(get());
    }
  },

  toggleManualX: (coord) => {
    const state = get();
    if (state.isPaused || state.outOfHearts || state.victorySummary || state.isCelebratingBoard) {
      return;
    }
    if (isLockedCell(state.puzzle, coord)) return;
    if (state.board[coord.row]?.[coord.col] === 'cat') return;

    const key = cellKey(coord.row, coord.col);
    const exists = state.manualXKeys.includes(key);
    const nextManual = exists
      ? state.manualXKeys.filter((k) => k !== key)
      : [...state.manualXKeys, key];

    const synced = syncBoardMarks(
      state.puzzle,
      state.board,
      nextManual,
      state.settings.autoMarkX
    );

    soundManager.play('markX', state.settings.soundEnabled);
    triggerHaptic('x', state.settings.hapticsEnabled);

    set({
      board: synced.board,
      manualXKeys: synced.manualXKeys,
      autoXKeys: synced.autoXKeys,
      validation: validateBoard(state.puzzle, synced.board),
      selectedCell: coord,
      undoStack: [...state.undoStack.slice(-49), makeSnapshot(state, 'toggle-x')],
      redoStack: [],
      mistakeFlash: null,
    });
    persistFromState(get());
  },

  toggleCandidate: (coord) => {
    const state = get();
    if (state.isPaused || state.outOfHearts || state.victorySummary || state.isCelebratingBoard) {
      return;
    }
    if (isLockedCell(state.puzzle, coord)) return;
    if (state.board[coord.row]?.[coord.col] === 'cat') return;

    const key = cellKey(coord.row, coord.col);
    const current = state.candidateMarks[key];
    const nextCandidates = { ...state.candidateMarks };

    if (!current) {
      nextCandidates[key] = 'possible';
    } else if (current === 'possible') {
      nextCandidates[key] = 'priority';
    } else {
      delete nextCandidates[key];
    }

    soundManager.play('select', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    set({
      candidateMarks: nextCandidates,
      selectedCell: coord,
      undoStack: [...state.undoStack.slice(-49), makeSnapshot(state, 'toggle-candidate')],
      redoStack: [],
      mistakeFlash: null,
    });
    persistFromState(get());
  },

  clearCellMarks: (coord) => {
    const state = get();
    if (state.isPaused || state.outOfHearts || state.victorySummary || state.isCelebratingBoard) {
      return;
    }
    const key = cellKey(coord.row, coord.col);
    const hadManual = state.manualXKeys.includes(key);
    const hadCandidate = Boolean(state.candidateMarks[key]);
    if (!hadManual && !hadCandidate) return;

    const nextManual = state.manualXKeys.filter((k) => k !== key);
    const nextCandidates = { ...state.candidateMarks };
    delete nextCandidates[key];

    const synced = syncBoardMarks(
      state.puzzle,
      state.board,
      nextManual,
      state.settings.autoMarkX
    );

    soundManager.play('button', state.settings.soundEnabled);
    set({
      board: synced.board,
      manualXKeys: synced.manualXKeys,
      autoXKeys: synced.autoXKeys,
      candidateMarks: nextCandidates,
      validation: validateBoard(state.puzzle, synced.board),
      undoStack: [...state.undoStack.slice(-49), makeSnapshot(state, 'clear-marks')],
      redoStack: [],
    });
    persistFromState(get());
  },

  clearAllMarks: () => {
    const state = get();
    if (state.isPaused || state.outOfHearts || state.victorySummary || state.isCelebratingBoard) {
      return;
    }
    if (state.manualXKeys.length === 0 && Object.keys(state.candidateMarks).length === 0) {
      state.showToast(i18n.t('toasts.noMarksToClear'));
      return;
    }

    const synced = syncBoardMarks(state.puzzle, state.board, [], state.settings.autoMarkX);

    soundManager.play('button', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    set({
      board: synced.board,
      manualXKeys: [],
      autoXKeys: synced.autoXKeys,
      candidateMarks: {},
      validation: validateBoard(state.puzzle, synced.board),
      undoStack: [...state.undoStack.slice(-49), makeSnapshot(state, 'clear-marks')],
      redoStack: [],
    });
    state.showToast(i18n.t('toasts.marksCleared'));
    persistFromState(get());
  },

  removeCatAt: (coord) => {
    const state = get();
    if (state.isPaused || state.outOfHearts || state.victorySummary || state.isCelebratingBoard) {
      return;
    }
    if (isLockedCell(state.puzzle, coord)) return;
    if (state.board[coord.row]?.[coord.col] !== 'cat') return;

    const rawNext = cloneBoard(state.board);
    rawNext[coord.row]![coord.col] = 'empty';
    const synced = syncBoardMarks(
      state.puzzle,
      rawNext,
      state.manualXKeys,
      state.settings.autoMarkX
    );
    const nextValidation = validateBoard(state.puzzle, synced.board);

    soundManager.play('removeCat', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    set({
      board: synced.board,
      manualXKeys: synced.manualXKeys,
      autoXKeys: synced.autoXKeys,
      validation: nextValidation,
      selectedCell: coord,
      undoStack: [...state.undoStack.slice(-49), makeSnapshot(state, 'remove-cat')],
      redoStack: [],
      activeHint: null,
      hintStage: 1,
      mistakeFlash: null,
    });
    persistFromState(get());
  },

  attemptPlaceCat: (coord) => {
    const state = get();
    if (state.isPaused || state.outOfHearts || state.victorySummary || state.isCelebratingBoard) {
      return false;
    }
    if (isLockedCell(state.puzzle, coord)) return false;
    if (state.board[coord.row]?.[coord.col] === 'cat') return false;

    const evaluation = evaluateCatPlacement(state.puzzle, state.board, coord);

    if (!evaluation.valid) {
      // Mistake Shield absorbs the error cleanly without losing a heart!
      if (state.isMistakeShieldActive) {
        soundManager.play('hint', state.settings.soundEnabled);
        triggerHaptic('hint', state.settings.hapticsEnabled);
        state.showToast(i18n.t('toasts.shieldAbsorbed'));
        set({
          isMistakeShieldActive: false,
          selectedCell: coord,
          shakeNonce: state.shakeNonce + 1,
        });
        persistFromState(get());
        return false;
      }

      const nextNonce = state.shakeNonce + 1;
      const flash: MistakeFlash = {
        cells: evaluation.conflictCells,
        message: evaluation.message ?? i18n.t('validation.unsolvableConflict'),
        rule: evaluation.rule ?? 'unsolvable',
        nonce: nextNonce,
      };

      soundManager.play('error', state.settings.soundEnabled);
      triggerHaptic('error', state.settings.hapticsEnabled);

      clearMistakeFlashTimer();
      if (typeof window !== 'undefined') {
        mistakeFlashTimer = window.setTimeout(() => {
          mistakeFlashTimer = null;
          set({ mistakeFlash: null });
        }, 2800);
      }

      if (state.gameMode === 'classic') {
        const nextHearts = Math.max(0, state.hearts - 1);
        const nextMistakes = state.mistakesCount + 1;
        set({
          hearts: nextHearts,
          mistakesCount: nextMistakes,
          outOfHearts: nextHearts === 0,
          selectedCell: coord,
          shakeNonce: nextNonce,
          mistakeFlash: flash,
          activeHint: null,
          hintStage: 1,
        });
        persistFromState(get());
      } else {
        // Practice Mode: teach gently without deducting hearts (mistakes are still tallied
        // so the session can never be passed off as a mistake-free Classic run)
        set({
          mistakesCount: state.mistakesCount + 1,
          selectedCell: coord,
          shakeNonce: nextNonce,
          mistakeFlash: flash,
        });
      }
      return false;
    }

    // Valid placement! Commit cat, clear any manualX/candidate on that exact tile only,
    // and preserve ALL other manual marks & candidates cleanly.
    const key = cellKey(coord.row, coord.col);
    const rawNext = cloneBoard(state.board);
    rawNext[coord.row]![coord.col] = 'cat';

    const nextManualX = state.manualXKeys.filter((k) => k !== key);
    const nextCandidates = { ...state.candidateMarks };
    delete nextCandidates[key];

    const synced = syncBoardMarks(
      state.puzzle,
      rawNext,
      nextManualX,
      state.settings.autoMarkX
    );
    const nextValidation = validateBoard(state.puzzle, synced.board);

    const regionId = state.puzzle.regions[coord.row]?.[coord.col] ?? 0;
    const theme = getRegionTheme(regionId);

    // Ensure today's daily and this week's weekly missions are rolled over cleanly
    const todayKey = getTodayDateKey();
    const eligibility = missionEligibilityFromState(
      state.levelProgress,
      state.unlockedLevelId
    );
    let updatedMissions = ensureTodaysMissions(state.dailyMissions, todayKey, eligibility);
    let updatedWeeklyMissions = ensureWeeklyMissions(
      state.weeklyMissions,
      getCurrentWeekKey(),
      eligibility
    );

    if (!nextValidation.isSolved) {
      soundManager.play('placeCat', state.settings.soundEnabled);
      triggerHaptic('cat', state.settings.hapticsEnabled);
      if (typeof document !== 'undefined') {
        particleBus.burstElement(
          document.getElementById(`cell-${coord.row}-${coord.col}`),
          theme.bg,
          16
        );
      }

      set({
        board: synced.board,
        manualXKeys: synced.manualXKeys,
        autoXKeys: synced.autoXKeys,
        candidateMarks: nextCandidates,
        validation: nextValidation,
        selectedCell: coord,
        undoStack: [...state.undoStack.slice(-49), makeSnapshot(state, 'place-cat')],
        redoStack: [],
        activeHint: null,
        hintStage: 1,
        mistakeFlash: null,
        dailyMissions: updatedMissions,
        weeklyMissions: updatedWeeklyMissions,
      });
      persistFromState(get());
      return true;
    }

    // Handle Victory!
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

    const isPractice = state.gameMode === 'practice';
    const computedStars = isPractice
      ? 1
      : calculateStars(
          state.elapsedSec,
          state.hintsUsed,
          state.puzzle.parTimeSec,
          state.mistakesCount
        );

    const isDailyOrEvent = Boolean(state.puzzle.dailyDateKey);
    const isGoldenTrial = Boolean(state.puzzle.dailyDateKey?.startsWith('golden-'));
    const prevProg = isDailyOrEvent ? undefined : state.levelProgress[state.puzzle.id];
    let updatedLevelProgress = state.levelProgress;
    let nextUnlocked = state.unlockedLevelId;
    let nextCurrentLevel = state.currentLevelId;
    let isNewBestTime = !isPractice;
    let bestTimeSec = state.elapsedSec;
    let previousBestStars = 0;
    let nextDailyDates = state.completedDailyDates;
    let isFirstCompletion = true;
    let unlockedNextWorld: WorldDefinition | null = null;
    let worldMilestoneBonus = 0;
    let specialNodeBonus = 0;
    let nextSpecialCompleted = state.specialLevelsCompleted;
    let nextBoosters = { ...state.boosters };

    const eventAt = nextEventAt();

    if (isDailyOrEvent && state.puzzle.dailyDateKey) {
      isFirstCompletion = !state.completedDailyDates.includes(state.puzzle.dailyDateKey);
      if (isFirstCompletion && !isPractice) {
        nextDailyDates = [...state.completedDailyDates, state.puzzle.dailyDateKey];
        if (isGoldenTrial) {
          specialNodeBonus = GOLDEN_CAT_BONUS_COINS;
          nextBoosters[GOLDEN_CAT_BONUS_BOOSTER] += 1;
        }
      }
    } else {
      isFirstCompletion = !prevProg?.completed;
      previousBestStars = prevProg?.stars ?? 0;
      const nextAttempts = (prevProg?.attempts ?? (prevProg?.completed ? 1 : 0)) + 1;
      const lastResult: LevelLastResult = {
        stars: computedStars,
        timeSec: state.elapsedSec,
        hintsUsed: state.hintsUsed,
        mistakes: state.mistakesCount,
        mode: state.gameMode,
        at: eventAt,
      };

      if (!isPractice) {
        isNewBestTime =
          !prevProg?.bestTimeSec || state.elapsedSec < prevProg.bestTimeSec;
        bestTimeSec = isNewBestTime
          ? state.elapsedSec
          : (prevProg?.bestTimeSec ?? state.elapsedSec);

        const updatedProg: LevelProgress = {
          levelId: state.puzzle.id,
          completed: true,
          bestTimeSec,
          stars: Math.max(previousBestStars, computedStars),
          bestHintsUsed:
            prevProg?.bestHintsUsed === null || prevProg?.bestHintsUsed === undefined
              ? state.hintsUsed
              : Math.min(prevProg.bestHintsUsed, state.hintsUsed),
          bestMistakes:
            prevProg?.bestMistakes === null || prevProg?.bestMistakes === undefined
              ? state.mistakesCount
              : Math.min(prevProg.bestMistakes, state.mistakesCount),
          attempts: nextAttempts,
          lastResult,
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
      } else {
        // Practice Mode still lets players unlock next level smoothly without awarding Classic perfect-score stats
        isNewBestTime = false;
        bestTimeSec = prevProg?.bestTimeSec ?? state.elapsedSec;
        if (!prevProg?.completed) {
          updatedLevelProgress = {
            ...state.levelProgress,
            [state.puzzle.id]: {
              levelId: state.puzzle.id,
              completed: true,
              bestTimeSec: null,
              stars: Math.max(previousBestStars, 1),
              bestHintsUsed: null,
              bestMistakes: null,
              attempts: nextAttempts,
              lastResult,
            },
          };
          nextUnlocked = Math.min(
            TOTAL_LEVELS,
            Math.max(state.unlockedLevelId, state.puzzle.id + 1)
          );
          nextCurrentLevel = Math.min(TOTAL_LEVELS, Math.max(state.currentLevelId, nextUnlocked));
        } else {
          // Practice replay updates attempts & lastResult while preserving Classic bests untouched
          updatedLevelProgress = {
            ...state.levelProgress,
            [state.puzzle.id]: {
              ...prevProg,
              attempts: nextAttempts,
              lastResult,
            },
          };
        }
      }
    }

    const practiceCoins = isFirstCompletion ? 8 : 0;
    const rewardBreakdown: LevelRewardBreakdown = isPractice
      ? {
          baseCoins: practiceCoins,
          firstClearBonus: 0,
          starBonus: 0,
          specialNodeBonus: 0,
          worldMilestoneBonus: 0,
          starImprovementBonus: 0,
          totalCoins: practiceCoins,
        }
      : calculateLevelCoinReward({
          difficulty: state.puzzle.difficulty,
          stars: computedStars,
          isFirstCompletion,
          specialNodeBonus,
          worldMilestoneBonus,
          isDaily: isDailyOrEvent,
          previousBestStars,
        });

    const nextCoins = state.fishCoins + rewardBreakdown.totalCoins;
    // Never award competitive zero-mistake / no-hint perfect achievements in Practice Mode,
    // and never count replays of a puzzle that already earned them.
    const earnedPerfectLevel =
      !isPractice &&
      state.hintsUsed === 0 &&
      (isDailyOrEvent ? isFirstCompletion : prevProg?.bestHintsUsed !== 0);
    const earnedZeroMistake =
      !isPractice &&
      state.mistakesCount === 0 &&
      (isDailyOrEvent ? isFirstCompletion : prevProg?.bestMistakes !== 0);
    const starsEarnedDelta = isDailyOrEvent
      ? !isPractice && isFirstCompletion
        ? computedStars
        : 0
      : isPractice
        ? isFirstCompletion
          ? 1
          : 0
        : Math.max(0, computedStars - previousBestStars);

    const nextZeroMistakes = state.zeroMistakeSolves + (earnedZeroMistake ? 1 : 0);
    const newStreak = isPractice
      ? state.achievements.currentStreak
      : state.achievements.currentStreak + 1;

    const updatedAchievements: PlayerAchievements = {
      totalCatsFound: state.achievements.totalCatsFound + state.puzzle.size,
      perfectLevels: state.achievements.perfectLevels + (earnedPerfectLevel ? 1 : 0),
      currentStreak: newStreak,
      bestStreak: Math.max(state.achievements.bestStreak, newStreak),
    };

    const catsFoundCount = state.puzzle.size - state.puzzle.initialCats.length;

    const eventDate = new Date(eventAt);
    const eventSource: PuzzleSource = isGoldenTrial
      ? 'golden'
      : isDailyOrEvent
        ? 'daily'
        : 'campaign';
    const puzzleKey =
      isDailyOrEvent && state.puzzle.dailyDateKey
        ? state.puzzle.dailyDateKey
        : `L${state.puzzle.id}`;
    const previousBestTimeSec = isDailyOrEvent ? null : (prevProg?.bestTimeSec ?? null);
    const eventImprovedBest =
      !isPractice &&
      !isFirstCompletion &&
      (computedStars > previousBestStars ||
        (previousBestTimeSec !== null && state.elapsedSec < previousBestTimeSec));
    const techniques = getPuzzleAnalysis(state.puzzle).techniquesUsed.filter(
      (tech) => tech !== 'oracle_fallback'
    );

    const completedEvent: PuzzleCompletedEvent = {
      type: 'puzzle_completed',
      id: `${puzzleKey}:${eventAt}`,
      at: eventAt,
      dateKey: toDateKey(eventDate),
      weekKey: getWeekKey(eventDate),
      source: eventSource,
      puzzleKey,
      levelId: isDailyOrEvent ? null : state.puzzle.id,
      worldId: isDailyOrEvent ? null : getWorldForLevel(state.puzzle.id).id,
      mode: state.gameMode,
      firstCompletion: isFirstCompletion,
      stars: computedStars,
      previousBestStars,
      hintsUsed: state.hintsUsed,
      mistakesCount: state.mistakesCount,
      elapsedSec: state.elapsedSec,
      previousBestTimeSec,
      firstNoHint: earnedPerfectLevel,
      firstNoMistake: earnedZeroMistake,
      improvedBest: eventImprovedBest,
      catsFound: catsFoundCount,
      techniques,
    };

    updatedMissions = {
      ...updatedMissions,
      missions: applyMissionEvent(updatedMissions.missions, completedEvent),
    };
    updatedWeeklyMissions = {
      ...updatedWeeklyMissions,
      missions: applyMissionEvent(updatedWeeklyMissions.missions, completedEvent),
    };

    const nextProgressStats = applyGameEvent(state.progressStats, completedEvent);

    const newlyUnlockedCats = getNewlyUnlockedCats(
      buildUnlockContext({
        levelProgress: updatedLevelProgress,
        unlockedLevelId: nextUnlocked,
        progressStats: nextProgressStats,
        unlockedAchievementIds: state.unlockedAchievementIds,
        unlockedCatIds: state.unlockedCatIds,
      }),
      state.unlockedCatIds
    );
    const nextUnlockedCats = [
      ...state.unlockedCatIds,
      ...newlyUnlockedCats.map((c) => c.id),
    ];
    const nextCatUnlockLog: Record<string, CatUnlockEntry> =
      newlyUnlockedCats.length > 0 ? { ...state.catUnlockLog } : state.catUnlockLog;
    for (const cat of newlyUnlockedCats) {
      if (!nextCatUnlockLog[cat.id]) {
        nextCatUnlockLog[cat.id] = {
          dateKey: completedEvent.dateKey,
          source: completedEvent.puzzleKey,
        };
      }
    }

    const newlyUnlockedAchs = isPractice
      ? []
      : getNewlyUnlockedAchievements(
          buildUnlockContext({
            levelProgress: updatedLevelProgress,
            unlockedLevelId: nextUnlocked,
            progressStats: nextProgressStats,
            unlockedAchievementIds: state.unlockedAchievementIds,
            unlockedCatIds: nextUnlockedCats,
          }),
          state.unlockedAchievementIds
        );
    const nextUnlockedAchs = [
      ...state.unlockedAchievementIds,
      ...newlyUnlockedAchs.map((a) => a.id),
    ];

    const improvements: Improvement[] = [];
    if (!isDailyOrEvent && !isPractice && !isFirstCompletion) {
      if (computedStars > previousBestStars) {
        improvements.push({
          kind: 'stars',
          from: previousBestStars,
          to: computedStars,
        });
      }
      if (previousBestTimeSec !== null && state.elapsedSec < previousBestTimeSec) {
        improvements.push({
          kind: 'time',
          fromSec: previousBestTimeSec,
          toSec: state.elapsedSec,
        });
      }
      if (earnedPerfectLevel) {
        improvements.push({ kind: 'firstNoHint' });
      }
      if (earnedZeroMistake) {
        improvements.push({ kind: 'firstNoMistake' });
      }
    }

    const summary: VictorySummary = {
      levelId: state.puzzle.id,
      dailyDateKey: state.puzzle.dailyDateKey,
      elapsedSec: state.elapsedSec,
      hintsUsed: state.hintsUsed,
      mistakesCount: state.mistakesCount,
      stars: computedStars,
      previousBestStars,
      isNewBestTime,
      bestTimeSec,
      coinsAwarded: rewardBreakdown.totalCoins,
      rewardBreakdown,
      unlockedNextWorld,
      newlyUnlockedCats,
      isPracticeMode: isPractice,
      isReplay: !isFirstCompletion,
      improvements,
    };

    let nextDailyLogin = state.dailyLogin;
    let freezeEarnedFromGolden = false;
    let recoveredStreakCount: number | null = null;
    if (!isPractice) {
      if (isGoldenTrial && isFirstCompletion) {
        const withFreeze = grantStreakFreeze(nextDailyLogin);
        if (withFreeze.streakShields > nextDailyLogin.streakShields) {
          freezeEarnedFromGolden = true;
        }
        nextDailyLogin = withFreeze;
      }
      const recovery = tryRecoverStreak(nextDailyLogin, toDateKey(eventDate));
      nextDailyLogin = recovery.nextState;
      if (recovery.recovered) {
        recoveredStreakCount = recovery.nextState.streakCount;
      }
    }

    set({
      board: synced.board,
      manualXKeys: synced.manualXKeys,
      autoXKeys: synced.autoXKeys,
      candidateMarks: nextCandidates,
      validation: nextValidation,
      selectedCell: null,
      undoStack: [...state.undoStack.slice(-49), makeSnapshot(state, 'place-cat')],
      redoStack: [],
      activeHint: null,
      hintStage: 1,
      mistakeFlash: null,
      currentLevelId: nextCurrentLevel,
      unlockedLevelId: nextUnlocked,
      levelProgress: updatedLevelProgress,
      completedDailyDates: nextDailyDates,
      achievements: updatedAchievements,
      fishCoins: nextCoins,
      boosters: nextBoosters,
      dailyLogin: nextDailyLogin,
      dailyMissions: updatedMissions,
      weeklyMissions: updatedWeeklyMissions,
      unlockedAchievementIds: nextUnlockedAchs,
      unlockedCatIds: nextUnlockedCats,
      catUnlockLog: nextCatUnlockLog,
      zeroMistakeSolves: nextZeroMistakes,
      specialLevelsCompleted: nextSpecialCompleted,
      totalStarsEarnedEver: state.totalStarsEarnedEver + starsEarnedDelta,
      progressStats: nextProgressStats,
      isMistakeShieldActive: false,
      isCelebratingBoard: true,
      victorySummary: null,
    });

    persistFromState(get());
    emitToListeners(completedEvent);
    if (recoveredStreakCount !== null && freezeEarnedFromGolden) {
      get().showToast(
        `${i18n.t('dailyCalendar.recoveredToast', { count: recoveredStreakCount })} · ${i18n.t('dailyCalendar.freezeEarnedToast')}`
      );
    } else if (recoveredStreakCount !== null) {
      get().showToast(
        i18n.t('dailyCalendar.recoveredToast', { count: recoveredStreakCount })
      );
    } else if (freezeEarnedFromGolden) {
      get().showToast(i18n.t('dailyCalendar.freezeEarnedToast'));
    }

    const delayMs = state.settings.reducedMotion ? 120 : 620;
    clearCelebrationTimer();
    const revealVictory = () => {
      celebrationTimer = null;
      set({ isCelebratingBoard: false, victorySummary: summary });
      const achToast = formatAchievementUnlockToast(
        newlyUnlockedAchs,
        i18n.t.bind(i18n)
      );
      if (achToast) {
        get().showToast(achToast);
      }
    };
    if (typeof window !== 'undefined') {
      celebrationTimer = window.setTimeout(revealVictory, delayMs);
    } else {
      revealVictory();
    }

    return true;
  },

  tapCell: (coord) => {
    const state = get();
    if (state.isPaused || state.outOfHearts || state.victorySummary || state.isCelebratingBoard) {
      return;
    }

    if (isLockedCell(state.puzzle, coord)) {
      soundManager.play('select', state.settings.soundEnabled);
      set({ selectedCell: coord });
      return;
    }

    const currentVal = state.board[coord.row]?.[coord.col];
    if (!currentVal) return;

    // Pencil mode: NEVER places a cat, NEVER costs a heart!
    if (state.pencilMode) {
      if (currentVal === 'cat') {
        soundManager.play('select', state.settings.soundEnabled);
        set({ selectedCell: coord });
        return;
      }
      if (state.pencilSubMode === 'candidate') {
        state.toggleCandidate(coord);
      } else {
        state.toggleManualX(coord);
      }
      return;
    }

    // Normal mode:
    // Single tap ALWAYS selects cell cleanly without accidental placement!
    soundManager.play('select', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);
    set({ selectedCell: coord, mistakeFlash: null });
  },

  doubleTapCell: (coord) => {
    const state = get();
    if (
      state.pencilMode ||
      state.settings.controlMode !== 'double-tap' ||
      state.isPaused ||
      state.outOfHearts ||
      state.victorySummary ||
      state.isCelebratingBoard
    ) {
      return;
    }
    if (isLockedCell(state.puzzle, coord)) return;

    const currentVal = state.board[coord.row]?.[coord.col];
    if (!currentVal) return;

    // Safeguard: NEVER unexpectedly place a cat when double-tapping an X-marked cell!
    if (currentVal === 'x') {
      soundManager.play('select', state.settings.soundEnabled);
      state.showToast(i18n.t('toasts.doubleTapBlockedX'));
      return;
    }

    if (currentVal === 'cat') {
      state.removeCatAt(coord);
      return;
    }

    state.attemptPlaceCat(coord);
  },

  longPressCell: (coord) => {
    const state = get();
    if (
      state.pencilMode ||
      state.settings.controlMode !== 'long-press' ||
      state.isPaused ||
      state.outOfHearts ||
      state.victorySummary ||
      state.isCelebratingBoard
    ) {
      return;
    }
    if (isLockedCell(state.puzzle, coord)) return;

    const currentVal = state.board[coord.row]?.[coord.col];
    if (!currentVal) return;

    if (currentVal === 'x') {
      soundManager.play('select', state.settings.soundEnabled);
      state.showToast(i18n.t('toasts.doubleTapBlockedX'));
      return;
    }

    if (currentVal === 'cat') {
      state.removeCatAt(coord);
      return;
    }

    state.attemptPlaceCat(coord);
  },

  placeOrToggleDirect: (coord, mode) => {
    const state = get();
    if (state.isPaused || state.outOfHearts || state.victorySummary || state.isCelebratingBoard) {
      return;
    }
    if (isLockedCell(state.puzzle, coord)) return;

    if (mode === 'x') {
      state.toggleManualX(coord);
      return;
    }

    const currentVal = state.board[coord.row]?.[coord.col];
    if (currentVal === 'cat') {
      state.removeCatAt(coord);
    } else {
      state.attemptPlaceCat(coord);
    }
  },

  togglePencilMode: () => {
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);
    set({ pencilMode: !state.pencilMode });
  },

  setPencilSubMode: (sub) => {
    const state = get();
    soundManager.play('button', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);
    set({ pencilMode: true, pencilSubMode: sub });
  },

  undo: () => {
    const state = get();
    if (
      state.undoStack.length === 0 ||
      state.outOfHearts ||
      state.victorySummary ||
      state.isCelebratingBoard
    ) {
      return;
    }

    const prev = state.undoStack[state.undoStack.length - 1]!;
    const nextUndo = state.undoStack.slice(0, -1);
    const synced = syncBoardMarks(
      state.puzzle,
      prev.board,
      prev.manualXKeys,
      state.settings.autoMarkX
    );
    const nextValidation = validateBoard(state.puzzle, synced.board);

    soundManager.play('button', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    // Note: Hearts are NEVER silently refunded by pressing undo!
    set({
      board: synced.board,
      manualXKeys: synced.manualXKeys,
      autoXKeys: synced.autoXKeys,
      candidateMarks: { ...prev.candidateMarks },
      validation: nextValidation,
      selectedCell: prev.selectedCell,
      undoStack: nextUndo,
      redoStack: [
        ...state.redoStack.slice(-49),
        makeSnapshot(state, prev.actionType ?? 'place-cat'),
      ],
      activeHint: null,
      hintStage: 1,
      mistakeFlash: null,
    });
    persistFromState(get());
  },

  redo: () => {
    const state = get();
    if (
      state.redoStack.length === 0 ||
      state.outOfHearts ||
      state.victorySummary ||
      state.isCelebratingBoard
    ) {
      return;
    }

    const nextSnap = state.redoStack[state.redoStack.length - 1]!;
    const nextRedo = state.redoStack.slice(0, -1);
    const synced = syncBoardMarks(
      state.puzzle,
      nextSnap.board,
      nextSnap.manualXKeys,
      state.settings.autoMarkX
    );
    const nextValidation = validateBoard(state.puzzle, synced.board);

    soundManager.play('button', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    set({
      board: synced.board,
      manualXKeys: synced.manualXKeys,
      autoXKeys: synced.autoXKeys,
      candidateMarks: { ...nextSnap.candidateMarks },
      validation: nextValidation,
      selectedCell: nextSnap.selectedCell,
      undoStack: [
        ...state.undoStack.slice(-49),
        makeSnapshot(state, nextSnap.actionType ?? 'place-cat'),
      ],
      redoStack: nextRedo,
      activeHint: null,
      hintStage: 1,
      mistakeFlash: null,
    });
    persistFromState(get());
  },

  requestHint: () => {
    const state = get();
    if (state.isPaused || state.outOfHearts || state.victorySummary || state.isCelebratingBoard) {
      return;
    }

    // If a progressive hint is already active and can escalate, advance to the next stage!
    if (state.activeHint && state.activeHint.canEscalate && state.hintStage < 4) {
      state.escalateHint();
      return;
    }

    const hint = getProgressiveHint(state.puzzle, state.board, 1);
    if (!hint) return;

    soundManager.play('hint', state.settings.soundEnabled);
    triggerHaptic('hint', state.settings.hapticsEnabled);

    // Stage 1 Gentle Nudge counts as a hint step cleanly
    set({
      activeHint: hint,
      hintStage: hint.stage,
      selectedCell: hint.revealTargetCell ? hint.targetCell : state.selectedCell,
      hintsUsed: state.hintsUsed + 1,
      mistakeFlash: null,
    });
    persistFromState(get());
  },

  escalateHint: () => {
    const state = get();
    if (
      !state.activeHint ||
      !state.activeHint.canEscalate ||
      state.isPaused ||
      state.outOfHearts ||
      state.victorySummary ||
      state.isCelebratingBoard
    ) {
      return;
    }

    const nextStage = Math.min(4, state.hintStage + 1) as HintStage;
    const hint = getProgressiveHint(state.puzzle, state.board, nextStage);
    if (!hint) return;

    soundManager.play('hint', state.settings.soundEnabled);
    triggerHaptic('hint', state.settings.hapticsEnabled);

    set({
      activeHint: hint,
      hintStage: hint.stage,
      selectedCell: hint.revealTargetCell ? hint.targetCell : state.selectedCell,
    });
  },

  requestUseBooster: (boosterId) => {
    const state = get();
    if (state.isPaused || state.outOfHearts || state.victorySummary || state.isCelebratingBoard) {
      return;
    }

    if (boosterId === 'undoToken') {
      const why = canUseHeartRefill(state);
      if (why !== 'ok') {
        state.showToast(i18n.t(heartRefillBlockedToastKey(why)));
        return;
      }
    }

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
      return;
    }

    // Explicit confirmation before consuming a paid/limited booster
    soundManager.play('button', state.settings.soundEnabled);
    set({ pendingBoosterConfirm: boosterId });
  },

  confirmUseBooster: () => {
    const state = get();
    const id = state.pendingBoosterConfirm;
    if (!id) return false;
    set({ pendingBoosterConfirm: null });
    return get().useBooster(id);
  },

  cancelUseBooster: () => {
    set({ pendingBoosterConfirm: null });
  },

  useBooster: (boosterId) => {
    const state = get();
    if (state.isPaused || state.outOfHearts || state.victorySummary || state.isCelebratingBoard) {
      return false;
    }

    if (boosterId === 'undoToken') {
      const why = canUseHeartRefill(state);
      if (why !== 'ok') {
        state.showToast(i18n.t(heartRefillBlockedToastKey(why)));
        return false;
      }
    }

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
      set({ boosters: consume() });
      get().requestHint();
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
      set({
        boosters: consume(),
        hearts: state.hearts + 1,
      });
      soundManager.play('hint', state.settings.soundEnabled);
      triggerHaptic('select', state.settings.hapticsEnabled);
      state.showToast(i18n.t('toasts.heartRefilled'));
      persistFromState(get());
      return true;
    }

    if (boosterId === 'superHint') {
      // Auto-mark X around all valid cats + spotlight Stage 3 deduced target!
      const synced = syncBoardMarks(state.puzzle, state.board, state.manualXKeys, true);
      const hint = getProgressiveHint(state.puzzle, synced.board, 3);
      if (!hint) return false;
      soundManager.play('hint', state.settings.soundEnabled);
      triggerHaptic('hint', state.settings.hapticsEnabled);
      set({
        boosters: consume(),
        board: synced.board,
        manualXKeys: synced.manualXKeys,
        autoXKeys: synced.autoXKeys,
        validation: validateBoard(state.puzzle, synced.board),
        activeHint: hint,
        hintStage: 3,
        selectedCell: hint.targetCell,
        hintsUsed: state.hintsUsed + 1,
        undoStack: [...state.undoStack.slice(-49), makeSnapshot(state, 'booster')],
        redoStack: [],
      });
      persistFromState(get());
      return true;
    }

    if (boosterId === 'revealRegion') {
      const unsolvedReg = Array.from({ length: state.puzzle.size }, (_, i) => i).find(
        (regId) => !state.validation.completedRegions.has(regId)
      );
      if (unsolvedReg === undefined) return false;

      const solSet = new Set(state.puzzle.solution.map((c) => cellKey(c.row, c.col)));
      const nextManual = new Set(state.manualXKeys);
      let targetCatCell: CellCoord | null = null;
      for (let r = 0; r < state.puzzle.size; r++) {
        for (let c = 0; c < state.puzzle.size; c++) {
          if (state.puzzle.regions[r]![c] === unsolvedReg) {
            const k = cellKey(r, c);
            if (solSet.has(k)) {
              targetCatCell = { row: r, col: c };
            } else if (state.board[r]![c] !== 'cat') {
              nextManual.add(k);
            }
          }
        }
      }

      const synced = syncBoardMarks(
        state.puzzle,
        state.board,
        Array.from(nextManual),
        state.settings.autoMarkX
      );

      soundManager.play('hint', state.settings.soundEnabled);
      triggerHaptic('hint', state.settings.hapticsEnabled);
      const regionName = i18n.t(`regions.${Math.abs(unsolvedReg) % 8}`);
      set({
        boosters: consume(),
        board: synced.board,
        manualXKeys: synced.manualXKeys,
        autoXKeys: synced.autoXKeys,
        validation: validateBoard(state.puzzle, synced.board),
        selectedCell: targetCatCell,
        // Revealing a region's answer is assistance, just like a hint
        hintsUsed: state.hintsUsed + 1,
        undoStack: [...state.undoStack.slice(-49), makeSnapshot(state, 'booster')],
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

      set({
        boosters: consume(),
        pencilMode: false,
        selectedCell: missing,
        activeHint: null,
        hintStage: 1,
        // Revealing a cat is assistance: it must not keep 3-star / no-hint "perfect" eligibility
        hintsUsed: state.hintsUsed + 1,
      });
      get().attemptPlaceCat(missing);
      return true;
    }

    return false;
  },

  useHeartRefillFromOutOfHearts: () => {
    const state = get();
    if (
      !state.outOfHearts ||
      state.gameMode !== 'classic' ||
      state.boosters.undoToken <= 0
    ) {
      return false;
    }

    set({
      boosters: {
        ...state.boosters,
        undoToken: Math.max(0, state.boosters.undoToken - 1),
      },
      hearts: 1,
      outOfHearts: false,
    });
    soundManager.play('hint', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);
    state.showToast(i18n.t('toasts.heartRefilled'));
    persistFromState(get());
    return true;
  },

  applyActiveHint: () => {
    const state = get();
    const hint = state.activeHint;
    if (
      !hint ||
      !hint.canApply ||
      state.outOfHearts ||
      state.victorySummary ||
      state.isCelebratingBoard
    ) {
      return;
    }

    if (hint.applyValue === 'cat') {
      // Stages 1-3 are free (they only cost stars). Auto-placing the cat at Stage 4 always
      // costs exactly one Hint token; without one, offer the honest get-a-hint prompt
      // (rewarded ad or Fish Coins) instead of silently placing for free or charging some
      // players but not others.
      if (state.boosters.hint <= 0) {
        soundManager.play('button', state.settings.soundEnabled);
        set({ rewardedAdPlacement: 'free_hint', lastAdFeedback: null });
        return;
      }
      const nextBoosters = { ...state.boosters, hint: state.boosters.hint - 1 };
      set({
        boosters: nextBoosters,
        pencilMode: false,
        selectedCell: hint.targetCell,
        activeHint: null,
        hintStage: 1,
      });
      get().attemptPlaceCat(hint.targetCell);
      return;
    }

    // Remove wrong/conflicting cat
    get().removeCatAt(hint.targetCell);
  },

  dismissHint: () => {
    set({ activeHint: null, hintStage: 1 });
  },

  restartLevel: () => {
    clearCelebrationTimer();
    clearMistakeFlashTimer();
    activeDragSession = null;
    const state = get();
    if (!state.puzzle.dailyDateKey) {
      delete campaignSaves[state.puzzle.id];
    }
    const freshSynced = syncBoardMarks(
      state.puzzle,
      createInitialBoard(state.puzzle),
      [],
      state.settings.autoMarkX
    );
    const freshValidation = validateBoard(state.puzzle, freshSynced.board);

    soundManager.play('button', state.settings.soundEnabled);
    triggerHaptic('select', state.settings.hapticsEnabled);

    set({
      currentLevelId: state.puzzle.dailyDateKey ? state.currentLevelId : state.puzzle.id,
      board: freshSynced.board,
      manualXKeys: [],
      autoXKeys: freshSynced.autoXKeys,
      candidateMarks: {},
      validation: freshValidation,
      selectedCell: null,
      pencilMode: false,
      pencilSubMode: 'x',
      // A restart is a brand-new attempt, so it follows the player's preferred mode again
      gameMode: state.settings.gameMode,
      hearts: MAX_CLASSIC_HEARTS,
      outOfHearts: false,
      mistakeFlash: null,
      pendingBoosterConfirm: null,
      undoStack: [],
      redoStack: [],
      activeHint: null,
      hintStage: 1,
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
      state.outOfHearts ||
      state.pendingBoosterConfirm !== null ||
      state.isCelebratingBoard ||
      state.victorySummary !== null ||
      state.rewardedAdPlacement !== null ||
      isBoardHiddenByOrientation()
    ) {
      return;
    }
    const nextElapsed = state.elapsedSec + 1;
    set({ elapsedSec: nextElapsed });
    if (nextElapsed % 5 === 0) {
      persistFromState(get());
    }
  },

  recordSessionStart: () => {
    const at = nextEventAt();
    const d = new Date(at);
    recordEvent({
      type: 'session_started',
      id: `session:${at}`,
      at,
      dateKey: toDateKey(d),
      weekKey: getWeekKey(d),
    });
    persistFromState(get());
  },

  purchaseBooster: (boosterId) => {
    // Double-tap idempotency guard: never deduct Fish Coins twice on rapid double tap!
    const now = Date.now();
    if (now - lastPurchaseTimestamp < 320) {
      return false;
    }
    lastPurchaseTimestamp = now;

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
    const addBoosters = (map: Partial<Record<BoosterId, number>> | undefined) => {
      if (!map) return;
      for (const [k, qty] of Object.entries(map)) {
        if (qty) {
          const id = k as BoosterId;
          nextBoosters[id] = (nextBoosters[id] ?? 0) + qty;
        }
      }
    };
    addBoosters(result.reward.boosters);
    addBoosters(result.milestone?.boosters);

    const totalCoins =
      result.reward.coins + result.luckyBonusCoins + (result.milestone?.coins ?? 0);

    soundManager.play('victory', state.settings.soundEnabled);
    triggerHaptic('victory', state.settings.hapticsEnabled);
    particleBus.victoryFountain();

    set({
      dailyLogin: result.nextState,
      fishCoins: state.fishCoins + totalCoins,
      boosters: nextBoosters,
    });
    const at = nextEventAt();
    const d = new Date(at);
    recordEvent({
      type: 'reward_claimed',
      id: `reward:daily_login:${at}`,
      at,
      dateKey: toDateKey(d),
      weekKey: getWeekKey(d),
      source: 'daily_login',
      coins: totalCoins,
    });
    persistFromState(get());
    return result;
  },

  claimMissionReward: (missionId) => {
    const state = get();
    const dailyTarget = state.dailyMissions.missions.find((m) => m.id === missionId);
    const weeklyTarget = dailyTarget
      ? undefined
      : state.weeklyMissions.missions.find((m) => m.id === missionId);
    const target = dailyTarget ?? weeklyTarget;
    if (!target || target.claimed || target.progress < target.target) return false;

    const nextBoosters = { ...state.boosters };
    if (target.rewardBooster) {
      nextBoosters[target.rewardBooster] += 1;
    }

    const nextDailyMissions: DailyMissionsState = dailyTarget
      ? {
          ...state.dailyMissions,
          missions: state.dailyMissions.missions.map((m) =>
            m.id === missionId ? { ...m, claimed: true } : m
          ),
        }
      : state.dailyMissions;

    const nextWeeklyMissions: WeeklyMissionsState = weeklyTarget
      ? {
          ...state.weeklyMissions,
          missions: state.weeklyMissions.missions.map((m) =>
            m.id === missionId ? { ...m, claimed: true } : m
          ),
        }
      : state.weeklyMissions;

    soundManager.play('victory', state.settings.soundEnabled);
    triggerHaptic('cat', state.settings.hapticsEnabled);
    particleBus.victoryFountain();

    set({
      dailyMissions: nextDailyMissions,
      weeklyMissions: nextWeeklyMissions,
      fishCoins: state.fishCoins + target.rewardCoins,
      boosters: nextBoosters,
    });
    state.showToast(i18n.t('toasts.claimedCoins', { coins: target.rewardCoins }));
    const at = nextEventAt();
    const d = new Date(at);
    recordEvent({
      type: 'reward_claimed',
      id: `reward:mission:${missionId}:${at}`,
      at,
      dateKey: toDateKey(d),
      weekKey: getWeekKey(d),
      source: 'mission',
      coins: target.rewardCoins,
    });
    persistFromState(get());
    return true;
  },

  rerollDailyMission: (missionId) => {
    const state = get();
    const eligibility = missionEligibilityFromState(
      state.levelProgress,
      state.unlockedLevelId
    );
    const next = rerollDailyMissionPure(state.dailyMissions, missionId, eligibility);
    if (!next) return false;

    soundManager.play('button', state.settings.soundEnabled);
    set({ dailyMissions: next });
    persistFromState(get());
    return true;
  },

  claimMilestone: () => {
    const state = get();
    const def = MILESTONE_LADDER[state.milestoneIndex];
    if (!def) return false;

    const { current, target } = getMilestoneProgress(state.milestoneIndex, {
      levelProgress: state.levelProgress,
      progressStats: state.progressStats,
    });
    if (target <= 0 || current < target) return false;

    const nextBoosters = { ...state.boosters };
    if (def.rewardBooster) {
      nextBoosters[def.rewardBooster] += 1;
    }

    soundManager.play('victory', state.settings.soundEnabled);
    triggerHaptic('victory', state.settings.hapticsEnabled);
    particleBus.victoryFountain();

    set({
      milestoneIndex: state.milestoneIndex + 1,
      fishCoins: state.fishCoins + def.rewardCoins,
      boosters: nextBoosters,
    });
    state.showToast(i18n.t('toasts.claimedCoins', { coins: def.rewardCoins }));
    const at = nextEventAt();
    const d = new Date(at);
    recordEvent({
      type: 'reward_claimed',
      id: `reward:milestone:${def.id}:${at}`,
      at,
      dateKey: toDateKey(d),
      weekKey: getWeekKey(d),
      source: 'mission',
      coins: def.rewardCoins,
    });
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
      `${getAchievementCopy(def, i18n.t.bind(i18n)).title} : +${def.rewardCoins} ${i18n.t('common.fishCoinsLabel')}`
    );
    const at = nextEventAt();
    const d = new Date(at);
    recordEvent({
      type: 'reward_claimed',
      id: `reward:achievement:${achievementId}:${at}`,
      at,
      dateKey: toDateKey(d),
      weekKey: getWeekKey(d),
      source: 'achievement',
      coins: def.rewardCoins,
    });
    persistFromState(get());
    return true;
  },

  claimEventChest: (eventId) => {
    const state = get();
    const ev = WORLD_EVENTS.find((e) => e.id === eventId);
    if (!ev || ev.type !== 'milestone_chest') return false;

    const currentWeekKey = getCurrentWeekKey();
    const claimKey =
      eventId === 'perfect_week'
        ? `${eventId}-${currentWeekKey}`
        : eventId;
    if (state.claimedEventIds.includes(claimKey)) return false;

    const solvedCount = Object.values(state.levelProgress).filter((p) => p.completed).length;
    const progress =
      eventId === 'treasure_hunt'
        ? solvedCount
        : getWeeklyClaimCount(state.dailyLogin, currentWeekKey);
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
    const at = nextEventAt();
    const d = new Date(at);
    recordEvent({
      type: 'reward_claimed',
      id: `reward:event_chest:${claimKey}:${at}`,
      at,
      dateKey: toDateKey(d),
      weekKey: getWeekKey(d),
      source: 'event_chest',
      coins: ev.rewardCoins,
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
    const todayKey = getTodayDateKey();
    if (placement === 'daily_bonus' && get().dailyLogin.adBonusDateKey === todayKey) {
      const blocked: RewardedAdResult = {
        status: 'UNAVAILABLE',
        placement,
        granted: false,
        message: i18n.t('dailyCalendar.claimedToday'),
      };
      set({ lastAdFeedback: blocked.message });
      return blocked;
    }

    const result = await rewardedAdService.requestReward(placement);
    if (result.status === 'COMPLETED' && result.granted) {
      const state = get();
      const nextBoosters = { ...state.boosters };
      let nextCoins = state.fishCoins;
      let nextDailyLogin = state.dailyLogin;
      if (placement === 'free_hint') nextBoosters.hint += 1;
      else if (placement === 'extra_undo') nextBoosters.undoToken += 1;
      else if (placement === 'booster_pack') nextBoosters.mistakeShield += 1;
      else if (placement === 'challenge_retry') nextBoosters.superHint += 1;
      else {
        nextCoins += 30;
        if (placement === 'daily_bonus') {
          nextDailyLogin = {
            ...state.dailyLogin,
            adBonusDateKey: todayKey,
          };
        }
      }
      set({
        boosters: nextBoosters,
        fishCoins: nextCoins,
        dailyLogin: nextDailyLogin,
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
  toggleFavouriteCat: (catId) => {
    const state = get();
    if (!VALID_CAT_IDS.has(catId) || !state.unlockedCatIds.includes(catId)) return;
    soundManager.play('button', state.settings.soundEnabled);
    const exists = state.favouriteCatIds.includes(catId);
    const nextFavs = exists
      ? state.favouriteCatIds.filter((id) => id !== catId)
      : [...state.favouriteCatIds, catId];
    set({ favouriteCatIds: nextFavs });
    persistFromState(get());
  },
  claimCatSet: (setId) => {
    const state = get();
    const def = CAT_SETS.find((s) => s.id === setId);
    if (!def || state.claimedSetIds.includes(setId)) return false;
    const progress = getSetProgress(def, state.unlockedCatIds);
    if (!progress.complete) return false;

    const nextAccessories = state.unlockedAccessoryIds.includes(def.rewardAccessory)
      ? state.unlockedAccessoryIds
      : [...state.unlockedAccessoryIds, def.rewardAccessory];

    soundManager.play('victory', state.settings.soundEnabled);
    triggerHaptic('victory', state.settings.hapticsEnabled);
    particleBus.victoryFountain();

    const setName = i18n.t(`catSets.${setId}.name`);
    const accLabel = i18n.t(`accessories.${def.rewardAccessory}`);

    set({
      fishCoins: state.fishCoins + def.rewardCoins,
      unlockedAccessoryIds: nextAccessories,
      claimedSetIds: [...state.claimedSetIds, setId],
      chestRevealModal: {
        title: i18n.t('catSets.claimedTitle', { name: setName }),
        subtitle: accLabel,
        coins: def.rewardCoins,
        boosterLabel: accLabel,
      },
    });
    const at = nextEventAt();
    const d = new Date(at);
    recordEvent({
      type: 'reward_claimed',
      id: `reward:cat_set:${setId}:${at}`,
      at,
      dateKey: toDateKey(d),
      weekKey: getWeekKey(d),
      source: 'event_chest',
      coins: def.rewardCoins,
    });
    persistFromState(get());
    return true;
  },
  selectAccessory: (id) => {
    const state = get();
    if (id !== null && !state.unlockedAccessoryIds.includes(id)) {
      return false;
    }
    soundManager.play('button', state.settings.soundEnabled);
    set({ activeAccessoryId: id });
    persistFromState(get());
    return true;
  },
  enqueueUnlockedCats: (catIds) => {
    if (catIds.length === 0) return;
    const state = get();
    const existing = new Set(state.unlockedCatQueue);
    const additions = catIds.filter((id) => VALID_CAT_IDS.has(id) && !existing.has(id));
    if (additions.length === 0) return;
    const nextQueue = [...state.unlockedCatQueue, ...additions];
    set({
      unlockedCatQueue: nextQueue,
      unlockedCatModal: nextQueue[0] ? getCollectibleCat(nextQueue[0]) : null,
    });
  },
  dismissUnlockedCat: () => {
    const state = get();
    const nextQueue = state.unlockedCatQueue.slice(1);
    set({
      unlockedCatQueue: nextQueue,
      unlockedCatModal: nextQueue[0] ? getCollectibleCat(nextQueue[0]) : null,
    });
  },
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

    if (key === 'autoMarkX') {
      // Immediately recompute autoX without ever losing manual X marks or candidates!
      const synced = syncBoardMarks(
        state.puzzle,
        state.board,
        state.manualXKeys,
        Boolean(value)
      );
      set({
        settings: nextSettings,
        board: synced.board,
        manualXKeys: synced.manualXKeys,
        autoXKeys: synced.autoXKeys,
        validation: validateBoard(state.puzzle, synced.board),
      });
      persistFromState(get());
      return;
    }

    if (key === 'gameMode') {
      applyGameModeRequest(state, value as GameMode, set);
      persistFromState(get());
      return;
    }

    set({ settings: nextSettings });
    persistFromState(get());
  },

  resetAllProgress: () => {
    clearCelebrationTimer();
    clearMistakeFlashTimer();
    activeDragSession = null;
    campaignSaves = {};
    specialSaves = {};
    clearPersistedState();
    soundManager.setMusic(false);
    const level1 = getLevelPuzzle(1);
    const synced = syncBoardMarks(
      level1,
      createInitialBoard(level1),
      [],
      DEFAULT_SETTINGS.autoMarkX
    );
    const validation = validateBoard(level1, synced.board);
    const todayKey = getTodayDateKey();

    set({
      screen: 'welcome',
      isPaused: false,
      isSettingsOpen: false,
      isTutorialOpen: false,
      isDailyCalendarOpen: false,
      outOfHearts: false,
      pendingBoosterConfirm: null,
      mistakeFlash: null,
      rewardedAdPlacement: null,
      lastAdFeedback: null,
      unlockedWorldModal: null,
      unlockedCatQueue: [],
      unlockedCatModal: null,
      chestRevealModal: null,
      isCelebratingBoard: false,
      victorySummary: null,
      currentLevelId: 1,
      unlockedLevelId: 1,
      levelProgress: {},
      campaignSaveLevelIds: [],
      completedDailyDates: [],
      selectedDifficulty: 'all',
      hasSeenTutorial: false,
      achievements: DEFAULT_ACHIEVEMENTS,
      fishCoins: INITIAL_FISH_COINS,
      boosters: { ...INITIAL_BOOSTERS },
      dailyLogin: {
        ...INITIAL_DAILY_LOGIN,
        weekClaims: { ...INITIAL_DAILY_LOGIN.weekClaims },
        claimedStreakMilestones: [],
      },
      dailyMissions: ensureTodaysMissions(null, todayKey, {
        completedLevelCount: 0,
        unlockedLevelId: 1,
      }),
      weeklyMissions: ensureWeeklyMissions(null, getCurrentWeekKey(), {
        completedLevelCount: 0,
        unlockedLevelId: 1,
      }),
      milestoneIndex: 0,
      unlockedAchievementIds: [],
      claimedAchievementIds: [],
      pendingAchievementBackfillCount: 0,
      unlockedCatIds: ['mochi'],
      activeMascotCatId: 'mochi',
      catUnlockLog: { mochi: { dateKey: todayKey, source: null } },
      favouriteCatIds: [],
      unlockedAccessoryIds: [],
      activeAccessoryId: null,
      claimedSetIds: [],
      claimedEventIds: [],
      zeroMistakeSolves: 0,
      specialLevelsCompleted: 0,
      totalStarsEarnedEver: 0,
      progressStats: EMPTY_PROGRESS_STATS,
      puzzle: level1,
      board: synced.board,
      manualXKeys: [],
      autoXKeys: synced.autoXKeys,
      candidateMarks: {},
      validation,
      selectedCell: null,
      pencilMode: false,
      pencilSubMode: 'x',
      gameMode: DEFAULT_SETTINGS.gameMode,
      hearts: MAX_CLASSIC_HEARTS,
      undoStack: [],
      redoStack: [],
      activeHint: null,
      hintStage: 1,
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
  const dailyClaimableCount = state.dailyMissions.missions.filter(
    (m) => !m.claimed && m.progress >= m.target
  ).length;
  const weeklyClaimableCount = state.weeklyMissions.missions.filter(
    (m) => !m.claimed && m.progress >= m.target
  ).length;
  const milestoneDef = MILESTONE_LADDER[state.milestoneIndex];
  const milestoneProg = milestoneDef
    ? getMilestoneProgress(state.milestoneIndex, {
        levelProgress: state.levelProgress,
        progressStats: state.progressStats,
      })
    : { current: 0, target: 0 };
  const milestoneClaimableCount =
    milestoneDef && milestoneProg.target > 0 && milestoneProg.current >= milestoneProg.target
      ? 1
      : 0;
  const missionsClaimableCount =
    dailyClaimableCount + weeklyClaimableCount + milestoneClaimableCount;
  const achievementsClaimableCount = state.unlockedAchievementIds.filter(
    (id) => !state.claimedAchievementIds.includes(id)
  ).length;
  return { dailyClaimable, missionsClaimableCount, achievementsClaimableCount };
}

i18n.on('languageChanged', () => {
  const state = useGameStore.getState();
  const nextValidation = validateBoard(state.puzzle, state.board);
  const nextHint = state.activeHint
    ? getProgressiveHint(state.puzzle, state.board, state.hintStage)
    : null;
  useGameStore.setState({
    validation: nextValidation,
    activeHint: nextHint,
  });
});
