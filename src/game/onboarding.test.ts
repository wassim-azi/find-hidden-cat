import { describe, expect, it } from 'vitest';
import {
  brokenRule,
  createOnboardingBoard,
  isStepComplete,
  nextStepIndex,
  ONBOARDING_PUZZLE,
  ONBOARDING_STEPS,
} from './onboarding';
import { CellCoord, cellKey, coordsEqual } from './gameTypes';
import { areCellsTouching, validateBoard } from './validation';

function areRegionsConnected(regions: number[][]): boolean {
  const size = regions.length;
  for (let id = 0; id < size; id++) {
    const cells: CellCoord[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (regions[r]![c] === id) cells.push({ row: r, col: c });
      }
    }
    if (cells.length === 0) return false;
    const visited = new Set<string>([cellKey(cells[0]!.row, cells[0]!.col)]);
    const queue: CellCoord[] = [cells[0]!];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const nr = cur.row + dr;
        const nc = cur.col + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (regions[nr]![nc] !== id) continue;
        const k = cellKey(nr, nc);
        if (!visited.has(k)) {
          visited.add(k);
          queue.push({ row: nr, col: nc });
        }
      }
    }
    if (visited.size !== cells.length) return false;
  }
  return true;
}

function bruteForce4x4Solutions(regions: number[][]): CellCoord[][] {
  const solutions: CellCoord[][] = [];
  const usedCols = new Set<number>();
  const usedRegions = new Set<number>();
  const placed: CellCoord[] = [];

  function backtrack(row: number): void {
    if (row === 4) {
      solutions.push(placed.map((p) => ({ ...p })));
      return;
    }
    for (let col = 0; col < 4; col++) {
      const reg = regions[row]![col]!;
      if (usedCols.has(col) || usedRegions.has(reg)) continue;
      const cell = { row, col };
      if (placed.some((p) => areCellsTouching(p, cell))) continue;
      usedCols.add(col);
      usedRegions.add(reg);
      placed.push(cell);
      backtrack(row + 1);
      placed.pop();
      usedCols.delete(col);
      usedRegions.delete(reg);
    }
  }

  backtrack(0);
  return solutions;
}

