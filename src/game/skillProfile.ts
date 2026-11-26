import type { DifficultyTier, LogicalTechnique } from './gameTypes';
import type { GameEvent } from './progressStats';

/**
 * On-device skill profile (#23).
 *
 * A small model of how the player is doing, used ONLY for suggestions (#24) and the local
 * stats sheet (#30). It never changes puzzles or rewards and never leaves the device.
 */

/** Exponential moving averages per difficulty tier. */
export interface TierStats {
  samples: number;
  timeRatio: number;
  hints: number;
  mistakes: number;
  successRate: number;
}

export interface SkillProfile {
  version: 1;
  classic: Partial<Record<DifficultyTier, TierStats>>;
  /** Tracked, never used for classification. */
  practice: Partial<Record<DifficultyTier, TierStats>>;
  hintTechniqueCounts: Partial<Record<LogicalTechnique, number>>;
  /** Last 10 Classic outcomes. */
  recent: Array<{ at: number; success: 0 | 1 }>;
}

export type SkillLevel = 'unknown' | 'struggling' | 'steady' | 'cruising';

export const EMA_ALPHA = 0.3;
export const MAX_RECENT_OUTCOMES = 10;
export const MIN_CLASSIFY_SAMPLES = 3;

export const DIFFICULTY_TIERS: readonly DifficultyTier[] = [
  'beginner',
  'easy',
  'normal',
  'hard',
  'expert',
];

export const EMPTY_SKILL_PROFILE: SkillProfile = {
  version: 1,
  classic: {},
  practice: {},
  hintTechniqueCounts: {},
  recent: [],
};

function ema(old: number, x: number, isFirst: boolean): number {
  return isFirst ? x : old + EMA_ALPHA * (x - old);
}

const EMPTY_TIER: TierStats = { samples: 0, timeRatio: 0, hints: 0, mistakes: 0, successRate: 0 };

function pushRecent(
  recent: SkillProfile['recent'],
  at: number,
  success: 0 | 1
): SkillProfile['recent'] {
  return [...recent, { at, success }].slice(-MAX_RECENT_OUTCOMES);
}

/** Pure reducer: folds one gameplay event into the profile. */
export function applySkillEvent(p: SkillProfile, e: GameEvent): SkillProfile {
  if (e.type === 'puzzle_completed') {
    const bucketKey = e.mode === 'classic' ? 'classic' : 'practice';
    const prev = p[bucketKey][e.tier] ?? EMPTY_TIER;
    const isFirst = prev.samples === 0;
    const timeRatio = e.parTimeSec > 0 ? Math.max(0, e.elapsedSec) / e.parTimeSec : 0;
    const next: TierStats = {
      samples: prev.samples + 1,
      timeRatio: ema(prev.timeRatio, timeRatio, isFirst),
      hints: ema(prev.hints, Math.max(0, e.hintsUsed), isFirst),
      mistakes: ema(prev.mistakes, Math.max(0, e.mistakesCount), isFirst),
      successRate: ema(prev.successRate, 1, isFirst),
    };
    return {
      ...p,
      [bucketKey]: { ...p[bucketKey], [e.tier]: next },
      recent: bucketKey === 'classic' ? pushRecent(p.recent, e.at, 1) : p.recent,
    };
  }

  if (e.type === 'puzzle_failed' || e.type === 'puzzle_restarted') {
    const prev = p.classic[e.tier] ?? EMPTY_TIER;
    const next: TierStats = {
      ...prev,
      samples: prev.samples + 1,
      successRate: ema(prev.successRate, 0, prev.samples === 0),
    };
    return {
      ...p,
      classic: { ...p.classic, [e.tier]: next },
      recent: pushRecent(p.recent, e.at, 0),
    };
  }

  if (e.type === 'hint_used' && e.technique !== null) {
    return {
      ...p,
      hintTechniqueCounts: {
        ...p.hintTechniqueCounts,
        [e.technique]: (p.hintTechniqueCounts[e.technique] ?? 0) + 1,
      },
    };
  }

  return p;
}

interface AggregateStats {
  samples: number;
  timeRatio: number;
  hints: number;
  mistakes: number;
  successRate: number;
}

function aggregateClassic(p: SkillProfile, tier?: DifficultyTier): AggregateStats {
  if (tier) {
    const b = p.classic[tier];
    return b ? { ...b } : { ...EMPTY_TIER };
  }
  let samples = 0;
  let timeRatio = 0;
  let hints = 0;
  let mistakes = 0;
  let successRate = 0;
  for (const t of DIFFICULTY_TIERS) {
    const b = p.classic[t];
    if (!b || b.samples <= 0) continue;
    samples += b.samples;
    timeRatio += b.timeRatio * b.samples;
    hints += b.hints * b.samples;
    mistakes += b.mistakes * b.samples;
    successRate += b.successRate * b.samples;
  }
  if (samples === 0) return { ...EMPTY_TIER };
  const weighted: AggregateStats = {
    samples,
    timeRatio: timeRatio / samples,
    hints: hints / samples,
    mistakes: mistakes / samples,
    successRate: successRate / samples,
  };
  if (p.recent.length >= MIN_CLASSIFY_SAMPLES) {
    weighted.successRate = p.recent.reduce((sum, r) => sum + r.success, 0) / p.recent.length;
  }
  return weighted;
}

/** Classifies Classic play only; Practice buckets never influence the result. */
export function classify(p: SkillProfile, tier?: DifficultyTier): SkillLevel {
  const s = aggregateClassic(p, tier);
  if (s.samples < MIN_CLASSIFY_SAMPLES) return 'unknown';
  if (s.successRate < 0.6 || s.hints >= 1.5 || s.timeRatio >= 2.5) return 'struggling';
  if (s.successRate >= 0.9 && s.hints <= 0.25 && s.mistakes <= 0.5 && s.timeRatio <= 1.0) {
    return 'cruising';
  }
  return 'steady';
}
