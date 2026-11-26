import { BoosterId } from './economy';
import { fnv1a } from './hash';

export type MissionMetric =
  | 'levels_completed'
  | 'no_hint_level'
  | 'earn_stars'
  | 'fast_solve'
  | 'place_cats'
  | 'no_mistake_level'
  | 'improve_score';

export interface DailyMission {
  id: string;
  metric: MissionMetric;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardBooster?: BoosterId;
  claimed: boolean;
}

export interface DailyMissionsState {
  dateKey: string;
  missions: DailyMission[];
}

interface MissionTemplate {
  metric: MissionMetric;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
  rewardBooster?: BoosterId;
}

const MISSION_POOL: readonly MissionTemplate[] = [
  {
    metric: 'levels_completed',
    title: 'Cozy Explorer',
    description: 'Complete 2 puzzle levels',
    target: 2,
    rewardCoins: 30,
  },
  {
    metric: 'place_cats',
    title: 'Cat Finder',
    description: 'Find 8 cats by solving puzzles',
    target: 8,
    rewardCoins: 20,
  },
  {
    metric: 'no_hint_level',
    title: 'Sharp Instincts',
    description: 'Finish 1 level without using hints',
    target: 1,
    rewardCoins: 35,
    rewardBooster: 'hint',
  },
  {
    metric: 'earn_stars',
    title: 'Star Collector',
    description: 'Earn 3 stars across any levels',
    target: 3,
    rewardCoins: 30,
  },
  {
    metric: 'fast_solve',
    title: 'Quick Paws',
    description: 'Finish a puzzle in under 3 minutes',
    target: 1,
    rewardCoins: 25,
  },
  {
    metric: 'no_mistake_level',
    title: 'Purr-fect Accuracy',
    description: 'Complete a level with zero mistakes',
    target: 1,
    rewardCoins: 40,
    rewardBooster: 'mistakeShield',
  },
  {
    metric: 'improve_score',
    title: 'Beat Your Best',
    description: 'Replay a level or set a new personal best',
    target: 1,
    rewardCoins: 25,
  },
];

/**
 * Deterministically picks 3 varied daily missions for a given local dateKey.
 */
export function generateDailyMissions(dateKey: string): DailyMissionsState {
  const seed = fnv1a(dateKey);
  const pool = [...MISSION_POOL];
  const chosen: MissionTemplate[] = [];

  // Always include 1 accessible starter mission from first 2, plus 2 varied challenges
  const firstIdx = seed % 2;
  chosen.push(pool.splice(firstIdx, 1)[0]!);

  let s = seed + 37;
  while (chosen.length < 3 && pool.length > 0) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const idx = s % pool.length;
    chosen.push(pool.splice(idx, 1)[0]!);
  }

  return {
    dateKey,
    missions: chosen.map((tpl, i) => ({
      id: `${dateKey}-m${i + 1}-${tpl.metric}`,
      metric: tpl.metric,
      title: tpl.title,
      description: tpl.description,
      target: tpl.target,
      progress: 0,
      rewardCoins: tpl.rewardCoins,
      rewardBooster: tpl.rewardBooster,
      claimed: false,
    })),
  };
}

export function ensureTodaysMissions(
  state: DailyMissionsState | null,
  todayKey: string
): DailyMissionsState {
  if (state && state.dateKey === todayKey && state.missions.length === 3) {
    return state;
  }
  return generateDailyMissions(todayKey);
}

export interface GameplayMissionEvent {
  type: 'level_completed';
  starsEarned?: number;
  hintsUsed?: number;
  mistakesCount?: number;
  elapsedSec?: number;
  improvedBest?: boolean;
  catsFound?: number;
}

export function applyMissionEvent(
  state: DailyMissionsState,
  event: GameplayMissionEvent
): DailyMissionsState {
  const nextMissions = state.missions.map((m) => {
    if (m.claimed || m.progress >= m.target) return m;
    let delta = 0;

    if (event.type === 'level_completed') {
      if (m.metric === 'levels_completed') delta = 1;
      if (m.metric === 'place_cats') delta = Math.max(0, event.catsFound ?? 0);
      if (m.metric === 'earn_stars') delta = event.starsEarned ?? 0;
      if (m.metric === 'no_hint_level' && (event.hintsUsed ?? 1) === 0) delta = 1;
      if (m.metric === 'no_mistake_level' && (event.mistakesCount ?? 1) === 0) delta = 1;
      if (m.metric === 'fast_solve' && (event.elapsedSec ?? 999) < 180) delta = 1;
      if (m.metric === 'improve_score' && event.improvedBest) delta = 1;
    }

    if (delta === 0) return m;
    return {
      ...m,
      progress: Math.min(m.target, m.progress + delta),
    };
  });

  return { ...state, missions: nextMissions };
}
