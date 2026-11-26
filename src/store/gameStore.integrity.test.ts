import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import { isResumableSave, resolveSessionGameMode } from './sessionGuards';
import { CellCoord, MAX_CLASSIC_HEARTS, PuzzleDefinition, coordsEqual } from '../game/gameTypes';
import { createInitialBoard } from '../game/puzzleEngine';
import { getLevelPuzzle, getTodayDateKey } from '../game/levels';
import { getPlacedCats } from '../game/validation';
import { onGameEvent } from '../game/gameEvents';
import { GameEvent, getDayStats } from '../game/progressStats';

const S = () => useGameStore.getState();

function wrongCellFor(puzzle: PuzzleDefinition): CellCoord {
  // A tile that conflicts with nothing on the starting board but is not in the solution
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
  const { puzzle } = S();
  for (const cat of puzzle.solution) {
    if (S().board[cat.row]![cat.col] !== 'cat') S().attemptPlaceCat(cat);
  }
}

function unlockAll(): void {
  useGameStore.setState({ unlockedLevelId: 24 });
}

describe('Heart system integrity', () => {
  beforeEach(() => {
    S().resetAllProgress();
    unlockAll();
  });

  it('does not resume a Classic board with 0 hearts after leaving the Out-of-Hearts screen', () => {
    S().startLevel(2, false);
    const wrong = wrongCellFor(S().puzzle);
    const good = S().puzzle.solution.find(
      (s) => !S().puzzle.initialCats.some((ic) => coordsEqual(ic, s))
    )!;
    S().attemptPlaceCat(good);
    for (let i = 0; i < MAX_CLASSIC_HEARTS; i++) S().attemptPlaceCat(wrong);
    expect(S().outOfHearts).toBe(true);

    S().goToScreen('map');
    S().continueGame();

    expect(S().hearts).toBe(MAX_CLASSIC_HEARTS);
    expect(S().outOfHearts).toBe(false);
    // Classic rules: running out of hearts restarts the level
    expect(S().board[good.row]![good.col]).not.toBe('cat');
  });

  it('defers Practice → Classic until the next puzzle so practice mistakes cannot earn Classic stars', () => {
    S().startLevel(3, false);
    S().updateSetting('gameMode', 'practice');
    expect(S().gameMode).toBe('practice');

    const wrong = wrongCellFor(S().puzzle);
    S().attemptPlaceCat(wrong);
    S().attemptPlaceCat(wrong);
    expect(S().hearts).toBe(MAX_CLASSIC_HEARTS);

    S().updateSetting('gameMode', 'classic');
    expect(S().settings.gameMode).toBe('classic');
    expect(S().gameMode).toBe('practice');

    solveCurrentPuzzle();
    const summary = S().victorySummary!;
    expect(summary).not.toBeNull();
    expect(summary.isPracticeMode).toBe(true);
    expect(summary.stars).toBe(1);

    // Next puzzle honours the Classic preference
    S().startNextLevel();
    expect(S().gameMode).toBe('classic');
    expect(S().hearts).toBe(MAX_CLASSIC_HEARTS);
  });

  it('switching back to Classic after continuing in Practice does not refill hearts', () => {
    S().startLevel(2, false);
    const wrong = wrongCellFor(S().puzzle);
    for (let i = 0; i < MAX_CLASSIC_HEARTS; i++) S().attemptPlaceCat(wrong);
    S().continueInPracticeMode();
    S().setGameMode('classic');
    expect(S().gameMode).toBe('practice');
    expect(S().hearts).toBe(0);

    // A deliberate restart is a new Classic attempt with full hearts
    S().restartLevel();
    expect(S().gameMode).toBe('classic');
    expect(S().hearts).toBe(MAX_CLASSIC_HEARTS);
  });

  it('allows choosing Classic before any move has been made', () => {
    S().updateSetting('gameMode', 'practice');
    S().startLevel(2, false);
    expect(S().gameMode).toBe('practice');
    S().setGameMode('classic');
    expect(S().gameMode).toBe('classic');
    expect(S().hearts).toBe(MAX_CLASSIC_HEARTS);
  });

  it('resolveSessionGameMode only defers upgrades of a started puzzle', () => {
    const base = { gameMode: 'practice' as const, elapsedSec: 0, mistakesCount: 0, hintsUsed: 0, undoStackLength: 0, isSolved: false };
    expect(resolveSessionGameMode(base, 'classic')).toEqual({ sessionMode: 'classic', deferred: false });
    expect(resolveSessionGameMode({ ...base, elapsedSec: 4 }, 'classic')).toEqual({ sessionMode: 'practice', deferred: true });
    expect(resolveSessionGameMode({ ...base, gameMode: 'classic', elapsedSec: 9 }, 'practice')).toEqual({ sessionMode: 'practice', deferred: false });
  });
});

