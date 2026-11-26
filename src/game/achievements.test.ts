import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  AchievementEvalContext,
  backfillAchievements,
  formatAchievementUnlockToast,
  getAchievementCopy,
  getNewlyUnlockedAchievements,
} from './achievements';
import { LevelProgress, LogicalTechnique } from './gameTypes';
import { EMPTY_PROGRESS_STATS, ProgressStats } from './progressStats';
import { buildUnlockContext } from './unlockContext';
import { WORLDS } from './worlds';
import i18n from '../i18n';

function makeLevelProg(
  levelIds: number[],
  stars = 2
): Record<number, LevelProgress> {
  const lp: Record<number, LevelProgress> = {};
  for (const id of levelIds) {
    lp[id] = {
      levelId: id,
      completed: true,
      bestTimeSec: 40,
      stars,
      bestHintsUsed: 0,
      bestMistakes: 0,
      attempts: 1,
      lastResult: null,
    };
  }
  return lp;
}

function makeStats(
  lifetimeOverrides: Partial<ProgressStats['lifetime']> = {}
): ProgressStats {
  return {
    ...EMPTY_PROGRESS_STATS,
    lifetime: {
      ...EMPTY_PROGRESS_STATS.lifetime,
      ...lifetimeOverrides,
    },
  };
}

function makeCtx(overrides: Partial<AchievementEvalContext> = {}): AchievementEvalContext {
  return {
    levelProgress: {},
    unlockedLevelId: 1,
    noHintSolves: 0,
    zeroMistakeSolves: 0,
    specialLevelsCompleted: 0,
    unlockedCatsCount: 1,
    completedDailyCount: 0,
    totalStars: 0,
    progressStats: EMPTY_PROGRESS_STATS,
    ...overrides,
  };
}

