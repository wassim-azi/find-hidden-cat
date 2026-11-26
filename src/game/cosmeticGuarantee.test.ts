import { describe, expect, it } from 'vitest';
import validationSrc from './validation.ts?raw';
import hintEngineSrc from './hintEngine.ts?raw';
import logicalSolverSrc from './logicalSolver.ts?raw';
import puzzleGeneratorSrc from './puzzleGenerator.ts?raw';
import puzzleEngineSrc from './puzzleEngine.ts?raw';
import economySrc from './economy.ts?raw';
import levelsSrc from './levels.ts?raw';

const GAMEPLAY_SOURCES: readonly [string, string][] = [
  ['validation.ts', validationSrc],
  ['hintEngine.ts', hintEngineSrc],
  ['logicalSolver.ts', logicalSolverSrc],
  ['puzzleGenerator.ts', puzzleGeneratorSrc],
  ['puzzleEngine.ts', puzzleEngineSrc],
  ['economy.ts', economySrc],
  ['levels.ts', levelsSrc],
];

const FORBIDDEN_PATTERNS = [
  /collectibleCats/,
  /\bactiveMascotCatId\b/,
  /\bunlockedCatIds\b/,
  /\bfavouriteCatIds\b/,
] as const;

describe('Cosmetic-only guarantee for collectible cats (#18)', () => {
  for (const [filename, src] of GAMEPLAY_SOURCES) {
    it(`src/game/${filename} never imports collectibleCats or references cat ownership/selection`, () => {
      expect(src.length).toBeGreaterThan(0);
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(src).not.toMatch(pattern);
      }
    });
  }
});