describe('Saved session safety', () => {
  const lvl1 = getLevelPuzzle(1);
  const baseSave = () => ({
    levelId: 1,
    board: createInitialBoard(lvl1),
    elapsedSec: 10,
    hintsUsed: 0,
    hearts: 2,
    gameMode: 'classic' as const,
  });

  it('accepts a consistent save', () => {
    expect(isResumableSave(baseSave(), lvl1)).toBe(true);
  });

  it('rejects a Classic save with 0 hearts', () => {
    expect(isResumableSave({ ...baseSave(), hearts: 0 }, lvl1)).toBe(false);
    expect(isResumableSave({ ...baseSave(), hearts: 0, gameMode: 'practice' }, lvl1)).toBe(true);
  });

  it('rejects a save whose cats are not in the solution (layout changed / tampered)', () => {
    const save = baseSave();
    const wrong = (() => {
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 6; c++)
          if (!lvl1.solution.some((s) => s.row === r && s.col === c)) return { row: r, col: c };
      throw new Error();
    })();
    save.board[wrong.row]![wrong.col] = 'cat';
    expect(isResumableSave(save, lvl1)).toBe(false);
  });

  it('rejects a save for another level, wrong size, or missing starter cats', () => {
    expect(isResumableSave({ ...baseSave(), levelId: 2 }, lvl1)).toBe(false);
    expect(isResumableSave({ ...baseSave(), board: createInitialBoard(getLevelPuzzle(24)) }, lvl1)).toBe(false);
    const noStarter = baseSave();
    const st = lvl1.initialCats[0]!;
    noStarter.board[st.row]![st.col] = 'empty';
    expect(isResumableSave(noStarter, lvl1)).toBe(false);
  });
});

describe('Campaign and Daily progress survive each other', () => {
  beforeEach(() => {
    S().resetAllProgress();
    unlockAll();
  });

  it('playing the Daily Kitty does not wipe the in-progress campaign board', () => {
    S().startLevel(5, false);
    const campaignCat = S().puzzle.solution[0]!;
    S().attemptPlaceCat(campaignCat);
    expect(S().board[campaignCat.row]![campaignCat.col]).toBe('cat');

    S().startDailyChallenge();
    const dailyCat = S().puzzle.solution[0]!;
    S().attemptPlaceCat(dailyCat);
    S().goToScreen('map');

    S().continueGame();
    expect(S().puzzle.id).toBe(5);
    expect(S().board[campaignCat.row]![campaignCat.col]).toBe('cat');

    // ...and the Daily board is resumed as well
    S().startDailyChallenge();
    expect(S().board[dailyCat.row]![dailyCat.col]).toBe('cat');
  });

  it('a solved Daily starts fresh when replayed', () => {
    S().startDailyChallenge();
    solveCurrentPuzzle();
    expect(S().victorySummary).not.toBeNull();
    S().goToScreen('map');
    S().startDailyChallenge();
    expect(getPlacedCats(S().board)).toHaveLength(S().puzzle.initialCats.length);
  });
});

