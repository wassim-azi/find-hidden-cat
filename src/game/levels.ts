import { Difficulty, GridSize, PuzzleDefinition } from './gameTypes';
import { BAKED_LEVELS } from './levelsData';
import { generateValidatedPuzzle } from './puzzleGenerator';

export const TOTAL_LEVELS = BAKED_LEVELS.length;

const dailyCache = new Map<string, PuzzleDefinition>();

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLevelMetaList(): ReadonlyArray<{
  id: number;
  title: string;
  difficulty: Difficulty;
  size: GridSize;
}> {
  return BAKED_LEVELS.map(({ id, title, difficulty, size }) => ({
    id,
    title,
    difficulty,
    size,
  }));
}

/**
 * Instant 0ms retrieval of any pre-baked validated campaign level (1..24).
 */
export function getLevelPuzzle(levelId: number): PuzzleDefinition {
  return BAKED_LEVELS.find((l) => l.id === levelId) ?? BAKED_LEVELS[0]!;
}

/**
 * Retrieves all 24 pre-baked campaign puzzles.
 */
export function getAllLevelPuzzles(): readonly PuzzleDefinition[] {
  return BAKED_LEVELS;
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
  };

  dailyCache.set(dateKey, dailyPuzzle);
  return dailyPuzzle;
}
