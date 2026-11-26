import type { GameMode, LevelProgress, LogicalTechnique } from './gameTypes';
import { TECHNIQUE_RANK } from './logicalSolver';
import { classify, SkillProfile } from './skillProfile';
import { daysBetween } from '../services/reminderPlanner';

/**
 * Adaptive, dismissible suggestions (#24). Pure: the campaign's handcrafted levels and their
 * order never change, nothing is hidden, and the player always chooses.
 */
export type Recommendation =
  | { kind: 'practice_mode' }
  | { kind: 'technique_tip'; technique: LogicalTechnique }
  | { kind: 'relaxed_daily' }
  | { kind: 'golden_trial' }
  | { kind: 'no_hint_replay'; levelId: number }
  | { kind: 'three_star_replay'; levelId: number };

export type RecommendationKind = Recommendation['kind'];

export const RECOMMENDATION_KINDS: readonly RecommendationKind[] = [
  'practice_mode',
  'technique_tip',
  'relaxed_daily',
  'golden_trial',
  'no_hint_replay',
  'three_star_replay',
];

/** A dismissed kind stays hidden for this many days (the day of dismissal included). */
export const RECOMMENDATION_DISMISS_DAYS = 3;

export interface RecommendationInput {
  profile: SkillProfile;
  levelProgress: Record<number, LevelProgress>;
  /** settings.gameMode */
  preferredMode: GameMode;
  goldenSolvedThisWeek: boolean;
  /** kind → dateKey it was dismissed */
  dismissed: Record<string, string>;
  todayKey: string;
}

export function isRecommendationDismissed(
  kind: RecommendationKind,
  dismissed: Record<string, string>,
  todayKey: string
): boolean {
  const at = dismissed[kind];
  if (!at) return false;
  const days = daysBetween(at, todayKey);
  return Number.isFinite(days) && days >= 0 && days < RECOMMENDATION_DISMISS_DAYS;
}

/** The technique with the most hint requests (≥ 3) among ranks 1–4, ties to the harder one. */
function pickTipTechnique(profile: SkillProfile): LogicalTechnique | null {
  let best: { technique: LogicalTechnique; count: number } | null = null;
  for (const [technique, count] of Object.entries(profile.hintTechniqueCounts) as [
    LogicalTechnique,
    number,
  ][]) {
    const rank = TECHNIQUE_RANK[technique];
    if (rank < 1 || rank > 4 || count < 3) continue;
    if (
      !best ||
      count > best.count ||
      (count === best.count && rank > TECHNIQUE_RANK[best.technique]) ||
      (count === best.count && rank === TECHNIQUE_RANK[best.technique] && technique < best.technique)
    ) {
      best = { technique, count };
    }
  }
  return best?.technique ?? null;
}

function lowestCompletedLevel(
  levelProgress: Record<number, LevelProgress>,
  predicate: (p: LevelProgress) => boolean
): number | null {
  const ids = Object.values(levelProgress)
    .filter((p) => p.completed && predicate(p))
    .map((p) => p.levelId)
    .sort((a, b) => a - b);
  return ids[0] ?? null;
}

/** First matching, non-dismissed rule wins. */
export function getRecommendation(input: RecommendationInput): Recommendation | null {
  const level = classify(input.profile);
  const candidates: Array<() => Recommendation | null> = [
    () => (level === 'struggling' && input.preferredMode === 'classic' ? { kind: 'practice_mode' } : null),
    () => {
      if (level !== 'struggling') return null;
      const technique = pickTipTechnique(input.profile);
      return technique ? { kind: 'technique_tip', technique } : null;
    },
    () => (level === 'struggling' ? { kind: 'relaxed_daily' } : null),
    () => (level === 'cruising' && !input.goldenSolvedThisWeek ? { kind: 'golden_trial' } : null),
    () => {
      if (level !== 'cruising') return null;
      const levelId = lowestCompletedLevel(
        input.levelProgress,
        (p) => typeof p.bestHintsUsed === 'number' && p.bestHintsUsed > 0
      );
      return levelId !== null ? { kind: 'no_hint_replay', levelId } : null;
    },
    () => {
      if (level !== 'cruising' && level !== 'steady') return null;
      const levelId = lowestCompletedLevel(input.levelProgress, (p) => p.stars < 3);
      return levelId !== null ? { kind: 'three_star_replay', levelId } : null;
    },
  ];

  for (const candidate of candidates) {
    const rec = candidate();
    if (rec && !isRecommendationDismissed(rec.kind, input.dismissed, input.todayKey)) {
      return rec;
    }
  }
  return null;
}
