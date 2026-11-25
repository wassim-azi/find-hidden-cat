import {
  BoardGrid,
  CellCoord,
  CellValue,
  GridSize,
  PuzzleDefinition,
  coordsEqual,
} from './gameTypes';
import { areCellsTouching, validateBoard } from './validation';

/**
 * Creates an initialized board for a given puzzle (including locked initial starter cats).
 */
export function createInitialBoard(puzzle: PuzzleDefinition): BoardGrid {
  const board: BoardGrid = Array.from({ length: puzzle.size }, () =>
    Array.from<CellValue>({ length: puzzle.size }).fill('empty')
  );
  for (const cat of puzzle.initialCats) {
    const row = board[cat.row];
    if (row && cat.col >= 0 && cat.col < puzzle.size) {
      row[cat.col] = 'cat';
    }
  }
  return board;
}

/**
 * Deep clones a board matrix.
 */
export function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map((row) => [...row]);
}

/**
 * Returns true if the cell is a locked starter cat that the player cannot remove.
 */
export function isLockedCell(puzzle: PuzzleDefinition, coord: CellCoord): boolean {
  return puzzle.initialCats.some((c) => coordsEqual(c, coord));
}

/**
 * Applies a cell value immutably and returns a new board.
 */
export function setCellValue(
  board: BoardGrid,
  coord: CellCoord,
  value: CellValue
): BoardGrid {
  const next = cloneBoard(board);
  const row = next[coord.row];
  if (row && coord.col >= 0 && coord.col < row.length) {
    row[coord.col] = value;
  }
  return next;
}

/**
 * Returns all cells eliminated by placing a cat at `coord`
 * (same row, same column, same region, or 8-directional neighbor).
 */
export function getEliminatedCellsForCat(
  puzzle: Pick<PuzzleDefinition, 'size' | 'regions'>,
  coord: CellCoord
): CellCoord[] {
  const targetRegion = puzzle.regions[coord.row]?.[coord.col];
  const eliminated: CellCoord[] = [];
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (r === coord.row && c === coord.col) continue;
      if (
        r === coord.row ||
        c === coord.col ||
        puzzle.regions[r]?.[c] === targetRegion ||
        (Math.abs(r - coord.row) <= 1 && Math.abs(c - coord.col) <= 1)
      ) {
        eliminated.push({ row: r, col: c });
      }
    }
  }
  return eliminated;
}

/**
 * Checks whether every region ID 0..size-1 exists and is 4-directionally connected.
 */
export function areRegionsContiguous(size: GridSize, regions: number[][]): boolean {
  if (regions.length !== size) return false;
  for (const row of regions) {
    if (row.length !== size) return false;
  }

  const cellsByRegion = new Map<number, CellCoord[]>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = regions[r]![c]!;
      if (id < 0 || id >= size) return false;
      const list = cellsByRegion.get(id) ?? [];
      list.push({ row: r, col: c });
      cellsByRegion.set(id, list);
    }
  }

  if (cellsByRegion.size !== size) return false;

  const dirs: readonly [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let id = 0; id < size; id++) {
    const cells = cellsByRegion.get(id);
    if (!cells || cells.length === 0) return false;

    const visited = new Set<string>();
    const queue: CellCoord[] = [cells[0]!];
    visited.add(`${cells[0]!.row},${cells[0]!.col}`);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const [dr, dc] of dirs) {
        const nr = curr.row + dr;
        const nc = curr.col + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (regions[nr]![nc] === id) {
            const key = `${nr},${nc}`;
            if (!visited.has(key)) {
              visited.add(key);
              queue.push({ row: nr, col: nc });
            }
          }
        }
      }
    }

    if (visited.size !== cells.length) return false;
  }

  return true;
}

/**
 * Fast constraint-propagating backtracking solver.
 * Finds up to `maxSolutions` valid cat placements for the given region layout.
 * Optionally respects pre-placed locked cats.
 */
