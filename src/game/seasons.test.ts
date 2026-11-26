import { describe, expect, it } from 'vitest';
import { ACCESSORIES } from './accessories';
import {
  applySeasonEvent,
  ensureCurrentSeasonProgress,
  getNewlyEarnedSeasonalAccessories,
  getSeasonForDate,
  SEASON_ITEMS,
  SEASONS_ORDER,
} from './seasons';
import { PuzzleCompletedEvent } from './progressStats';
import { useGameStore } from '../store/gameStore';

function makeEvent(overrides: Partial<PuzzleCompletedEvent> = {}): PuzzleCompletedEvent {
  return {
    type: 'puzzle_completed',
    id: '2026-12-05:1000',
    at: 1000,
    dateKey: '2026-12-05',
    weekKey: '2026-W49',
    source: 'daily',
    puzzleKey: '2026-12-05',
    levelId: null,
    worldId: null,
    mode: 'classic',
    firstCompletion: true,
    stars: 2,
    previousBestStars: 0,
    hintsUsed: 0,
    mistakesCount: 0,
    elapsedSec: 60,
    previousBestTimeSec: null,
    firstNoHint: true,
    firstNoMistake: true,
    improvedBest: false,
    catsFound: 6,
    techniques: [],
    ...overrides,
  };
}