describe('Cat Finder mission cannot be farmed (#5)', () => {
  beforeEach(() => {
    S().resetAllProgress();
    unlockAll();
    useGameStore.setState({
      dailyMissions: {
        dateKey: getTodayDateKey(),
        missions: [
          {
            id: 'm1',
            metric: 'place_cats',
            title: '',
            description: '',
            target: 8,
            progress: 0,
            rewardCoins: 20,
            claimed: false,
          },
          {
            id: 'm2',
            metric: 'levels_completed',
            title: '',
            description: '',
            target: 2,
            progress: 0,
            rewardCoins: 30,
            claimed: false,
          },
          {
            id: 'm3',
            metric: 'fast_solve',
            title: '',
            description: '',
            target: 1,
            progress: 0,
            rewardCoins: 25,
            claimed: false,
          },
        ],
      },
    });
  });

  it('repeating place/remove/undo/redo never advances Cat Finder, while Classic solve adds non-starter cats', () => {
    S().startLevel(2, false);
    const { puzzle } = S();
    const nonStarterCat = puzzle.solution.find(
      (s) => !puzzle.initialCats.some((ic) => coordsEqual(ic, s))
    )!;

    for (let i = 0; i < 10; i++) {
      expect(S().attemptPlaceCat(nonStarterCat)).toBe(true);
      S().removeCatAt(nonStarterCat);
    }
    // Undo/redo cycles must not advance progress either
    S().attemptPlaceCat(nonStarterCat);
    S().undo();
    S().redo();
    S().undo();

    expect(S().dailyMissions.missions[0]!.progress).toBe(0);

    // Solving in Classic advances by exactly (size - initialCats.length)
    solveCurrentPuzzle();
    expect(S().dailyMissions.missions[0]!.progress).toBe(
      puzzle.size - puzzle.initialCats.length
    );
  });

  it('solving in Practice mode does not advance Cat Finder', () => {
    S().updateSetting('gameMode', 'practice');
    S().startLevel(2, false);
    solveCurrentPuzzle();
    expect(S().dailyMissions.missions[0]!.progress).toBe(0);
  });
});

describe('Heart Refill (undoToken) booster (#8)', () => {
  beforeEach(() => {
    S().resetAllProgress();
    unlockAll();
    S().startLevel(2, false);
  });

  it('restores 1 heart in Classic mode without erasing mistakesCount', () => {
    const wrong = wrongCellFor(S().puzzle);
    const tokensBefore = S().boosters.undoToken;
    expect(tokensBefore).toBeGreaterThan(0);

    S().attemptPlaceCat(wrong);
    expect(S().hearts).toBe(2);
    expect(S().mistakesCount).toBe(1);

    expect(S().useBooster('undoToken')).toBe(true);
    expect(S().hearts).toBe(3);
    expect(S().boosters.undoToken).toBe(tokensBefore - 1);
    expect(S().mistakesCount).toBe(1);
  });

  it('returns false and consumes nothing when hearts are already full', () => {
    const tokensBefore = S().boosters.undoToken;
    expect(S().hearts).toBe(MAX_CLASSIC_HEARTS);

    S().requestUseBooster('undoToken');
    expect(S().pendingBoosterConfirm).toBeNull();
    expect(S().rewardedAdPlacement).toBeNull();

    expect(S().useBooster('undoToken')).toBe(false);
    expect(S().boosters.undoToken).toBe(tokensBefore);
    expect(S().hearts).toBe(MAX_CLASSIC_HEARTS);
  });

  it('returns false and consumes nothing in Practice mode', () => {
    S().updateSetting('gameMode', 'practice');
    S().startLevel(2, false);
    const tokensBefore = S().boosters.undoToken;

    S().requestUseBooster('undoToken');
    expect(S().pendingBoosterConfirm).toBeNull();
    expect(S().rewardedAdPlacement).toBeNull();

    expect(S().useBooster('undoToken')).toBe(false);
    expect(S().boosters.undoToken).toBe(tokensBefore);
  });

  it('recovers from Out-of-Hearts keeping placed cats, elapsedSec, and mistakesCount', () => {
    const { puzzle } = S();
    const wrong = wrongCellFor(puzzle);
    const good = puzzle.solution.find(
      (s) => !puzzle.initialCats.some((ic) => coordsEqual(ic, s))
    )!;
    const tokensBefore = S().boosters.undoToken;

    S().attemptPlaceCat(good);
    useGameStore.setState({ elapsedSec: 42 });

    for (let i = 0; i < MAX_CLASSIC_HEARTS; i++) S().attemptPlaceCat(wrong);
    expect(S().outOfHearts).toBe(true);
    expect(S().hearts).toBe(0);

    expect(S().useHeartRefillFromOutOfHearts()).toBe(true);
    expect(S().outOfHearts).toBe(false);
    expect(S().hearts).toBe(1);
    expect(S().boosters.undoToken).toBe(tokensBefore - 1);
    expect(S().board[good.row]![good.col]).toBe('cat');
    expect(S().elapsedSec).toBe(42);
    expect(S().mistakesCount).toBe(3);

    // Finishing after a refill still computes stars with the real mistakesCount (<= 2 stars)
    solveCurrentPuzzle();
    expect(S().victorySummary?.stars).toBeLessThanOrEqual(2);
    expect(S().victorySummary?.mistakesCount).toBe(3);
  });

  it('rejects useHeartRefillFromOutOfHearts when player owns 0 tokens', () => {
    const wrong = wrongCellFor(S().puzzle);
    useGameStore.setState({
      boosters: { ...S().boosters, undoToken: 0 },
    });

    for (let i = 0; i < MAX_CLASSIC_HEARTS; i++) S().attemptPlaceCat(wrong);
    expect(S().outOfHearts).toBe(true);

    expect(S().useHeartRefillFromOutOfHearts()).toBe(false);
    expect(S().outOfHearts).toBe(true);
    expect(S().hearts).toBe(0);
  });
});

