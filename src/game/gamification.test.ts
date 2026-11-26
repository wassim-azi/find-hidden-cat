import { describe, expect, it } from 'vitest';
import { calculateStars } from './validation';
import { calculateLevelCoinReward, SHOP_ITEMS } from './economy';
import {
  canClaimDailyReward,
  claimDailyRewardPure,
  getWeeklyClaimCount,
  grantStreakFreeze,
  INITIAL_DAILY_LOGIN,
  MAX_STREAK_FREEZES,
  tryRecoverStreak,
} from './dailyRewards';
import { getWeekKey } from './dateKeys';
import { applyMissionEvent, generateDailyMissions } from './missions';
import { getNewlyUnlockedAchievements } from './achievements';
import { getNewlyUnlockedCats } from './collectibleCats';
import {
  getNextWorldAfter,
  getWorldForLevel,
  isWorldFinalLevel,
  WORLDS,
} from './worlds';
import { getGoldenCatPuzzle } from './events';
import { verifyPuzzleDefinition } from './puzzleEngine';
import { rewardedAdService } from '../services/rewardedAds';

describe('Candy Crush Progression, Economy, Daily & Engagement Systems', () => {
  it('evaluates star ratings based on time, hints, and mistakes accurately', () => {
    expect(calculateStars(40, 0, 60, 0)).toBe(3);
    expect(calculateStars(40, 0, 60, 1)).toBe(2); // 1 mistake drops from 3 to 2
    expect(calculateStars(40, 1, 60, 2)).toBe(2);
    expect(calculateStars(40, 2, 60, 0)).toBe(1); // too many hints
    expect(calculateStars(40, 0, 60, 3)).toBe(1); // too many mistakes
  });

  it('maps all 24 levels cleanly into 4 sequential worlds with milestones', () => {
    expect(WORLDS).toHaveLength(4);
    expect(getWorldForLevel(1).name).toBe('Kitty Village');
    expect(getWorldForLevel(7).name).toBe('Candy Garden');
    expect(getWorldForLevel(13).name).toBe('Moonlit Valley');
    expect(getWorldForLevel(24).name).toBe('Starlight Castle');

    const world1End = isWorldFinalLevel(6);
    expect(world1End?.id).toBe(1);
    expect(getNextWorldAfter(1)?.name).toBe('Candy Garden');
    expect(getNextWorldAfter(4)).toBeNull();
  });

  it('computes balanced Fish Coin rewards for first clear, 3-stars, and world milestones', () => {
    const firstBoss = calculateLevelCoinReward({
      difficulty: 'easy',
      stars: 3,
      isFirstCompletion: true,
      specialNodeBonus: 50,
      worldMilestoneBonus: 60,
    });
    expect(firstBoss.totalCoins).toBe(18 + 15 + 15 + 50 + 60);

    const replay = calculateLevelCoinReward({
      difficulty: 'easy',
      stars: 2,
      isFirstCompletion: false,
      specialNodeBonus: 50,
      worldMilestoneBonus: 60,
      previousBestStars: 2,
    });
    expect(replay.firstClearBonus).toBe(0);
    expect(replay.worldMilestoneBonus).toBe(0);
    expect(replay.starImprovementBonus).toBe(0);
    expect(replay.totalCoins).toBe(0);
    expect(SHOP_ITEMS).toHaveLength(6);
  });

  it('prevents duplicate same-day Daily Login claims and protects streak with Streak Shield', () => {
    const day1 = claimDailyRewardPure(INITIAL_DAILY_LOGIN, '2026-11-25');
    expect(day1.claimed).toBe(true);
    expect(day1.reward?.day).toBe(1);
    expect(day1.nextState.streakCount).toBe(1);
    expect(canClaimDailyReward(day1.nextState, '2026-11-25')).toBe(false);

    // Duplicate same day blocked
    const dup = claimDailyRewardPure(day1.nextState, '2026-11-25');
    expect(dup.claimed).toBe(false);

    // Missed 1 day (2-day gap) -> Streak Shield saves streak!
    const day2Saved = claimDailyRewardPure(day1.nextState, '2026-11-27');
    expect(day2Saved.claimed).toBe(true);
    expect(day2Saved.usedStreakShield).toBe(true);
    expect(day2Saved.nextState.streakCount).toBe(2);
    expect(day2Saved.nextState.streakShields).toBe(0);
  });

  it('tracks weekly daily-login claims and resets on Sunday rollover (#7)', () => {
    // 2026-11-23 (Mon), 2026-11-24 (Tue), 2026-11-25 (Wed) are in the same Sunday-start week
    const weekA = getWeekKey(new Date(2026, 10, 23));
    const mon = claimDailyRewardPure(INITIAL_DAILY_LOGIN, '2026-11-23').nextState;
    const tue = claimDailyRewardPure(mon, '2026-11-24').nextState;
    const wed = claimDailyRewardPure(tue, '2026-11-25').nextState;

    expect(wed.weekClaims).toEqual({ weekKey: weekA, count: 3 });
    expect(getWeeklyClaimCount(wed, weekA)).toBe(3);

    // Stale week check returns 0
    const nextWeek = getWeekKey(new Date(2026, 10, 29)); // Sunday, Nov 29
    expect(nextWeek).not.toBe(weekA);
    expect(getWeeklyClaimCount(wed, nextWeek)).toBe(0);

    // Claiming on the following Sunday resets the counter to { nextWeek, 1 }
    const sun = claimDailyRewardPure(wed, '2026-11-29').nextState;
    expect(sun.weekClaims).toEqual({ weekKey: nextWeek, count: 1 });
    expect(getWeeklyClaimCount(sun, nextWeek)).toBe(1);
    expect(getWeeklyClaimCount(sun, weekA)).toBe(0);
  });

  it('preserves calendar day on break, supports one-tap recovery with 30-day cooldown, caps freezes at 3, and tracks longestStreak (#15)', () => {
    let st = { ...INITIAL_DAILY_LOGIN, streakShields: 0 };
    st = claimDailyRewardPure(st, '2026-11-01').nextState;
    st = claimDailyRewardPure(st, '2026-11-02').nextState;
    st = claimDailyRewardPure(st, '2026-11-03').nextState;
    expect(st.streakCount).toBe(3);
    expect(st.longestStreak).toBe(3);
    expect(st.currentDayIndex).toBe(3);

    // Next claim on day 6 (3-day gap) with 0 freezes -> streak resets to 1,
    // calendar day advances from slot index 3 (Day 4) instead of resetting to Day 1!
    const broken = claimDailyRewardPure(st, '2026-11-06');
    expect(broken.claimed).toBe(true);
    expect(broken.streakBroken).toBe(true);
    expect(broken.reward?.day).toBe(4);
    expect(broken.nextState.streakCount).toBe(1);
    expect(broken.nextState.currentDayIndex).toBe(4);
    expect(broken.nextState.longestStreak).toBe(3);
    expect(broken.nextState.recoverable).toEqual({ value: 3, brokenOn: '2026-11-06' });

    // Recovery on day 6 (same day) -> streak becomes 4
    const recSameDay = tryRecoverStreak(broken.nextState, '2026-11-06');
    expect(recSameDay.recovered).toBe(true);
    expect(recSameDay.nextState.streakCount).toBe(4);
    expect(recSameDay.nextState.longestStreak).toBe(4);
    expect(recSameDay.nextState.recoverable).toBeNull();
    expect(recSameDay.nextState.lastRecoveryDateKey).toBe('2026-11-06');

    // Recovery on day 7 (day after break) also works
    const recNextDay = tryRecoverStreak(broken.nextState, '2026-11-07');
    expect(recNextDay.recovered).toBe(true);
    expect(recNextDay.nextState.streakCount).toBe(4);

    // Recovery on day 8 (expired) -> not recovered and recoverable silently cleared
    const recExpired = tryRecoverStreak(broken.nextState, '2026-11-08');
    expect(recExpired.recovered).toBe(false);
    expect(recExpired.nextState.recoverable).toBeNull();

    // Second break within 30 days of a recovery -> recoverable stays null
    const secondBreak = claimDailyRewardPure(recSameDay.nextState, '2026-11-20');
    expect(secondBreak.streakBroken).toBe(true);
    expect(secondBreak.nextState.recoverable).toBeNull();
    expect(secondBreak.nextState.longestStreak).toBe(4); // never decreases

    // With 1 freeze and a 2-missed-day gap (diff = 3) -> streak continues and freezes drop to 0
    const withFreeze = { ...INITIAL_DAILY_LOGIN, streakShields: 1 };
    const c1 = claimDailyRewardPure(withFreeze, '2026-11-01').nextState;
    const c4 = claimDailyRewardPure(c1, '2026-11-04');
    expect(c4.usedStreakShield).toBe(true);
    expect(c4.nextState.streakCount).toBe(2);
    expect(c4.nextState.streakShields).toBe(0);

    // Freeze cap at MAX_STREAK_FREEZES (3)
    const atCap = { ...INITIAL_DAILY_LOGIN, streakShields: MAX_STREAK_FREEZES };
    expect(grantStreakFreeze(atCap).streakShields).toBe(MAX_STREAK_FREEZES);
  });

  it('tracks real gameplay events on generated Daily Missions', () => {
    const state = generateDailyMissions('2026-11-25');
    expect(state.missions).toHaveLength(3);

    const nextMissions = applyMissionEvent(state.missions, {
      type: 'puzzle_completed',
      id: 'L1:1',
      at: 1,
      dateKey: '2026-11-25',
      weekKey: '2026-W48',
      source: 'campaign',
      puzzleKey: 'L1',
      levelId: 1,
      worldId: 1,
      mode: 'classic',
      firstCompletion: false,
      stars: 3,
      previousBestStars: 2,
      hintsUsed: 0,
      mistakesCount: 0,
      elapsedSec: 45,
      previousBestTimeSec: 60,
      firstNoHint: true,
      firstNoMistake: true,
      improvedBest: true,
      catsFound: 6,
      techniques: [],
    });

    const anyProgressed = nextMissions.some((m) => m.progress > 0);
    expect(anyProgressed).toBe(true);
  });

  it('unlocks achievements and collectible cats accurately from player milestones', () => {
    const cats = getNewlyUnlockedCats(
      {
        levelProgress: {
          1: { levelId: 1, completed: true, bestTimeSec: 30, stars: 3, bestHintsUsed: 0, bestMistakes: 0, attempts: 1, lastResult: null },
          4: { levelId: 4, completed: true, bestTimeSec: 40, stars: 3, bestHintsUsed: 0, bestMistakes: 0, attempts: 1, lastResult: null },
        },
        unlockedLevelId: 7,
        totalStars: 6,
        noHintSolves: 3,
        completedDailyCount: 1,
        unlockedAchievementsCount: 2,
      },
      ['mochi']
    );
    const ids = cats.map((c) => c.id);
    expect(ids).toContain('marmalade');
    expect(ids).toContain('pebble');
    expect(ids).toContain('biscuit');
    expect(ids).toContain('cleo');
    expect(ids).toContain('luna');
    expect(ids).toContain('snowbell');

    const achs = getNewlyUnlockedAchievements(
      {
        levelProgress: {
          1: { levelId: 1, completed: true, bestTimeSec: 30, stars: 3, bestHintsUsed: 0, bestMistakes: 0, attempts: 1, lastResult: null },
        },
        unlockedLevelId: 7,
        noHintSolves: 5,
        zeroMistakeSolves: 1,
        specialLevelsCompleted: 1,
        unlockedCatsCount: 5,
        completedDailyCount: 1,
        totalStars: 15,
      },
      []
    );
    expect(achs.map((a) => a.id)).toContain('first_purr');
    expect(achs.map((a) => a.id)).toContain('world_traveler');
    expect(achs.map((a) => a.id)).toContain('cat_collector');
  });

  it('rewardedAdService returns NOT_IMPLEMENTED and never fakes reward completion', async () => {
    expect(rewardedAdService.isAvailable('free_hint')).toBe(false);
    const res = await rewardedAdService.requestReward('free_hint');
    expect(res.status).toBe('NOT_IMPLEMENTED');
    expect(res.granted).toBe(false);
    expect(res.message.length).toBeGreaterThan(10);
  });

  it('generates a deterministic unique-solution 8x8 Golden Cat weekly trial puzzle', () => {
    const puzzle = getGoldenCatPuzzle('2026-W48');
    expect(puzzle.size).toBe(8);
    const check = verifyPuzzleDefinition(puzzle);
    expect(check.valid).toBe(true);
    expect(check.solutionCount).toBe(1);
  });
});
