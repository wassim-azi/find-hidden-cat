import { describe, expect, it } from 'vitest';
import { BoardGrid, CellCoord, CellValue, GridSize, PuzzleDefinition, coordsEqual } from './gameTypes';
import { areCellsTouching, evaluateCatPlacement, validateBoard } from './validation';
import { countSolutions, createInitialBoard, solvePuzzle, verifyPuzzleDefinition } from './puzzleEngine';
import { analyzePuzzleDifficulty, findNextLogicalDeduction } from './logicalSolver';
import { getProgressiveHint } from './hintEngine';
import { getAllLevelPuzzles, getDailyPuzzle, getLevelPuzzle } from './levels';
import { getGoldenCatPuzzle } from './events';
import { createSeededRng, generateValidatedPuzzle } from './puzzleGenerator';
import i18n from '../i18n';

function emptyBoard(size: number): BoardGrid {
  return Array.from({ length: size }, () => Array.from<CellValue>({ length: size }).fill('empty'));
}

function boardWith(size: number, cats: CellCoord[], xs: CellCoord[] = []): BoardGrid {
  const b = emptyBoard(size);
  for (const x of xs) b[x.row]![x.col] = 'x';
  for (const c of cats) b[c.row]![c.col] = 'cat';
  return b;
}

/** 6×6 layout where region i == row i (many solutions). */
const ROW_REGIONS_6: number[][] = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, () => r));

describe('Rule primitives', () => {
  it('treats all eight neighbours as touching, and nothing further away', () => {
    const center = { row: 3, col: 3 };
    const dirs = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1],
    ];
    for (const [dr, dc] of dirs) {
      expect(areCellsTouching(center, { row: 3 + dr!, col: 3 + dc! })).toBe(true);
    }
    expect(areCellsTouching(center, center)).toBe(false);
    for (const [dr, dc] of [[-2, 0], [2, 2], [0, 2], [-2, -1], [1, 2]]) {
      expect(areCellsTouching(center, { row: 3 + dr!, col: 3 + dc! })).toBe(false);
    }
  });

  it('flags each adjacency direction as a conflict in validateBoard', () => {
    const puzzle = getLevelPuzzle(1);
    for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
      const a = { row: 2, col: 2 };
      const b = { row: 2 + dr!, col: 2 + dc! };
      const v = validateBoard(puzzle, boardWith(6, [a, b]));
      expect(v.violatedRules.has('adjacent')).toBe(true);
      expect(v.isValid).toBe(false);
    }
  });

  it('detects duplicate cats in a row, column and region', () => {
    const regions = ROW_REGIONS_6;
    const p = { size: 6 as GridSize, regions };
    expect(validateBoard(p, boardWith(6, [{ row: 0, col: 0 }, { row: 0, col: 4 }])).violatedRules.has('rowCol')).toBe(true);
    expect(validateBoard(p, boardWith(6, [{ row: 0, col: 1 }, { row: 4, col: 1 }])).violatedRules.has('rowCol')).toBe(true);
    const lvl = getLevelPuzzle(1);
    // two non-touching cells of the same region in different rows/cols
    let pair: [CellCoord, CellCoord] | null = null;
    for (let r1 = 0; r1 < 6 && !pair; r1++)
      for (let c1 = 0; c1 < 6 && !pair; c1++)
        for (let r2 = 0; r2 < 6 && !pair; r2++)
          for (let c2 = 0; c2 < 6 && !pair; c2++) {
            const a = { row: r1, col: c1 };
            const b = { row: r2, col: c2 };
            if (r1 !== r2 && c1 !== c2 && !areCellsTouching(a, b) && lvl.regions[r1]![c1] === lvl.regions[r2]![c2]) pair = [a, b];
          }
    expect(pair).not.toBeNull();
    expect(validateBoard(lvl, boardWith(6, pair!)).violatedRules.has('region')).toBe(true);
  });

  it('only declares completion with exactly N valid cats; X marks never count as cats', () => {
    for (const puzzle of [getLevelPuzzle(1), getLevelPuzzle(24)]) {
      const solved = validateBoard(puzzle, boardWith(puzzle.size, puzzle.solution));
      expect(solved.isSolved).toBe(true);
      expect(solved.placedCatsCount).toBe(puzzle.size);

      const missingOne = puzzle.solution.slice(0, -1);
      const lastCat = puzzle.solution[puzzle.solution.length - 1]!;
      const withX = validateBoard(puzzle, boardWith(puzzle.size, missingOne, [lastCat]));
      expect(withX.isSolved).toBe(false);
      expect(withX.placedCatsCount).toBe(puzzle.size - 1);

      // Filling every other tile with X must not count either
      const allX: CellCoord[] = [];
      for (let r = 0; r < puzzle.size; r++)
        for (let c = 0; c < puzzle.size; c++)
          if (!missingOne.some((m) => m.row === r && m.col === c)) allX.push({ row: r, col: c });
      expect(validateBoard(puzzle, boardWith(puzzle.size, missingOne, allX)).isSolved).toBe(false);
    }
  });

  it('rejects impossible placements before they are committed', () => {
    const puzzle = getLevelPuzzle(1);
    const board = createInitialBoard(puzzle);
    const starter = puzzle.initialCats[0]!;
    const sameRow = { row: starter.row, col: (starter.col + 3) % 6 };
    expect(evaluateCatPlacement(puzzle, board, sameRow).valid).toBe(false);
    for (const sol of puzzle.solution) {
      if (puzzle.initialCats.some((ic) => coordsEqual(ic, sol))) continue;
      expect(evaluateCatPlacement(puzzle, board, sol).valid).toBe(true);
    }
  });
});

