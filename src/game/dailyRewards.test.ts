import { describe, expect, it } from 'vitest';
import {
  claimDailyRewardPure,
  getRewardForSlot,
  INITIAL_DAILY_LOGIN,
  isLuckyDailyClaim,
  LUCKY_BONUS,
  SEVEN_DAY_REWARDS,
  STREAK_MILESTONES,
} from './dailyRewards';
import { formatRewardLabel } from './rewardLabels';
import i18n from '../i18n';

function dateKeyAtOffset(baseYear: number, offsetDays: number): string {
  const d = new Date(Date.UTC(baseYear, 0, 1 + offsetDays));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('Daily rewards v2 (#14)', () => {
  it('escalates Day 7 coins by +20 per cycle up to 200 and leaves other days unchanged', () => {
    const expectedDay7 = [100, 120, 140, 160, 180, 200, 200, 200];
    for (let cycle = 0; cycle <= 7; cycle++) {
      expect(getRewardForSlot(6, cycle).coins).toBe(expectedDay7[cycle]);
      for (let dayIdx = 0; dayIdx < 6; dayIdx++) {
        expect(getRewardForSlot(dayIdx, cycle).coins).toBe(
          SEVEN_DAY_REWARDS[dayIdx]!.coins
        );
      }
    }
  });

  it('grants each streak milestone once ever and never re-grants after a streak reset', () => {
    let state = { ...INITIAL_DAILY_LOGIN, streakShields: 0 };
    let milestone7: ReturnType<typeof claimDailyRewardPure>['milestone'] = null;

    // 7 consecutive days -> 7th claim triggers the 7-day milestone
    for (let i = 0; i < 7; i++) {
      const res = claimDailyRewardPure(state, dateKeyAtOffset(2026, i));
      expect(res.claimed).toBe(true);
      if (i < 6) {
        expect(res.milestone).toBeNull();
      } else {
        milestone7 = res.milestone;
      }
      state = res.nextState;
    }

    expect(milestone7).toEqual(STREAK_MILESTONES[0]);
    expect(state.streakCount).toBe(7);
    expect(state.claimedStreakMilestones).toEqual([7]);

    // Break streak by skipping 10 days (with shields removed so it actually resets)
    state = { ...state, streakShields: 0 };
    let res = claimDailyRewardPure(state, dateKeyAtOffset(2026, 20));
    expect(res.claimed).toBe(true);
    expect(res.nextState.streakCount).toBe(1);
    state = res.nextState;

    // Climb back up to a 7-day streak -> milestone 7 must NOT be granted a second time
    for (let i = 21; i <= 26; i++) {
      res = claimDailyRewardPure(state, dateKeyAtOffset(2026, i));
      expect(res.milestone).toBeNull();
      state = res.nextState;
    }
    expect(state.streakCount).toBe(7);
    expect(state.claimedStreakMilestones).toEqual([7]);
  });

  it('triggers lucky bonus deterministically at ~10% (±2%) over 365 dates × 10 claim counts', () => {
    let hits = 0;
    const total = 365 * 10;

    for (let d = 0; d < 365; d++) {
      const dateKey = dateKeyAtOffset(2026, d);
      for (let claims = 0; claims < 10; claims++) {
        const first = isLuckyDailyClaim(dateKey, claims);
        const second = isLuckyDailyClaim(dateKey, claims);
        expect(first).toBe(second);
        if (first) hits++;
      }
    }

    const rate = hits / total;
    expect(rate).toBeGreaterThanOrEqual(LUCKY_BONUS.chance - 0.02);
    expect(rate).toBeLessThanOrEqual(LUCKY_BONUS.chance + 0.02);
  });

  it('generates localized reward labels from data in EN and FR', async () => {
    await i18n.changeLanguage('en');
    expect(formatRewardLabel(40, {}, i18n.t.bind(i18n))).toBe('40 Fish Coins');
    expect(formatRewardLabel(10, { hint: 1 }, i18n.t.bind(i18n))).toBe(
      '1 Hint + 10 Fish Coins'
    );
    expect(formatRewardLabel(0, { hint: 2 }, i18n.t.bind(i18n))).toBe('2 × Hint');

    await i18n.changeLanguage('fr');
    expect(formatRewardLabel(40, {}, i18n.t.bind(i18n))).toBe('40 pièces poisson');
    expect(formatRewardLabel(0, { hint: 2 }, i18n.t.bind(i18n))).toBe('2 × Indice');
    await i18n.changeLanguage('en');
  });
});
