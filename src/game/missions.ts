import { BoosterId } from './economy';
import { LevelProgress } from './gameTypes';
import { fnv1a } from './hash';
import { ProgressStats, PuzzleCompletedEvent } from './progressStats';
import { WORLDS } from './worlds';
import { addDays } from '../services/reminderPlanner';

export type MissionMetric =
  | 'levels_completed'
  | 'no_hint_level'
  | 'earn_stars'
  | 'fast_solve'
  | 'place_cats'
  | 'no_mistake_level'
  | 'improve_score'
  | 'three_star_wins'
  | 'daily_solved'
  | 'worlds_played';

export const VALID_MISSION_METRICS: ReadonlySet<string> = new Set<MissionMetric>([
  'levels_completed',
  'no_hint_level',
  'earn_stars',
  'fast_solve',
  'place_cats',
  'no_mistake_level',
  'improve_score',
  'three_star_wins',
  'daily_solved',
  'worlds_played',
]);

export interface Mission {
  id: string;
  scope: 'daily' | 'weekly';
  metric: MissionMetric;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardBooster?: BoosterId;
  claimed: boolean;
  seenWorldIds?: number[];
}

export type DailyMission = Mission;

export interface DailyMissionsState {
  dateKey: string;
  missions: Mission[];
  rerollUsed: boolean;
}

export interface WeeklyMissionsState {
  weekKey: string;
  missions: Mission[];
}

export interface MissionEligibilityContext {
  completedLevelCount: number;
  unlockedLevelId: number;
}

interface MissionTemplate {
  metric: MissionMetric;
  target: number;
  rewardCoins: number;
  rewardBooster?: BoosterId;
}

const DAILY_MISSION_POOL: readonly MissionTemplate[] = [
  { metric: 'levels_completed', target: 2, rewardCoins: 30 },
  { metric: 'place_cats', target: 8, rewardCoins: 20 },
  { metric: 'no_hint_level', target: 1, rewardCoins: 35, rewardBooster: 'hint' },
  { metric: 'earn_stars', target: 3, rewardCoins: 30 },
  { metric: 'fast_solve', target: 1, rewardCoins: 25 },
  { metric: 'no_mistake_level', target: 1, rewardCoins: 40, rewardBooster: 'mistakeShield' },
  { metric: 'improve_score', target: 1, rewardCoins: 25 },
];

const WEEKLY_MISSION_POOL: readonly MissionTemplate[] = [
  { metric: 'three_star_wins', target: 6, rewardCoins: 80, rewardBooster: 'hint' },
  { metric: 'levels_completed', target: 10, rewardCoins: 70 },
  { metric: 'daily_solved', target: 4, rewardCoins: 90, rewardBooster: 'superHint' },
  { metric: 'worlds_played', target: 2, rewardCoins: 60 },
  { metric: 'no_mistake_level', target: 4, rewardCoins: 80, rewardBooster: 'mistakeShield' },
  { metric: 'improve_score', target: 3, rewardCoins: 60 },
];

export function getEligibleDailyMetrics(ctx?: MissionEligibilityContext): MissionMetric[] {
  const completedLevelCount = ctx?.completedLevelCount ?? 1;
  return DAILY_MISSION_POOL.filter((tpl) => {
    if (tpl.metric === 'improve_score') return completedLevelCount >= 1;
    return true;
  }).map((tpl) => tpl.metric);
}

export function getEligibleWeeklyMetrics(ctx?: MissionEligibilityContext): MissionMetric[] {
  const completedLevelCount = ctx?.completedLevelCount ?? 3;
  const unlockedLevelId = ctx?.unlockedLevelId ?? 7;
  return WEEKLY_MISSION_POOL.filter((tpl) => {
    if (tpl.metric === 'worlds_played') return unlockedLevelId >= 7;
    if (tpl.metric === 'improve_score') return completedLevelCount >= 3;
    return true;
  }).map((tpl) => tpl.metric);
}

function lcgNext(state: number): number {
  return (Math.imul(state, 1664525) + 1013904223) >>> 0;
}

function shuffleDeterministic<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  let s = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = lcgNext(s);
    const j = s % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export interface GenerateDailyOptions {
  eligible?: MissionMetric[];
  yesterdayMetrics?: MissionMetric[];
}

/**
 * Deterministically picks 3 varied daily missions for a given local dateKey,
 * respecting eligibility and avoiding yesterday's metrics when possible.
 */
