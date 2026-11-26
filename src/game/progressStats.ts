import type { GameMode, LevelProgress, LogicalTechnique, PlayerAchievements } from './gameTypes';

export type PuzzleSource = 'campaign' | 'daily' | 'golden';

export interface PuzzleCompletedEvent {
  type: 'puzzle_completed';
  id: string; // `${puzzleKey}:${at}` — unique, used for idempotency
  at: number; // epoch ms
  dateKey: string; // local YYYY-MM-DD of `at`
  weekKey: string; // getWeekKey(new Date(at))
  source: PuzzleSource;
  puzzleKey: string; // campaign `L${levelId}`, daily `${dateKey}`, golden `golden-${weekKey}`
  levelId: number | null; // campaign only
  worldId: number | null; // getWorldForLevel(levelId).id for campaign, else null
  mode: GameMode;
  firstCompletion: boolean;
  stars: number;
  previousBestStars: number;
  hintsUsed: number;
  mistakesCount: number;
  elapsedSec: number;
  previousBestTimeSec: number | null;
  firstNoHint: boolean; // first no-hint solve of this puzzle in Classic
  firstNoMistake: boolean; // first zero-mistake solve of this puzzle in Classic
  improvedBest: boolean; // Classic && !firstCompletion && (stars > previousBestStars || (previousBestTimeSec !== null && elapsedSec < previousBestTimeSec))
  catsFound: number; // puzzle.size - puzzle.initialCats.length
  techniques: LogicalTechnique[]; // getPuzzleAnalysis(puzzle).techniquesUsed without 'oracle_fallback'
}

export interface RewardClaimedEvent {
  type: 'reward_claimed';
  id: string;
  at: number;
  dateKey: string;
  weekKey: string;
  source: 'daily_login' | 'mission' | 'achievement' | 'event_chest';
  coins: number;
}

export interface SessionStartedEvent {
  type: 'session_started';
  id: string;
  at: number;
  dateKey: string;
  weekKey: string;
}

export type GameEvent = PuzzleCompletedEvent | RewardClaimedEvent | SessionStartedEvent;

export interface PeriodStats {
  puzzlesCompleted: number; // every completion, any mode
  classicCompleted: number;
  threeStarWins: number; // Classic, stars === 3
  noHintWins: number; // Classic, hintsUsed === 0 (replays included)
  noMistakeWins: number; // Classic, mistakesCount === 0 (replays included)
  personalBests: number; // improvedBest
  dailySolved: number; // source daily && firstCompletion && Classic
  goldenSolved: number; // source golden && firstCompletion && Classic
  worldsPlayed: number[]; // distinct worldIds (sorted)
  catsFound: number; // Classic only
  rewardsClaimed: number;
  sessions: number;
}

export interface LifetimeStats extends PeriodStats {
  campaignFirstClears: number; // campaign && firstCompletion (any mode — Practice also unlocks levels)
  uniqueNoHintPuzzles: number; // firstNoHint
  uniqueNoMistakePuzzles: number; // firstNoMistake
  starsGained: number; // campaign Classic: max(0, stars-previousBestStars); Practice first clear: 1; daily/golden first Classic: stars
  playTimeSec: number; // sum of elapsedSec of completions
  techniquesSeen: LogicalTechnique[]; // union over Classic completions (sorted)
}

export interface ProgressStats {
  version: 1;
  lifetime: LifetimeStats;
  byDay: Record<string, PeriodStats>; // keep the 14 most recent dateKeys
  byWeek: Record<string, PeriodStats>; // keep the 6 most recent weekKeys
  processedEventIds: string[]; // keep the last 300
}

export const MAX_BY_DAY_KEYS = 14;
export const MAX_BY_WEEK_KEYS = 6;
export const MAX_PROCESSED_EVENT_IDS = 300;

export function createEmptyPeriodStats(): PeriodStats {
  return {
    puzzlesCompleted: 0,
    classicCompleted: 0,
    threeStarWins: 0,
    noHintWins: 0,
    noMistakeWins: 0,
    personalBests: 0,
    dailySolved: 0,
    goldenSolved: 0,
    worldsPlayed: [],
    catsFound: 0,
    rewardsClaimed: 0,
    sessions: 0,
  };
}

