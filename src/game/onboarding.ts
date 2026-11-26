import { BoardGrid, CellCoord, cellKey, coordsEqual } from './gameTypes';
import { areCellsTouching } from './validation';

export interface OnboardingPuzzle {
  size: 4;
  regions: number[][];
  solution: CellCoord[];
}

export const ONBOARDING_PUZZLE: OnboardingPuzzle = {
  size: 4,
  regions: [
    [1, 3, 2, 2], // 1 = Rose (pink), 3 = Sage (green)
    [1, 2, 2, 2], // 2 = Sky (blue)
    [1, 0, 2, 2], // 0 = Honey (yellow)
    [1, 0, 0, 2],
  ],
  solution: [
    { row: 0, col: 1 },
    { row: 1, col: 3 },
    { row: 2, col: 0 },
    { row: 3, col: 2 },
  ],
};

export type OnboardingStepId =
  | 'placeFirst'
  | 'ruleColor'
  | 'toolOn'
  | 'ruleRowCol'
  | 'ruleTouch'
  | 'lastHoney'
  | 'sweep'
  | 'lastRose'
  | 'findLast'
  | 'done';

export type OnboardingGoal = 'place' | 'markX' | 'toggleTool' | 'ack';

export type OnboardingBrokenRule = 'color' | 'rowCol' | 'touch';

export interface OnboardingStep {
  id: OnboardingStepId;
  litCells: readonly CellCoord[];
  goal: OnboardingGoal;
  targetCells: readonly CellCoord[];
  instructionKey: string;
  regionId?: number;
  autoToolMode?: 'on' | 'off';
  freePlay?: boolean;
}

const ALL_CELLS: readonly CellCoord[] = Array.from({ length: 16 }, (_, idx) => ({
  row: Math.floor(idx / 4),
  col: idx % 4,
}));

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'placeFirst',
    litCells: [{ row: 0, col: 1 }],
    goal: 'place',
    targetCells: [{ row: 0, col: 1 }],
    instructionKey: 'onboarding.steps.placeFirst',
    autoToolMode: 'off',
  },
  {
    id: 'ruleColor',
    litCells: ALL_CELLS,
    goal: 'ack',
    targetCells: [],
    instructionKey: 'onboarding.steps.ruleColor',
  },
  {
    id: 'toolOn',
    litCells: [],
    goal: 'toggleTool',
    targetCells: [],
    instructionKey: 'onboarding.steps.toolOn',
  },
  {
    id: 'ruleRowCol',
    litCells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
      { row: 3, col: 1 },
    ],
    goal: 'markX',
    targetCells: [
      { row: 0, col: 0 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
      { row: 3, col: 1 },
    ],
    instructionKey: 'onboarding.steps.ruleRowCol',
    autoToolMode: 'on',
  },
  {
    id: 'ruleTouch',
    litCells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ],
    goal: 'markX',
    targetCells: [
      { row: 1, col: 0 },
      { row: 1, col: 2 },
    ],
    instructionKey: 'onboarding.steps.ruleTouch',
    autoToolMode: 'on',
  },
  {
    id: 'lastHoney',
    litCells: [
      { row: 2, col: 1 },
      { row: 3, col: 1 },
      { row: 3, col: 2 },
    ],
    goal: 'place',
    targetCells: [{ row: 3, col: 2 }],
    instructionKey: 'onboarding.steps.lastInRegion',
    regionId: 0,
    autoToolMode: 'off',
  },
  {
    id: 'sweep',
    litCells: [
      { row: 3, col: 0 },
      { row: 3, col: 1 },
      { row: 3, col: 2 },
      { row: 3, col: 3 },
    ],
    goal: 'markX',
    targetCells: [
      { row: 3, col: 0 },
      { row: 3, col: 3 },
    ],
    instructionKey: 'onboarding.steps.sweep',
    autoToolMode: 'on',
  },
  {
    id: 'lastRose',
    litCells: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 3, col: 0 },
    ],
    goal: 'place',
    targetCells: [{ row: 2, col: 0 }],
    instructionKey: 'onboarding.steps.lastInRegion',
    regionId: 1,
    autoToolMode: 'off',
  },
  {
    id: 'findLast',
    litCells: ALL_CELLS,
    goal: 'place',
    targetCells: [{ row: 1, col: 3 }],
    instructionKey: 'onboarding.steps.findLast',
    freePlay: true,
  },
  {
    id: 'done',
    litCells: ALL_CELLS,
    goal: 'ack',
    targetCells: [],
    instructionKey: 'onboarding.steps.done',
  },
];

export function createOnboardingBoard(): BoardGrid {
  return Array.from({ length: ONBOARDING_PUZZLE.size }, () =>
    Array.from({ length: ONBOARDING_PUZZLE.size }, () => 'empty')
  );
}

export function isCellInList(cells: readonly CellCoord[], cell: CellCoord): boolean {
  return cells.some((c) => coordsEqual(c, cell));
}

export function isStepComplete(
  step: OnboardingStep,
  board: BoardGrid,
  toolOn: boolean
): boolean {
  switch (step.goal) {
    case 'place':
      return (
        step.targetCells.length > 0 &&
        step.targetCells.every((c) => board[c.row]?.[c.col] === 'cat')
      );
    case 'markX':
      return (
        step.targetCells.length > 0 &&
        step.targetCells.every((c) => board[c.row]?.[c.col] === 'x')
      );
    case 'toggleTool':
      return toolOn;
    case 'ack':
      return false;
  }
}

export function nextStepIndex(
  currentIndex: number,
  board: BoardGrid,
  toolOn: boolean
): number {
  const step = ONBOARDING_STEPS[currentIndex];
  if (!step) return currentIndex;
  if (currentIndex >= ONBOARDING_STEPS.length - 1) return currentIndex;
  return isStepComplete(step, board, toolOn) ? currentIndex + 1 : currentIndex;
}

/**
 * Determines which Meowdoku rule placing a cat at `cell` breaks on `board`.
 * Precedence: color → rowCol → touch. Returns null if valid.
 */
export function brokenRule(
  board: BoardGrid,
  cell: CellCoord
): OnboardingBrokenRule | null {
  const targetRegion = ONBOARDING_PUZZLE.regions[cell.row]?.[cell.col];
  const existingCats: CellCoord[] = [];
  for (let r = 0; r < ONBOARDING_PUZZLE.size; r++) {
    for (let c = 0; c < ONBOARDING_PUZZLE.size; c++) {
      if (r === cell.row && c === cell.col) continue;
      if (board[r]?.[c] === 'cat') {
        existingCats.push({ row: r, col: c });
      }
    }
  }

  for (const cat of existingCats) {
    if (ONBOARDING_PUZZLE.regions[cat.row]?.[cat.col] === targetRegion) {
      return 'color';
    }
  }

  for (const cat of existingCats) {
    if (cat.row === cell.row || cat.col === cell.col) {
      return 'rowCol';
    }
  }

  for (const cat of existingCats) {
    if (areCellsTouching(cat, cell)) {
      return 'touch';
    }
  }

  return null;
}

export function getLitCellKeys(step: OnboardingStep): Set<string> {
  return new Set(step.litCells.map((c) => cellKey(c.row, c.col)));
}
