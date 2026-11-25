import i18n from '../i18n';
import {
  BoardGrid,
  CellCoord,
  ConflictDetail,
  PuzzleDefinition,
  RuleViolationType,
  ValidationResult,
  cellKey,
} from './gameTypes';

/**
 * Checks whether two cells are adjacent (including diagonals).
 */
export function areCellsTouching(a: CellCoord, b: CellCoord): boolean {
  if (a.row === b.row && a.col === b.col) return false;
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
}

/**
 * Extracts all coordinates currently containing a cat on the board.
 */
export function getPlacedCats(board: BoardGrid): CellCoord[] {
  const cats: CellCoord[] = [];
  for (let row = 0; row < board.length; row++) {
    const rowData = board[row];
    if (!rowData) continue;
    for (let col = 0; col < rowData.length; col++) {
      if (rowData[col] === 'cat') {
        cats.push({ row, col });
      }
    }
  }
  return cats;
}

/**
 * Validates the current board state against all three Meowdoku rules:
 * 1. One cat per colored region
 * 2. One cat per row and column
 * 3. Cats cannot touch (including diagonally)
 */
export function validateBoard(
  puzzle: Pick<PuzzleDefinition, 'size' | 'regions'>,
  board: BoardGrid
): ValidationResult {
  const { size, regions } = puzzle;
  const placedCats = getPlacedCats(board);
  const conflicts: ConflictDetail[] = [];
  const conflictingCellKeys = new Set<string>();
  const violatedRules = new Set<RuleViolationType>();

  const catsByRow = new Map<number, CellCoord[]>();
  const catsByCol = new Map<number, CellCoord[]>();
  const catsByRegion = new Map<number, CellCoord[]>();

  for (const cat of placedCats) {
    const regionId = regions[cat.row]?.[cat.col];
    if (regionId === undefined) continue;

    const rowList = catsByRow.get(cat.row) ?? [];
    rowList.push(cat);
    catsByRow.set(cat.row, rowList);

    const colList = catsByCol.get(cat.col) ?? [];
    colList.push(cat);
    catsByCol.set(cat.col, colList);

    const regionList = catsByRegion.get(regionId) ?? [];
    regionList.push(cat);
    catsByRegion.set(regionId, regionList);
  }

  // Rule 1: One cat per colored region
  for (const [, cells] of catsByRegion.entries()) {
    if (cells.length > 1) {
      violatedRules.add('region');
      cells.forEach((c) => conflictingCellKeys.add(cellKey(c.row, c.col)));
      conflicts.push({
        rule: 'region',
        cells,
        message: i18n.t('validation.regionConflict'),
      });
    }
  }

  // Rule 2: One cat per row
  for (const [row, cells] of catsByRow.entries()) {
    if (cells.length > 1) {
      violatedRules.add('rowCol');
      cells.forEach((c) => conflictingCellKeys.add(cellKey(c.row, c.col)));
      conflicts.push({
        rule: 'rowCol',
        cells,
        message: i18n.t('validation.rowConflict', { row: row + 1 }),
      });
    }
  }

  // Rule 2: One cat per column
  for (const [col, cells] of catsByCol.entries()) {
    if (cells.length > 1) {
      violatedRules.add('rowCol');
      cells.forEach((c) => conflictingCellKeys.add(cellKey(c.row, c.col)));
      conflicts.push({
        rule: 'rowCol',
        cells,
        message: i18n.t('validation.colConflict', { col: col + 1 }),
      });
    }
  }

  // Rule 3: No touching cats (8-directional adjacency)
  for (let i = 0; i < placedCats.length; i++) {
    for (let j = i + 1; j < placedCats.length; j++) {
      const a = placedCats[i]!;
      const b = placedCats[j]!;
      if (areCellsTouching(a, b)) {
        violatedRules.add('adjacent');
        conflictingCellKeys.add(cellKey(a.row, a.col));
        conflictingCellKeys.add(cellKey(b.row, b.col));
        conflicts.push({
          rule: 'adjacent',
          cells: [a, b],
          message: i18n.t('validation.adjacentConflict'),
        });
      }
    }
  }

  // Determine which regions have exactly 1 non-conflicting cat
  const completedRegions = new Set<number>();
  for (let regionId = 0; regionId < size; regionId++) {
    const regionCats = catsByRegion.get(regionId);
    if (regionCats && regionCats.length === 1) {
      const cat = regionCats[0]!;
      if (!conflictingCellKeys.has(cellKey(cat.row, cat.col))) {
        completedRegions.add(regionId);
      }
    }
  }

  const isValid = conflicts.length === 0;
  const isSolved =
    isValid &&
    placedCats.length === size &&
    catsByRow.size === size &&
    catsByCol.size === size &&
    catsByRegion.size === size;

  const primaryMessage = conflicts[0]?.message ?? null;

  return {
    isValid,
    isSolved,
    placedCatsCount: placedCats.length,
    targetCatsCount: size,
    conflicts,
    conflictingCellKeys,
    violatedRules,
    completedRegions,
    primaryMessage,
  };
}

/**
 * Checks whether placing a cat at (row, col) would conflict with existing cats.
 */
export function isPlacementSafe(
  puzzle: Pick<PuzzleDefinition, 'size' | 'regions'>,
  board: BoardGrid,
  target: CellCoord
): boolean {
  const targetRegion = puzzle.regions[target.row]?.[target.col];
  if (targetRegion === undefined) return false;

  const existingCats = getPlacedCats(board);
  for (const cat of existingCats) {
    if (cat.row === target.row && cat.col === target.col) continue;
    if (cat.row === target.row) return false;
    if (cat.col === target.col) return false;
    if (puzzle.regions[cat.row]?.[cat.col] === targetRegion) return false;
    if (areCellsTouching(cat, target)) return false;
  }
  return true;
}

export interface StarThresholds {
  parTimeSec: number;
  maxTime2StarSec?: number;
  maxHints2Star?: number;
  maxMistakes2Star?: number;
}

/**
 * Computes stars earned (1 to 3) based on completion time, hints used, and mistakes.
 * - 3 stars: 0 hints, 0 mistakes, and within parTimeSec
 * - 2 stars: limited hints & mistakes and reasonable completion time
 * - 1 star: completed the puzzle
 */
export function calculateStars(
  elapsedSec: number,
  hintsUsed: number,
  parTimeSec: number,
  mistakesCount = 0,
  thresholds?: Partial<StarThresholds>
): number {
  const target3 = thresholds?.parTimeSec ?? parTimeSec;
  const target2 = thresholds?.maxTime2StarSec ?? target3 * 1.9;
  const maxHints2 = thresholds?.maxHints2Star ?? 1;
  const maxMistakes2 = thresholds?.maxMistakes2Star ?? 2;

  if (hintsUsed === 0 && mistakesCount === 0 && elapsedSec <= target3) {
    return 3;
  }
  if (
    hintsUsed <= maxHints2 &&
    mistakesCount <= maxMistakes2 &&
    elapsedSec <= target2
  ) {
    return 2;
  }
  return 1;
}