export function createEmptyLifetimeStats(): LifetimeStats {
  return {
    ...createEmptyPeriodStats(),
    campaignFirstClears: 0,
    uniqueNoHintPuzzles: 0,
    uniqueNoMistakePuzzles: 0,
    starsGained: 0,
    playTimeSec: 0,
    techniquesSeen: [],
  };
}

export const EMPTY_PROGRESS_STATS: ProgressStats = {
  version: 1,
  lifetime: createEmptyLifetimeStats(),
  byDay: {},
  byWeek: {},
  processedEventIds: [],
};

function mergeSortedNumbers(existing: number[], nextVal: number | null): number[] {
  if (nextVal === null) return existing;
  if (existing.includes(nextVal)) return existing;
  return [...existing, nextVal].sort((a, b) => a - b);
}

function mergeSortedTechniques(
  existing: LogicalTechnique[],
  incoming: LogicalTechnique[]
): LogicalTechnique[] {
  const filtered = incoming.filter((t) => t !== 'oracle_fallback');
  if (filtered.length === 0) return existing;
  const set = new Set<LogicalTechnique>(existing);
  let changed = false;
  for (const t of filtered) {
    if (!set.has(t)) {
      set.add(t);
      changed = true;
    }
  }
  if (!changed) return existing;
  return Array.from(set).sort();
}

function applyEventToPeriod(period: PeriodStats, e: GameEvent): PeriodStats {
  if (e.type === 'session_started') {
    return { ...period, sessions: period.sessions + 1 };
  }
  if (e.type === 'reward_claimed') {
    return { ...period, rewardsClaimed: period.rewardsClaimed + 1 };
  }

  const isClassic = e.mode === 'classic';
  if (!isClassic) {
    return {
      ...period,
      puzzlesCompleted: period.puzzlesCompleted + 1,
    };
  }

  return {
    ...period,
    puzzlesCompleted: period.puzzlesCompleted + 1,
    classicCompleted: period.classicCompleted + 1,
    threeStarWins: period.threeStarWins + (e.stars === 3 ? 1 : 0),
    noHintWins: period.noHintWins + (e.hintsUsed === 0 ? 1 : 0),
    noMistakeWins: period.noMistakeWins + (e.mistakesCount === 0 ? 1 : 0),
    personalBests: period.personalBests + (e.improvedBest ? 1 : 0),
    dailySolved:
      period.dailySolved + (e.source === 'daily' && e.firstCompletion ? 1 : 0),
    goldenSolved:
      period.goldenSolved + (e.source === 'golden' && e.firstCompletion ? 1 : 0),
    worldsPlayed: mergeSortedNumbers(period.worldsPlayed, e.worldId),
    catsFound: period.catsFound + Math.max(0, e.catsFound),
  };
}

function computeStarsGained(e: PuzzleCompletedEvent): number {
  const isClassic = e.mode === 'classic';
  if (e.source === 'campaign') {
    if (!isClassic) return e.firstCompletion ? 1 : 0;
    return Math.max(0, e.stars - e.previousBestStars);
  }
  return isClassic && e.firstCompletion ? e.stars : 0;
}

function applyEventToLifetime(lifetime: LifetimeStats, e: GameEvent): LifetimeStats {
  const nextPeriod = applyEventToPeriod(lifetime, e);
  if (e.type !== 'puzzle_completed') {
    return {
      ...lifetime,
      ...nextPeriod,
    };
  }

  const isClassic = e.mode === 'classic';
  return {
    ...lifetime,
    ...nextPeriod,
    campaignFirstClears:
      lifetime.campaignFirstClears +
      (e.source === 'campaign' && e.firstCompletion ? 1 : 0),
    uniqueNoHintPuzzles: lifetime.uniqueNoHintPuzzles + (e.firstNoHint ? 1 : 0),
    uniqueNoMistakePuzzles:
      lifetime.uniqueNoMistakePuzzles + (e.firstNoMistake ? 1 : 0),
    starsGained: lifetime.starsGained + computeStarsGained(e),
    playTimeSec: lifetime.playTimeSec + Math.max(0, e.elapsedSec),
    techniquesSeen: isClassic
      ? mergeSortedTechniques(lifetime.techniquesSeen, e.techniques)
      : lifetime.techniquesSeen,
  };
}

