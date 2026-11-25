export type GridSize = 6 | 8;

/** Legacy 3-tier difficulty retained for economy & campaign compatibility */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** True mathematical 5-tier difficulty derived from human logical analysis */
export type DifficultyTier = 'beginner' | 'easy' | 'normal' | 'hard' | 'expert';

export type CellValue = 'empty' | 'cat' | 'x';

export type CandidateMark = 'possible' | 'priority';

export type ControlMode = 'tap-confirm' | 'double-tap' | 'long-press';

export type GameMode = 'classic' | 'practice';

export type PencilSubMode = 'x' | 'candidate';

export type RuleViolationType = 'region' | 'rowCol' | 'adjacent' | 'unsolvable';

export const MAX_CLASSIC_HEARTS = 3;

export interface CellCoord {
  row: number;
  col: number;
}

export type LogicalTechnique =
  | 'naked_region_single'
  | 'naked_row_single'
  | 'naked_col_single'
  | 'region_line_intersection'
  | 'line_region_intersection'
  | 'region_adjacency_exclusion'
  /** A tile that would block every remaining spot of a row or column */
  | 'line_adjacency_exclusion'
  /** N regions confined to N rows/columns (pigeonhole) */
  | 'naked_pair_regions'
  /** N rows/columns whose candidates all lie in N regions (dual pigeonhole) */
  | 'line_group_confinement'
  /** One-step "what if" test: placing a cat leads to an empty region/row/column */
  | 'contradiction_chain'
  | 'oracle_fallback';

export interface DifficultyAnalysis {
  tier: DifficultyTier;
  complexityScore: number; // 0..100
  initialCandidateCount: number;
  immediatelyForcedMoves: number;
  deductionSteps: number;
  maxChainDepth: number;
  avgCandidatesPerRegion: number;
  startingClues: number;
  techniquesUsed: LogicalTechnique[];
  solvableByHumanLogic: boolean;
}

export interface PuzzleDefinition {
  id: number;
  title: string;
  difficulty: Difficulty;
  size: GridSize;
  /** size x size matrix of region IDs in range [0, size - 1] */
  regions: number[][];
  /** Known unique valid solution (one cat per row/col/region, non-touching) */
  solution: CellCoord[];
  /** Optional pre-placed locked starter cats for intro levels */
  initialCats: CellCoord[];
  /** Target time (seconds) for 3 stars */
  parTimeSec: number;
  /** Present when this puzzle is a Daily Challenge (YYYY-MM-DD) or Event */
  dailyDateKey?: string;
  /** True if handcrafted/curated rather than procedurally generated */
  isCurated?: boolean;
  /** Optional precomputed logical difficulty analysis */
  analysis?: DifficultyAnalysis;
}

export type BoardGrid = CellValue[][];

export interface ConflictDetail {
  rule: RuleViolationType;
  cells: CellCoord[];
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  isSolved: boolean;
  placedCatsCount: number;
  targetCatsCount: number;
  conflicts: ConflictDetail[];
  /** Quick lookup set of "row,col" keys that are currently in conflict */
  conflictingCellKeys: Set<string>;
  violatedRules: Set<RuleViolationType>;
  /** Region IDs that currently have exactly 1 non-conflicting cat */
  completedRegions: Set<number>;
  /** Friendly primary message if there is a conflict */
  primaryMessage: string | null;
}

export type HintStage = 1 | 2 | 3 | 4;

export interface HintResult {
  type: 'fix-conflict' | 'remove-wrong-cat' | 'place-cat' | 'eliminate-cell';
  stage: HintStage;
  technique?: LogicalTechnique;
  targetCell: CellCoord;
  /** Cells highlighted softly for Stage 1 & 2 (e.g., an entire region, row, or column) */
  areaCells: CellCoord[];
  /** Supporting / blocking cells involved in the logical deduction */
  relatedCells: CellCoord[];
  title: string;
  message: string;
  /** Whether the exact target cell should be spotlighted on the board (Stages 3 & 4 or fix) */
  revealTargetCell: boolean;
  /** If true, the player can confirm applying the move directly */
  canApply: boolean;
  applyValue: CellValue;
  /** True if Stage 1/2/3 can be escalated to a more detailed stage */
  canEscalate: boolean;
}

export type MoveActionType =
  | 'place-cat'
  | 'remove-cat'
  | 'toggle-x'
  | 'drag-x'
  | 'toggle-candidate'
  | 'clear-marks'
  | 'hint'
  | 'booster';

export interface MoveSnapshot {
  board: BoardGrid;
  manualXKeys: string[];
  candidateMarks: Record<string, CandidateMark>;
  selectedCell: CellCoord | null;
  actionType?: MoveActionType;
}

export interface LevelProgress {
  levelId: number;
  completed: boolean;
  bestTimeSec: number | null;
  stars: number; // 0..3
  bestHintsUsed: number | null;
}

export interface PlayerSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  musicEnabled: boolean;
  reducedMotion: boolean;
  showRegionSymbols: boolean;
  autoMarkX: boolean;
  // Enhanced Controls, Visuals & Accessibility (Phase 6, 7, 8, 9)
  controlMode: ControlMode;
  gameMode: GameMode;
  highlightRowCol: boolean;
  highlightNeighbors: boolean;
  highlightRegion: boolean;
  highlightCompletedRegions: boolean;
  fadeCompletedRegions: boolean;
  showCandidates: boolean;
  highContrast: boolean;
  largeText: boolean;
}

export interface ActivePuzzleSave {
  levelId: number;
  board: BoardGrid;
  manualXKeys?: string[];
  candidateMarks?: Record<string, CandidateMark>;
  elapsedSec: number;
  hintsUsed: number;
  mistakesCount?: number;
  hearts?: number;
  gameMode?: GameMode;
}

export interface PlayerAchievements {
  totalCatsFound: number;
  perfectLevels: number; // solved with 0 hints in Classic mode
  currentStreak: number;
  bestStreak: number;
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function coordsEqual(a: CellCoord | null, b: CellCoord | null): boolean {
  if (!a || !b) return false;
  return a.row === b.row && a.col === b.col;
}
