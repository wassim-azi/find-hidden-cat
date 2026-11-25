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
  /** Hardest elimination technique needed before this cat became forced */
  helperTechnique?: LogicalTechnique;
  /** Region that triggered the helper elimination (region-based techniques) */
  helperRegionId?: number;
  /** Row/column that triggered the helper elimination (line-based techniques) */
  helperLine?: { type: 'row' | 'col'; index: number };
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

/**
 * Difficulty rank of every technique (0 = easiest). The human-style solver always
 * applies the easiest available technique first, and a puzzle's tier is driven by the
 * hardest technique it genuinely requires — the standard approach used by Sudoku graders.
 */
export const TECHNIQUE_RANK: Record<LogicalTechnique, number> = {
  naked_region_single: 0,
  naked_row_single: 0,
  naked_col_single: 0,
  region_line_intersection: 1,
  line_region_intersection: 1,
  region_adjacency_exclusion: 2,
  line_adjacency_exclusion: 2,
  naked_pair_regions: 3,
  line_group_confinement: 3,
  contradiction_chain: 4,
  oracle_fallback: 5,
};

function createCandidateState(
  puzzle: Pick<PuzzleDefinition, 'size' | 'regions'>,
  placedCats: CellCoord[]
): CandidateState {
  const { size, regions } = puzzle;
  const state: CandidateState = {
    size,
    regions,
    possible: Array.from({ length: size }, () =>
      Array.from<boolean>({ length: size }).fill(true)
    ),
    placedCats: [],
    placedRows: new Array<boolean>(size).fill(false),
    placedCols: new Array<boolean>(size).fill(false),
    placedRegions: new Array<boolean>(size).fill(false),
  };

  for (const cat of placedCats) {
    placeCatInState(state, cat);
  }

  return state;
}

function cloneState(state: CandidateState): CandidateState {
  return {
    size: state.size,
    regions: state.regions,
    possible: state.possible.map((row) => [...row]),
    placedCats: [...state.placedCats],
    placedRows: [...state.placedRows],
    placedCols: [...state.placedCols],
    placedRegions: [...state.placedRegions],
  };
}

