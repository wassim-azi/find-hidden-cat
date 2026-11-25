import { CellCoord, Difficulty, GridSize, PuzzleDefinition } from './gameTypes';
import { areRegionsContiguous, solvePuzzle } from './puzzleEngine';
import { analyzePuzzleDifficulty } from './logicalSolver';
import { getCuratedFallbackPuzzle } from './curatedPuzzles';
import { areCellsTouching } from './validation';

/**
 * Deterministic fast PRNG (Mulberry32) so puzzles are reproducible and testable.
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

const ORTHO_DIRS: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * Generates a valid placement of `size` non-touching cats (1 per row & col).
 */
function generateValidCatPlacement(
  size: GridSize,
  rng: () => number
): CellCoord[] | null {
  const placed: CellCoord[] = [];
  const usedCols = new Array<boolean>(size).fill(false);

  function backtrack(row: number): boolean {
    if (row === size) return true;

    const cols = Array.from({ length: size }, (_, i) => i);
    shuffleInPlace(cols, rng);

    for (const col of cols) {
      if (usedCols[col]) continue;
      const candidate: CellCoord = { row, col };
      if (placed.some((p) => areCellsTouching(p, candidate))) continue;

      usedCols[col] = true;
      placed.push(candidate);
      if (backtrack(row + 1)) return true;
      placed.pop();
      usedCols[col] = false;
    }
    return false;
  }

  return backtrack(0) ? placed : null;
}

/**
 * Grows organic 4-connected regions from the cat seed cells until the whole board is filled.
 */
function growRegionsFromSeeds(
  size: GridSize,
  seeds: CellCoord[],
  rng: () => number,
  difficulty: Difficulty
): number[][] {
  const regions: number[][] = Array.from({ length: size }, () =>
    Array.from<number>({ length: size }).fill(-1)
  );
  const regionSizes = new Array<number>(size).fill(0);
  const frontiers: CellCoord[][] = Array.from({ length: size }, () => []);

  seeds.forEach((seed, regId) => {
    regions[seed.row]![seed.col] = regId;
    regionSizes[regId] = 1;
    frontiers[regId]!.push(seed);
  });

  const growthBias = Array.from({ length: size }, (_, idx) => {
    if (difficulty === 'easy') {
      return idx < 2 ? 0.35 + rng() * 0.25 : 0.9 + rng() * 0.8;
    }
    if (difficulty === 'medium') {
      return idx < 2 ? 0.55 + rng() * 0.3 : 0.85 + rng() * 1.1;
    }
    return 0.75 + rng() * 1.4;
  });

  let unfilled = size * size - size;

  while (unfilled > 0) {
    const expandable: { regId: number; neighbors: CellCoord[] }[] = [];

    for (let regId = 0; regId < size; regId++) {
      const candidateMap = new Map<string, CellCoord>();
      for (const cell of frontiers[regId]!) {
        for (const [dr, dc] of ORTHO_DIRS) {
          const nr = cell.row + dr;
          const nc = cell.col + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr]![nc] === -1) {
            candidateMap.set(`${nr},${nc}`, { row: nr, col: nc });
          }
        }
      }
      if (candidateMap.size > 0) {
        expandable.push({ regId, neighbors: Array.from(candidateMap.values()) });
      }
    }

    if (expandable.length === 0) break;

    let totalWeight = 0;
    const weights = expandable.map(({ regId }) => {
      const w = growthBias[regId]! / Math.sqrt(regionSizes[regId]!);
      totalWeight += w;
      return w;
    });

    let pick = rng() * totalWeight;
    let chosen = expandable[0]!;
    for (let i = 0; i < expandable.length; i++) {
      pick -= weights[i]!;
      if (pick <= 0) {
        chosen = expandable[i]!;
        break;
      }
    }

    const nextCell = chosen.neighbors[Math.floor(rng() * chosen.neighbors.length)]!;
    regions[nextCell.row]![nextCell.col] = chosen.regId;
    regionSizes[chosen.regId]! += 1;
    frontiers[chosen.regId]!.push(nextCell);
    unfilled -= 1;
  }

  return regions;
}

/**
 * Checks whether removing (row, col) from `regionId` leaves `regionId` 4-connected.
 */