describe('Solver: zero, one and multiple solutions', () => {
  it('finds zero solutions when two single-cell regions touch', () => {
    const regions = [
      [0, 1, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2],
      [3, 3, 3, 3, 3, 3],
      [3, 3, 3, 3, 3, 3],
      [4, 4, 4, 4, 4, 4],
      [5, 5, 5, 5, 5, 5],
    ];
    expect(countSolutions(6, regions, 2)).toBe(0);
  });

  it('detects multiple solutions', () => {
    expect(countSolutions(6, ROW_REGIONS_6, 2)).toBe(2);
    const analysis = analyzePuzzleDifficulty({
      id: 999, title: 't', difficulty: 'easy', size: 6, regions: ROW_REGIONS_6,
      solution: solvePuzzle(6, ROW_REGIONS_6, 1)[0]!, initialCats: [], parTimeSec: 60,
    });
    // An ambiguous layout can never be "solved by logic"
    expect(analysis.solvableByHumanLogic).toBe(false);
  });

  it('every campaign level has exactly one solution that matches its stored answer', () => {
    for (const p of getAllLevelPuzzles()) {
      const check = verifyPuzzleDefinition(p);
      expect(check.valid, `level ${p.id}: ${check.reason}`).toBe(true);
      const sols = solvePuzzle(p.size, p.regions, 2);
      expect(sols).toHaveLength(1);
      expect(sols[0]!.every((s) => p.solution.some((x) => coordsEqual(x, s)))).toBe(true);
    }
  });
});

/** Plays a puzzle from its start purely by following logical deductions (no oracle). */
function solveByHints(puzzle: PuzzleDefinition, startCats: CellCoord[] = puzzle.initialCats) {
  let board = boardWith(puzzle.size, startCats);
  const techniques: string[] = [];
  for (let i = 0; i < puzzle.size + 1; i++) {
    if (validateBoard(puzzle, board).isSolved) break;
    const d = findNextLogicalDeduction(puzzle, board);
    expect(d).not.toBeNull();
    techniques.push(d!.technique);
    expect(puzzle.solution.some((s) => coordsEqual(s, d!.targetCell))).toBe(true);
    expect(evaluateCatPlacement(puzzle, board, d!.targetCell).valid).toBe(true);
    board = boardWith(puzzle.size, [...startCats, ...getCats(board), d!.targetCell]);
  }
  return { solved: validateBoard(puzzle, board).isSolved, techniques };
}

function getCats(board: BoardGrid): CellCoord[] {
  const out: CellCoord[] = [];
  board.forEach((row, r) => row.forEach((v, c) => v === 'cat' && out.push({ row: r, col: c })));
  return out;
}

