import { Difficulty, GridSize, PuzzleDefinition } from './gameTypes';
import { BAKED_LEVELS } from './levelsData';

/**
 * Curated, mathematically verified puzzles for tutorials, early progression,
 * special events, and guaranteed fallback if procedural generation ever exhausts attempts.
 */
export const CURATED_FALLBACK_PUZZLES: Record<GridSize, PuzzleDefinition> = {
  6: {
    ...BAKED_LEVELS[0]!,
    isCurated: true,
  },
  8: {
    ...BAKED_LEVELS[12]!,
    isCurated: true,
  },
};

export function getCuratedFallbackPuzzle(
  size: GridSize,
  overrides: { id: number; title: string; difficulty: Difficulty }
): PuzzleDefinition {
  const base = CURATED_FALLBACK_PUZZLES[size];
  return {
    ...base,
    id: overrides.id,
    title: overrides.title,
    difficulty: overrides.difficulty,
    isCurated: true,
  };
}