describe('Seasonal accessory collections (#20)', () => {
  it('resolves local meteorological seasons and leap-year February boundaries accurately', () => {
    expect(getSeasonForDate(new Date(2026, 10, 30))).toEqual({
      season: 'autumn',
      seasonKey: 'autumn-2026',
      startKey: '2026-09-01',
      endKey: '2026-11-30',
    });
    expect(getSeasonForDate(new Date(2026, 11, 1))).toEqual({
      season: 'winter',
      seasonKey: 'winter-2026',
      startKey: '2026-12-01',
      endKey: '2027-02-28',
    });
    expect(getSeasonForDate(new Date(2027, 1, 28))).toEqual({
      season: 'winter',
      seasonKey: 'winter-2026',
      startKey: '2026-12-01',
      endKey: '2027-02-28',
    });
    expect(getSeasonForDate(new Date(2028, 1, 29))).toEqual({
      season: 'winter',
      seasonKey: 'winter-2027',
      startKey: '2027-12-01',
      endKey: '2028-02-29',
    });
    expect(getSeasonForDate(new Date(2027, 2, 1))).toEqual({
      season: 'spring',
      seasonKey: 'spring-2027',
      startKey: '2027-03-01',
      endKey: '2027-05-31',
    });
    expect(getSeasonForDate(new Date(2027, 5, 1))).toEqual({
      season: 'summer',
      seasonKey: 'summer-2027',
      startKey: '2027-06-01',
      endKey: '2027-08-31',
    });
    expect(getSeasonForDate(new Date(2027, 7, 31))).toEqual({
      season: 'summer',
      seasonKey: 'summer-2027',
      startKey: '2027-06-01',
      endKey: '2027-08-31',
    });
    expect(getSeasonForDate(new Date(2027, 8, 1))).toEqual({
      season: 'autumn',
      seasonKey: 'autumn-2027',
      startKey: '2027-09-01',
      endKey: '2027-11-30',
    });
  });

  it('ignores Practice events and daily replays, and reaches thresholds at 5 dailies / 10 three-star wins', () => {
    let prog = { seasonKey: 'winter-2026', dailySolved: 0, threeStarWins: 0 };

    // Practice ignored
    prog = applySeasonEvent(prog, makeEvent({ mode: 'practice', stars: 3 }));
    expect(prog).toEqual({ seasonKey: 'winter-2026', dailySolved: 0, threeStarWins: 0 });

    // Daily replay (firstCompletion: false) ignored for dailySolved
    prog = applySeasonEvent(prog, makeEvent({ firstCompletion: false, stars: 2 }));
    expect(prog.dailySolved).toBe(0);

    // 5 first-completion Classic dailies -> unlocks winterBeanie
    for (let i = 0; i < 5; i++) {
      prog = applySeasonEvent(prog, makeEvent({ dateKey: `2026-12-0${i + 1}`, stars: 2 }));
    }
    expect(prog.dailySolved).toBe(5);
    expect(getNewlyEarnedSeasonalAccessories(prog, [])).toEqual(['winterBeanie']);
    // Idempotent once already owned
    expect(getNewlyEarnedSeasonalAccessories(prog, ['winterBeanie'])).toEqual([]);

    // 10 three-star wins -> unlocks snowflakeCollar
    for (let i = 0; i < 10; i++) {
      prog = applySeasonEvent(
        prog,
        makeEvent({ source: 'campaign', firstCompletion: false, stars: 3 })
      );
    }
    expect(prog.threeStarWins).toBe(10);
    expect(getNewlyEarnedSeasonalAccessories(prog, ['winterBeanie'])).toEqual([
      'snowflakeCollar',
    ]);
  });

  it('resets progress on season rollover while keeping earned items permanently and earns idempotently in store', () => {
    const S = () => useGameStore.getState();
    S().resetAllProgress();

    const currentInfo = getSeasonForDate(new Date());
    const currentDef = SEASON_ITEMS[currentInfo.season];

    // Simulate previous season with an earned item
    useGameStore.setState({
      unlockedAccessoryIds: ['winterBeanie'],
      seasonProgress: { seasonKey: 'winter-2020', dailySolved: 5, threeStarWins: 10 },
    });

    // Navigating triggers lazy rollover -> counters reset, earned winterBeanie stays permanent!
    S().goToScreen('cats');
    expect(S().seasonProgress).toEqual({
      seasonKey: currentInfo.seasonKey,
      dailySolved: 0,
      threeStarWins: 0,
    });
    expect(S().unlockedAccessoryIds).toContain('winterBeanie');

    // Position 1 win away from current season's threeStarWins accessory (9 -> 10)
    useGameStore.setState({
      unlockedLevelId: 2,
      seasonProgress: {
        seasonKey: currentInfo.seasonKey,
        dailySolved: 0,
        threeStarWins: 9,
      },
    });
    S().startLevel(1, false);
    const sol = S().puzzle.solution;
    for (const c of sol) {
      if (S().board[c.row]![c.col] !== 'cat') {
        S().attemptPlaceCat(c);
      }
    }
    expect(S().seasonProgress.threeStarWins).toBe(10);
    expect(S().unlockedAccessoryIds).toContain(currentDef.starsItem);

    // Solving again does NOT duplicate the earned accessory
    const countAfterFirst = S().unlockedAccessoryIds.filter(
      (id) => id === currentDef.starsItem
    ).length;
    S().startLevel(1, false);
    for (const c of S().puzzle.solution) {
      if (S().board[c.row]![c.col] !== 'cat') {
        S().attemptPlaceCat(c);
      }
    }
    const countAfterSecond = S().unlockedAccessoryIds.filter(
      (id) => id === currentDef.starsItem
    ).length;
    expect(countAfterFirst).toBe(1);
    expect(countAfterSecond).toBe(1);

    // ensureCurrentSeasonProgress helper check
    expect(
      ensureCurrentSeasonProgress(
        { seasonKey: 'spring-2025', dailySolved: 3, threeStarWins: 7 },
        new Date(2026, 5, 10)
      )
    ).toEqual({ seasonKey: 'summer-2026', dailySolved: 0, threeStarWins: 0 });
  });

  it('every seasonal item exists in ACCESSORIES with source: "season"', () => {
    for (const season of SEASONS_ORDER) {
      const def = SEASON_ITEMS[season];
      for (const itemId of [def.dailyItem, def.starsItem]) {
        const acc = ACCESSORIES.find((a) => a.id === itemId);
        expect(acc, `${itemId} must exist in ACCESSORIES`).toBeDefined();
        expect(acc!.source).toBe('season');
      }
    }
  });
});
