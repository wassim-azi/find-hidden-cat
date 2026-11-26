import {
  DailyVariant,
  Difficulty,
  DifficultyAnalysis,
  DifficultyTier,
  GridSize,
  PuzzleDefinition,
} from './gameTypes';
import { BAKED_LEVELS } from './levelsData';
import { analyzePuzzleDifficulty } from './logicalSolver';
import { generateValidatedPuzzle } from './puzzleGenerator';
import { fnv1a } from './hash';

export type { DailyVariant } from './gameTypes';
export const DAILY_VARIANTS: readonly DailyVariant[] = ['relaxed', 'standard', 'tricky'];

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
    ? `daily:${puzzle.dailyDateKey}:${puzzle.dailyVariant ?? 'standard'}`
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
 * The original Daily Kitty generator call. MUST stay byte-identical so existing saves,
 * completions and reminders remain valid (guarded by a committed snapshot test).
 */
function generateStandardDaily(dateKey: string): PuzzleDefinition {
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

  return {
    ...puzzle,
    dailyDateKey: dateKey,
    analysis: puzzle.analysis ?? analyzePuzzleDifficulty(puzzle),
  };
}

const VARIANT_OPTIONS: Record<
  Exclude<DailyVariant, 'standard'>,
  { difficulty: Difficulty; starterCatsCount: number }
> = {
  relaxed: { difficulty: 'easy', starterCatsCount: 1 },
  tricky: { difficulty: 'hard', starterCatsCount: 0 },
};

function generateVariantDaily(
  dateKey: string,
  variant: Exclude<DailyVariant, 'standard'>
): PuzzleDefinition | null {
  try {
    const opts = VARIANT_OPTIONS[variant];
    const puzzle = generateValidatedPuzzle({
      id: 0,
      title: `Daily Kitty • ${dateKey.slice(5)}`,
      difficulty: opts.difficulty,
      size: 8,
      seed: fnv1a(`${dateKey}:${variant}`) || 90210,
      starterCatsCount: opts.starterCatsCount,
    });
    const analysis = puzzle.analysis ?? analyzePuzzleDifficulty(puzzle);
    if (!analysis.solvableByHumanLogic) return null;
    return { ...puzzle, dailyDateKey: dateKey, dailyVariant: variant, analysis };
  } catch {
    return null;
  }
}

/**
 * Generates and memoizes a deterministic unique-solution Daily Challenge puzzle
 * for a given YYYY-MM-DD calendar date and difficulty variant (#24).
 *
 * Every variant uses id 0 and the same dailyDateKey, so completion, rewards, saves and the
 * reminder planner treat them as the one Daily of that day. A variant that fails to generate
 * (or is not solvable by human logic) falls back to the standard puzzle.
 */
export function getDailyPuzzle(
  dateKey = getTodayDateKey(),
  variant: DailyVariant = 'standard'
): PuzzleDefinition {
  const cacheKey = `${dateKey}:${variant}`;
  const cached = dailyCache.get(cacheKey);
  if (cached) return cached;

  const dailyPuzzle =
    (variant !== 'standard' ? generateVariantDaily(dateKey, variant) : null) ??
    (variant !== 'standard' ? getDailyPuzzle(dateKey, 'standard') : generateStandardDaily(dateKey));

  dailyCache.set(cacheKey, dailyPuzzle);
  return dailyPuzzle;
}