describe('Per-level campaign save slots (#9)', () => {
  beforeEach(() => {
    S().resetAllProgress();
    unlockAll();
  });

  it('preserves level 12 progress while playing and finishing level 3, and syncs campaignSaveLevelIds', () => {
    // Start level 12, place 2 non-starter cats, lose 1 heart, advance timer
    S().startLevel(12, false);
    const lvl12 = S().puzzle;
    const lvl12Cats = lvl12.solution.filter(
      (s) => !lvl12.initialCats.some((ic) => coordsEqual(ic, s))
    );
    expect(lvl12Cats.length).toBeGreaterThanOrEqual(2);
    const catA = lvl12Cats[0]!;
    const catB = lvl12Cats[1]!;

    S().attemptPlaceCat(catA);
    S().attemptPlaceCat(catB);
    S().attemptPlaceCat(wrongCellFor(lvl12)); // hearts -> 2
    useGameStore.setState({ elapsedSec: 77 });
    S().tickTimer(); // elapsedSec -> 78
    // Persist the timer/hearts snapshot by toggling a mark or calling goToScreen -> actually attemptPlaceCat already saved hearts=2; let's force a persist via tickTimer at multiple of 5:
    useGameStore.setState({ elapsedSec: 79 });
    S().tickTimer(); // elapsedSec -> 80 (divisible by 5 -> persists!)
    expect(S().hearts).toBe(2);
    expect(S().elapsedSec).toBe(80);
    expect(S().campaignSaveLevelIds).toEqual([12]);

    // Switch to level 3 and place 1 cat
    S().startLevel(3, false);
    const lvl3 = S().puzzle;
    const lvl3Cat = lvl3.solution.find(
      (s) => !lvl3.initialCats.some((ic) => coordsEqual(ic, s))
    )!;
    S().attemptPlaceCat(lvl3Cat);
    expect(S().campaignSaveLevelIds).toEqual([3, 12]);

    // Resume level 12 -> both cats, hearts, and elapsedSec are restored
    S().startLevel(12, true);
    expect(S().puzzle.id).toBe(12);
    expect(S().board[catA.row]![catA.col]).toBe('cat');
    expect(S().board[catB.row]![catB.col]).toBe('cat');
    expect(S().hearts).toBe(2);
    expect(S().elapsedSec).toBe(80);

    // Resume level 3 and finish it -> removes only slot 3, slot 12 survives
    S().startLevel(3, true);
    expect(S().board[lvl3Cat.row]![lvl3Cat.col]).toBe('cat');
    solveCurrentPuzzle();
    expect(S().campaignSaveLevelIds).toEqual([12]);

    // Level 12 can still be resumed with both cats intact
    S().startLevel(12, true);
    expect(S().board[catA.row]![catA.col]).toBe('cat');
    expect(S().board[catB.row]![catB.col]).toBe('cat');

    // resetAllProgress clears all slots
    S().resetAllProgress();
    expect(S().campaignSaveLevelIds).toEqual([]);
    unlockAll();
    S().startLevel(12, true);
    expect(S().board[catA.row]![catA.col]).not.toBe('cat');
    expect(S().elapsedSec).toBe(0);
  });
});

