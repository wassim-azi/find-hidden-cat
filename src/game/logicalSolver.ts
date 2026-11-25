import {
  BoardGrid,
  CellCoord,
  DifficultyAnalysis,
  DifficultyTier,
  LogicalTechnique,
  PuzzleDefinition,
  cellKey,
  coordsEqual,
} from './gameTypes';
import { areCellsTouching, getPlacedCats } from './validation';

export interface LogicalDeduction {
  technique: LogicalTechnique;
  /** The deduced cat placement (always verified against unique solution) */
  targetCell: CellCoord;
  /** Primary focal unit for Stage 1 & Stage 2 highlights */
  focusType: 'region' | 'row' | 'col';
  focusIndex: number; // regionId, row index, or col index
  /** All cells in the focal region/row/col */
  areaCells: CellCoord[];
  /** Blocking cats or supporting cells that force this deduction */
  relatedCells: CellCoord[];
  /** Number of elimination steps needed before this cat became forced */
  chainDepth: number;
  /** If an intersection or adjacency exclusion helped force this cell */
  helperTechnique?: LogicalTechnique;
  helperRegionId?: number;
}

interface CandidateState {
  size: number;
  regions: number[][];
  /** true = cell is still a live candidate */
  possible: boolean[][];
  placedCats: CellCoord[];
  placedRows: boolean[];
  placedCols: boolean[];
  placedRegions: boolean[];
}

function createCandidateState(
  puzzle: Pick<PuzzleDefinition, 'size' | 'regions'>,
  placedCats: CellCoord[]
): CandidateState {
  const { size, regions } = puzzle;
  const possible: boolean[][] = Array.from({ length: size }, () =>
    Array.from<boolean>({ length: size }).fill(true)
  );
  const placedRows = new Array<boolean>(size).fill(false);
  const placedCols = new Array<boolean>(size).fill(false);
  const placedRegions = new Array<boolean>(size).fill(false);

  const state: CandidateState = {
    size,
    regions,
    possible,
    placedCats: [],
    placedRows,
    placedCols,
    placedRegions,
  };

  for (const cat of placedCats) {
    placeCatInState(state, cat);
  }

  return state;
}

function placeCatInState(state: CandidateState, cat: CellCoord): void {
  const { size, regions, possible } = state;
  const regId = regions[cat.row]?.[cat.col];
  if (regId === undefined) return;

  state.placedCats.push(cat);
  state.placedRows[cat.row] = true;
  state.placedCols[cat.col] = true;
  state.placedRegions[regId] = true;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (
        r === cat.row ||
        c === cat.col ||
        regions[r]![c] === regId ||
        areCellsTouching({ row: r, col: c }, cat)
      ) {
        possible[r]![c] = false;
      }
    }
  }
}

function getRegionCandidates(state: CandidateState, regId: number): CellCoord[] {
  if (state.placedRegions[regId]) return [];
  const list: CellCoord[] = [];
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      if (state.regions[r]![c] === regId && state.possible[r]![c]) {
        list.push({ row: r, col: c });
      }
    }
  }
  return list;
}

function getRowCandidates(state: CandidateState, row: number): CellCoord[] {
  if (state.placedRows[row]) return [];
  const list: CellCoord[] = [];
  for (let c = 0; c < state.size; c++) {
    if (state.possible[row]![c]) {
      list.push({ row, col: c });
    }
  }
  return list;
}

function getColCandidates(state: CandidateState, col: number): CellCoord[] {
  if (state.placedCols[col]) return [];
  const list: CellCoord[] = [];
  for (let r = 0; r < state.size; r++) {
    if (state.possible[r]![col]) {
      list.push({ row: r, col });
    }
  }
  return list;
}

