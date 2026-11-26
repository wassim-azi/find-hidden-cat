import { describe, expect, it } from 'vitest';
import {
  applyMissionEvent,
  ensureTodaysMissions,
  generateDailyMissions,
  generateWeeklyMissions,
  getMilestoneProgress,
  MILESTONE_LADDER,
  Mission,
  MissionMetric,
  rerollDailyMission,
} from './missions';
import { EMPTY_PROGRESS_STATS, PuzzleCompletedEvent } from './progressStats';
import { LevelProgress } from './gameTypes';
import { useGameStore } from '../store/gameStore';

function makeEvent(overrides: Partial<PuzzleCompletedEvent> = {}): PuzzleCompletedEvent {
  return {
    type: 'puzzle_completed',
    id: 'L1:1000',
    at: 1000,
    dateKey: '2026-11-25',
    weekKey: '2026-W48',
    source: 'campaign',
    puzzleKey: 'L1',
    levelId: 1,
    worldId: 1,
    mode: 'classic',
    firstCompletion: true,
    stars: 2,
    previousBestStars: 0,
    hintsUsed: 1,
    mistakesCount: 1,
    elapsedSec: 200,
    previousBestTimeSec: null,
    firstNoHint: false,
    firstNoMistake: false,
    improvedBest: false,
    catsFound: 4,
    techniques: [],
    tier: 'easy',
    parTimeSec: 60,
    ...overrides,
  };
}

function makeMission(
  metric: MissionMetric,
  target = 10,
  scope: 'daily' | 'weekly' = 'daily'
): Mission {
  return {
    id: `m-${metric}`,
    scope,
    metric,
    target,
    progress: 0,
    rewardCoins: 30,
    claimed: false,
    ...(metric === 'worlds_played' ? { seenWorldIds: [] } : {}),
  };
}

