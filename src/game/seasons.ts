import { AccessoryId } from './accessories';
import { PuzzleCompletedEvent } from './progressStats';
import { dateFromKey } from '../services/reminderPlanner';

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export const SEASONS_ORDER: readonly Season[] = [
  'winter',
  'spring',
  'summer',
  'autumn',
] as const;

export interface SeasonInfo {
  season: Season;
  seasonKey: string;
  startKey: string; // YYYY-MM-DD
  endKey: string; // YYYY-MM-DD (inclusive)
}

export interface SeasonProgress {
  seasonKey: string;
  dailySolved: number;
  threeStarWins: number;
}

export interface SeasonItemsDef {
  readonly dailyItem: AccessoryId;
  readonly starsItem: AccessoryId;
  readonly dailyTarget: 5;
  readonly starsTarget: 10;
}

export const SEASON_ITEMS: Record<Season, SeasonItemsDef> = {
  winter: {
    dailyItem: 'winterBeanie',
    starsItem: 'snowflakeCollar',
    dailyTarget: 5,
    starsTarget: 10,
  },
  spring: {
    dailyItem: 'blossomCrown',
    starsItem: 'butterflyBow',
    dailyTarget: 5,
    starsTarget: 10,
  },
  summer: {
    dailyItem: 'sunHat',
    starsItem: 'shellNecklace',
    dailyTarget: 5,
    starsTarget: 10,
  },
  autumn: {
    dailyItem: 'leafScarf',
    starsItem: 'acornCharm',
    dailyTarget: 5,
    starsTarget: 10,
  },
};

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Resolves the meteorological Northern Hemisphere season for a local calendar Date.
 * Winter spans Dec 1 (year Y) through end of Feb (year Y+1) and uses key `winter-Y`.
 */
export function getSeasonForDate(d: Date): SeasonInfo {
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1..12

  if (month === 12) {
    const febYear = year + 1;
    const febEndDay = isLeapYear(febYear) ? '29' : '28';
    return {
      season: 'winter',
      seasonKey: `winter-${year}`,
      startKey: `${year}-12-01`,
      endKey: `${febYear}-02-${febEndDay}`,
    };
  }
  if (month === 1 || month === 2) {
    const decYear = year - 1;
    const febEndDay = isLeapYear(year) ? '29' : '28';
    return {
      season: 'winter',
      seasonKey: `winter-${decYear}`,
      startKey: `${decYear}-12-01`,
      endKey: `${year}-02-${febEndDay}`,
    };
  }
  if (month >= 3 && month <= 5) {
    return {
      season: 'spring',
      seasonKey: `spring-${year}`,
      startKey: `${year}-03-01`,
      endKey: `${year}-05-31`,
    };
  }
  if (month >= 6 && month <= 8) {
    return {
      season: 'summer',
      seasonKey: `summer-${year}`,
      startKey: `${year}-06-01`,
      endKey: `${year}-08-31`,
    };
  }
  return {
    season: 'autumn',
    seasonKey: `autumn-${year}`,
    startKey: `${year}-09-01`,
    endKey: `${year}-11-30`,
  };
}

export function ensureCurrentSeasonProgress(
  prev: SeasonProgress | null,
  d: Date
): SeasonProgress {
  const { seasonKey } = getSeasonForDate(d);
  if (prev && prev.seasonKey === seasonKey) {
    return prev;
  }
  return { seasonKey, dailySolved: 0, threeStarWins: 0 };
}

/**
 * Applies a Classic PuzzleCompletedEvent to seasonal progress.
 * Automatically resets counters when crossing into a new season-year.
 */
export function applySeasonEvent(
  progress: SeasonProgress,
  e: PuzzleCompletedEvent
): SeasonProgress {
  const { seasonKey } = getSeasonForDate(dateFromKey(e.dateKey));
  const base: SeasonProgress =
    progress.seasonKey === seasonKey
      ? progress
      : { seasonKey, dailySolved: 0, threeStarWins: 0 };

  if (e.mode === 'practice') {
    return base;
  }

  const dailyDelta = e.source === 'daily' && e.firstCompletion ? 1 : 0;
  const threeStarDelta = e.stars === 3 ? 1 : 0;
  if (dailyDelta === 0 && threeStarDelta === 0) {
    return base;
  }

  return {
    seasonKey,
    dailySolved: base.dailySolved + dailyDelta,
    threeStarWins: base.threeStarWins + threeStarDelta,
  };
}

export function getNewlyEarnedSeasonalAccessories(
  progress: SeasonProgress,
  unlockedAccessoryIds: readonly AccessoryId[]
): AccessoryId[] {
  const seasonPrefix = progress.seasonKey.split('-')[0] as Season | undefined;
  if (!seasonPrefix || !(seasonPrefix in SEASON_ITEMS)) return [];
  const def = SEASON_ITEMS[seasonPrefix];
  const owned = new Set(unlockedAccessoryIds);
  const newly: AccessoryId[] = [];

  if (progress.dailySolved >= def.dailyTarget && !owned.has(def.dailyItem)) {
    newly.push(def.dailyItem);
  }
  if (progress.threeStarWins >= def.starsTarget && !owned.has(def.starsItem)) {
    newly.push(def.starsItem);
  }
  return newly;
}