describe('onboarding 4x4 puzzle and step script (#32)', () => {
  it('ONBOARDING_PUZZLE has 4 connected regions 0..3 and a valid solution', () => {
    expect(ONBOARDING_PUZZLE.size).toBe(4);
    expect(ONBOARDING_PUZZLE.regions).toHaveLength(4);
    const ids = new Set(ONBOARDING_PUZZLE.regions.flat());
    expect([...ids].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    expect(areRegionsConnected(ONBOARDING_PUZZLE.regions)).toBe(true);

    const board = createOnboardingBoard();
    for (const c of ONBOARDING_PUZZLE.solution) {
      board[c.row]![c.col] = 'cat';
    }
    const validation = validateBoard(ONBOARDING_PUZZLE, board);
    expect(validation.isValid).toBe(true);
    expect(validation.isSolved).toBe(true);
  });

  it('ONBOARDING_PUZZLE has a unique solution (4x4 brute force)', () => {
    const solutions = bruteForce4x4Solutions(ONBOARDING_PUZZLE.regions);
    expect(solutions).toHaveLength(1);
    const sol = solutions[0]!;
    for (const c of ONBOARDING_PUZZLE.solution) {
      expect(sol.some((s) => coordsEqual(s, c))).toBe(true);
    }
  });

  it('every step target is consistent with already-placed cats along the script', () => {
    expect(ONBOARDING_STEPS).toHaveLength(10);
    const placedCats: CellCoord[] = [];

    const isExcludedByPlaced = (cell: CellCoord): boolean =>
      placedCats.some((cat) => {
        const catReg = ONBOARDING_PUZZLE.regions[cat.row]![cat.col]!;
        const cellReg = ONBOARDING_PUZZLE.regions[cell.row]![cell.col]!;
        return (
          catReg === cellReg ||
          cat.row === cell.row ||
          cat.col === cell.col ||
          areCellsTouching(cat, cell)
        );
      });

    for (const step of ONBOARDING_STEPS) {
      if (step.goal === 'markX') {
        expect(step.targetCells.length).toBeGreaterThan(0);
        for (const t of step.targetCells) {
          expect(isExcludedByPlaced(t)).toBe(true);
        }
      }

      if (step.goal === 'place') {
        expect(step.targetCells).toHaveLength(1);
        const target = step.targetCells[0]!;
        const regId = ONBOARDING_PUZZLE.regions[target.row]![target.col]!;
        const candidatesInRegion: CellCoord[] = [];
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (ONBOARDING_PUZZLE.regions[r]![c] !== regId) continue;
            const cell = { row: r, col: c };
            if (!isExcludedByPlaced(cell)) candidatesInRegion.push(cell);
          }
        }
        expect(candidatesInRegion).toEqual([target]);
        placedCats.push(target);
      }
    }
  });

  it('isStepComplete and nextStepIndex work for every goal type', () => {
    const placeStep = ONBOARDING_STEPS[0]!;
    const ackStep = ONBOARDING_STEPS[1]!;
    const toolStep = ONBOARDING_STEPS[2]!;
    const markXStep = ONBOARDING_STEPS[3]!;

    const board = createOnboardingBoard();
    expect(isStepComplete(placeStep, board, false)).toBe(false);
    expect(nextStepIndex(0, board, false)).toBe(0);

    board[0]![1] = 'cat';
    expect(isStepComplete(placeStep, board, false)).toBe(true);
    expect(nextStepIndex(0, board, false)).toBe(1);

    // ack steps never auto-complete
    expect(isStepComplete(ackStep, board, false)).toBe(false);
    expect(nextStepIndex(1, board, false)).toBe(1);

    // toggleTool completes when toolOn becomes true
    expect(isStepComplete(toolStep, board, false)).toBe(false);
    expect(nextStepIndex(2, board, false)).toBe(2);
    expect(isStepComplete(toolStep, board, true)).toBe(true);
    expect(nextStepIndex(2, board, true)).toBe(3);

    // markX completes once all targetCells have 'x'
    for (const c of markXStep.targetCells.slice(0, -1)) {
      board[c.row]![c.col] = 'x';
    }
    expect(isStepComplete(markXStep, board, true)).toBe(false);
    const lastX = markXStep.targetCells[markXStep.targetCells.length - 1]!;
    board[lastX.row]![lastX.col] = 'x';
    expect(isStepComplete(markXStep, board, true)).toBe(true);
    expect(nextStepIndex(3, board, true)).toBe(4);
  });

  it('brokenRule detects color, rowCol and touch in precedence order', () => {
    // color conflict (same region 1, diff row/col/not touching): (0,0) vs (3,0) -> col too,
    // so craft same color non-adjacent different row/col using region 2: (0,3) and (2,2)
    const colorBoard = createOnboardingBoard();
    colorBoard[0]![3] = 'cat'; // region 2
    expect(brokenRule(colorBoard, { row: 2, col: 2 })).toBe('color'); // also region 2, not touching, diff row/col

    // rowCol conflict (different region, same row/col, not touching): (0,1) [reg 3] vs (0,3) [reg 2]
    const rowColBoard = createOnboardingBoard();
    rowColBoard[0]![1] = 'cat';
    expect(brokenRule(rowColBoard, { row: 0, col: 3 })).toBe('rowCol');

    // touch conflict (different region, diff row/col, diagonal neighbor): (0,1) [reg 3] vs (1,2) [reg 2]
    const touchBoard = createOnboardingBoard();
    touchBoard[0]![1] = 'cat';
    expect(brokenRule(touchBoard, { row: 1, col: 2 })).toBe('touch');

    // Step 9 example: (0,1), (3,2), (2,0) placed -> (2,2) breaks rowCol
    const step9Board = createOnboardingBoard();
    step9Board[0]![1] = 'cat';
    step9Board[3]![2] = 'cat';
    step9Board[2]![0] = 'cat';
    expect(brokenRule(step9Board, { row: 2, col: 2 })).toBe('rowCol');
    expect(brokenRule(step9Board, { row: 1, col: 3 })).toBeNull();
  });
});