/** True when a cat at `a` rules out a cat at `b` (same row, column, region, or touching). */
function blocks(regions: number[][], a: CellCoord, b: CellCoord): boolean {
  return (
    a.row === b.row ||
    a.col === b.col ||
    regions[a.row]![a.col] === regions[b.row]![b.col] ||
    areCellsTouching(a, b)
  );
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
      if (blocks(regions, cat, { row: r, col: c })) {
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

/** True when some still-unplaced region, row or column has no candidate left. */
function hasContradiction(state: CandidateState): boolean {
  for (let i = 0; i < state.size; i++) {
    if (!state.placedRegions[i] && getRegionCandidates(state, i).length === 0) return true;
    if (!state.placedRows[i] && getRowCandidates(state, i).length === 0) return true;
    if (!state.placedCols[i] && getColCandidates(state, i).length === 0) return true;
  }
  return false;
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
  for (let reg = 0; reg < state.size; reg++) {
    const cands = getRegionCandidates(state, reg);
    if (cands.length === 1) {
      return { cell: cands[0]!, technique: 'naked_region_single', focusType: 'region', focusIndex: reg };
    }
  }
  for (let r = 0; r < state.size; r++) {
    const cands = getRowCandidates(state, r);
    if (cands.length === 1) {
      return { cell: cands[0]!, technique: 'naked_row_single', focusType: 'row', focusIndex: r };
    }
  }
  for (let c = 0; c < state.size; c++) {
    const cands = getColCandidates(state, c);
    if (cands.length === 1) {
      return { cell: cands[0]!, technique: 'naked_col_single', focusType: 'col', focusIndex: c };
    }
  }
  return null;
}

interface EliminationStep {
  technique: LogicalTechnique;
  eliminatedCount: number;
  sourceRegionId?: number;
  sourceLine?: { type: 'row' | 'col'; index: number };
}

function eliminate(state: CandidateState, cells: CellCoord[]): number {
  let count = 0;
  for (const cell of cells) {
    if (state.possible[cell.row]![cell.col]) {
      state.possible[cell.row]![cell.col] = false;
      count += 1;
    }
  }
  return count;
}

/** Technique A/B (rank 1): a region confined to one line, or a line confined to one region. */
function applyIntersections(state: CandidateState): EliminationStep | null {
  const { size, regions, possible } = state;

  for (let reg = 0; reg < size; reg++) {
    const cands = getRegionCandidates(state, reg);
    if (cands.length < 2) continue;
    const firstRow = cands[0]!.row;
    if (cands.every((c) => c.row === firstRow)) {
      const targets: CellCoord[] = [];
      for (let col = 0; col < size; col++) {
        if (regions[firstRow]![col] !== reg && possible[firstRow]![col]) targets.push({ row: firstRow, col });
      }
      const n = eliminate(state, targets);
      if (n > 0) return { technique: 'region_line_intersection', eliminatedCount: n, sourceRegionId: reg };
    }
    const firstCol = cands[0]!.col;
    if (cands.every((c) => c.col === firstCol)) {
      const targets: CellCoord[] = [];
      for (let row = 0; row < size; row++) {
        if (regions[row]![firstCol] !== reg && possible[row]![firstCol]) targets.push({ row, col: firstCol });
      }
      const n = eliminate(state, targets);
      if (n > 0) return { technique: 'region_line_intersection', eliminatedCount: n, sourceRegionId: reg };
    }
  }

  for (let line = 0; line < size; line++) {
    for (const type of ['row', 'col'] as const) {
      const cands = type === 'row' ? getRowCandidates(state, line) : getColCandidates(state, line);
      if (cands.length < 2) continue;
      const onlyReg = regions[cands[0]!.row]![cands[0]!.col]!;
      if (!cands.every((c) => regions[c.row]![c.col] === onlyReg)) continue;
      const targets: CellCoord[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const onLine = type === 'row' ? r === line : c === line;
          if (!onLine && regions[r]![c] === onlyReg && possible[r]![c]) targets.push({ row: r, col: c });
        }
      }
      const n = eliminate(state, targets);
      if (n > 0) {
        return {
          technique: 'line_region_intersection',
          eliminatedCount: n,
          sourceRegionId: onlyReg,
          sourceLine: { type, index: line },
        };
      }
    }
  }

  return null;
}

/**
 * Technique C (rank 2): a candidate tile that would block EVERY remaining candidate of
 * another unplaced region, row or column can never hold a cat.
 */
function applyBlockingExclusion(state: CandidateState): EliminationStep | null {
  const { size, regions, possible } = state;

  const units: { kind: 'region' | 'row' | 'col'; index: number; cands: CellCoord[] }[] = [];
  for (let i = 0; i < size; i++) {
    const regC = getRegionCandidates(state, i);
    if (regC.length > 0) units.push({ kind: 'region', index: i, cands: regC });
  }
  for (let i = 0; i < size; i++) {
    const rowC = getRowCandidates(state, i);
    if (rowC.length > 0) units.push({ kind: 'row', index: i, cands: rowC });
    const colC = getColCandidates(state, i);
    if (colC.length > 0) units.push({ kind: 'col', index: i, cands: colC });
  }

  for (const unit of units) {
    const targets: CellCoord[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!possible[r]![c]) continue;
        const test: CellCoord = { row: r, col: c };
        // A tile inside the unit itself could satisfy that unit
        if (unit.cands.some((u) => u.row === r && u.col === c)) continue;
        if (unit.kind === 'region' && regions[r]![c] === unit.index) continue;
        if (unit.kind === 'row' && r === unit.index) continue;
        if (unit.kind === 'col' && c === unit.index) continue;
        if (unit.cands.every((u) => blocks(regions, test, u))) targets.push(test);
      }
    }
    const n = eliminate(state, targets);
    if (n > 0) {
      return unit.kind === 'region'
        ? { technique: 'region_adjacency_exclusion', eliminatedCount: n, sourceRegionId: unit.index }
        : {
            technique: 'line_adjacency_exclusion',
            eliminatedCount: n,
            sourceLine: { type: unit.kind, index: unit.index },
          };
    }
  }
  return null;
}

/**
 * Technique D (rank 3): pigeonhole confinement for groups of 2..N-1 lines.
 * - If exactly k unplaced regions have ALL candidates inside k unplaced rows (cols), those lines
 *   are reserved for them: eliminate every other region's candidates in those lines.
 * - Dual: if all candidates of k unplaced rows (cols) lie inside exactly k regions, those regions
 *   must place their cats in those lines: eliminate their candidates elsewhere.
 */
