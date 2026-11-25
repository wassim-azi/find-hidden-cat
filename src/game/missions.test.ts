import { describe, expect, it } from 'vitest';
import { applyMissionEvent, DailyMissionsState } from './missions';

function makeCatFinderState(progress = 0): DailyMissionsState {
  return {
    dateKey: '2026-11-25',
    missions: [
      {
        id: '2026-11-25-m1-place_cats',
        metric: 'place_cats',
        title: 'Cat Finder',
        description: 'Find 8 cats by solving puzzles',
        target: 8,
        progress,
        rewardCoins: 20,
        claimed: false,
      },
    ],
  };
}

describe('Daily Missions — Cat Finder (#5)', () => {
  it('advances place_cats on level_completed by catsFound and caps at target', () => {
    const start = makeCatFinderState(0);
    const afterFirst = applyMissionEvent(start, {
      type: 'level_completed',
      catsFound: 6,
    });
    expect(afterFirst.missions[0]!.progress).toBe(6);

    const afterSecond = applyMissionEvent(afterFirst, {
      type: 'level_completed',
      catsFound: 6,
    });
    expect(afterSecond.missions[0]!.progress).toBe(8);
  });

  it('does not advance place_cats when catsFound is omitted or 0', () => {
    const start = makeCatFinderState(2);
    const next = applyMissionEvent(start, { type: 'level_completed' });
    expect(next.missions[0]!.progress).toBe(2);
  });
});