function prunePeriodMap(
  map: Record<string, PeriodStats>,
  maxKeys: number
): Record<string, PeriodStats> {
  const keys = Object.keys(map);
  if (keys.length <= maxKeys) return map;
  keys.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)); // newest keys first
  const pruned: Record<string, PeriodStats> = {};
  for (const k of keys.slice(0, maxKeys)) {
    pruned[k] = map[k]!;
  }
  return pruned;
}

/**
 * Pure, idempotent reducer for gameplay events.
 * Duplicate event ids (already in `processedEventIds`) are ignored.
 */
export function applyGameEvent(stats: ProgressStats, e: GameEvent): ProgressStats {
  if (stats.processedEventIds.includes(e.id)) {
    return stats;
  }

  const nextLifetime = applyEventToLifetime(stats.lifetime, e);

  const prevDay = stats.byDay[e.dateKey] ?? createEmptyPeriodStats();
  const nextByDay = prunePeriodMap(
    {
      ...stats.byDay,
      [e.dateKey]: applyEventToPeriod(prevDay, e),
    },
    MAX_BY_DAY_KEYS
  );

  const prevWeek = stats.byWeek[e.weekKey] ?? createEmptyPeriodStats();
  const nextByWeek = prunePeriodMap(
    {
      ...stats.byWeek,
      [e.weekKey]: applyEventToPeriod(prevWeek, e),
    },
    MAX_BY_WEEK_KEYS
  );

  const nextProcessed = [...stats.processedEventIds, e.id].slice(
    -MAX_PROCESSED_EVENT_IDS
  );

  return {
    version: 1,
    lifetime: nextLifetime,
    byDay: nextByDay,
    byWeek: nextByWeek,
    processedEventIds: nextProcessed,
  };
}

export function getDayStats(stats: ProgressStats, dateKey: string): PeriodStats {
  return stats.byDay[dateKey] ?? createEmptyPeriodStats();
}

export function getWeekStats(stats: ProgressStats, weekKey: string): PeriodStats {
  return stats.byWeek[weekKey] ?? createEmptyPeriodStats();
}

/**
 * Back-fills LifetimeStats for an existing save created before `progressStats` existed.
 */
export function backfillProgressStats(input: {
  levelProgress: Record<number, LevelProgress>;
  completedDailyDates: string[];
  achievements: PlayerAchievements;
  zeroMistakeSolves: number;
  getTechniquesForLevel: (levelId: number) => LogicalTechnique[];
}): ProgressStats {
  const completedLevels = Object.values(input.levelProgress).filter((p) => p.completed);
  const campaignFirstClears = completedLevels.length;
  const dailySolved = input.completedDailyDates.filter(
    (d) => !d.startsWith('golden-')
  ).length;
  const goldenSolved = input.completedDailyDates.filter((d) =>
    d.startsWith('golden-')
  ).length;
  const threeStarWins = completedLevels.filter((p) => p.stars === 3).length;
  const starsGained = Object.values(input.levelProgress).reduce(
    (sum, p) => sum + p.stars,
    0
  );
  const totalCompleted = campaignFirstClears + dailySolved + goldenSolved;

  const techSet = new Set<LogicalTechnique>();
  for (const prog of completedLevels) {
    for (const tech of input.getTechniquesForLevel(prog.levelId)) {
      if (tech !== 'oracle_fallback') {
        techSet.add(tech);
      }
    }
  }

  return {
    version: 1,
    lifetime: {
      ...createEmptyLifetimeStats(),
      puzzlesCompleted: totalCompleted,
      classicCompleted: totalCompleted,
      threeStarWins,
      dailySolved,
      goldenSolved,
      campaignFirstClears,
      uniqueNoHintPuzzles: Math.max(0, Math.floor(input.achievements.perfectLevels)),
      uniqueNoMistakePuzzles: Math.max(0, Math.floor(input.zeroMistakeSolves)),
      starsGained,
      techniquesSeen: Array.from(techSet).sort(),
    },
    byDay: {},
    byWeek: {},
    processedEventIds: [],
  };
}
