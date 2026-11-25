import { describe, expect, it } from 'vitest';
import { calculateStars } from './validation';
import { calculateLevelCoinReward, SHOP_ITEMS } from './economy';
import {
  canClaimDailyReward,
  claimDailyRewardPure,
  INITIAL_DAILY_LOGIN,
} from './dailyRewards';
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

  it('tracks real gameplay events on generated Daily Missions', () => {
    let state = generateDailyMissions('2026-11-25');
    expect(state.missions).toHaveLength(3);

    for (let i = 0; i < 10; i++) {
      state = applyMissionEvent(state, { type: 'cat_placed' });
    }
    state = applyMissionEvent(state, {
      type: 'level_completed',
      starsEarned: 3,
      hintsUsed: 0,
      mistakesCount: 0,
      elapsedSec: 45,
      improvedBest: true,
    });

    const anyProgressed = state.missions.some((m) => m.progress > 0);
    expect(anyProgressed).toBe(true);
  });

  it('unlocks achievements and collectible cats accurately from player milestones', () => {
    const cats = getNewlyUnlockedCats(
      {
        levelProgress: {
          1: { levelId: 1, completed: true, bestTimeSec: 30, stars: 3, bestHintsUsed: 0, bestMistakes: 0 },
          4: { levelId: 4, completed: true, bestTimeSec: 40, stars: 3, bestHintsUsed: 0, bestMistakes: 0 },
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
          1: { levelId: 1, completed: true, bestTimeSec: 30, stars: 3, bestHintsUsed: 0, bestMistakes: 0 },
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