export function generateDailyMissions(
  dateKey: string,
  options?: GenerateDailyOptions
): DailyMissionsState {
  const eligibleSet = options?.eligible ? new Set(options.eligible) : null;
  const eligiblePool = eligibleSet
    ? DAILY_MISSION_POOL.filter((tpl) => eligibleSet.has(tpl.metric))
    : [...DAILY_MISSION_POOL];

  const yesterdaySet = new Set(options?.yesterdayMetrics ?? []);
  const nonRepeatPool = eligiblePool.filter((tpl) => !yesterdaySet.has(tpl.metric));

  // If filters leave fewer than 3 metrics, drop the no-repeat rule first.
  const basePool =
    nonRepeatPool.length >= 3
      ? [...nonRepeatPool]
      : eligiblePool.length >= 3
        ? [...eligiblePool]
        : [...DAILY_MISSION_POOL];

  const seed = fnv1a(dateKey);
  const pool = [...basePool];
  const chosen: MissionTemplate[] = [];

  // Prefer 1 accessible starter mission if present in the filtered pool
  const starterIndices = pool
    .map((tpl, idx) =>
      tpl.metric === 'levels_completed' || tpl.metric === 'place_cats' ? idx : -1
    )
    .filter((idx) => idx >= 0);

  if (starterIndices.length > 0) {
    const pickIdx = starterIndices[seed % starterIndices.length]!;
    chosen.push(pool.splice(pickIdx, 1)[0]!);
  }

  let s = (seed + 37) >>> 0;
  while (chosen.length < 3 && pool.length > 0) {
    s = lcgNext(s);
    const idx = s % pool.length;
    chosen.push(pool.splice(idx, 1)[0]!);
  }

  return {
    dateKey,
    missions: chosen.map((tpl, i) => ({
      id: `${dateKey}-m${i + 1}-${tpl.metric}`,
      scope: 'daily',
      metric: tpl.metric,
      target: tpl.target,
      progress: 0,
      rewardCoins: tpl.rewardCoins,
      rewardBooster: tpl.rewardBooster,
      claimed: false,
    })),
    rerollUsed: false,
  };
}

export function ensureTodaysMissions(
  state: DailyMissionsState | null,
  todayKey: string,
  ctx?: MissionEligibilityContext
): DailyMissionsState {
  if (state && state.dateKey === todayKey && state.missions.length === 3) {
    return state;
  }
  const yesterdayMetrics =
    state && state.dateKey === addDays(todayKey, -1)
      ? state.missions.map((m) => m.metric)
      : [];
  const eligible = getEligibleDailyMetrics(ctx);
  return generateDailyMissions(todayKey, { eligible, yesterdayMetrics });
}

/**
 * Replaces one unclaimed, incomplete daily mission with the first eligible daily metric
 * not already present today, ordered by fnv1a(dateKey + ':reroll'). Allowed once per day.
 */
export function rerollDailyMission(
  state: DailyMissionsState,
  missionId: string,
  ctx?: MissionEligibilityContext
): DailyMissionsState | null {
  if (state.rerollUsed) return null;
  const idx = state.missions.findIndex((m) => m.id === missionId);
  if (idx < 0) return null;
  const target = state.missions[idx]!;
  if (target.claimed || target.progress >= target.target) return null;

  const currentMetrics = new Set(state.missions.map((m) => m.metric));
  const eligibleSet = new Set(getEligibleDailyMetrics(ctx));
  const eligibleTemplates = DAILY_MISSION_POOL.filter((tpl) => eligibleSet.has(tpl.metric));
  const shuffled = shuffleDeterministic(eligibleTemplates, fnv1a(`${state.dateKey}:reroll`));
  const replacement = shuffled.find((tpl) => !currentMetrics.has(tpl.metric));
  if (!replacement) return null;

  const nextMissions = state.missions.map((m, i) =>
    i === idx
      ? {
          id: `${state.dateKey}-r-${replacement.metric}`,
          scope: 'daily' as const,
          metric: replacement.metric,
          target: replacement.target,
          progress: 0,
          rewardCoins: replacement.rewardCoins,
          rewardBooster: replacement.rewardBooster,
          claimed: false,
        }
      : m
  );

  return {
    ...state,
    missions: nextMissions,
    rerollUsed: true,
  };
}

/**
 * Deterministically picks 3 weekly missions for a given weekKey from eligible templates.
 */
export function generateWeeklyMissions(
  weekKey: string,
  ctx?: MissionEligibilityContext
): WeeklyMissionsState {
  const eligibleSet = new Set(getEligibleWeeklyMetrics(ctx));
  const eligiblePool = WEEKLY_MISSION_POOL.filter((tpl) => eligibleSet.has(tpl.metric));
  const ordered = shuffleDeterministic(eligiblePool, fnv1a(weekKey));
  const chosen = ordered.slice(0, 3);

  return {
    weekKey,
    missions: chosen.map((tpl, i) => ({
      id: `${weekKey}-w${i}-${tpl.metric}`,
      scope: 'weekly',
      metric: tpl.metric,
      target: tpl.target,
      progress: 0,
      rewardCoins: tpl.rewardCoins,
      rewardBooster: tpl.rewardBooster,
      claimed: false,
      ...(tpl.metric === 'worlds_played' ? { seenWorldIds: [] } : {}),
    })),
  };
}

export function ensureWeeklyMissions(
  state: WeeklyMissionsState | null,
  weekKey: string,
  ctx?: MissionEligibilityContext
): WeeklyMissionsState {
  if (state && state.weekKey === weekKey && state.missions.length === 3) {
    return state;
  }
  return generateWeeklyMissions(weekKey, ctx);
}

/**
 * Applies a #11 PuzzleCompletedEvent to a list of daily or weekly missions.
 * Practice mode events never advance missions.
 */
