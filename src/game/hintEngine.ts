import i18n from '../i18n';
import {
  BoardGrid,
  HintResult,
  HintStage,
  PuzzleDefinition,
  coordsEqual,
} from './gameTypes';
import { findNextLogicalDeduction } from './logicalSolver';
import { getPlacedCats, validateBoard } from './validation';

function localizedRegionName(regionId: number): string {
  return i18n.t(`regions.${Math.abs(regionId) % 8}`);
}

/**
 * Generates a live, progressive, teaching-focused logical hint (Stages 1..4)
 * from the real current board state.
 *
 * - Stage 1 (Gentle Nudge): Points to the most constrained region/row/column without spoiling the cell.
 * - Stage 2 (Explain Deduction): Explains WHY using human logical deduction & highlights relevant area.
 * - Stage 3 (Highlight Target): Spotlights the exact target cell with complete reasoning.
 * - Stage 4 (Reveal Cat): Offers confirmed placement of one verified cat.
 */
export function getProgressiveHint(
  puzzle: PuzzleDefinition,
  board: BoardGrid,
  stage: HintStage = 1
): HintResult | null {
  const validation = validateBoard(puzzle, board);
  if (validation.isSolved) return null;

  // 1. Active conflicts always take priority
  if (validation.conflicts.length > 0) {
    const firstConflict = validation.conflicts[0]!;
    const target = firstConflict.cells[firstConflict.cells.length - 1]!;
    return {
      type: 'fix-conflict',
      stage: 3,
      targetCell: target,
      areaCells: firstConflict.cells,
      relatedCells: firstConflict.cells,
      title: i18n.t('hints.fixConflictTitle'),
      message: firstConflict.message,
      revealTargetCell: true,
      canApply: true,
      applyValue: 'empty',
      canEscalate: false,
    };
  }

  // 2. Check if any placed cat contradicts the unique solution
  const placedCats = getPlacedCats(board);
  for (const cat of placedCats) {
    const isCorrect = puzzle.solution.some((s) => coordsEqual(s, cat));
    if (!isCorrect) {
      return {
        type: 'remove-wrong-cat',
        stage: 3,
        targetCell: cat,
        areaCells: [cat],
        relatedCells: [cat],
        title: i18n.t('hints.removeWrongTitle'),
        message: i18n.t('hints.removeWrongMsg'),
        revealTargetCell: true,
        canApply: true,
        applyValue: 'empty',
        canEscalate: false,
      };
    }
  }

  // 3. Run real human logical deduction engine (always validated against unique solution)
  const deduction = findNextLogicalDeduction(puzzle, board);
  if (!deduction) return null;

  const target = deduction.targetCell;
  const targetRegionId = puzzle.regions[target.row]![target.col]!;
  const targetRegName = localizedRegionName(targetRegionId);
  const focusRegName =
    deduction.focusType === 'region'
      ? localizedRegionName(deduction.focusIndex)
      : targetRegName;

  // Stage 1: Gentle Nudge (area only — do NOT reveal the exact cell yet!)
  if (stage === 1) {
    if (deduction.focusType === 'row') {
      return {
        type: 'place-cat',
        stage: 1,
        technique: deduction.technique,
        targetCell: target,
        areaCells: deduction.areaCells,
        relatedCells: [],
        title: i18n.t('hints.stage1Title'),
        message: i18n.t('hints.nudgeRow', { row: deduction.focusIndex + 1 }),
        revealTargetCell: false,
        canApply: false,
        applyValue: 'cat',
        canEscalate: true,
      };
    }
    if (deduction.focusType === 'col') {
      return {
        type: 'place-cat',
        stage: 1,
        technique: deduction.technique,
        targetCell: target,
        areaCells: deduction.areaCells,
        relatedCells: [],
        title: i18n.t('hints.stage1Title'),
        message: i18n.t('hints.nudgeCol', { col: deduction.focusIndex + 1 }),
        revealTargetCell: false,
        canApply: false,
        applyValue: 'cat',
        canEscalate: true,
      };
    }
    return {
      type: 'place-cat',
      stage: 1,
      technique: deduction.technique,
      targetCell: target,
      areaCells: deduction.areaCells,
      relatedCells: [],
      title: i18n.t('hints.stage1Title'),
      message: i18n.t('hints.nudgeRegion', { region: focusRegName.toLowerCase() }),
      revealTargetCell: false,
      canApply: false,
      applyValue: 'cat',
      canEscalate: true,
    };
  }

  // Stage 2: Explain the Deduction (teaches the logic without placing or spotlighting exact cell)
  if (stage === 2) {
    let message: string;
    if (deduction.helperTechnique === 'region_line_intersection' && deduction.helperRegionId !== undefined) {
      const helperReg = localizedRegionName(deduction.helperRegionId).toLowerCase();
      message = i18n.t('hints.explainIntersection', {
        helperRegion: helperReg,
        region: focusRegName.toLowerCase(),
        row: target.row + 1,
      });
    } else if (deduction.helperTechnique === 'region_adjacency_exclusion' && deduction.helperRegionId !== undefined) {
      const helperReg = localizedRegionName(deduction.helperRegionId).toLowerCase();
      message = i18n.t('hints.explainAdjacency', {
        helperRegion: helperReg,
        region: focusRegName.toLowerCase(),
      });
    } else if (deduction.focusType === 'row') {
      message = i18n.t('hints.explainRow', {
        row: deduction.focusIndex + 1,
        region: targetRegName.toLowerCase(),
      });
    } else if (deduction.focusType === 'col') {
      message = i18n.t('hints.explainCol', {
        col: deduction.focusIndex + 1,
        region: targetRegName.toLowerCase(),
      });
    } else {
      message = i18n.t('hints.explainRegion', {
        region: focusRegName.toLowerCase(),
        row: target.row + 1,
      });
    }

    return {
      type: 'place-cat',
      stage: 2,
      technique: deduction.technique,
      targetCell: target,
      areaCells: deduction.areaCells,
      relatedCells: deduction.relatedCells,
      title: i18n.t('hints.stage2Title'),
      message,
      revealTargetCell: false,
      canApply: false,
      applyValue: 'cat',
      canEscalate: true,
    };
  }

  // Stage 3: Highlight the Exact Target Cell + Why It Must Contain a Cat
  if (stage === 3) {
    const message =
      deduction.technique === 'naked_row_single'
        ? i18n.t('hints.rowDeductionMsg', { row: target.row + 1 })
        : deduction.technique === 'naked_col_single'
          ? i18n.t('hints.colDeductionMsg', { col: target.col + 1 })
          : deduction.technique === 'naked_region_single'
            ? i18n.t('hints.regionDeductionMsg', { region: targetRegName.toLowerCase() })
            : i18n.t('hints.spotNearbyMsg', {
                region: targetRegName.toLowerCase(),
                row: target.row + 1,
                col: target.col + 1,
              });

    return {
      type: 'place-cat',
      stage: 3,
      technique: deduction.technique,
      targetCell: target,
      areaCells: deduction.areaCells,
      relatedCells: deduction.relatedCells,
      title: i18n.t('hints.stage3Title'),
      message,
      revealTargetCell: true,
      canApply: false,
      applyValue: 'cat',
      canEscalate: true,
    };
  }

  // Stage 4: Confirmed Reveal Cat
  return {
    type: 'place-cat',
    stage: 4,
    technique: deduction.technique,
    targetCell: target,
    areaCells: [target],
    relatedCells: deduction.relatedCells,
    title: i18n.t('hints.stage4Title'),
    message: i18n.t('hints.stage4ConfirmMsg', {
      region: targetRegName.toLowerCase(),
      row: target.row + 1,
      col: target.col + 1,
    }),
    revealTargetCell: true,
    canApply: true,
    applyValue: 'cat',
    canEscalate: false,
  };
}

/**
 * Backward-compatible entry point returning a live hint (defaults to Stage 3 target hint
 * when called directly by legacy tests or automated helpers, or any requested stage).
 */
export function getNextHint(
  puzzle: PuzzleDefinition,
  board: BoardGrid,
  stage: HintStage = 3
): HintResult | null {
  return getProgressiveHint(puzzle, board, stage);
}
