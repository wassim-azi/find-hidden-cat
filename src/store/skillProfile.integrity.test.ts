import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import { CellCoord, coordsEqual, MAX_CLASSIC_HEARTS, PuzzleDefinition } from '../game/gameTypes';
import { onGameEvent } from '../game/gameEvents';
import { getPuzzleAnalysis } from '../game/levels';
import { EMPTY_SKILL_PROFILE } from '../game/skillProfile';
import type { GameEvent } from '../game/progressStats';

const S = () => useGameStore.getState();

function wrongCellFor(puzzle: PuzzleDefinition): CellCoord {
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      const cell = { row: r, col: c };
      if (S().board[r]![c] !== 'empty') continue;
      if (!puzzle.solution.some((s) => coordsEqual(s, cell))) return cell;
    }
  }
  throw new Error('no wrong cell');
}

function solveCurrentPuzzle(): void {
  for (const cat of S().puzzle.solution) {
    if (S().board[cat.row]![cat.col] !== 'cat') S().attemptPlaceCat(cat);
  }
}

describe('Skill profile events in the store (#23)', () => {
  let events: GameEvent[] = [];
  let unsubscribe: () => void = () => {};

  beforeEach(() => {
    S().resetAllProgress();
    useGameStore.setState({ unlockedLevelId: 24 });
    events = [];
    unsubscribe = onGameEvent((e) => events.push(e));
  });
  afterEach(() => unsubscribe());

  const ofType = (type: GameEvent['type']) => events.filter((e) => e.type === type);

  it('emits puzzle_restarted only after at least 30 s on an unsolved board', () => {
    S().startLevel(2, false);
    useGameStore.setState({ elapsedSec: 10 });
    S().restartLevel();
    expect(ofType('puzzle_restarted')).toHaveLength(0);

    useGameStore.setState({ elapsedSec: 40 });
    S().restartLevel();
    const restarted = ofType('puzzle_restarted');
    expect(restarted).toHaveLength(1);
    expect(restarted[0]).toMatchObject({
      puzzleKey: 'L2',
      elapsedSec: 40,
      tier: getPuzzleAnalysis(S().puzzle).tier,
    });
    expect(S().skillProfile.recent.map((r) => r.success)).toEqual([0]);
  });

  it('emits exactly one puzzle_failed when Classic runs out of hearts', () => {
    S().startLevel(3, false);
    useGameStore.setState({ elapsedSec: 55 });
    const wrong = wrongCellFor(S().puzzle);
    for (let i = 0; i < MAX_CLASSIC_HEARTS; i++) S().attemptPlaceCat(wrong);
    expect(S().outOfHearts).toBe(true);
    S().attemptPlaceCat(wrong); // ignored while out of hearts
    const failedEvents = ofType('puzzle_failed');
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0]).toMatchObject({ puzzleKey: 'L3', elapsedSec: 55 });

    // Retrying from the Out-of-Hearts screen is not counted a second time
    S().restartLevel();
    expect(ofType('puzzle_restarted')).toHaveLength(0);
    // Failures never touch PeriodStats
    expect(S().progressStats.lifetime.puzzlesCompleted).toBe(0);
  });

  it('does not emit puzzle_failed in Practice', () => {
    S().updateSetting('gameMode', 'practice');
    S().startLevel(3, false);
    const wrong = wrongCellFor(S().puzzle);
    for (let i = 0; i < 4; i++) S().attemptPlaceCat(wrong);
    expect(ofType('puzzle_failed')).toHaveLength(0);
  });

  it('emits hint_used from requestHint and escalateHint with technique and stage', () => {
    S().startLevel(4, false);
    S().requestHint();
    const first = ofType('hint_used');
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ puzzleKey: 'L4', stage: S().hintStage });
    expect(first[0]!.type === 'hint_used' && first[0]!.technique).toBe(
      S().activeHint?.technique ?? null
    );

    if (S().activeHint?.canEscalate) {
      S().escalateHint();
      expect(ofType('hint_used')).toHaveLength(2);
    }
  });

  it('updates the Classic bucket on victory and clears with resetSkillProfile / resetAllProgress', () => {
    S().startLevel(1, false);
    solveCurrentPuzzle();
    const tier = getPuzzleAnalysis(S().puzzle).tier;
    expect(S().skillProfile.classic[tier]?.samples).toBe(1);
    const completed = ofType('puzzle_completed')[0];
    expect(completed).toMatchObject({ tier, parTimeSec: S().puzzle.parTimeSec });

    S().resetSkillProfile();
    expect(S().skillProfile).toEqual(EMPTY_SKILL_PROFILE);
    expect(S().levelProgress[1]?.completed).toBe(true); // progress stays

    S().startLevel(2, false);
    solveCurrentPuzzle();
    expect(S().skillProfile.recent).toHaveLength(1);
    S().resetAllProgress();
    expect(S().skillProfile).toEqual(EMPTY_SKILL_PROFILE);
  });
});