export function applyMissionEvent(
  missions: Mission[],
  event: PuzzleCompletedEvent
): Mission[] {
  if (event.mode === 'practice') {
    return missions;
  }

  return missions.map((m) => {
    if (m.claimed || m.progress >= m.target) return m;

    if (m.metric === 'worlds_played') {
      if (event.worldId === null) return m;
      const seen = new Set(m.seenWorldIds ?? []);
      if (seen.has(event.worldId)) return m;
      seen.add(event.worldId);
      const nextSeen = Array.from(seen).sort((a, b) => a - b);
      return {
        ...m,
        seenWorldIds: nextSeen,
        progress: Math.min(m.target, nextSeen.length),
      };
    }

    let delta = 0;
    switch (m.metric) {
      case 'levels_completed':
        delta = 1;
        break;
      case 'place_cats':
        delta = Math.max(0, event.catsFound);
        break;
      case 'no_hint_level':
        delta = event.hintsUsed === 0 ? 1 : 0;
        break;
      case 'earn_stars':
        delta = Math.max(0, event.stars);
        break;
      case 'fast_solve':
        delta = event.elapsedSec < 180 ? 1 : 0;
        break;
      case 'no_mistake_level':
        delta = event.mistakesCount === 0 ? 1 : 0;
        break;
      case 'improve_score':
        delta = event.improvedBest ? 1 : 0;
        break;
      case 'three_star_wins':
        delta = event.stars === 3 ? 1 : 0;
        break;
      case 'daily_solved':
        delta = event.source === 'daily' && event.firstCompletion ? 1 : 0;
        break;
    }

    if (delta === 0) return m;
    return {
      ...m,
      progress: Math.min(m.target, m.progress + delta),
    };
  });
}

// ─── Permanent Milestone Ladder ──────────────────────────────────────────────

export type MilestoneId =
  | 'world1'
  | 'stars15'
  | 'daily5'
  | 'world2'
  | 'threeStar10'
  | 'world3'
  | 'golden3'
  | 'world4'
  | 'allThreeStars';

export interface MilestoneDefinition {
  readonly id: MilestoneId;
  readonly worldId?: number;
  readonly rewardCoins: number;
  readonly rewardBooster?: BoosterId;
}

export const MILESTONE_LADDER: readonly MilestoneDefinition[] = [
  { id: 'world1', worldId: 1, rewardCoins: 100 },
  { id: 'stars15', rewardCoins: 120 },
  { id: 'daily5', rewardCoins: 150, rewardBooster: 'superHint' },
  { id: 'world2', worldId: 2, rewardCoins: 150 },
  { id: 'threeStar10', rewardCoins: 200, rewardBooster: 'revealCat' },
  { id: 'world3', worldId: 3, rewardCoins: 200 },
  { id: 'golden3', rewardCoins: 250, rewardBooster: 'revealRegion' },
  { id: 'world4', worldId: 4, rewardCoins: 300 },
  { id: 'allThreeStars', rewardCoins: 500 },
] as const;

export interface MilestoneProgressState {
  levelProgress: Record<number, LevelProgress>;
  progressStats: ProgressStats;
}

export function computeTotalStars(levelProgress: Record<number, LevelProgress>): number {
  return Object.values(levelProgress).reduce((sum, p) => sum + (p.stars ?? 0), 0);
}

function countCompletedInWorld(
  worldId: number,
  levelProgress: Record<number, LevelProgress>
): { current: number; target: number } {
  const world = WORLDS.find((w) => w.id === worldId);
  if (!world) return { current: 0, target: 0 };
  const target = world.levelEnd - world.levelStart + 1;
  let current = 0;
  for (let id = world.levelStart; id <= world.levelEnd; id++) {
    if (levelProgress[id]?.completed) current++;
  }
  return { current, target };
}

function countThreeStarLevels(levelProgress: Record<number, LevelProgress>): number {
  return Object.values(levelProgress).filter((p) => p.completed && p.stars >= 3).length;
}

export function getMilestoneProgress(
  index: number,
  state: MilestoneProgressState
): { current: number; target: number } {
  const def = MILESTONE_LADDER[index];
  if (!def) return { current: 0, target: 0 };

  switch (def.id) {
    case 'world1':
    case 'world2':
    case 'world3':
    case 'world4':
      return countCompletedInWorld(def.worldId!, state.levelProgress);
    case 'stars15':
      return {
        current: Math.min(15, computeTotalStars(state.levelProgress)),
        target: 15,
      };
    case 'daily5':
      return {
        current: Math.min(5, state.progressStats.lifetime.dailySolved),
        target: 5,
      };
    case 'threeStar10':
      return {
        current: Math.min(10, countThreeStarLevels(state.levelProgress)),
        target: 10,
      };
    case 'golden3':
      return {
        current: Math.min(3, state.progressStats.lifetime.goldenSolved),
        target: 3,
      };
    case 'allThreeStars': {
      const totalLevels = WORLDS.reduce(
        (sum, w) => sum + (w.levelEnd - w.levelStart + 1),
        0
      );
      return {
        current: Math.min(totalLevels, countThreeStarLevels(state.levelProgress)),
        target: totalLevels,
      };
    }
  }
}
