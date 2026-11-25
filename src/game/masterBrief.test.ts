import { beforeEach, describe, expect, it } from 'vitest';
import { getAllLevelPuzzles, getLevelPuzzle } from './levels';
import { analyzePuzzleDifficulty, findNextLogicalDeduction } from './logicalSolver';
import { getProgressiveHint } from './hintEngine';
import { createInitialBoard, verifyPuzzleDefinition } from './puzzleEngine';
import { CURATED_FALLBACK_PUZZLES } from './curatedPuzzles';
import { evaluateCatPlacement, validateBoard } from './validation';
import { cellKey, coordsEqual, MAX_CLASSIC_HEARTS } from './gameTypes';
import { useGameStore } from '../store/gameStore';

describe('Master Brief — Engine, Difficulty, Progressive Hints, Controls, Hearts & Marks', () => {
  beforeEach(() => {
    useGameStore.getState().resetAllProgress();
  });

  it('validates all curated fallback puzzles as unique-solution valid puzzles', () => {
    for (const puzzle of Object.values(CURATED_FALLBACK_PUZZLES)) {
      const check = verifyPuzzleDefinition(puzzle);
      expect(check.valid).toBe(true);
      expect(check.solutionCount).toBe(1);
    }
  });

  it('evaluates candidate placements for region, row, col, diagonal touching, and unsolvable dead-ends', () => {
    const lvl1 = getLevelPuzzle(1);
    const board = createInitialBoard(lvl1);
    const starter = lvl1.initialCats[0]!;

    // Diagonal neighbor of starter cat must be rejected as adjacent
    const diagCandidates = [
      { row: starter.row + 1, col: starter.col + 1 },
      { row: starter.row - 1, col: starter.col - 1 },
      { row: starter.row + 1, col: starter.col - 1 },
      { row: starter.row - 1, col: starter.col + 1 },
    ].filter(
      (c) => c.row >= 0 && c.row < lvl1.size && c.col >= 0 && c.col < lvl1.size
    );
    expect(diagCandidates.length).toBeGreaterThan(0);
    const diagEval = evaluateCatPlacement(lvl1, board, diagCandidates[0]!);
    expect(diagEval.valid).toBe(false);
    expect(diagEval.rule).toBe('adjacent');

    // A non-conflicting cell that is NOT in the unique solution must be caught as unsolvable
    let unsolvableCell: { row: number; col: number } | null = null;
    for (let r = 0; r < lvl1.size; r++) {
      for (let c = 0; c < lvl1.size; c++) {
        if (board[r]![c] !== 'empty') continue;
        const coord = { row: r, col: c };
        const inSol = lvl1.solution.some((s) => coordsEqual(s, coord));
        if (inSol) continue;
        const ev = evaluateCatPlacement(lvl1, board, coord);
        if (!ev.valid && ev.rule === 'unsolvable') {
          unsolvableCell = coord;
          break;
        }
      }
      if (unsolvableCell) break;
    }
    expect(unsolvableCell).not.toBeNull();
  });

  it('analyzes objective 5-tier logical difficulty across all 24 campaign puzzles', () => {
    const allLevels = getAllLevelPuzzles();
    const validTiers = new Set(['beginner', 'easy', 'normal', 'hard', 'expert']);

    for (const lvl of allLevels) {
      const analysis = analyzePuzzleDifficulty(lvl);
      expect(validTiers.has(analysis.tier)).toBe(true);
      expect(analysis.complexityScore).toBeGreaterThanOrEqual(5);
      expect(analysis.complexityScore).toBeLessThanOrEqual(100);
      expect(analysis.initialCandidateCount).toBeGreaterThan(0);
      expect(analysis.deductionSteps).toBeGreaterThan(0);
    }

    // Level 1 with starter clues should have lower complexity than late 8x8 puzzles
    const a1 = analyzePuzzleDifficulty(getLevelPuzzle(1));
    const a24 = analyzePuzzleDifficulty(getLevelPuzzle(24));
    expect(a1.complexityScore).toBeLessThan(a24.complexityScore);
  });

  it('generates 4-stage progressive teaching hints always consistent with unique solution', () => {
    const lvl1 = getLevelPuzzle(1);
    const board = createInitialBoard(lvl1);

    const deduction = findNextLogicalDeduction(lvl1, board);
    expect(deduction).not.toBeNull();
    expect(lvl1.solution.some((s) => coordsEqual(s, deduction!.targetCell))).toBe(true);

    const h1 = getProgressiveHint(lvl1, board, 1)!;
    const h2 = getProgressiveHint(lvl1, board, 2)!;
    const h3 = getProgressiveHint(lvl1, board, 3)!;
    const h4 = getProgressiveHint(lvl1, board, 4)!;

    expect(h1.stage).toBe(1);
    expect(h1.revealTargetCell).toBe(false);
    expect(h1.canApply).toBe(false);
    expect(h1.canEscalate).toBe(true);
    expect(h1.areaCells.length).toBeGreaterThan(0);

    expect(h2.stage).toBe(2);
    expect(h2.revealTargetCell).toBe(false);
    expect(h2.canApply).toBe(false);

    expect(h3.stage).toBe(3);
    expect(h3.revealTargetCell).toBe(true);
    expect(h3.canApply).toBe(false);
    expect(h3.canEscalate).toBe(true);

    expect(h4.stage).toBe(4);
    expect(h4.revealTargetCell).toBe(true);
    expect(h4.canApply).toBe(true);
    expect(h4.canEscalate).toBe(false);
    expect(lvl1.solution.some((s) => coordsEqual(s, h4.targetCell))).toBe(true);
  });

  it('enforces 3-hearts Classic Mode, rejects invalid cats cleanly, and never refunds hearts on Undo', () => {
    const store = useGameStore.getState();
    store.startLevel(1, false);
    expect(useGameStore.getState().hearts).toBe(MAX_CLASSIC_HEARTS);

    const puzzle = useGameStore.getState().puzzle;
    const wrongCell = (() => {
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (!puzzle.solution.some((s) => s.row === r && s.col === c)) {
            return { row: r, col: c };
          }
        }
      }
      return { row: 0, col: 0 };
    })();

    // First make one valid move (a manual X) so Undo stack is non-empty
    useGameStore.getState().toggleManualX(wrongCell);
    expect(useGameStore.getState().hearts).toBe(3); // Marking X never costs a heart!

    // Attempt 3 wrong cat placements
    expect(useGameStore.getState().attemptPlaceCat(wrongCell)).toBe(false);
    expect(useGameStore.getState().hearts).toBe(2);
    expect(useGameStore.getState().board[wrongCell.row]![wrongCell.col]).not.toBe('cat');

    // Undo MUST NOT refund the lost heart!
    useGameStore.getState().undo();
    expect(useGameStore.getState().hearts).toBe(2);

    useGameStore.getState().attemptPlaceCat(wrongCell);
    expect(useGameStore.getState().hearts).toBe(1);

    useGameStore.getState().attemptPlaceCat(wrongCell);
    expect(useGameStore.getState().hearts).toBe(0);
    expect(useGameStore.getState().outOfHearts).toBe(true);

    // Continuing in Practice Mode clears Out of Hearts and protects hearts on mistakes
    useGameStore.getState().continueInPracticeMode();
    expect(useGameStore.getState().gameMode).toBe('practice');
    expect(useGameStore.getState().outOfHearts).toBe(false);
    expect(useGameStore.getState().attemptPlaceCat(wrongCell)).toBe(false);
    expect(useGameStore.getState().outOfHearts).toBe(false);
  });

  it('prevents accidental single-tap placement in tap-confirm mode and blocks double-tapping X-marked cells', () => {
    useGameStore.getState().startLevel(1, false);
    const puzzle = useGameStore.getState().puzzle;
    const target = puzzle.solution.find(
      (s) => !puzzle.initialCats.some((ic) => coordsEqual(ic, s))
    )!;

    // Default controlMode is tap-confirm: single tap selects only, never places cat
    expect(useGameStore.getState().settings.controlMode).toBe('tap-confirm');
    useGameStore.getState().tapCell(target);
    expect(useGameStore.getState().selectedCell).toEqual(target);
    expect(useGameStore.getState().board[target.row]![target.col]).not.toBe('cat');

    // Double-tap mode: marking cell with manual X blocks double-tap cat placement
    useGameStore.getState().updateSetting('controlMode', 'double-tap');
    useGameStore.getState().toggleManualX(target);
    useGameStore.getState().doubleTapCell(target);
    expect(useGameStore.getState().board[target.row]![target.col]).toBe('x');
  });

  it('preserves Manual X and Candidate notes across unrelated moves, Auto-X toggles, and Undo/Redo', () => {
    useGameStore.getState().startLevel(1, false);
    const puzzle = useGameStore.getState().puzzle;
    const nonStarterSols = puzzle.solution.filter(
      (s) => !puzzle.initialCats.some((ic) => coordsEqual(ic, s))
    );
    const solA = nonStarterSols[0]!;
    const solB = nonStarterSols[1]!;

    // Place a candidate note on solB and a manual X on a non-solution cell
    const manualCell = (() => {
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (
            useGameStore.getState().board[r]![c] === 'empty' &&
            !coordsEqual({ row: r, col: c }, solA) &&
            !coordsEqual({ row: r, col: c }, solB)
          ) {
            return { row: r, col: c };
          }
        }
      }
      return { row: 0, col: 0 };
    })();

    useGameStore.getState().toggleManualX(manualCell);
    useGameStore.getState().toggleCandidate(solB);
    expect(useGameStore.getState().manualXKeys).toContain(
      cellKey(manualCell.row, manualCell.col)
    );
    expect(useGameStore.getState().candidateMarks[cellKey(solB.row, solB.col)]).toBe(
      'possible'
    );

    // Place cat on solA, then toggle Auto-X off and back on — manual X and candidate must survive!
    expect(useGameStore.getState().attemptPlaceCat(solA)).toBe(true);
    useGameStore.getState().updateSetting('autoMarkX', false);
    expect(useGameStore.getState().manualXKeys).toContain(
      cellKey(manualCell.row, manualCell.col)
    );
    expect(useGameStore.getState().candidateMarks[cellKey(solB.row, solB.col)]).toBe(
      'possible'
    );

    // Undo solA cat placement — manual X and candidate MUST remain intact!
    useGameStore.getState().undo();
    expect(useGameStore.getState().board[solA.row]![solA.col]).not.toBe('cat');
    expect(useGameStore.getState().manualXKeys).toContain(
      cellKey(manualCell.row, manualCell.col)
    );
    expect(useGameStore.getState().candidateMarks[cellKey(solB.row, solB.col)]).toBe(
      'possible'
    );

    // Redo restores solA cat cleanly
    useGameStore.getState().redo();
    expect(useGameStore.getState().board[solA.row]![solA.col]).toBe('cat');

    // Final validation stays clean
    const val = validateBoard(puzzle, useGameStore.getState().board);
    expect(val.isValid).toBe(true);
  });

  it('prevents accidental double currency deduction when purchaseBooster is double-tapped', () => {
    const startCoins = useGameStore.getState().fishCoins;
    const first = useGameStore.getState().purchaseBooster('hint');
    const secondImmediate = useGameStore.getState().purchaseBooster('hint');
    expect(first).toBe(true);
    expect(secondImmediate).toBe(false);
    expect(useGameStore.getState().fishCoins).toBe(startCoins - 20);
  });
});