describe('Missions v2 (#16)', () => {
  it('advances every mission metric accurately on Classic PuzzleCompletedEvent and ignores Practice', () => {
    // 1. Practice mode changes nothing
    const allMissions: Mission[] = [
      makeMission('levels_completed', 5),
      makeMission('place_cats', 10),
      makeMission('no_hint_level', 5),
      makeMission('earn_stars', 10),
      makeMission('fast_solve', 5),
      makeMission('no_mistake_level', 5),
      makeMission('improve_score', 5),
      makeMission('three_star_wins', 5, 'weekly'),
      makeMission('daily_solved', 5, 'weekly'),
      makeMission('worlds_played', 3, 'weekly'),
    ];
    const afterPractice = applyMissionEvent(
      allMissions,
      makeEvent({
        mode: 'practice',
        stars: 3,
        hintsUsed: 0,
        mistakesCount: 0,
        elapsedSec: 30,
        improvedBest: true,
        source: 'daily',
        firstCompletion: true,
        catsFound: 6,
        worldId: 2,
      })
    );
    expect(afterPractice.every((m) => m.progress === 0)).toBe(true);

    // 2. levels_completed: +1 any source
    expect(
      applyMissionEvent([makeMission('levels_completed', 3)], makeEvent({ source: 'golden' }))[0]!
        .progress
    ).toBe(1);

    // 3. place_cats: +catsFound, capped at target, 0 does nothing (#5)
    let catFinder = [makeMission('place_cats', 8)];
    catFinder = applyMissionEvent(catFinder, makeEvent({ catsFound: 0 }));
    expect(catFinder[0]!.progress).toBe(0);
    catFinder = applyMissionEvent(catFinder, makeEvent({ catsFound: 6 }));
    expect(catFinder[0]!.progress).toBe(6);
    catFinder = applyMissionEvent(catFinder, makeEvent({ catsFound: 6 }));
    expect(catFinder[0]!.progress).toBe(8);

    // 4. no_hint_level: +1 only if hintsUsed === 0
    expect(
      applyMissionEvent([makeMission('no_hint_level', 3)], makeEvent({ hintsUsed: 1 }))[0]!.progress
    ).toBe(0);
    expect(
      applyMissionEvent([makeMission('no_hint_level', 3)], makeEvent({ hintsUsed: 0 }))[0]!.progress
    ).toBe(1);

    // 5. earn_stars: +stars
    expect(
      applyMissionEvent([makeMission('earn_stars', 5)], makeEvent({ stars: 3 }))[0]!.progress
    ).toBe(3);

    // 6. fast_solve: +1 if elapsedSec < 180
    expect(
      applyMissionEvent([makeMission('fast_solve', 3)], makeEvent({ elapsedSec: 180 }))[0]!.progress
    ).toBe(0);
    expect(
      applyMissionEvent([makeMission('fast_solve', 3)], makeEvent({ elapsedSec: 179 }))[0]!.progress
    ).toBe(1);

    // 7. no_mistake_level: +1 if mistakesCount === 0
    expect(
      applyMissionEvent([makeMission('no_mistake_level', 3)], makeEvent({ mistakesCount: 1 }))[0]!
        .progress
    ).toBe(0);
    expect(
      applyMissionEvent([makeMission('no_mistake_level', 3)], makeEvent({ mistakesCount: 0 }))[0]!
        .progress
    ).toBe(1);

    // 8. improve_score: +1 if improvedBest
    expect(
      applyMissionEvent([makeMission('improve_score', 3)], makeEvent({ improvedBest: false }))[0]!
        .progress
    ).toBe(0);
    expect(
      applyMissionEvent([makeMission('improve_score', 3)], makeEvent({ improvedBest: true }))[0]!
        .progress
    ).toBe(1);

    // 9. three_star_wins: +1 if stars === 3
    expect(
      applyMissionEvent([makeMission('three_star_wins', 6, 'weekly')], makeEvent({ stars: 2 }))[0]!
        .progress
    ).toBe(0);
    expect(
      applyMissionEvent([makeMission('three_star_wins', 6, 'weekly')], makeEvent({ stars: 3 }))[0]!
        .progress
    ).toBe(1);

    // 10. daily_solved: +1 if source === 'daily' && firstCompletion
    expect(
      applyMissionEvent(
        [makeMission('daily_solved', 4, 'weekly')],
        makeEvent({ source: 'daily', firstCompletion: false })
      )[0]!.progress
    ).toBe(0);
    expect(
      applyMissionEvent(
        [makeMission('daily_solved', 4, 'weekly')],
        makeEvent({ source: 'daily', firstCompletion: true })
      )[0]!.progress
    ).toBe(1);

    // 11. worlds_played: distinct non-null worldIds
    let worlds = [makeMission('worlds_played', 2, 'weekly')];
    worlds = applyMissionEvent(worlds, makeEvent({ worldId: null }));
    expect(worlds[0]!.progress).toBe(0);
    worlds = applyMissionEvent(worlds, makeEvent({ worldId: 1 }));
    worlds = applyMissionEvent(worlds, makeEvent({ worldId: 1 }));
    expect(worlds[0]!.progress).toBe(1);
    expect(worlds[0]!.seenWorldIds).toEqual([1]);
    worlds = applyMissionEvent(worlds, makeEvent({ worldId: 2 }));
    expect(worlds[0]!.progress).toBe(2);
    expect(worlds[0]!.seenWorldIds).toEqual([1, 2]);
  });

  it('generates deterministic daily missions respecting eligibility and no-repeat from yesterday', () => {
    const a = generateDailyMissions('2026-11-25');
    const b = generateDailyMissions('2026-11-25');
    expect(a).toEqual(b);
    expect(a.missions).toHaveLength(3);

    // Brand-new player (0 completed levels) cannot get improve_score
    for (let d = 1; d <= 20; d++) {
      const dateKey = `2026-11-${String(d).padStart(2, '0')}`;
      const daily = ensureTodaysMissions(null, dateKey, {
        completedLevelCount: 0,
        unlockedLevelId: 1,
      });
      expect(daily.missions.some((m) => m.metric === 'improve_score')).toBe(false);
    }

    // No metric repeats from yesterday when rolling over consecutive days
    const yesterday = ensureTodaysMissions(null, '2026-11-24', {
      completedLevelCount: 5,
      unlockedLevelId: 6,
    });
    const today = ensureTodaysMissions(yesterday, '2026-11-25', {
      completedLevelCount: 5,
      unlockedLevelId: 6,
    });
    const yMetrics = new Set(yesterday.missions.map((m) => m.metric));
    for (const m of today.missions) {
      expect(yMetrics.has(m.metric)).toBe(false);
    }
  });

  it('generates deterministic weekly missions and excludes worlds_played when unlockedLevelId < 7', () => {
    const w1 = generateWeeklyMissions('2026-W48', {
      completedLevelCount: 10,
      unlockedLevelId: 12,
    });
    const w2 = generateWeeklyMissions('2026-W48', {
      completedLevelCount: 10,
      unlockedLevelId: 12,
    });
    expect(w1).toEqual(w2);
    expect(w1.missions).toHaveLength(3);
    expect(w1.missions.every((m) => m.scope === 'weekly')).toBe(true);

    // Check across many week keys that worlds_played never appears when unlockedLevelId < 7
    for (let wk = 1; wk <= 30; wk++) {
      const weekly = generateWeeklyMissions(`2026-W${String(wk).padStart(2, '0')}`, {
        completedLevelCount: 2,
        unlockedLevelId: 3,
      });
      expect(weekly.missions.some((m) => m.metric === 'worlds_played')).toBe(false);
      expect(weekly.missions.some((m) => m.metric === 'improve_score')).toBe(false);
    }
  });

  it('supports once-per-day daily mission reroll with a distinct metric', () => {
    const initial = generateDailyMissions('2026-11-25');
    const originalMetrics = new Set(initial.missions.map((m) => m.metric));
    const targetId = initial.missions[0]!.id;

    const rerolled = rerollDailyMission(initial, targetId, {
      completedLevelCount: 5,
      unlockedLevelId: 6,
    });
    expect(rerolled).not.toBeNull();
    expect(rerolled!.rerollUsed).toBe(true);
    expect(originalMetrics.has(rerolled!.missions[0]!.metric)).toBe(false);
    expect(rerolled!.missions[0]!.progress).toBe(0);

    // Second reroll the same day is blocked
    const second = rerollDailyMission(rerolled!, rerolled!.missions[1]!.id, {
      completedLevelCount: 5,
      unlockedLevelId: 6,
    });
    expect(second).toBeNull();
  });

  it('computes milestone progress from state and claims milestones strictly sequentially', () => {
    const makeProg = (count: number, stars = 3): Record<number, LevelProgress> => {
      const lp: Record<number, LevelProgress> = {};
      for (let id = 1; id <= count; id++) {
        lp[id] = {
          levelId: id,
          completed: true,
          bestTimeSec: 30,
          stars,
          bestHintsUsed: 0,
          bestMistakes: 0,
          attempts: 1,
          lastResult: null,
        };
      }
      return lp;
    };

    const stats = {
      ...EMPTY_PROGRESS_STATS,
      lifetime: {
        ...EMPTY_PROGRESS_STATS.lifetime,
        dailySolved: 5,
        goldenSolved: 3,
      },
    };

    // Crafted states for milestone ladder
    expect(getMilestoneProgress(0, { levelProgress: makeProg(4), progressStats: stats })).toEqual({
      current: 4,
      target: 6,
    });
    expect(getMilestoneProgress(0, { levelProgress: makeProg(6), progressStats: stats })).toEqual({
      current: 6,
      target: 6,
    });
    expect(
      getMilestoneProgress(1, { levelProgress: makeProg(6, 3), progressStats: stats })
    ).toEqual({ current: 15, target: 15 });
    expect(getMilestoneProgress(2, { levelProgress: {}, progressStats: stats })).toEqual({
      current: 5,
      target: 5,
    });

    // Store claimMilestone: blocked when incomplete, sequential when complete
    useGameStore.getState().resetAllProgress();
    expect(useGameStore.getState().claimMilestone()).toBe(false);

    useGameStore.setState({
      levelProgress: makeProg(6, 3),
      progressStats: stats,
      milestoneIndex: 0,
    });
    const coins0 = useGameStore.getState().fishCoins;
    expect(useGameStore.getState().claimMilestone()).toBe(true);
    expect(useGameStore.getState().milestoneIndex).toBe(1);
    expect(useGameStore.getState().fishCoins).toBe(coins0 + MILESTONE_LADDER[0]!.rewardCoins);

    // Next milestone (stars15 = 18 stars >= 15) is immediately claimable sequentially
    expect(useGameStore.getState().claimMilestone()).toBe(true);
    expect(useGameStore.getState().milestoneIndex).toBe(2);
    expect(useGameStore.getState().fishCoins).toBe(
      coins0 + MILESTONE_LADDER[0]!.rewardCoins + MILESTONE_LADDER[1]!.rewardCoins
    );
  });
});
