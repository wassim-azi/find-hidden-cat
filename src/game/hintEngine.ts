import {
  BoardGrid,
  CellCoord,
  HintResult,
  PuzzleDefinition,
  cellKey,
  coordsEqual,
} from './gameTypes';
import { getRegionTheme } from '../styles/theme';
import { areCellsTouching, getPlacedCats, isPlacementSafe, validateBoard } from './validation';

/**
 * Generates a helpful, human-friendly logical hint for the current board state
 * without spoiling the entire solution.
 */
export function getNextHint(
  puzzle: PuzzleDefinition,
  board: BoardGrid
): HintResult | null {
  const validation = validateBoard(puzzle, board);
  if (validation.isSolved) return null;

  // 1. If there are active rule conflicts, point out the first conflict cleanly
  if (validation.conflicts.length > 0) {
    const firstConflict = validation.conflicts[0]!;
    const target = firstConflict.cells[firstConflict.cells.length - 1]!;
    return {
      type: 'fix-conflict',
      targetCell: target,
      relatedCells: firstConflict.cells,
      title: 'Fix a Conflict First',
      message: firstConflict.message,
      canApply: true,
      applyValue: 'empty',
    };
  }

  // 2. Check if any currently placed cat is not part of the unique solution
  const placedCats = getPlacedCats(board);
  for (const cat of placedCats) {
    const isCorrect = puzzle.solution.some((s) => coordsEqual(s, cat));
    if (!isCorrect) {
      return {
        type: 'remove-wrong-cat',
        targetCell: cat,
        relatedCells: [cat],
        title: 'Double-Check This Cat',
        message:
          'This cat looks happy now, but it blocks a valid solution later. Try removing it!',
        canApply: true,
        applyValue: 'empty',
      };
    }
  }

  // 3. Collect remaining solution cats not yet placed
  const placedSet = new Set(placedCats.map((c) => cellKey(c.row, c.col)));
  const missingSolutionCats = puzzle.solution.filter(
    (s) => !placedSet.has(cellKey(s.row, s.col))
  );
  if (missingSolutionCats.length === 0) return null;

  // Compute all currently safe (non-conflicting, not X-marked, empty) cells
  const safeCells: CellCoord[] = [];
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (board[r]![c] === 'empty' && isPlacementSafe(puzzle, board, { row: r, col: c })) {
        safeCells.push({ row: r, col: c });
      }
    }
  }

  // 4. Look for a region with only 1 safe empty spot left (immediate deduction!)
  for (let regId = 0; regId < puzzle.size; regId++) {
    if (validation.completedRegions.has(regId)) continue;
    const regionSafe = safeCells.filter(
      (cell) => puzzle.regions[cell.row]![cell.col] === regId
    );
    if (regionSafe.length === 1) {
      const target = regionSafe[0]!;
      if (puzzle.solution.some((s) => coordsEqual(s, target))) {
        const theme = getRegionTheme(regId);
        return {
          type: 'place-cat',
          targetCell: target,
          relatedCells: [target],
          title: `${theme.name} Region Deduction`,
          message: `Only one safe spot remains in the ${theme.name.toLowerCase()} region — a cat must hide here!`,
          canApply: true,
          applyValue: 'cat',
        };
      }
    }
  }

  // 5. Look for a row with only 1 safe empty spot left
  for (let r = 0; r < puzzle.size; r++) {
    if (placedCats.some((c) => c.row === r)) continue;
    const rowSafe = safeCells.filter((cell) => cell.row === r);
    if (rowSafe.length === 1) {
      const target = rowSafe[0]!;
      if (puzzle.solution.some((s) => coordsEqual(s, target))) {
        return {
          type: 'place-cat',
          targetCell: target,
          relatedCells: [target],
          title: `Row ${r + 1} Deduction`,
          message: `Row ${r + 1} has only one valid cell left. Place a cat here!`,
          canApply: true,
          applyValue: 'cat',
        };
      }
    }
  }

  // 6. Look for a column with only 1 safe empty spot left
  for (let c = 0; c < puzzle.size; c++) {
    if (placedCats.some((cat) => cat.col === c)) continue;
    const colSafe = safeCells.filter((cell) => cell.col === c);
    if (colSafe.length === 1) {
      const target = colSafe[0]!;
      if (puzzle.solution.some((s) => coordsEqual(s, target))) {
        return {
          type: 'place-cat',
          targetCell: target,
          relatedCells: [target],
          title: `Column ${c + 1} Deduction`,
          message: `Column ${c + 1} has only one valid cell left. Place a cat here!`,
          canApply: true,
          applyValue: 'cat',
        };
      }
    }
  }

  // 7. Look for a missing cat in the smallest remaining region (most helpful reveal)
  const regionSizes = new Array<number>(puzzle.size).fill(0);
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      regionSizes[puzzle.regions[r]![c]!]! += 1;
    }
  }

  const bestTarget = [...missingSolutionCats].sort((a, b) => {
    const regA = puzzle.regions[a.row]![a.col]!;
    const regB = puzzle.regions[b.row]![b.col]!;
    return regionSizes[regA]! - regionSizes[regB]!;
  })[0]!;

  const targetRegion = puzzle.regions[bestTarget.row]![bestTarget.col]!;
  const theme = getRegionTheme(targetRegion);

  // Check if any existing cat is nearby to explain the context naturally
  const nearbyBlocked = placedCats.some(
    (c) => Math.abs(c.row - bestTarget.row) <= 2 && Math.abs(c.col - bestTarget.col) <= 2 && !areCellsTouching(c, bestTarget)
  );

  return {
    type: 'place-cat',
    targetCell: bestTarget,
    relatedCells: [bestTarget],
    title: `Spot in ${theme.name} Region`,
    message: nearbyBlocked
      ? `Try the ${theme.name.toLowerCase()} tile at row ${bestTarget.row + 1}, column ${bestTarget.col + 1} — it keeps every row, column, and neighbor clear!`
      : `A cat belongs in the ${theme.name.toLowerCase()} region at row ${bestTarget.row + 1}, column ${bestTarget.col + 1}.`,
    canApply: true,
    applyValue: 'cat',
  };
}