export function solvePuzzle(
  size: GridSize,
  regions: number[][],
  maxSolutions = 2,
  fixedCats: CellCoord[] = []
): CellCoord[][] {
  const solutions: CellCoord[][] = [];

  // Group cells by region and order regions by smallest size first (MRV heuristic)
  const regionCells: CellCoord[][] = Array.from({ length: size }, () => []);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = regions[r]?.[c];
      if (id === undefined || id < 0 || id >= size) return [];
      regionCells[id]!.push({ row: r, col: c });
    }
  }

  const usedRows = new Array<boolean>(size).fill(false);
  const usedCols = new Array<boolean>(size).fill(false);
  const usedRegions = new Array<boolean>(size).fill(false);
  const placed: CellCoord[] = [];

  // Apply fixed cats first
  for (const fc of fixedCats) {
    const reg = regions[fc.row]?.[fc.col];
    if (reg === undefined) return [];
    if (usedRows[fc.row] || usedCols[fc.col] || usedRegions[reg]) return [];
    if (placed.some((p) => areCellsTouching(p, fc))) return [];
    usedRows[fc.row] = true;
    usedCols[fc.col] = true;
    usedRegions[reg] = true;
    placed.push(fc);
  }

  // Remaining regions ordered by ascending candidate count
  const remainingRegions: number[] = [];
  for (let reg = 0; reg < size; reg++) {
    if (!usedRegions[reg]) {
      remainingRegions.push(reg);
    }
  }
  remainingRegions.sort((a, b) => regionCells[a]!.length - regionCells[b]!.length);

  function backtrack(step: number): void {
    if (solutions.length >= maxSolutions) return;

    if (step === remainingRegions.length) {
      // Sort solution by row for deterministic output
      const sorted = [...placed].sort((a, b) => a.row - b.row);
      solutions.push(sorted);
      return;
    }

    // Dynamic MRV: pick the unplaced region with fewest valid candidates right now
    let bestIdx = step;
    let bestCandidates: CellCoord[] | null = null;

    for (let i = step; i < remainingRegions.length; i++) {
      const regId = remainingRegions[i]!;
      const candidates: CellCoord[] = [];
      for (const cell of regionCells[regId]!) {
        if (usedRows[cell.row] || usedCols[cell.col]) continue;
        let touches = false;
        for (let k = 0; k < placed.length; k++) {
          if (areCellsTouching(placed[k]!, cell)) {
            touches = true;
            break;
          }
        }
        if (!touches) {
          candidates.push(cell);
        }
      }

      if (candidates.length === 0) {
        return; // Dead end — prune immediately
      }

      if (bestCandidates === null || candidates.length < bestCandidates.length) {
        bestCandidates = candidates;
        bestIdx = i;
        if (candidates.length === 1) break;
      }
    }

    if (!bestCandidates) return;

    // Swap chosen region into current step slot
    const chosenReg = remainingRegions[bestIdx]!;
    remainingRegions[bestIdx] = remainingRegions[step]!;
    remainingRegions[step] = chosenReg;

    for (const candidate of bestCandidates) {
      usedRows[candidate.row] = true;
      usedCols[candidate.col] = true;
      placed.push(candidate);

      backtrack(step + 1);

      placed.pop();
      usedRows[candidate.row] = false;
      usedCols[candidate.col] = false;

      if (solutions.length >= maxSolutions) break;
    }

    // Restore swap
    remainingRegions[step] = remainingRegions[bestIdx]!;
    remainingRegions[bestIdx] = chosenReg;
  }

  backtrack(0);
  return solutions;
}

/**
 * Counts how many valid solutions a puzzle region layout has, up to `limit`.
 */
export function countSolutions(
  size: GridSize,
  regions: number[][],
  limit = 2,
  fixedCats: CellCoord[] = []
): number {
  return solvePuzzle(size, regions, limit, fixedCats).length;
}

/**
 * Programmatically validates that a PuzzleDefinition is well-formed,
 * has contiguous regions, its stored solution is valid, and has a unique solution.
 */
export function verifyPuzzleDefinition(puzzle: PuzzleDefinition): {
  valid: boolean;
  reason?: string;
  solutionCount: number;
} {
  if (!areRegionsContiguous(puzzle.size, puzzle.regions)) {
    return { valid: false, reason: 'Regions are not contiguous or incomplete', solutionCount: 0 };
  }

  // Verify stored solution satisfies all rules
  const testBoard: BoardGrid = Array.from({ length: puzzle.size }, () =>
    Array.from<CellValue>({ length: puzzle.size }).fill('empty')
  );
  for (const c of puzzle.solution) {
    testBoard[c.row]![c.col] = 'cat';
  }
  const check = validateBoard(puzzle, testBoard);
  if (!check.isSolved) {
    return { valid: false, reason: 'Stored solution does not solve puzzle', solutionCount: 0 };
  }

  // Verify initialCats are a subset of solution
  for (const initCat of puzzle.initialCats) {
    if (!puzzle.solution.some((s) => coordsEqual(s, initCat))) {
      return { valid: false, reason: 'Initial starter cat not in solution', solutionCount: 0 };
    }
  }

  // Verify unique solution
  const solutions = solvePuzzle(puzzle.size, puzzle.regions, 2);
  if (solutions.length !== 1) {
    return {
      valid: false,
      reason: `Expected unique solution, found ${solutions.length}`,
      solutionCount: solutions.length,
    };
  }

  return { valid: true, solutionCount: 1 };
}