describe('Gameplay event log and progressStats (#11)', () => {
  beforeEach(() => {
    S().resetAllProgress();
    unlockAll();
  });

  it('records puzzle_completed in byDay[today], notifies listeners, and emits reward_claimed on mission claim', () => {
    const received: GameEvent[] = [];
    const unsubscribe = onGameEvent((ev) => received.push(ev));

    try {
      S().startLevel(2, false);
      solveCurrentPuzzle();

      const today = getTodayDateKey();
      const dayStats = getDayStats(S().progressStats, today);
      expect(dayStats.puzzlesCompleted).toBe(1);
      expect(dayStats.classicCompleted).toBe(1);
      expect(dayStats.threeStarWins).toBe(1);
      expect(S().progressStats.lifetime.campaignFirstClears).toBe(1);
      expect(S().progressStats.lifetime.uniqueNoHintPuzzles).toBe(1);
      expect(S().progressStats.lifetime.uniqueNoMistakePuzzles).toBe(1);

      const completedEv = received.find((e) => e.type === 'puzzle_completed');
      expect(completedEv).toBeDefined();
      if (completedEv && completedEv.type === 'puzzle_completed') {
        expect(completedEv.levelId).toBe(2);
        expect(completedEv.worldId).toBe(1);
        expect(completedEv.source).toBe('campaign');
        expect(completedEv.mode).toBe('classic');
      }

      // Make first mission claimable and claim it -> emits reward_claimed
      const firstMission = S().dailyMissions.missions[0]!;
      useGameStore.setState({
        dailyMissions: {
          ...S().dailyMissions,
          missions: S().dailyMissions.missions.map((m, i) =>
            i === 0 ? { ...m, progress: m.target, claimed: false } : m
          ),
        },
      });
      expect(S().claimMissionReward(firstMission.id)).toBe(true);

      const rewardEv = received.find((e) => e.type === 'reward_claimed');
      expect(rewardEv).toBeDefined();
      if (rewardEv && rewardEv.type === 'reward_claimed') {
        expect(rewardEv.source).toBe('mission');
        expect(rewardEv.coins).toBe(firstMission.rewardCoins);
      }
      expect(getDayStats(S().progressStats, today).rewardsClaimed).toBe(1);
    } finally {
      unsubscribe();
    }
  });
});

describe('Personal bests, attempts, and victory improvements (#12)', () => {
  beforeEach(() => {
    S().resetAllProgress();
    unlockAll();
  });

  function solveWithElapsed(sec: number): void {
    const { puzzle } = S();
    const missing = puzzle.solution.filter((c) => S().board[c.row]![c.col] !== 'cat');
    for (let i = 0; i < missing.length; i++) {
      if (i === missing.length - 1) {
        useGameStore.setState({ elapsedSec: sec });
      }
      S().attemptPlaceCat(missing[i]!);
    }
  }

  it('records star and time improvements on Classic replay, and leaves Classic bests untouched on Practice replay', () => {
    S().startLevel(2, false);
    const par = S().puzzle.parTimeSec;
    const slowTime = 2 * par + 1;

    // 1★ first clear (over 1.9 * par)
    solveWithElapsed(slowTime);
    expect(S().victorySummary?.stars).toBe(1);
    expect(S().victorySummary?.improvements).toEqual([]);
    expect(S().levelProgress[2]?.attempts).toBe(1);
    expect(S().levelProgress[2]?.lastResult?.mode).toBe('classic');
    expect(S().levelProgress[2]?.bestTimeSec).toBe(slowTime);

    // 3★ Classic replay (elapsedSec = 1)
    S().startLevel(2, false);
    solveWithElapsed(1);
    expect(S().victorySummary?.stars).toBe(3);
    expect(S().victorySummary?.improvements).toContainEqual({
      kind: 'stars',
      from: 1,
      to: 3,
    });
    expect(S().victorySummary?.improvements).toContainEqual({
      kind: 'time',
      fromSec: slowTime,
      toSec: 1,
    });
    expect(S().levelProgress[2]?.attempts).toBe(2);
    expect(S().levelProgress[2]?.lastResult?.mode).toBe('classic');
    expect(S().levelProgress[2]?.bestTimeSec).toBe(1);
    expect(S().levelProgress[2]?.bestMistakes).toBe(0);
    expect(S().levelProgress[2]?.bestHintsUsed).toBe(0);

    // Practice replay -> improvements empty, Classic bests untouched, attempts +1, lastResult.mode === 'practice'
    S().updateSetting('gameMode', 'practice');
    S().startLevel(2, false);
    solveWithElapsed(50);
    expect(S().victorySummary?.improvements).toEqual([]);
    expect(S().levelProgress[2]?.attempts).toBe(3);
    expect(S().levelProgress[2]?.lastResult?.mode).toBe('practice');
    expect(S().levelProgress[2]?.bestTimeSec).toBe(1);
    expect(S().levelProgress[2]?.bestMistakes).toBe(0);
    expect(S().levelProgress[2]?.bestHintsUsed).toBe(0);
  });
});





