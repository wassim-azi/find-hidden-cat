import { BoosterId } from './economy';
import { getWeekKey } from './dateKeys';
import { fnv1a } from './hash';
import { dateFromKey } from '../services/reminderPlanner';

export interface DailyRewardSlot {
  day: number; // 1..7
  title: string;
  subtitle: string;
  coins: number;
  boosters: Partial<Record<BoosterId, number>>;
  streakShields?: number;
  isGrandPrize?: boolean;
}

export interface StreakMilestone {
  readonly days: number;
  readonly coins: number;
  readonly boosters: Partial<Record<BoosterId, number>>;
}

export const STREAK_MILESTONES: readonly StreakMilestone[] = [
  { days: 7, coins: 50, boosters: { superHint: 1 } },
  { days: 14, coins: 75, boosters: { revealCat: 1 } },
  { days: 30, coins: 150, boosters: { revealRegion: 1 } },
  { days: 60, coins: 250, boosters: { hint: 2 } },
] as const;

export const LUCKY_BONUS = { chance: 0.1, coins: 10 } as const;

export interface DailyLoginState {
  currentDayIndex: number; // 0..6 (next day to claim)
  lastClaimDateKey: string | null; // YYYY-MM-DD
  streakCount: number;
  streakShields: number;
  totalClaims: number;
  weekClaims: { weekKey: string; count: number };
  claimedStreakMilestones: number[];
  adBonusDateKey: string | null;
}

export const INITIAL_DAILY_LOGIN: DailyLoginState = {
  currentDayIndex: 0,
  lastClaimDateKey: null,
  streakCount: 0,
  streakShields: 1, // Start with 1 friendly streak protection!
  totalClaims: 0,
  weekClaims: { weekKey: '', count: 0 },
  claimedStreakMilestones: [],
  adBonusDateKey: null,
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
    subtitle: 'Clever boost',
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
    subtitle: 'Grand prize',
    coins: 100,
    boosters: { revealCat: 1, revealRegion: 1 },
    streakShields: 1,
    isGrandPrize: true,
  },
] as const;

/**
 * Returns the reward slot for a given 0..6 dayIndex and completed-week cycle.
 * Day 7 (index 6) escalates by +20 coins per cycle up to 200 max (cycle >= 5).
 */
export function getRewardForSlot(dayIndex: number, cycle: number): DailyRewardSlot {
  const idx = ((Math.floor(dayIndex) % 7) + 7) % 7;
  const base = SEVEN_DAY_REWARDS[idx]!;
  const safeCycle = Math.max(0, Math.floor(cycle));
  const coins = idx === 6 ? 100 + 20 * Math.min(safeCycle, 5) : base.coins;
  return {
    ...base,
    coins,
    boosters: { ...base.boosters },
  };
}

/** Deterministic 10% lucky bonus check — reloading cannot re-roll the outcome. */
export function isLuckyDailyClaim(todayKey: string, totalClaimsBefore: number): boolean {
  return fnv1a(`${todayKey}|${totalClaimsBefore}`) / 4294967296 < LUCKY_BONUS.chance;
}

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
  luckyBonusCoins: number;
  milestone: StreakMilestone | null;
  nextState: DailyLoginState;
} {
  if (!canClaimDailyReward(state, todayKey)) {
    return {
      claimed: false,
      reward: null,
      usedStreakShield: false,
      luckyBonusCoins: 0,
      milestone: null,
      nextState: state,
    };
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

  const cycle = Math.floor(state.totalClaims / 7);
  const reward = getRewardForSlot(dayIdx, cycle);
  const nextDayIdx = (dayIdx + 1) % 7;
  const weekKey = getWeekKey(dateFromKey(todayKey));
  const weekClaims =
    state.weekClaims.weekKey === weekKey
      ? { weekKey, count: state.weekClaims.count + 1 }
      : { weekKey, count: 1 };

  const luckyBonusCoins = isLuckyDailyClaim(todayKey, state.totalClaims)
    ? LUCKY_BONUS.coins
    : 0;

  const claimedMilestones = state.claimedStreakMilestones ?? [];
  const milestone =
    STREAK_MILESTONES.find(
      (m) => m.days === streak && !claimedMilestones.includes(m.days)
    ) ?? null;
  const nextClaimedMilestones = milestone
    ? [...claimedMilestones, milestone.days].sort((a, b) => a - b)
    : claimedMilestones;

  return {
    claimed: true,
    reward,
    usedStreakShield,
    luckyBonusCoins,
    milestone,
    nextState: {
      currentDayIndex: nextDayIdx,
      lastClaimDateKey: todayKey,
      streakCount: streak,
      streakShields: shields + (reward.streakShields ?? 0),
      totalClaims: state.totalClaims + 1,
      weekClaims,
      claimedStreakMilestones: nextClaimedMilestones,
      adBonusDateKey: state.adBonusDateKey ?? null,
    },
  };
}

export function getWeeklyClaimCount(
  state: DailyLoginState,
  weekKey: string
): number {
  return state.weekClaims.weekKey === weekKey ? state.weekClaims.count : 0;
}