describe('Achievements v2 (#17)', () => {
  it('preserves all 8 legacy achievement ids and targets alongside 20 new ones (28 total)', () => {
    expect(ACHIEVEMENTS).toHaveLength(28);

    const legacyTargets: Record<string, number> = {
      first_purr: 1,
      perfect_paws: 1,
      sharp_whiskers: 5,
      treasure_hunter: 1,
      world_traveler: 1,
      star_gazer: 15,
      cat_collector: 5,
      puzzle_master: 30,
    };

    for (const [id, target] of Object.entries(legacyTargets)) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      expect(def).toBeDefined();
      expect(def!.target).toBe(target);
    }
  });

  it('every single achievement is reachable at target and locked just below target', () => {
    const cases: Record<
      string,
      { below: AchievementEvalContext; met: AchievementEvalContext }
    > = {
      first_purr: {
        below: makeCtx(),
        met: makeCtx({ levelProgress: makeLevelProg([1]) }),
      },
      perfect_paws: {
        below: makeCtx({ zeroMistakeSolves: 0 }),
        met: makeCtx({ zeroMistakeSolves: 1 }),
      },
      sharp_whiskers: {
        below: makeCtx({ noHintSolves: 4 }),
        met: makeCtx({ noHintSolves: 5 }),
      },
      treasure_hunter: {
        below: makeCtx({ specialLevelsCompleted: 0 }),
        met: makeCtx({ specialLevelsCompleted: 1 }),
      },
      world_traveler: {
        below: makeCtx({ unlockedLevelId: 6 }),
        met: makeCtx({ unlockedLevelId: 7 }),
      },
      star_gazer: {
        below: makeCtx({ totalStars: 14 }),
        met: makeCtx({ totalStars: 15 }),
      },
      cat_collector: {
        below: makeCtx({ unlockedCatsCount: 4 }),
        met: makeCtx({ unlockedCatsCount: 5 }),
      },
      puzzle_master: {
        below: makeCtx({ totalStars: 29 }),
        met: makeCtx({ totalStars: 30 }),
      },
      sharp_whiskers_2: {
        below: makeCtx({ progressStats: makeStats({ uniqueNoHintPuzzles: 14 }) }),
        met: makeCtx({ progressStats: makeStats({ uniqueNoHintPuzzles: 15 }) }),
      },
      sharp_whiskers_3: {
        below: makeCtx({ progressStats: makeStats({ uniqueNoHintPuzzles: 39 }) }),
        met: makeCtx({ progressStats: makeStats({ uniqueNoHintPuzzles: 40 }) }),
      },
      perfect_paws_2: {
        below: makeCtx({ progressStats: makeStats({ uniqueNoMistakePuzzles: 9 }) }),
        met: makeCtx({ progressStats: makeStats({ uniqueNoMistakePuzzles: 10 }) }),
      },
      perfect_paws_3: {
        below: makeCtx({ progressStats: makeStats({ uniqueNoMistakePuzzles: 29 }) }),
        met: makeCtx({ progressStats: makeStats({ uniqueNoMistakePuzzles: 30 }) }),
      },
      daily_devotee_1: {
        below: makeCtx({ progressStats: makeStats({ dailySolved: 6 }) }),
        met: makeCtx({ progressStats: makeStats({ dailySolved: 7 }) }),
      },
      daily_devotee_2: {
        below: makeCtx({ progressStats: makeStats({ dailySolved: 29 }) }),
        met: makeCtx({ progressStats: makeStats({ dailySolved: 30 }) }),
      },
      daily_devotee_3: {
        below: makeCtx({ progressStats: makeStats({ dailySolved: 99 }) }),
        met: makeCtx({ progressStats: makeStats({ dailySolved: 100 }) }),
      },
      golden_hunter: {
        below: makeCtx({ progressStats: makeStats({ goldenSolved: 2 }) }),
        met: makeCtx({ progressStats: makeStats({ goldenSolved: 3 }) }),
      },
      tech_rank_1: {
        below: makeCtx({
          progressStats: makeStats({ techniquesSeen: ['naked_region_single'] }),
        }),
        met: makeCtx({
          progressStats: makeStats({ techniquesSeen: ['region_line_intersection'] }),
        }),
      },
      tech_rank_2: {
        below: makeCtx({
          progressStats: makeStats({ techniquesSeen: ['region_line_intersection'] }),
        }),
        met: makeCtx({
          progressStats: makeStats({ techniquesSeen: ['region_adjacency_exclusion'] }),
        }),
      },
      tech_rank_3: {
        below: makeCtx({
          progressStats: makeStats({ techniquesSeen: ['line_adjacency_exclusion'] }),
        }),
        met: makeCtx({
          progressStats: makeStats({ techniquesSeen: ['naked_pair_regions'] }),
        }),
      },
      tech_rank_4: {
        below: makeCtx({
          progressStats: makeStats({ techniquesSeen: ['line_group_confinement'] }),
        }),
        met: makeCtx({
          progressStats: makeStats({ techniquesSeen: ['contradiction_chain'] }),
        }),
      },
    };

    for (const w of WORLDS) {
      const allIds: number[] = [];
      for (let id = w.levelStart; id <= w.levelEnd; id++) allIds.push(id);
      const almostIds = allIds.slice(0, -1);

      cases[`world_${w.id}_clear`] = {
        below: makeCtx({ levelProgress: makeLevelProg(almostIds, 1) }),
        met: makeCtx({ levelProgress: makeLevelProg(allIds, 1) }),
      };
      cases[`world_${w.id}_stars`] = {
        below: makeCtx({
          levelProgress: {
            ...makeLevelProg(almostIds, 3),
            ...makeLevelProg([allIds[allIds.length - 1]!], 2),
          },
        }),
        met: makeCtx({ levelProgress: makeLevelProg(allIds, 3) }),
      };
    }

    // Ensure every achievement in ACHIEVEMENTS is covered
    expect(Object.keys(cases).sort()).toEqual(ACHIEVEMENTS.map((a) => a.id).sort());

    for (const ach of ACHIEVEMENTS) {
      const c = cases[ach.id]!;
      expect(
        getNewlyUnlockedAchievements(c.below, []).some((a) => a.id === ach.id),
        `${ach.id} should NOT unlock below target`
      ).toBe(false);
      expect(
        getNewlyUnlockedAchievements(c.met, []).some((a) => a.id === ach.id),
        `${ach.id} SHOULD unlock at target`
      ).toBe(true);
    }
  });

  it('unlocks tech_rank_N from any technique of matching rank', () => {
    const rankSamples: [string, LogicalTechnique][] = [
      ['tech_rank_1', 'line_region_intersection'],
      ['tech_rank_2', 'line_adjacency_exclusion'],
      ['tech_rank_3', 'line_group_confinement'],
      ['tech_rank_4', 'contradiction_chain'],
    ];
    for (const [id, tech] of rankSamples) {
      const unlocked = getNewlyUnlockedAchievements(
        makeCtx({ progressStats: makeStats({ techniquesSeen: [tech] }) }),
        []
      );
      expect(unlocked.some((a) => a.id === id)).toBe(true);
    }
  });

  it('back-fills world_1_clear as unlocked (not auto-claimed) for a save with 6 completed World 1 levels', () => {
    const levelProgress = makeLevelProg([1, 2, 3, 4, 5, 6], 2);
    const ctx = buildUnlockContext({
      levelProgress,
      unlockedLevelId: 7,
      progressStats: EMPTY_PROGRESS_STATS,
      unlockedAchievementIds: ['first_purr'],
      unlockedCatIds: ['mochi'],
    });
    const res = backfillAchievements(ctx, ['first_purr']);
    expect(res.nextUnlockedIds).toContain('world_1_clear');
    expect(res.addedCount).toBeGreaterThan(0);
    // Running backfill a second time adds 0 (idempotent)
    const second = backfillAchievements(ctx, res.nextUnlockedIds);
    expect(second.addedCount).toBe(0);
  });

  it('formats singular vs plural victory achievement toast and resolves all 28 localized titles in EN & FR', async () => {
    const first = ACHIEVEMENTS[0]!;
    const second = ACHIEVEMENTS[1]!;

    for (const lang of ['en', 'fr']) {
      await i18n.changeLanguage(lang);
      const t = i18n.t.bind(i18n);

      expect(formatAchievementUnlockToast([], t)).toBeNull();

      const single = formatAchievementUnlockToast([first], t)!;
      expect(single).toContain(getAchievementCopy(first, t).title);

      const many = formatAchievementUnlockToast([first, second], t)!;
      expect(many).toContain('2');

      for (const ach of ACHIEVEMENTS) {
        const { title, desc } = getAchievementCopy(ach, t);
        expect(title.length).toBeGreaterThan(0);
        expect(desc.length).toBeGreaterThan(0);
        expect(title).not.toContain('achievements.');
        expect(desc).not.toContain('achievements.');
      }
    }

    await i18n.changeLanguage('en');
  });
});