describe('Logical solvability (no forced guessing)', () => {
  it('every campaign level is fully solvable by the logic engine without oracle reveals', () => {
    for (const p of getAllLevelPuzzles()) {
      expect(analyzePuzzleDifficulty(p).solvableByHumanLogic, `level ${p.id}`).toBe(true);
      const run = solveByHints(p);
      expect(run.solved, `level ${p.id}`).toBe(true);
      expect(run.techniques, `level ${p.id}`).not.toContain('oracle_fallback');
    }
  });

  it('hints stay logical from random partial (correct) boards', () => {
    const rng = createSeededRng(4242);
    for (const p of getAllLevelPuzzles()) {
      for (let t = 0; t < 4; t++) {
        const subset = p.solution.filter(() => rng() < 0.4);
        const start = [...new Map([...p.initialCats, ...subset].map((c) => [`${c.row},${c.col}`, c])).values()];
        const run = solveByHints(p, start);
        expect(run.solved).toBe(true);
        expect(run.techniques).not.toContain('oracle_fallback');
      }
    }
  });

  it('daily and golden puzzles are deterministic, unique and logic-solvable', () => {
    const start = Date.UTC(2026, 0, 1);
    for (let i = 0; i < 40; i++) {
      const key = new Date(start + i * 86400000).toISOString().slice(0, 10);
      const p = getDailyPuzzle(key);
      expect(verifyPuzzleDefinition(p).valid).toBe(true);
      expect(p.analysis!.solvableByHumanLogic).toBe(true);
      expect(getDailyPuzzle(key).regions).toEqual(p.regions);
    }
    for (const week of ['2026-W01', '2026-W20', '2026-W48']) {
      const g = getGoldenCatPuzzle(week);
      expect(verifyPuzzleDefinition(g).valid).toBe(true);
      expect(analyzePuzzleDifficulty(g).solvableByHumanLogic).toBe(true);
    }
  });

  it('generator only ever emits unique, logic-solvable puzzles', () => {
    for (let seed = 1; seed <= 12; seed++) {
      for (const size of [6, 8] as const) {
        const p = generateValidatedPuzzle({ id: seed, title: 's', size, difficulty: 'hard', seed });
        expect(verifyPuzzleDefinition(p).valid).toBe(true);
        expect(p.analysis!.solvableByHumanLogic).toBe(true);
      }
    }
  });
});

describe('Difficulty labels follow the real solving path', () => {
  const rank = { beginner: 0, easy: 1, normal: 2, hard: 3, expert: 4 } as const;

  it('first world stays gentle and the campaign ends hardest', () => {
    const levels = getAllLevelPuzzles();
    const tier = (id: number) => levels.find((l) => l.id === id)!.analysis!.tier;
    expect(tier(1)).toBe('beginner');
    for (let id = 1; id <= 8; id++) expect(rank[tier(id)]).toBeLessThanOrEqual(rank.normal);
    expect(tier(13)).toBe('easy'); // first 8×8 board eases the size jump
    expect(tier(24)).toBe('expert');
    const avg = (from: number, to: number) => {
      let s = 0;
      for (let id = from; id <= to; id++) s += rank[tier(id)];
      return s / (to - from + 1);
    };
    expect(avg(1, 8)).toBeLessThan(avg(9, 16));
    expect(avg(9, 16)).toBeLessThan(avg(17, 24));
  });

  it('tier rank never understates the hardest technique used', () => {
    const techniqueRank: Record<string, number> = {
      naked_region_single: 0, naked_row_single: 0, naked_col_single: 0,
      region_line_intersection: 1, line_region_intersection: 1,
      region_adjacency_exclusion: 2, line_adjacency_exclusion: 2,
      naked_pair_regions: 3, line_group_confinement: 3, contradiction_chain: 4,
    };
    for (const p of getAllLevelPuzzles()) {
      const a = p.analysis!;
      const hardest = Math.max(...a.techniquesUsed.map((t) => techniqueRank[t] ?? 0));
      expect(rank[a.tier]).toBe(hardest);
    }
  });
});

describe('Hint explanations', () => {
  it('produce fully interpolated text in English and French for every level', async () => {
    for (const lang of ['en', 'fr']) {
      await i18n.changeLanguage(lang);
      for (const p of getAllLevelPuzzles()) {
        const board = createInitialBoard(p);
        for (const stage of [1, 2, 3, 4] as const) {
          const h = getProgressiveHint(p, board, stage)!;
          expect(h.message).not.toMatch(/\{\{|hints\./);
          if (stage < 3) expect(h.revealTargetCell).toBe(false);
        }
      }
    }
    await i18n.changeLanguage('en');
  });
});