function staysContiguousWithout(
  size: GridSize,
  regions: number[][],
  regionId: number,
  excludeRow: number,
  excludeCol: number
): boolean {
  const cells: CellCoord[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r]![c] === regionId && !(r === excludeRow && c === excludeCol)) {
        cells.push({ row: r, col: c });
      }
    }
  }
  if (cells.length === 0) return false;

  const visited = new Set<string>();
  const queue: CellCoord[] = [cells[0]!];
  visited.add(`${cells[0]!.row},${cells[0]!.col}`);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const [dr, dc] of ORTHO_DIRS) {
      const nr = curr.row + dr;
      const nc = curr.col + dc;
      if (
        nr >= 0 &&
        nr < size &&
        nc >= 0 &&
        nc < size &&
        !(nr === excludeRow && nc === excludeCol) &&
        regions[nr]![nc] === regionId
      ) {
        const key = `${nr},${nc}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ row: nr, col: nc });
        }
      }
    }
  }

  return visited.size === cells.length;
}

/**
 * Refines region boundaries to eliminate alternate solutions while preserving
 * `targetSolution` and 4-connectivity of every region.
 */
function refineToUniqueSolution(
  size: GridSize,
  regions: number[][],
  targetSolution: CellCoord[],
  rng: () => number,
  minRegionSize: number,
  maxSteps = 45
): boolean {
  const targetKeys = new Set(targetSolution.map((c) => `${c.row},${c.col}`));

  for (let step = 0; step < maxSteps; step++) {
    const solutions = solvePuzzle(size, regions, 2);
    if (solutions.length === 1) return true;
    if (solutions.length === 0) return false;

    // Identify the alternate solution distinct from targetSolution
    const alt = solutions.find((sol) =>
      sol.some((cell) => !targetKeys.has(`${cell.row},${cell.col}`))
    );
    if (!alt) return true;

    // Collect cells in alt that are NOT in targetSolution — reassigning any of these
    // to a neighboring region immediately invalidates `alt` while preserving `targetSolution`!
    const diffCells = alt.filter((c) => !targetKeys.has(`${c.row},${c.col}`));
    shuffleInPlace(diffCells, rng);

    // Count region sizes
    const counts = new Array<number>(size).fill(0);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        counts[regions[r]![c]!]! += 1;
      }
    }

    let flipped = false;

    for (const cell of diffCells) {
      const oldReg = regions[cell.row]![cell.col]!;
      if (counts[oldReg]! - 1 < minRegionSize) continue;

      const neighborRegs = new Set<number>();
      for (const [dr, dc] of ORTHO_DIRS) {
        const nr = cell.row + dr;
        const nc = cell.col + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const nReg = regions[nr]![nc]!;
          if (nReg !== oldReg) neighborRegs.add(nReg);
        }
      }

      if (neighborRegs.size === 0) continue;
      if (!staysContiguousWithout(size, regions, oldReg, cell.row, cell.col)) continue;

      const candidates = Array.from(neighborRegs);
      shuffleInPlace(candidates, rng);
      const newReg = candidates[0]!;
      regions[cell.row]![cell.col] = newReg;
      flipped = true;
      break;
    }

    // If none of diffCells were directly on a safe border, nudge a random boundary cell
    // of a region containing a diffCell to create new boundary geometry.
    if (!flipped) {
      const borderMoves: { row: number; col: number; newReg: number }[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (targetKeys.has(`${r},${c}`)) continue;
          const oldReg = regions[r]![c]!;
          if (counts[oldReg]! - 1 < minRegionSize) continue;
          for (const [dr, dc] of ORTHO_DIRS) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              const nReg = regions[nr]![nc]!;
              if (nReg !== oldReg) {
                borderMoves.push({ row: r, col: c, newReg: nReg });
              }
            }
          }
        }
      }
      shuffleInPlace(borderMoves, rng);
      for (const move of borderMoves) {
        const oldReg = regions[move.row]![move.col]!;
        if (staysContiguousWithout(size, regions, oldReg, move.row, move.col)) {
          regions[move.row]![move.col] = move.newReg;
          flipped = true;
          break;
        }
      }
    }

    if (!flipped) return false;
  }

  return solvePuzzle(size, regions, 2).length === 1;
}

export interface GeneratorOptions {
  id: number;
  title: string;
  size: GridSize;
  difficulty: Difficulty;
  seed: number;
  starterCatsCount?: number;
  maxAttempts?: number;
}

/**
 * Generates a programmatically verified puzzle with a guaranteed UNIQUE solution
 * and contiguous regions.
 */
export function generateValidatedPuzzle(
  options: GeneratorOptions
): PuzzleDefinition {
  const {
    id,
    title,
    size,
    difficulty,
    seed,
    starterCatsCount = 0,
    maxAttempts = 120,
  } = options;

  const rng = createSeededRng(seed);
  const minRegionSize = difficulty === 'hard' ? 2 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const placement = generateValidCatPlacement(size, rng);
    if (!placement) continue;

    const regions = growRegionsFromSeeds(size, placement, rng, difficulty);
    if (!areRegionsContiguous(size, regions)) continue;

    const isUnique = refineToUniqueSolution(
      size,
      regions,
      placement,
      rng,
      minRegionSize
    );
    if (!isUnique) continue;

    if (!areRegionsContiguous(size, regions)) continue;

    const counts = new Array<number>(size).fill(0);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        counts[regions[r]![c]!]! += 1;
      }
    }
    const maxRegionSize = Math.max(...counts);
    if (maxRegionSize > (size === 6 ? 13 : 22)) continue;

    const solutions = solvePuzzle(size, regions, 2);
    if (solutions.length === 1) {
      const uniqueSolution = solutions[0]!;
      const initialCats: CellCoord[] = [];
      if (starterCatsCount > 0) {
        const shuffled = shuffleInPlace([...uniqueSolution], rng);
        initialCats.push(...shuffled.slice(0, starterCatsCount));
      }

      const parTimeSec =
        size === 6
          ? difficulty === 'easy'
            ? 55
            : 80
          : difficulty === 'medium'
            ? 125
            : 165;

      const candidatePuzzle: PuzzleDefinition = {
        id,
        title,
        difficulty,
        size,
        regions,
        solution: uniqueSolution,
        initialCats,
        parTimeSec,
      };
      candidatePuzzle.analysis = analyzePuzzleDifficulty(candidatePuzzle);
      // Never publish a puzzle that needs guessing: it must be solvable by pure logic
      if (!candidatePuzzle.analysis.solvableByHumanLogic) continue;
      return candidatePuzzle;
    }
  }

  // Safe validated curated fallback — never publish an invalid puzzle!
  const fallback = getCuratedFallbackPuzzle(size, { id, title, difficulty });
  fallback.analysis = analyzePuzzleDifficulty(fallback);
  return fallback;
}