function getAllCellsInRegion(
  puzzle: Pick<PuzzleDefinition, 'size' | 'regions'>,
  regId: number
): CellCoord[] {
  const cells: CellCoord[] = [];
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (puzzle.regions[r]![c] === regId) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

function getAllCellsInRow(size: number, row: number): CellCoord[] {
  return Array.from({ length: size }, (_, col) => ({ row, col }));
}

function getAllCellsInCol(size: number, col: number): CellCoord[] {
  return Array.from({ length: size }, (_, row) => ({ row, col }));
}

interface ForcedPlacement {
  cell: CellCoord;
  technique: 'naked_region_single' | 'naked_row_single' | 'naked_col_single';
  focusType: 'region' | 'row' | 'col';
  focusIndex: number;
}

function findImmediateForcedPlacement(state: CandidateState): ForcedPlacement | null {
  // 1. Region with 1 remaining candidate
  for (let reg = 0; reg < state.size; reg++) {
    const cands = getRegionCandidates(state, reg);
    if (cands.length === 1) {
      return {
        cell: cands[0]!,
        technique: 'naked_region_single',
        focusType: 'region',
        focusIndex: reg,
      };
    }
  }

  // 2. Row with 1 remaining candidate
  for (let r = 0; r < state.size; r++) {
    const cands = getRowCandidates(state, r);
    if (cands.length === 1) {
      return {
        cell: cands[0]!,
        technique: 'naked_row_single',
        focusType: 'row',
        focusIndex: r,
      };
    }
  }

  // 3. Column with 1 remaining candidate
  for (let c = 0; c < state.size; c++) {
    const cands = getColCandidates(state, c);
    if (cands.length === 1) {
      return {
        cell: cands[0]!,
        technique: 'naked_col_single',
        focusType: 'col',
        focusIndex: c,
      };
    }
  }

  return null;
}

interface EliminationStep {
  technique: LogicalTechnique;
  eliminatedCount: number;
  sourceRegionId?: number;
}

/**
 * Runs one pass of human-style candidate elimination (without guessing) and returns
 * the first technique that eliminates at least one candidate.
 */
function applyOneEliminationPass(state: CandidateState): EliminationStep | null {
  const { size, regions, possible } = state;

  // Technique A: Region-Line Intersection
  // If all candidates of an unplaced region lie in a single row or column,
  // eliminate all other candidates in that row or column.
  for (let reg = 0; reg < size; reg++) {
    const cands = getRegionCandidates(state, reg);
    if (cands.length < 2) continue;

    const firstRow = cands[0]!.row;
    if (cands.every((c) => c.row === firstRow)) {
      let eliminated = 0;
      for (let col = 0; col < size; col++) {
        if (regions[firstRow]![col] !== reg && possible[firstRow]![col]) {
          possible[firstRow]![col] = false;
          eliminated += 1;
        }
      }
      if (eliminated > 0) {
        return {
          technique: 'region_line_intersection',
          eliminatedCount: eliminated,
          sourceRegionId: reg,
        };
      }
    }

    const firstCol = cands[0]!.col;
    if (cands.every((c) => c.col === firstCol)) {
      let eliminated = 0;
      for (let row = 0; row < size; row++) {
        if (regions[row]![firstCol] !== reg && possible[row]![firstCol]) {
          possible[row]![firstCol] = false;
          eliminated += 1;
        }
      }
      if (eliminated > 0) {
        return {
          technique: 'region_line_intersection',
          eliminatedCount: eliminated,
          sourceRegionId: reg,
        };
      }
    }
  }

  // Technique B: Line-Region Intersection
  // If all candidates of an unplaced row (or col) lie in a single region,
  // eliminate all other candidates of that region outside that row (or col).
  for (let r = 0; r < size; r++) {
    const cands = getRowCandidates(state, r);
    if (cands.length < 2) continue;
    const onlyReg = regions[r]![cands[0]!.col]!;
    if (cands.every((c) => regions[c.row]![c.col] === onlyReg)) {
      let eliminated = 0;
      for (let rr = 0; rr < size; rr++) {
        if (rr === r) continue;
        for (let cc = 0; cc < size; cc++) {
          if (regions[rr]![cc] === onlyReg && possible[rr]![cc]) {
            possible[rr]![cc] = false;
            eliminated += 1;
          }
        }
      }
      if (eliminated > 0) {
        return {
          technique: 'line_region_intersection',
          eliminatedCount: eliminated,
          sourceRegionId: onlyReg,
        };
      }
    }
  }

  for (let c = 0; c < size; c++) {
    const cands = getColCandidates(state, c);
    if (cands.length < 2) continue;
    const onlyReg = regions[cands[0]!.row]![c]!;
    if (cands.every((cell) => regions[cell.row]![cell.col] === onlyReg)) {
      let eliminated = 0;
      for (let rr = 0; rr < size; rr++) {
        for (let cc = 0; cc < size; cc++) {
          if (cc === c) continue;
          if (regions[rr]![cc] === onlyReg && possible[rr]![cc]) {
            possible[rr]![cc] = false;
            eliminated += 1;
          }
        }
      }
      if (eliminated > 0) {
        return {
          technique: 'line_region_intersection',
          eliminatedCount: eliminated,
          sourceRegionId: onlyReg,
        };
      }
    }
  }

  // Technique C: Region Adjacency Exclusion
  // If a candidate cell (r, c) touches EVERY remaining candidate of some other unplaced region,
  // then placing a cat at (r, c) would eliminate that entire region — so (r, c) is impossible!
  for (let reg = 0; reg < size; reg++) {
    const regCands = getRegionCandidates(state, reg);
    if (regCands.length === 0 || regCands.length > 4) continue;

    let eliminated = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!possible[r]![c] || regions[r]![c] === reg) continue;
        const testCell: CellCoord = { row: r, col: c };
        const killsAll = regCands.every(
          (rc) =>
            rc.row === r ||
            rc.col === c ||
            areCellsTouching(rc, testCell)
        );
        if (killsAll) {
          possible[r]![c] = false;
          eliminated += 1;
        }
      }
    }

    if (eliminated > 0) {
      return {
        technique: 'region_adjacency_exclusion',
        eliminatedCount: eliminated,
        sourceRegionId: reg,
      };
    }
  }

  // Technique D: Naked Pair of Regions in 2 Rows or 2 Columns
  // If two unplaced regions are completely confined to the same 2 rows (or 2 columns),
  // no other region can place a cat in those 2 rows (or 2 columns).
  const unplacedRegionRows: { reg: number; rows: Set<number>; cols: Set<number> }[] = [];
  for (let reg = 0; reg < size; reg++) {
    const cands = getRegionCandidates(state, reg);
    if (cands.length === 0) continue;
    unplacedRegionRows.push({
      reg,
      rows: new Set(cands.map((c) => c.row)),
      cols: new Set(cands.map((c) => c.col)),
    });
  }

  for (let i = 0; i < unplacedRegionRows.length; i++) {
    for (let j = i + 1; j < unplacedRegionRows.length; j++) {
      const a = unplacedRegionRows[i]!;
      const b = unplacedRegionRows[j]!;

      const unionRows = new Set([...a.rows, ...b.rows]);
      if (unionRows.size === 2) {
        let eliminated = 0;
        for (const r of unionRows) {
          for (let c = 0; c < size; c++) {
            const reg = regions[r]![c]!;
            if (reg !== a.reg && reg !== b.reg && possible[r]![c]) {
              possible[r]![c] = false;
              eliminated += 1;
            }
          }
        }
        if (eliminated > 0) {
          return {
            technique: 'naked_pair_regions',
            eliminatedCount: eliminated,
            sourceRegionId: a.reg,
          };
        }
      }

      const unionCols = new Set([...a.cols, ...b.cols]);
      if (unionCols.size === 2) {
        let eliminated = 0;
        for (const c of unionCols) {
          for (let r = 0; r < size; r++) {
            const reg = regions[r]![c]!;
            if (reg !== a.reg && reg !== b.reg && possible[r]![c]) {
              possible[r]![c] = false;
              eliminated += 1;
            }
          }
        }
        if (eliminated > 0) {
          return {
            technique: 'naked_pair_regions',
            eliminatedCount: eliminated,
            sourceRegionId: a.reg,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Finds the next human-solvable logical deduction from the current board state.
 * Always validates against `puzzle.solution` so hints never contradict the unique solution.
 */
export function findNextLogicalDeduction(
  puzzle: PuzzleDefinition,
  board: BoardGrid
): LogicalDeduction | null {
  const placedCats = getPlacedCats(board);
  const state = createCandidateState(puzzle, placedCats);

  let chainDepth = 0;
  let helperTechnique: LogicalTechnique | undefined;
  let helperRegionId: number | undefined;

  for (let guard = 0; guard < 32; guard++) {
    const forced = findImmediateForcedPlacement(state);
    if (forced && puzzle.solution.some((s) => coordsEqual(s, forced.cell))) {
      const areaCells =
        forced.focusType === 'region'
          ? getAllCellsInRegion(puzzle, forced.focusIndex)
          : forced.focusType === 'row'
            ? getAllCellsInRow(puzzle.size, forced.focusIndex)
            : getAllCellsInCol(puzzle.size, forced.focusIndex);

      const relatedCells = placedCats.filter((cat) =>
        areaCells.some(
          (ac) =>
            ac.row === cat.row ||
            ac.col === cat.col ||
            areCellsTouching(ac, cat)
        )
      );

      return {
        technique: forced.technique,
        targetCell: forced.cell,
        focusType: forced.focusType,
        focusIndex: forced.focusIndex,
        areaCells,
        relatedCells,
        chainDepth,
        helperTechnique,
        helperRegionId,
      };
    }

    const elim = applyOneEliminationPass(state);
    if (!elim) break;
    chainDepth += 1;
    if (!helperTechnique) {
      helperTechnique = elim.technique;
      helperRegionId = elim.sourceRegionId;
    }
  }

  // Fallback for expert deep-chain positions: pick the remaining solution cat in the tightest region
  const placedSet = new Set(placedCats.map((c) => cellKey(c.row, c.col)));
  const missing = puzzle.solution.filter((s) => !placedSet.has(cellKey(s.row, s.col)));
  if (missing.length === 0) return null;

  const bestTarget = [...missing].sort((a, b) => {
    const regA = puzzle.regions[a.row]![a.col]!;
    const regB = puzzle.regions[b.row]![b.col]!;
    return getRegionCandidates(state, regA).length - getRegionCandidates(state, regB).length;
  })[0]!;

  const regId = puzzle.regions[bestTarget.row]![bestTarget.col]!;
  return {
    technique: 'oracle_fallback',
    targetCell: bestTarget,
    focusType: 'region',
    focusIndex: regId,
    areaCells: getAllCellsInRegion(puzzle, regId),
    relatedCells: placedCats.filter((cat) =>
      areCellsTouching(cat, bestTarget) ||
      Math.abs(cat.row - bestTarget.row) <= 2 && Math.abs(cat.col - bestTarget.col) <= 2
    ),
    chainDepth: Math.max(chainDepth, 3),
    helperTechnique,
    helperRegionId,
  };
}

/**
 * Computes an objective, mathematically grounded DifficultyAnalysis for a puzzle
 * by simulating a human logical solver from its starting state (`initialCats`).
 */
export function analyzePuzzleDifficulty(puzzle: PuzzleDefinition): DifficultyAnalysis {
  const state = createCandidateState(puzzle, puzzle.initialCats);

  let initialCandidateCount = 0;
  let unplacedRegionCount = 0;
  for (let reg = 0; reg < puzzle.size; reg++) {
    if (!state.placedRegions[reg]) {
      unplacedRegionCount += 1;
      initialCandidateCount += getRegionCandidates(state, reg).length;
    }
  }

  const avgCandidatesPerRegion =
    unplacedRegionCount > 0
      ? Math.round((initialCandidateCount / unplacedRegionCount) * 10) / 10
      : 0;

  // Count how many moves are immediately forced before any elimination
  let immediatelyForcedMoves = 0;
  for (let reg = 0; reg < puzzle.size; reg++) {
    if (getRegionCandidates(state, reg).length === 1) immediatelyForcedMoves += 1;
  }
  for (let r = 0; r < puzzle.size; r++) {
    if (getRowCandidates(state, r).length === 1) immediatelyForcedMoves += 1;
  }
  for (let c = 0; c < puzzle.size; c++) {
    if (getColCandidates(state, c).length === 1) immediatelyForcedMoves += 1;
  }

  const techniquesUsedSet = new Set<LogicalTechnique>();
  let deductionSteps = 0;
  let currentChain = 0;
  let maxChainDepth = 0;

  while (state.placedCats.length < puzzle.size) {
    const forced = findImmediateForcedPlacement(state);
    if (forced) {
      techniquesUsedSet.add(forced.technique);
      placeCatInState(state, forced.cell);
      deductionSteps += 1;
      maxChainDepth = Math.max(maxChainDepth, currentChain);
      currentChain = 0;
      continue;
    }

    const elim = applyOneEliminationPass(state);
    if (elim) {
      techniquesUsedSet.add(elim.technique);
      deductionSteps += 1;
      currentChain += 1;
      maxChainDepth = Math.max(maxChainDepth, currentChain);
      continue;
    }

    // Couldn't progress without deeper lookahead
    break;
  }

  const solvableByHumanLogic = state.placedCats.length === puzzle.size;
  const techniquesUsed = Array.from(techniquesUsedSet);

  // Compute nuanced complexity score (0..100) from actual logical properties
  let score = 0;
  score += Math.min(26, Math.round(avgCandidatesPerRegion * 3.6));
  score += Math.min(22, deductionSteps * 1.4);
  score += Math.min(20, maxChainDepth * 6.5);
  score -= Math.min(18, immediatelyForcedMoves * 6);
  score -= Math.min(12, puzzle.initialCats.length * 6);

  if (techniquesUsedSet.has('region_line_intersection') || techniquesUsedSet.has('line_region_intersection')) {
    score += 10;
  }
  if (techniquesUsedSet.has('region_adjacency_exclusion')) {
    score += 14;
  }
  if (techniquesUsedSet.has('naked_pair_regions')) {
    score += 16;
  }
  if (!solvableByHumanLogic) {
    score += 18;
  }

  const complexityScore = Math.max(5, Math.min(100, Math.round(score)));

  let tier: DifficultyTier;
  if (complexityScore < 22) {
    tier = 'beginner';
  } else if (complexityScore < 40) {
    tier = 'easy';
  } else if (complexityScore < 60) {
    tier = 'normal';
  } else if (complexityScore < 78) {
    tier = 'hard';
  } else {
    tier = 'expert';
  }

  return {
    tier,
    complexityScore,
    initialCandidateCount,
    immediatelyForcedMoves,
    deductionSteps,
    maxChainDepth,
    avgCandidatesPerRegion,
    startingClues: puzzle.initialCats.length,
    techniquesUsed,
    solvableByHumanLogic,
  };
}
