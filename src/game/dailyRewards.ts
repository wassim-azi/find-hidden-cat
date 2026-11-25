import { BoosterId } from './economy';

export interface DailyRewardSlot {
  day: number; // 1..7
  title: string;
  subtitle: string;
  coins: number;
  boosters: Partial<Record<BoosterId, number>>;
  streakShields?: number;
  isGrandPrize?: boolean;
}

export interface DailyLoginState {
  currentDayIndex: number; // 0..6 (next day to claim)
  lastClaimDateKey: string | null; // YYYY-MM-DD
  streakCount: number;
  streakShields: number;
  totalClaims: number;
}

export const INITIAL_DAILY_LOGIN: DailyLoginState = {
  currentDayIndex: 0,
  lastClaimDateKey: null,
  streakCount: 0,
  streakShields: 1, // Start with 1 friendly streak protection!
  totalClaims: 0,
};

export const SEVEN_DAY_REWARDS: readonly DailyRewardSlot[] = [
  {
    day: 1,
    title: '25 Fish Coins',
    subtitle: 'Welcome treat',
    coins: 25,
    boosters: {},
  },
  {
    day: 2,
    title: '1 Hint',
    subtitle: '+10 Fish Coins',
    coins: 10,
    boosters: { hint: 1 },
  },
  {
    day: 3,
    title: '40 Fish Coins',
    subtitle: 'Mid-week stash',
    coins: 40,
    boosters: {},
  },
  {
    day: 4,
    title: '1 Super Hint',
    subtitle: 'Clears decoys!',
    coins: 0,
    boosters: { superHint: 1 },
  },
  {
    day: 5,
    title: '60 Fish Coins',
    subtitle: 'Golden catch',
    coins: 60,
    boosters: {},
  },
  {
    day: 6,
    title: '2 Hints + Shield',
    subtitle: 'Puzzle armor',
    coins: 15,
    boosters: { hint: 2, mistakeShield: 1 },
  },
  {
    day: 7,
    title: 'Cat Booster Pack',
    subtitle: '100 Coins + Reveal + Shield',
    coins: 100,
    boosters: { revealCat: 1, revealRegion: 1 },
    streakShields: 1,
    isGrandPrize: true,
  },
] as const;

export function parseDateKeyToDays(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return 0;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function canClaimDailyReward(
  state: DailyLoginState,
  todayKey: string
): boolean {
  if (!state.lastClaimDateKey) return true;
  // Only a strictly later calendar day can be claimed: moving the device clock (or timezone)
  // backwards must not unlock an extra reward.
  return parseDateKeyToDays(todayKey) > parseDateKeyToDays(state.lastClaimDateKey);
}

/**
 * Friendly streak evaluation:
 * - Same day: already claimed
 * - Consecutive day (diff === 1): streak continues
 * - Missed 1-2 days with a Streak Shield: consumes 1 shield and preserves streak!
 * - Otherwise: gently restarts at Day 1 without losing earned items or coins.
 */
export function claimDailyRewardPure(
  state: DailyLoginState,
  todayKey: string
): {
  claimed: boolean;
  reward: DailyRewardSlot | null;
  usedStreakShield: boolean;
  nextState: DailyLoginState;
} {
  if (!canClaimDailyReward(state, todayKey)) {
    return { claimed: false, reward: null, usedStreakShield: false, nextState: state };
  }

  let dayIdx = state.currentDayIndex;
  let streak = state.streakCount;
  let shields = state.streakShields;
  let usedStreakShield = false;

  if (state.lastClaimDateKey) {
    const diff = parseDateKeyToDays(todayKey) - parseDateKeyToDays(state.lastClaimDateKey);
    if (diff === 1) {
      // Perfect consecutive day
      streak += 1;
    } else if (diff > 1 && diff <= 3 && shields > 0) {
      // Friendly streak protection!
      shields -= 1;
      usedStreakShield = true;
      streak += 1;
    } else if (diff > 1) {
      dayIdx = 0;
      streak = 1;
    }
  } else {
    streak = 1;
  }

  const reward = SEVEN_DAY_REWARDS[dayIdx % 7]!;
  const nextDayIdx = (dayIdx + 1) % 7;

  return {
    claimed: true,
    reward,
    usedStreakShield,
    nextState: {
      currentDayIndex: nextDayIdx,
      lastClaimDateKey: todayKey,
      streakCount: streak,
      streakShields: shields + (reward.streakShields ?? 0),
      totalClaims: state.totalClaims + 1,
    },
  };
}
