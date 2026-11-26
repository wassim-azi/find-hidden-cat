import { BoosterId } from './economy';
import { getWeekKey } from './dateKeys';
import { fnv1a } from './hash';
import { dateFromKey, daysBetween } from '../services/reminderPlanner';

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

export interface RecoverableStreak {
  value: number;
  brokenOn: string; // YYYY-MM-DD
}

export const MAX_STREAK_FREEZES = 3;
export const RECOVERY_COOLDOWN_DAYS = 30;
export const RECOVERY_MIN_STREAK = 3;

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
  longestStreak: number;
  streakShields: number; // Streak Freezes (capped at MAX_STREAK_FREEZES)
  totalClaims: number;
  weekClaims: { weekKey: string; count: number };
  claimedStreakMilestones: number[];
  adBonusDateKey: string | null;
  recoverable: RecoverableStreak | null;
  lastRecoveryDateKey: string | null;
}

export const INITIAL_DAILY_LOGIN: DailyLoginState = {
  currentDayIndex: 0,
  lastClaimDateKey: null,
  streakCount: 0,
  longestStreak: 0,
  streakShields: 1, // Start with 1 friendly Streak Freeze!
  totalClaims: 0,
  weekClaims: { weekKey: '', count: 0 },
  claimedStreakMilestones: [],
  adBonusDateKey: null,
  recoverable: null,
  lastRecoveryDateKey: null,
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

/** Grants +1 Streak Freeze, respecting MAX_STREAK_FREEZES (3). */
export function grantStreakFreeze(state: DailyLoginState): DailyLoginState {
  if (state.streakShields >= MAX_STREAK_FREEZES) {
    return state;
  }
  return {
    ...state,
    streakShields: Math.min(MAX_STREAK_FREEZES, state.streakShields + 1),
  };
}

/** Returns true if a broken streak can still be recovered via Classic play today. */
export function isRecoverableActive(
  state: DailyLoginState,
  todayKey: string
): boolean {
  if (!state.recoverable) return false;
  const gap = daysBetween(state.recoverable.brokenOn, todayKey);
  return gap >= 0 && gap <= 1;
}

/**
 * Attempts one-tap streak recovery after a Classic puzzle completion.
 * Valid on `brokenOn` or the day after (gap 0 or 1). Silently expires if gap > 1.
 */
export function tryRecoverStreak(
  state: DailyLoginState,
  todayKey: string
): { recovered: boolean; nextState: DailyLoginState } {
  if (!state.recoverable) {
    return { recovered: false, nextState: state };
  }
  const gap = daysBetween(state.recoverable.brokenOn, todayKey);
  if (gap > 1) {
    return {
      recovered: false,
      nextState: {
        ...state,
        recoverable: null,
      },
    };
  }
  if (gap < 0) {
    return { recovered: false, nextState: state };
  }

  const restored = state.recoverable.value + state.streakCount;
  const longestStreak = Math.max(state.longestStreak ?? 0, restored);
  return {
    recovered: true,
    nextState: {
      ...state,
      streakCount: restored,
      longestStreak,
      recoverable: null,
      lastRecoveryDateKey: todayKey,
    },
  };
}

/**
 * Friendly streak evaluation:
 * - Same day / backwards clock: already claimed
 * - Consecutive day (diff === 1): streak continues
 * - Missed 1-2 days with a Streak Freeze: consumes 1 freeze and preserves streak
 * - Otherwise: streak restarts at 1 (calendar day index NEVER resets!) and
 *   offers free one-tap recovery if streak was >= 3 and 30 days elapsed since last recovery.
 */
export function claimDailyRewardPure(
  state: DailyLoginState,
  todayKey: string
): {
  claimed: boolean;
  reward: DailyRewardSlot | null;
  usedStreakShield: boolean;
  streakBroken: boolean;
  luckyBonusCoins: number;
  milestone: StreakMilestone | null;
  nextState: DailyLoginState;
} {
  if (!canClaimDailyReward(state, todayKey)) {
    return {
      claimed: false,
      reward: null,
      usedStreakShield: false,
      streakBroken: false,
      luckyBonusCoins: 0,
      milestone: null,
      nextState: state,
    };
  }

  const dayIdx = state.currentDayIndex;
  const previousStreak = state.streakCount;
  let streak = state.streakCount;
  let shields = state.streakShields;
  let usedStreakShield = false;
  let streakBroken = false;
  let nextRecoverable: RecoverableStreak | null = state.recoverable ?? null;

  // Expire any stale recovery window first
  if (nextRecoverable && daysBetween(nextRecoverable.brokenOn, todayKey) > 1) {
    nextRecoverable = null;
  }

  if (state.lastClaimDateKey) {
    const diff = parseDateKeyToDays(todayKey) - parseDateKeyToDays(state.lastClaimDateKey);
    if (diff === 1) {
      streak += 1;
    } else if (diff > 1 && diff <= 3 && shields > 0) {
      shields -= 1;
      usedStreakShield = true;
      streak += 1;
    } else if (diff > 1) {
      // Calendar position (dayIdx) never resets on a break!
      streak = 1;
      streakBroken = true;
      const canOfferRecovery =
        previousStreak >= RECOVERY_MIN_STREAK &&
        (!state.lastRecoveryDateKey ||
          daysBetween(state.lastRecoveryDateKey, todayKey) >= RECOVERY_COOLDOWN_DAYS);
      nextRecoverable = canOfferRecovery
        ? { value: previousStreak, brokenOn: todayKey }
        : null;
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

  let nextState: DailyLoginState = {
    currentDayIndex: nextDayIdx,
    lastClaimDateKey: todayKey,
    streakCount: streak,
    longestStreak: Math.max(state.longestStreak ?? previousStreak, streak),
    streakShields: shields,
    totalClaims: state.totalClaims + 1,
    weekClaims,
    claimedStreakMilestones: nextClaimedMilestones,
    adBonusDateKey: state.adBonusDateKey ?? null,
    recoverable: nextRecoverable,
    lastRecoveryDateKey: state.lastRecoveryDateKey ?? null,
  };

  const freezesToGrant = reward.streakShields ?? 0;
  for (let i = 0; i < freezesToGrant; i++) {
    nextState = grantStreakFreeze(nextState);
  }

  return {
    claimed: true,
    reward,
    usedStreakShield,
    streakBroken,
    luckyBonusCoins,
    milestone,
    nextState,
  };
}

export function getWeeklyClaimCount(
  state: DailyLoginState,
  weekKey: string
): number {
  return state.weekClaims.weekKey === weekKey ? state.weekClaims.count : 0;
}
