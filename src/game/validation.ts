import i18n from '../i18n';
import {
  BoardGrid,
  CellCoord,
  ConflictDetail,
  PuzzleDefinition,
  RuleViolationType,
  ValidationResult,
  cellKey,
  coordsEqual,
} from './gameTypes';

/**
 * Checks whether two cells are adjacent (including horizontal, vertical, and diagonal neighbors).
 * Formally: abs(r1 - r2) <= 1 && abs(c1 - c2) <= 1 for two distinct cells.
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
 * 1. Exactly one cat per colored region (using explicit region IDs)
 * 2. Exactly one cat per horizontal row and vertical column
 * 3. Cats cannot touch (horizontal, vertical, or diagonal neighbors)
 *
 * Completion is only declared when all rules hold, every row/col/region has 1 cat,
 * exactly N cats are placed, and (when provided) the solution matches the puzzle's valid configuration.
 */
export function validateBoard(
  puzzle: { size: number; regions: number[][]; solution?: CellCoord[] },
  board: BoardGrid
): ValidationResult {
  const { size, regions, solution } = puzzle;
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

  // Rule 3: No touching cats (8-directional adjacency including diagonals)
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
  let matchesIntendedSolution = true;
  if (solution && solution.length === size && placedCats.length === size) {
    matchesIntendedSolution = solution.every((solCat) =>
      placedCats.some((p) => coordsEqual(p, solCat))
    );
  }

  const isSolved =
    isValid &&
    placedCats.length === size &&
    catsByRow.size === size &&
    catsByCol.size === size &&
    catsByRegion.size === size &&
    matchesIntendedSolution;

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

export interface PlacementEvaluation {
  valid: boolean;
  rule?: RuleViolationType;
  conflictCells: CellCoord[];
  message?: string;
}

/**
 * Evaluates a candidate cat placement BEFORE committing it permanently to the board.
 * Detects:
 * 1. Touching cats (horizontal, vertical, or diagonal)
 * 2. Duplicate cat in same colored region
 * 3. Duplicate cat in same row or column
 * 4. Placement that contradicts the unique solution (makes the puzzle impossible to complete)
 */
export function evaluateCatPlacement(
  puzzle: Pick<PuzzleDefinition, 'size' | 'regions' | 'solution'>,
  board: BoardGrid,
  target: CellCoord
): PlacementEvaluation {
  const targetRegion = puzzle.regions[target.row]?.[target.col];
  if (targetRegion === undefined) {
    return { valid: false, conflictCells: [target] };
  }

  const existingCats = getPlacedCats(board).filter((c) => !coordsEqual(c, target));

  // Check Rule 3: Touching neighbors (horizontal, vertical, diagonal)
  const touching = existingCats.filter((c) => areCellsTouching(c, target));
  if (touching.length > 0) {
    return {
      valid: false,
      rule: 'adjacent',
      conflictCells: [target, ...touching],
      message: i18n.t('validation.adjacentConflict'),
    };
  }

  // Check Rule 1: Same colored region
  const sameRegion = existingCats.filter(
    (c) => puzzle.regions[c.row]?.[c.col] === targetRegion
  );
  if (sameRegion.length > 0) {
    return {
      valid: false,
      rule: 'region',
      conflictCells: [target, ...sameRegion],
      message: i18n.t('validation.regionConflict'),
    };
  }

  // Check Rule 2: Same row
  const sameRow = existingCats.filter((c) => c.row === target.row);
  if (sameRow.length > 0) {
    return {
      valid: false,
      rule: 'rowCol',
      conflictCells: [target, ...sameRow],
      message: i18n.t('validation.rowConflict', { row: target.row + 1 }),
    };
  }

  // Check Rule 2: Same column
  const sameCol = existingCats.filter((c) => c.col === target.col);
  if (sameCol.length > 0) {
    return {
      valid: false,
      rule: 'rowCol',
      conflictCells: [target, ...sameCol],
      message: i18n.t('validation.colConflict', { col: target.col + 1 }),
    };
  }

  // Check Uniqueness / Solvability: does this placement contradict the unique solution?
  const inUniqueSolution = puzzle.solution.some((s) => coordsEqual(s, target));
  if (!inUniqueSolution) {
    return {
      valid: false,
      rule: 'unsolvable',
      conflictCells: [target],
      message: i18n.t('validation.unsolvableConflict'),
    };
  }

  return { valid: true, conflictCells: [] };
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
