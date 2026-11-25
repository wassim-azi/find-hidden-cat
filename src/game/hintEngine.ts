import i18n from '../i18n';
import {
  BoardGrid,
  CellCoord,
  HintResult,
  PuzzleDefinition,
  cellKey,
  coordsEqual,
} from './gameTypes';
import { areCellsTouching, getPlacedCats, isPlacementSafe, validateBoard } from './validation';

function localizedRegionName(regionId: number): string {
  return i18n.t(`regions.${Math.abs(regionId) % 8}`);
}

/**
 * Generates a localized, human-friendly logical hint for the current board state
 * without spoiling the entire solution.
 */
export function getNextHint(
  puzzle: PuzzleDefinition,
  board: BoardGrid
): HintResult | null {
  const validation = validateBoard(puzzle, board);
  if (validation.isSolved) return null;

  // 1. Active conflicts first
  if (validation.conflicts.length > 0) {
    const firstConflict = validation.conflicts[0]!;
    const target = firstConflict.cells[firstConflict.cells.length - 1]!;
    return {
      type: 'fix-conflict',
      targetCell: target,
      relatedCells: firstConflict.cells,
      title: i18n.t('hints.fixConflictTitle'),
      message: firstConflict.message,
      canApply: true,
      applyValue: 'empty',
    };
  }

  // 2. Check if any placed cat doesn't match the unique solution
  const placedCats = getPlacedCats(board);
  for (const cat of placedCats) {
    const isCorrect = puzzle.solution.some((s) => coordsEqual(s, cat));
    if (!isCorrect) {
      return {
        type: 'remove-wrong-cat',
        targetCell: cat,
        relatedCells: [cat],
        title: i18n.t('hints.removeWrongTitle'),
        message: i18n.t('hints.removeWrongMsg'),
        canApply: true,
        applyValue: 'empty',
      };
    }
  }

  // 3. Remaining solution cats
  const placedSet = new Set(placedCats.map((c) => cellKey(c.row, c.col)));
  const missingSolutionCats = puzzle.solution.filter(
    (s) => !placedSet.has(cellKey(s.row, s.col))
  );
  if (missingSolutionCats.length === 0) return null;

  const safeCells: CellCoord[] = [];
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (board[r]![c] === 'empty' && isPlacementSafe(puzzle, board, { row: r, col: c })) {
        safeCells.push({ row: r, col: c });
      }
    }
  }

  // 4. Region with only 1 safe empty spot
  for (let regId = 0; regId < puzzle.size; regId++) {
    if (validation.completedRegions.has(regId)) continue;
    const regionSafe = safeCells.filter(
      (cell) => puzzle.regions[cell.row]![cell.col] === regId
    );
    if (regionSafe.length === 1) {
      const target = regionSafe[0]!;
      if (puzzle.solution.some((s) => coordsEqual(s, target))) {
        const regName = localizedRegionName(regId);
        return {
          type: 'place-cat',
          targetCell: target,
          relatedCells: [target],
          title: i18n.t('hints.regionDeductionTitle', { region: regName }),
          message: i18n.t('hints.regionDeductionMsg', { region: regName.toLowerCase() }),
          canApply: true,
          applyValue: 'cat',
        };
      }
    }
  }

  // 5. Row with only 1 safe empty spot
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
          title: i18n.t('hints.rowDeductionTitle', { row: r + 1 }),
          message: i18n.t('hints.rowDeductionMsg', { row: r + 1 }),
          canApply: true,
          applyValue: 'cat',
        };
      }
    }
  }

  // 6. Column with only 1 safe empty spot
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
          title: i18n.t('hints.colDeductionTitle', { col: c + 1 }),
          message: i18n.t('hints.colDeductionMsg', { col: c + 1 }),
          canApply: true,
          applyValue: 'cat',
        };
      }
    }
  }

  // 7. Smallest remaining region reveal
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
  const regName = localizedRegionName(targetRegion);

  const nearbyBlocked = placedCats.some(
    (c) =>
      Math.abs(c.row - bestTarget.row) <= 2 &&
      Math.abs(c.col - bestTarget.col) <= 2 &&
      !areCellsTouching(c, bestTarget)
  );

  return {
    type: 'place-cat',
    targetCell: bestTarget,
    relatedCells: [bestTarget],
    title: i18n.t('hints.spotTitle', { region: regName }),
    message: nearbyBlocked
      ? i18n.t('hints.spotNearbyMsg', {
          region: regName.toLowerCase(),
          row: bestTarget.row + 1,
          col: bestTarget.col + 1,
        })
      : i18n.t('hints.spotBasicMsg', {
          region: regName.toLowerCase(),
          row: bestTarget.row + 1,
          col: bestTarget.col + 1,
        }),
    canApply: true,
    applyValue: 'cat',
  };
}
