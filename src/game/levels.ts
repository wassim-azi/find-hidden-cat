import {
  Difficulty,
  DifficultyAnalysis,
  DifficultyTier,
  GridSize,
  PuzzleDefinition,
} from './gameTypes';
import { BAKED_LEVELS } from './levelsData';
import { analyzePuzzleDifficulty } from './logicalSolver';
import { generateValidatedPuzzle } from './puzzleGenerator';

export const TOTAL_LEVELS = BAKED_LEVELS.length;

const dailyCache = new Map<string, PuzzleDefinition>();
const analysisCache = new Map<string, DifficultyAnalysis>();

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the memoized real logical DifficultyAnalysis for any puzzle
 * (computed from actual candidate counts, forced moves, deduction chains, and techniques).
 */
export function getPuzzleAnalysis(puzzle: PuzzleDefinition): DifficultyAnalysis {
  if (puzzle.analysis) return puzzle.analysis;
  const cacheKey = puzzle.dailyDateKey
    ? `daily:${puzzle.dailyDateKey}`
    : `lvl:${puzzle.id}`;
  const cached = analysisCache.get(cacheKey);
  if (cached) return cached;

  const computed = analyzePuzzleDifficulty(puzzle);
  analysisCache.set(cacheKey, computed);
  return computed;
}

export function getLevelMetaList(): ReadonlyArray<{
  id: number;
  title: string;
  difficulty: Difficulty;
  difficultyTier: DifficultyTier;
  size: GridSize;
}> {
  return BAKED_LEVELS.map((lvl) => ({
    id: lvl.id,
    title: lvl.title,
    difficulty: lvl.difficulty,
    difficultyTier: getPuzzleAnalysis(lvl).tier,
    size: lvl.size,
  }));
}

/**
 * Instant 0ms retrieval of any pre-baked validated campaign level (1..24),
 * enriched with its memoized real DifficultyAnalysis.
 */
export function getLevelPuzzle(levelId: number): PuzzleDefinition {
  const base = BAKED_LEVELS.find((l) => l.id === levelId) ?? BAKED_LEVELS[0]!;
  return {
    ...base,
    analysis: getPuzzleAnalysis(base),
  };
}

/**
 * Retrieves all 24 pre-baked campaign puzzles with their real DifficultyAnalysis.
 */
export function getAllLevelPuzzles(): readonly PuzzleDefinition[] {
  return BAKED_LEVELS.map((lvl) => ({
    ...lvl,
    analysis: getPuzzleAnalysis(lvl),
  }));
}

/**
 * Generates and memoizes a deterministic unique-solution Daily Challenge puzzle
 * for a given YYYY-MM-DD calendar date.
 */
export function getDailyPuzzle(dateKey = getTodayDateKey()): PuzzleDefinition {
  const cached = dailyCache.get(dateKey);
  if (cached) return cached;

  // Deterministic hash of dateKey
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const seed = (hash >>> 0) || 90210;

  const puzzle = generateValidatedPuzzle({
    id: 0,
    title: `Daily Kitty • ${dateKey.slice(5)}`,
    difficulty: 'medium',
    size: 8,
    seed,
    starterCatsCount: 0,
  });

  const dailyPuzzle: PuzzleDefinition = {
    ...puzzle,
    dailyDateKey: dateKey,
    analysis: puzzle.analysis ?? analyzePuzzleDifficulty(puzzle),
  };

  dailyCache.set(dateKey, dailyPuzzle);
  return dailyPuzzle;
}