function applyGroupConfinement(state: CandidateState): EliminationStep | null {
  const { size, regions, possible } = state;

  for (const type of ['row', 'col'] as const) {
    const placedLines = type === 'row' ? state.placedRows : state.placedCols;
    const openLines: number[] = [];
    for (let i = 0; i < size; i++) if (!placedLines[i]) openLines.push(i);
    if (openLines.length < 3) continue;

    // Bitmask of lines each unplaced region currently occupies
    const regionLineMask = new Map<number, number>();
    for (let reg = 0; reg < size; reg++) {
      const cands = getRegionCandidates(state, reg);
      if (cands.length === 0) continue;
      let mask = 0;
      for (const c of cands) mask |= 1 << (type === 'row' ? c.row : c.col);
      regionLineMask.set(reg, mask);
    }

    const m = openLines.length;
    for (let subset = 1; subset < 1 << m; subset++) {
      let lineMask = 0;
      let k = 0;
      for (let b = 0; b < m; b++) {
        if (subset & (1 << b)) {
          lineMask |= 1 << openLines[b]!;
          k += 1;
        }
      }
      if (k < 2 || k > m - 1) continue;

      const inside: number[] = [];
      const touching: number[] = [];
      for (const [reg, mask] of regionLineMask) {
        if ((mask & ~lineMask) === 0) inside.push(reg);
        if ((mask & lineMask) !== 0) touching.push(reg);
      }

      if (inside.length === k) {
        const insideSet = new Set(inside);
        const targets: CellCoord[] = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const line = type === 'row' ? r : c;
            if ((lineMask & (1 << line)) && possible[r]![c] && !insideSet.has(regions[r]![c]!)) {
              targets.push({ row: r, col: c });
            }
          }
        }
        const n = eliminate(state, targets);
        if (n > 0) return { technique: 'naked_pair_regions', eliminatedCount: n, sourceRegionId: inside[0] };
      }

      if (touching.length === k) {
        const touchSet = new Set(touching);
        const targets: CellCoord[] = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const line = type === 'row' ? r : c;
            if (!(lineMask & (1 << line)) && possible[r]![c] && touchSet.has(regions[r]![c]!)) {
              targets.push({ row: r, col: c });
            }
          }
        }
        const n = eliminate(state, targets);
        if (n > 0) {
          return {
            technique: 'line_group_confinement',
            eliminatedCount: n,
            sourceRegionId: touching[0],
            sourceLine: { type, index: openLines.find((l) => lineMask & (1 << l))! },
          };
        }
      }
    }
  }
  return null;
}

/** Applies all non-trial techniques (ranks 0..3) until no further progress or a contradiction. */
function propagate(state: CandidateState): boolean {
  for (let guard = 0; guard < 400; guard++) {
    if (hasContradiction(state)) return false;
    if (state.placedCats.length === state.size) return true;
    const forced = findImmediateForcedPlacement(state);
    if (forced) {
      // Placing a forced cat that clashes with an existing cat would be caught next pass
      placeCatInState(state, forced.cell);
      continue;
    }
    const step = applyEliminationUpToRank(state, 3);
    if (!step) return true;
  }
  return !hasContradiction(state);
}

/**
 * Technique E (rank 4): one-step "what if" test. If placing a cat on a tile leads — through
 * the simpler techniques only — to a region, row or column with no possible tile, that tile is
 * eliminated. Puzzle players know this as a short test chain.
 */
function applyContradictionTest(state: CandidateState): EliminationStep | null {
  const { size, possible } = state;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!possible[r]![c]) continue;
      const trial = cloneState(state);
      placeCatInState(trial, { row: r, col: c });
      if (!propagate(trial)) {
        possible[r]![c] = false;
        return {
          technique: 'contradiction_chain',
          eliminatedCount: 1,
          sourceRegionId: state.regions[r]![c],
        };
      }
    }
  }
  return null;
}

function applyEliminationUpToRank(state: CandidateState, maxRank: number): EliminationStep | null {
  return (
    applyIntersections(state) ??
    (maxRank >= 2 ? applyBlockingExclusion(state) : null) ??
    (maxRank >= 3 ? applyGroupConfinement(state) : null) ??
    (maxRank >= 4 ? applyContradictionTest(state) : null)
  );
}

