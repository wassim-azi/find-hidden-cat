import { describe, expect, it } from 'vitest';
import { calculateLevelCoinReward } from './economy';
import {
  getEventRewardPreview,
  GOLDEN_CAT_BONUS_BOOSTER,
  GOLDEN_CAT_BONUS_COINS,
  WORLD_EVENTS,
  WorldEventId,
} from './events';

function eventById(id: WorldEventId) {
  const found = WORLD_EVENTS.find((ev) => ev.id === id);
  if (!found) throw new Error(`Missing event ${id}`);
  return found;
}

describe('Event reward previews match actual payouts (#6)', () => {
  it('computes exact Classic reward preview for daily_cat', () => {
    const preview = getEventRewardPreview(eventById('daily_cat'));
    expect(preview).toEqual({
      minCoins: 60,
      maxCoins: 75,
      classicOnly: true,
    });
  });

  it('computes exact Classic reward preview for golden_cat', () => {
    const preview = getEventRewardPreview(eventById('golden_cat'));
    expect(preview).toEqual({
      minCoins: 95,
      maxCoins: 110,
      booster: 'superHint',
      classicOnly: true,
    });
  });

  it('computes exact fixed chest previews for treasure_hunt and perfect_week', () => {
    expect(getEventRewardPreview(eventById('treasure_hunt'))).toEqual({
      minCoins: 75,
      maxCoins: 75,
      booster: 'revealCat',
      classicOnly: false,
    });
    expect(getEventRewardPreview(eventById('perfect_week'))).toEqual({
      minCoins: 60,
      maxCoins: 60,
      booster: 'revealRegion',
      classicOnly: false,
    });
  });

  it('matches calculateLevelCoinReward or chest definition for every event', () => {
    for (const ev of WORLD_EVENTS) {
      const preview = getEventRewardPreview(ev);
      if (ev.type === 'milestone_chest') {
        expect(preview.minCoins).toBe(ev.rewardCoins);
        expect(preview.maxCoins).toBe(ev.rewardCoins);
        expect(preview.booster).toBe(ev.rewardBooster);
        expect(preview.classicOnly).toBe(false);
      } else {
        const bonus = ev.id === 'golden_cat' ? GOLDEN_CAT_BONUS_COINS : 0;
        const expectedMin = calculateLevelCoinReward({
          difficulty: ev.id === 'golden_cat' ? 'hard' : 'medium',
          stars: 1,
          isFirstCompletion: true,
          specialNodeBonus: bonus,
          worldMilestoneBonus: 0,
          isDaily: true,
        }).totalCoins;
        const expectedMax = calculateLevelCoinReward({
          difficulty: ev.id === 'golden_cat' ? 'hard' : 'medium',
          stars: 3,
          isFirstCompletion: true,
          specialNodeBonus: bonus,
          worldMilestoneBonus: 0,
          isDaily: true,
        }).totalCoins;

        expect(preview.minCoins).toBe(expectedMin);
        expect(preview.maxCoins).toBe(expectedMax);
        expect(preview.classicOnly).toBe(true);
        if (ev.id === 'golden_cat') {
          expect(preview.booster).toBe(GOLDEN_CAT_BONUS_BOOSTER);
        } else {
          expect(preview.booster).toBeUndefined();
        }
      }
    }
  });
});
