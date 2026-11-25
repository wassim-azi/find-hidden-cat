import { describe, expect, it } from 'vitest';
import {
  areRegionsContiguous,
  countSolutions,
  createInitialBoard,
  setCellValue,
  verifyPuzzleDefinition,
} from './puzzleEngine';
import { getAllLevelPuzzles, getLevelPuzzle, TOTAL_LEVELS } from './levels';
import { calculateStars, isPlacementSafe, validateBoard } from './validation';
import { getNextHint } from './hintEngine';
import { generateValidatedPuzzle } from './puzzleGenerator';
import { coordsEqual } from './gameTypes';

describe('Meowdoku Puzzle Engine & Validation', () => {
  it('validates all 24 curated levels have contiguous regions and unique solutions', () => {
    const start = performance.now();
    const puzzles = getAllLevelPuzzles();
    const elapsed = performance.now() - start;

    expect(puzzles).toHaveLength(TOTAL_LEVELS);
    expect(TOTAL_LEVELS).toBeGreaterThanOrEqual(20);

    for (const puzzle of puzzles) {
      const result = verifyPuzzleDefinition(puzzle);
      expect(result.valid, `Level ${puzzle.id} (${puzzle.title}): ${result.reason}`).toBe(true);
      expect(result.solutionCount).toBe(1);
      expect(areRegionsContiguous(puzzle.size, puzzle.regions)).toBe(true);
    }

    // Ensure generation is fast enough for mobile devices
    expect(elapsed).toBeLessThan(3000);
  });

  it('detects row, column, region, and diagonal adjacency conflicts accurately', () => {
    const puzzle = getLevelPuzzle(4); // 6x6 empty start
    let board = createInitialBoard(puzzle);

    // Place a cat at (0,0)
    board = setCellValue(board, { row: 0, col: 0 }, 'cat');
    let res = validateBoard(puzzle, board);
    expect(res.isValid).toBe(true);
    expect(res.placedCatsCount).toBe(1);
    expect(res.isSolved).toBe(false);

    // Same row conflict: (0, 3)
    const sameRowBoard = setCellValue(board, { row: 0, col: 3 }, 'cat');
    res = validateBoard(puzzle, sameRowBoard);
    expect(res.isValid).toBe(false);
    expect(res.violatedRules.has('rowCol')).toBe(true);

    // Same column conflict: (3, 0)
    const sameColBoard = setCellValue(board, { row: 3, col: 0 }, 'cat');
    res = validateBoard(puzzle, sameColBoard);
    expect(res.isValid).toBe(false);
    expect(res.violatedRules.has('rowCol')).toBe(true);

    // Diagonal adjacency conflict: (1, 1)
    const diagBoard = setCellValue(board, { row: 1, col: 1 }, 'cat');
    res = validateBoard(puzzle, diagBoard);
    expect(res.isValid).toBe(false);
    expect(res.violatedRules.has('adjacent')).toBe(true);
    expect(isPlacementSafe(puzzle, board, { row: 1, col: 1 })).toBe(false);

    // Same region conflict: find another cell in region of (0,0)
    const reg0 = puzzle.regions[0]![0]!;
    let peer: { row: number; col: number } | null = null;
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if ((r !== 0 || c !== 0) && puzzle.regions[r]![c] === reg0) {
          peer = { row: r, col: c };
          break;
        }
      }
      if (peer) break;
    }
    if (peer) {
      const sameRegBoard = setCellValue(board, peer, 'cat');
      res = validateBoard(puzzle, sameRegBoard);
      expect(res.isValid).toBe(false);
      expect(res.violatedRules.has('region')).toBe(true);
    }
  });

  it('recognizes a completely solved board only when all rules are met', () => {
    const puzzle = getLevelPuzzle(15); // 8x8 puzzle
    let board = createInitialBoard(puzzle);

    for (const cat of puzzle.solution) {
      board = setCellValue(board, cat, 'cat');
    }

    const res = validateBoard(puzzle, board);
    expect(res.isValid).toBe(true);
    expect(res.isSolved).toBe(true);
    expect(res.completedRegions.size).toBe(puzzle.size);
    expect(res.placedCatsCount).toBe(puzzle.size);
  });

  it('hint engine guides player step-by-step to a valid solution and fixes mistakes', () => {
    const puzzle = getLevelPuzzle(1);
    let board = createInitialBoard(puzzle);

    // Introduce a wrong cat (not in solution)
    let wrongCell = { row: 0, col: 0 };
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (board[r]![c] === 'empty' && !puzzle.solution.some((s) => coordsEqual(s, { row: r, col: c }))) {
          wrongCell = { row: r, col: c };
          break;
        }
      }
    }

    const mistakeBoard = setCellValue(board, wrongCell, 'cat');
    const mistakeHint = getNextHint(puzzle, mistakeBoard);
    expect(mistakeHint).not.toBeNull();
    expect(['fix-conflict', 'remove-wrong-cat']).toContain(mistakeHint!.type);

    // Now follow hints from initial board all the way to victory
    let steps = 0;
    while (!validateBoard(puzzle, board).isSolved && steps < 10) {
      const hint = getNextHint(puzzle, board);
      expect(hint).not.toBeNull();
      expect(hint!.type).toBe('place-cat');
      board = setCellValue(board, hint!.targetCell, hint!.applyValue);
      steps++;
    }

    expect(validateBoard(puzzle, board).isSolved).toBe(true);
  });

  it('generates validated unique-solution puzzles on demand for 6x6 and 8x8', () => {
    const custom6 = generateValidatedPuzzle({
      id: 99,
      title: 'Custom 6x6',
      size: 6,
      difficulty: 'easy',
      seed: 77777,
    });
    expect(countSolutions(6, custom6.regions, 2)).toBe(1);

    const custom8 = generateValidatedPuzzle({
      id: 100,
      title: 'Custom 8x8',
      size: 8,
      difficulty: 'hard',
      seed: 88888,
    });
    expect(countSolutions(8, custom8.regions, 2)).toBe(1);
  });

  it('calculates stars accurately based on par time and hints used', () => {
    expect(calculateStars(40, 0, 60)).toBe(3);
    expect(calculateStars(75, 0, 60)).toBe(2);
    expect(calculateStars(50, 1, 60)).toBe(2);
    expect(calculateStars(50, 2, 60)).toBe(1);
    expect(calculateStars(180, 0, 60)).toBe(1);
  });
});