/** Runs one pass of human-style candidate elimination, always trying the easiest technique first. */
function applyOneEliminationPass(state: CandidateState): EliminationStep | null {
  return applyEliminationUpToRank(state, 4);
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
  let helper: EliminationStep | undefined;

  // Each elimination pass removes at least one candidate, so size² passes always suffice
  for (let guard = 0; guard <= puzzle.size * puzzle.size; guard++) {
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
          (ac) => ac.row === cat.row || ac.col === cat.col || areCellsTouching(ac, cat)
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
        helperTechnique: helper?.technique,
        helperRegionId: helper?.sourceRegionId,
        helperLine: helper?.sourceLine,
      };
    }

    const elim = applyOneEliminationPass(state);
    if (!elim) break;
    chainDepth += 1;
    // Report the hardest technique the chain needed — that is the insight the player is missing
    if (!helper || TECHNIQUE_RANK[elim.technique] >= TECHNIQUE_RANK[helper.technique]) {
      helper = elim;
    }
  }

  // Fallback (should not happen for validated puzzles): reveal a solution cat in the tightest region
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
    relatedCells: placedCats.filter((cat) => areCellsTouching(cat, bestTarget)),
    chainDepth: Math.max(chainDepth, 3),
  };
}

const TIER_BY_RANK: readonly DifficultyTier[] = ['beginner', 'easy', 'normal', 'hard', 'expert'];
const TIER_BASE_SCORE: Record<DifficultyTier, number> = {
  beginner: 8,
  easy: 26,
  normal: 44,
  hard: 62,
  expert: 80,
};

/**
 * Computes an objective DifficultyAnalysis by simulating a human logical solver from the
 * puzzle's starting state (`initialCats`). The solver always uses the easiest available
 * technique; the tier is the rank of the hardest technique the puzzle genuinely requires.
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

  let immediatelyForcedMoves = 0;
  for (let i = 0; i < puzzle.size; i++) {
    if (getRegionCandidates(state, i).length === 1) immediatelyForcedMoves += 1;
    if (getRowCandidates(state, i).length === 1) immediatelyForcedMoves += 1;
    if (getColCandidates(state, i).length === 1) immediatelyForcedMoves += 1;
  }

  const techniquesUsedSet = new Set<LogicalTechnique>();
  let deductionSteps = 0;
  let currentChain = 0;
  let maxChainDepth = 0;
  let hardestRank = 0;
  let advancedSteps = 0;

  for (let guard = 0; guard < 2000 && state.placedCats.length < puzzle.size; guard++) {
    if (hasContradiction(state)) break;
    const forced = findImmediateForcedPlacement(state);
    if (forced) {
      techniquesUsedSet.add(forced.technique);
      placeCatInState(state, forced.cell);
      deductionSteps += 1;
      currentChain = 0;
      continue;
    }

    const elim = applyOneEliminationPass(state);
    if (!elim) break;
    techniquesUsedSet.add(elim.technique);
    const rank = TECHNIQUE_RANK[elim.technique];
    hardestRank = Math.max(hardestRank, rank);
    if (rank >= 2) advancedSteps += 1;
    deductionSteps += 1;
    currentChain += 1;
    maxChainDepth = Math.max(maxChainDepth, currentChain);
  }

  const solvedCats = state.placedCats;
  const solvableByHumanLogic =
    solvedCats.length === puzzle.size &&
    puzzle.solution.every((s) => solvedCats.some((p) => coordsEqual(p, s)));
  const techniquesUsed = Array.from(techniquesUsedSet);

  const tier: DifficultyTier = solvableByHumanLogic
    ? TIER_BY_RANK[Math.min(4, hardestRank)]!
    : 'expert';

  // Score within the tier band (0..17) grows with workload: candidates, steps and chains
  const workload =
    Math.min(6, avgCandidatesPerRegion * 0.8) +
    Math.min(6, advancedSteps * 0.8) +
    Math.min(5, maxChainDepth * 0.8) -
    Math.min(4, immediatelyForcedMoves * 0.7 + puzzle.initialCats.length * 1.2);
  const complexityScore = solvableByHumanLogic
    ? Math.max(5, Math.min(97, Math.round(TIER_BASE_SCORE[tier] + Math.max(0, workload))))
    : 100;

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
