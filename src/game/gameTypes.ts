export type GridSize = 6 | 8;

export type Difficulty = 'easy' | 'medium' | 'hard';

export type CellValue = 'empty' | 'cat' | 'x';

export type RuleViolationType = 'region' | 'rowCol' | 'adjacent';

export interface CellCoord {
  row: number;
  col: number;
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
  /** Present when this puzzle is a Daily Challenge (YYYY-MM-DD) */
  dailyDateKey?: string;
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

export interface HintResult {
  type: 'fix-conflict' | 'remove-wrong-cat' | 'place-cat' | 'eliminate-cell';
  targetCell: CellCoord;
  relatedCells: CellCoord[];
  title: string;
  message: string;
  /** If true, the player can tap "Place Cat" or "Apply" directly */
  canApply: boolean;
  applyValue: CellValue;
}

export interface MoveSnapshot {
  board: BoardGrid;
  selectedCell: CellCoord | null;
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
}

export interface ActivePuzzleSave {
  levelId: number;
  board: BoardGrid;
  elapsedSec: number;
  hintsUsed: number;
}

export interface PlayerAchievements {
  totalCatsFound: number;
  perfectLevels: number; // solved with 0 hints
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
