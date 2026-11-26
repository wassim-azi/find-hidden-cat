import { describe, expect, it } from 'vitest';
import {
  STAR_IMPROVEMENT_COINS_PER_STAR,
  calculateLevelCoinReward,
} from './economy';

describe('calculateLevelCoinReward', () => {
  it('pays 0 on campaign replay with same stars', () => {
    const res = calculateLevelCoinReward({
      difficulty: 'medium',
      stars: 2,
      isFirstCompletion: false,
      specialNodeBonus: 50,
      worldMilestoneBonus: 60,
      previousBestStars: 2,
    });
    expect(res).toEqual({
      baseCoins: 0,
      firstClearBonus: 0,
      starBonus: 0,
      specialNodeBonus: 0,
      worldMilestoneBonus: 0,
      starImprovementBonus: 0,
      perfectBonus: 0,
      totalCoins: 0,
    });
  });

  it('pays STAR_IMPROVEMENT_COINS_PER_STAR per new star on campaign replay (1 -> 3 stars = 20)', () => {
    const res = calculateLevelCoinReward({
      difficulty: 'hard',
      stars: 3,
      isFirstCompletion: false,
      specialNodeBonus: 50,
      worldMilestoneBonus: 60,
      previousBestStars: 1,
    });
    expect(STAR_IMPROVEMENT_COINS_PER_STAR).toBe(10);
    expect(res).toEqual({
      baseCoins: 0,
      firstClearBonus: 0,
      starBonus: 0,
      specialNodeBonus: 0,
      worldMilestoneBonus: 0,
      starImprovementBonus: 20,
      perfectBonus: 0,
      totalCoins: 20,
    });
  });

  it('pays 0 on campaign replay with fewer stars than best (3 -> 2 stars = 0)', () => {
    const res = calculateLevelCoinReward({
      difficulty: 'easy',
      stars: 2,
      isFirstCompletion: false,
      specialNodeBonus: 0,
      worldMilestoneBonus: 0,
      previousBestStars: 3,
    });
    expect(res.starImprovementBonus).toBe(0);
    expect(res.totalCoins).toBe(0);
  });

  it('keeps first clear payout unchanged across easy/medium/hard x 1/2/3 stars', () => {
    const table = (['easy', 'medium', 'hard'] as const).map((difficulty) =>
      [1, 2, 3].map((stars) => ({
        difficulty,
        stars,
        ...calculateLevelCoinReward({
          difficulty,
          stars,
          isFirstCompletion: true,
          specialNodeBonus: 0,
          worldMilestoneBonus: 0,
        }),
      }))
    );

    expect(table).toEqual([
      [
        { difficulty: 'easy', stars: 1, baseCoins: 18, firstClearBonus: 15, starBonus: 0, specialNodeBonus: 0, worldMilestoneBonus: 0, starImprovementBonus: 0, perfectBonus: 0, totalCoins: 33 },
        { difficulty: 'easy', stars: 2, baseCoins: 18, firstClearBonus: 15, starBonus: 6, specialNodeBonus: 0, worldMilestoneBonus: 0, starImprovementBonus: 0, perfectBonus: 0, totalCoins: 39 },
        { difficulty: 'easy', stars: 3, baseCoins: 18, firstClearBonus: 15, starBonus: 15, specialNodeBonus: 0, worldMilestoneBonus: 0, starImprovementBonus: 0, perfectBonus: 0, totalCoins: 48 },
      ],
      [
        { difficulty: 'medium', stars: 1, baseCoins: 26, firstClearBonus: 15, starBonus: 0, specialNodeBonus: 0, worldMilestoneBonus: 0, starImprovementBonus: 0, perfectBonus: 0, totalCoins: 41 },
        { difficulty: 'medium', stars: 2, baseCoins: 26, firstClearBonus: 15, starBonus: 6, specialNodeBonus: 0, worldMilestoneBonus: 0, starImprovementBonus: 0, perfectBonus: 0, totalCoins: 47 },
        { difficulty: 'medium', stars: 3, baseCoins: 26, firstClearBonus: 15, starBonus: 15, specialNodeBonus: 0, worldMilestoneBonus: 0, starImprovementBonus: 0, perfectBonus: 0, totalCoins: 56 },
      ],
      [
        { difficulty: 'hard', stars: 1, baseCoins: 35, firstClearBonus: 15, starBonus: 0, specialNodeBonus: 0, worldMilestoneBonus: 0, starImprovementBonus: 0, perfectBonus: 0, totalCoins: 50 },
        { difficulty: 'hard', stars: 2, baseCoins: 35, firstClearBonus: 15, starBonus: 6, specialNodeBonus: 0, worldMilestoneBonus: 0, starImprovementBonus: 0, perfectBonus: 0, totalCoins: 56 },
        { difficulty: 'hard', stars: 3, baseCoins: 35, firstClearBonus: 15, starBonus: 15, specialNodeBonus: 0, worldMilestoneBonus: 0, starImprovementBonus: 0, perfectBonus: 0, totalCoins: 65 },
      ],
    ]);
  });

  it('pays 0 on daily replay even when previousBestStars is lower', () => {
    const res = calculateLevelCoinReward({
      difficulty: 'medium',
      stars: 3,
      isFirstCompletion: false,
      specialNodeBonus: 35,
      worldMilestoneBonus: 0,
      isDaily: true,
      previousBestStars: 1,
    });
    expect(res).toEqual({
      baseCoins: 0,
      firstClearBonus: 0,
      starBonus: 0,
      specialNodeBonus: 0,
      worldMilestoneBonus: 0,
      starImprovementBonus: 0,
      perfectBonus: 0,
      totalCoins: 0,
    });
  });
});
