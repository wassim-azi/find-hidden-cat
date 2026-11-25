import { describe, expect, it } from 'vitest';
import { areCellsTouching, validateBoard } from './validation';
import {
  createInitialBoard,
  getEliminatedCellsForCat,
  isLockedCell,
  setCellValue,
  verifyPuzzleDefinition,
} from './puzzleEngine';
import { getDailyPuzzle, getLevelPuzzle } from './levels';

describe('Meowdoku Edge Cases & Mechanics', () => {
  it('treats starter cats as locked cells and places them on initial board', () => {
    const lvl1 = getLevelPuzzle(1);
    expect(lvl1.initialCats.length).toBeGreaterThan(0);

    const board = createInitialBoard(lvl1);
    for (const starter of lvl1.initialCats) {
      expect(isLockedCell(lvl1, starter)).toBe(true);
      expect(board[starter.row]![starter.col]).toBe('cat');
    }
  });

  it('ignores X marks when checking cat conflicts and victory', () => {
    const lvl4 = getLevelPuzzle(4);
    let board = createInitialBoard(lvl4);

    // Fill every non-solution cell with X marks and solution cells with cats
    for (let r = 0; r < lvl4.size; r++) {
      for (let c = 0; c < lvl4.size; c++) {
        const isSol = lvl4.solution.some((s) => s.row === r && s.col === c);
        board = setCellValue(board, { row: r, col: c }, isSol ? 'cat' : 'x');
      }
    }

    const res = validateBoard(lvl4, board);
    expect(res.isValid).toBe(true);
    expect(res.isSolved).toBe(true);
  });

  it('correctly identifies 8-directional adjacency', () => {
    const center = { row: 2, col: 2 };
    expect(areCellsTouching(center, { row: 2, col: 2 })).toBe(false);
    expect(areCellsTouching(center, { row: 1, col: 1 })).toBe(true);
    expect(areCellsTouching(center, { row: 3, col: 3 })).toBe(true);
    expect(areCellsTouching(center, { row: 2, col: 3 })).toBe(true);
    expect(areCellsTouching(center, { row: 0, col: 2 })).toBe(false);
    expect(areCellsTouching(center, { row: 4, col: 3 })).toBe(false);
  });

  it('computes all eliminated cells (row, col, region, diagonals) for Auto-X assist', () => {
    const lvl4 = getLevelPuzzle(4);
    const eliminated = getEliminatedCellsForCat(lvl4, { row: 2, col: 2 });
    const keys = new Set(eliminated.map((c) => `${c.row},${c.col}`));
    expect(keys.has('2,2')).toBe(false);
    expect(keys.has('2,0')).toBe(true); // same row
    expect(keys.has('0,2')).toBe(true); // same col
    expect(keys.has('1,1')).toBe(true); // diagonal neighbor
    expect(keys.has('3,3')).toBe(true); // diagonal neighbor
  });

  it('generates a deterministic unique-solution 8x8 Daily Kitty puzzle', () => {
    const dailyA = getDailyPuzzle('2026-11-25');
    const dailyB = getDailyPuzzle('2026-11-25');
    expect(dailyA.size).toBe(8);
    expect(dailyA.dailyDateKey).toBe('2026-11-25');
    expect(dailyA.regions).toEqual(dailyB.regions);
    const check = verifyPuzzleDefinition(dailyA);
    expect(check.valid).toBe(true);
    expect(check.solutionCount).toBe(1);
  });
});
