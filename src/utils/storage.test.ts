import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const idbData = new Map<string, unknown>();
vi.mock('./idbStorage', () => ({
  STORE_GAME_STATE: 'game_state',
  idbGet: vi.fn(async (_store: string, key: string) => idbData.get(key) ?? null),
  idbPut: vi.fn(async () => true),
  idbDelete: vi.fn(async () => true),
}));

function installWindow(): Map<string, string> {
  const ls = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
      setItem: (k: string, v: string) => void ls.set(k, String(v)),
      removeItem: (k: string) => void ls.delete(k),
    },
    matchMedia: () => ({ matches: false }),
  });
  return ls;
}

describe('IndexedDB recovery of evicted or corrupted saves', () => {
  let ls: Map<string, string>;
  beforeEach(() => {
    idbData.clear();
    ls = installWindow();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const savedProgress = {
    schemaVersion: 2,
    currentLevelId: 7,
    unlockedLevelId: 7,
    levelProgress: { 1: { levelId: 1, completed: true, bestTimeSec: 40, stars: 3, bestHintsUsed: 0 } },
    fishCoins: 321,
  };

  it('restores from IndexedDB when LocalStorage was evicted', async () => {
    const { recoverPersistedStateFromIDB } = await import('./storage');
    idbData.set('current', savedProgress);
    const recovered = await recoverPersistedStateFromIDB();
    expect(recovered?.currentLevelId).toBe(7);
    expect(recovered?.fishCoins).toBe(321);
    expect(ls.get('meowdoku_state_v2')).toContain('"fishCoins":321');
  });

  it('restores from IndexedDB when the LocalStorage save is corrupted, keeping a backup', async () => {
    const { recoverPersistedStateFromIDB } = await import('./storage');
    ls.set('meowdoku_state_v2', '{"currentLevelId": 7, "fishCo');
    idbData.set('current', savedProgress);
    const recovered = await recoverPersistedStateFromIDB();
    expect(recovered?.unlockedLevelId).toBe(7);
    expect(ls.get('meowdoku_state_v2_corrupt_backup')).toBe('{"currentLevelId": 7, "fishCo');
  });

  it('leaves a healthy LocalStorage save untouched', async () => {
    const { recoverPersistedStateFromIDB, loadPersistedState } = await import('./storage');
    ls.set('meowdoku_state_v2', JSON.stringify({ ...savedProgress, fishCoins: 5 }));
    idbData.set('current', savedProgress);
    expect(await recoverPersistedStateFromIDB()).toBeNull();
    expect(loadPersistedState().fishCoins).toBe(5);
  });

  it('sanitizes in-progress Daily/Golden saves and drops malformed ones', async () => {
    const { loadPersistedState } = await import('./storage');
    const board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 'empty'));
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        activeSpecialPuzzles: {
          '2026-11-25': { levelId: 0, board, elapsedSec: 12, hintsUsed: 1, hearts: 9 },
          'golden-2026-W48': { levelId: -1, board: [[1]] },
          'evil-key': { levelId: 0, board },
        },
      })
    );
    const data = loadPersistedState();
    expect(Object.keys(data.activeSpecialPuzzles)).toEqual(['2026-11-25']);
    expect(data.activeSpecialPuzzles['2026-11-25']!.hearts).toBe(3);
    expect(data.activeSpecialPuzzles['2026-11-25']!.dailyDateKey).toBe('2026-11-25');
  });

  it('loads levelProgress entries without bestMistakes with bestMistakes: null', async () => {
    const { loadPersistedState } = await import('./storage');
    ls.set('meowdoku_state_v2', JSON.stringify(savedProgress));
    const data = loadPersistedState();
    expect(data.levelProgress[1]?.bestMistakes).toBeNull();
  });

  it('backfills dailyLogin.weekClaims from lastClaimDateKey when loading an old save (#7)', async () => {
    const { loadPersistedState } = await import('./storage');
    const { getWeekKey } = await import('../game/dateKeys');
    const { toDateKey } = await import('../services/reminderPlanner');

    const now = new Date();
    const todayKey = toDateKey(now);
    const currentWeekKey = getWeekKey(now);

    // Old save without weekClaims whose last claim was today -> count: 1 in current week
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        dailyLogin: {
          currentDayIndex: 3,
          lastClaimDateKey: todayKey,
          streakCount: 3,
          streakShields: 1,
          totalClaims: 10,
        },
      })
    );
    const todayData = loadPersistedState();
    expect(todayData.dailyLogin.weekClaims).toEqual({
      weekKey: currentWeekKey,
      count: 1,
    });

    // Old save without weekClaims whose last claim was from a past week -> count: 0
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        dailyLogin: {
          currentDayIndex: 3,
          lastClaimDateKey: '2025-01-02',
          streakCount: 3,
          streakShields: 1,
          totalClaims: 10,
        },
      })
    );
    const staleData = loadPersistedState();
    expect(staleData.dailyLogin.weekClaims).toEqual({
      weekKey: '',
      count: 0,
    });
  });

  it('migrates legacy activePuzzle into activeCampaignPuzzles, caps at 5 newest, and drops mismatched keys (#9)', async () => {
    const { loadPersistedState } = await import('./storage');
    const board6 = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 'empty'));

    // 1. Old save with only activePuzzle (levelId 12) -> migrated into activeCampaignPuzzles['12']
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        activePuzzle: {
          levelId: 12,
          board: board6,
          elapsedSec: 33,
          hintsUsed: 1,
          hearts: 2,
          gameMode: 'classic',
        },
      })
    );
    const migrated = loadPersistedState();
    expect(migrated.activePuzzle).toBeNull();
    expect(migrated.activeCampaignPuzzles['12']).toBeDefined();
    expect(migrated.activeCampaignPuzzles['12']?.elapsedSec).toBe(33);
    expect(migrated.activeCampaignPuzzles['12']?.savedAt).toBe(0);

    // 2. 7 entries + 1 mismatched key -> drops mismatch and keeps only 5 newest savedAt
    const rawSlots: Record<string, unknown> = {
      '99': { levelId: 4, board: board6, elapsedSec: 1, hintsUsed: 0, savedAt: 99999 },
    };
    for (let id = 1; id <= 7; id++) {
      rawSlots[String(id)] = {
        levelId: id,
        board: board6,
        elapsedSec: id * 10,
        hintsUsed: 0,
        savedAt: id * 1000,
      };
    }
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        activeCampaignPuzzles: rawSlots,
      })
    );
    const bounded = loadPersistedState();
    const keptKeys = Object.keys(bounded.activeCampaignPuzzles)
      .map(Number)
      .sort((a, b) => a - b);
    expect(keptKeys).toEqual([3, 4, 5, 6, 7]);
    expect(bounded.activeCampaignPuzzles['99']).toBeUndefined();
  });

  it('back-fills progressStats when loading a legacy save without progressStats (#11)', async () => {
    const { loadPersistedState } = await import('./storage');
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        schemaVersion: 2,
        currentLevelId: 6,
        unlockedLevelId: 6,
        levelProgress: {
          1: { levelId: 1, completed: true, bestTimeSec: 25, stars: 3, bestHintsUsed: 0, bestMistakes: 0 },
          2: { levelId: 2, completed: true, bestTimeSec: 30, stars: 3, bestHintsUsed: 0, bestMistakes: 0 },
          3: { levelId: 3, completed: true, bestTimeSec: 40, stars: 2, bestHintsUsed: 1, bestMistakes: 1 },
          4: { levelId: 4, completed: true, bestTimeSec: 50, stars: 3, bestHintsUsed: 0, bestMistakes: 0 },
          5: { levelId: 5, completed: true, bestTimeSec: 60, stars: 1, bestHintsUsed: 2, bestMistakes: 2 },
        },
        completedDailyDates: ['2026-11-25', 'golden-2026-W48'],
        achievements: {
          totalCatsFound: 30,
          perfectLevels: 3,
          currentStreak: 2,
          bestStreak: 4,
        },
        zeroMistakeSolves: 3,
      })
    );

    const data = loadPersistedState();
    expect(data.progressStats.version).toBe(1);
    expect(data.progressStats.lifetime.campaignFirstClears).toBe(5);
    expect(data.progressStats.lifetime.dailySolved).toBe(1);
    expect(data.progressStats.lifetime.goldenSolved).toBe(1);
    expect(data.progressStats.lifetime.puzzlesCompleted).toBe(7);
    expect(data.progressStats.lifetime.classicCompleted).toBe(7);
    expect(data.progressStats.lifetime.threeStarWins).toBe(3);
    expect(data.progressStats.lifetime.starsGained).toBe(12);
    expect(data.progressStats.lifetime.uniqueNoHintPuzzles).toBe(3);
    expect(data.progressStats.lifetime.uniqueNoMistakePuzzles).toBe(3);
    expect(data.progressStats.lifetime.techniquesSeen.length).toBeGreaterThan(0);
    expect(data.progressStats.lifetime.techniquesSeen).not.toContain('oracle_fallback');
    expect(data.progressStats.byDay).toEqual({});
    expect(data.progressStats.byWeek).toEqual({});
  });

  it('back-fills LevelProgress.attempts and lastResult for legacy saves (#12)', async () => {
    const { loadPersistedState } = await import('./storage');
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        levelProgress: {
          1: { levelId: 1, completed: true, bestTimeSec: 40, stars: 3, bestHintsUsed: 0 },
          2: { levelId: 2, completed: false, bestTimeSec: null, stars: 0, bestHintsUsed: null },
        },
      })
    );
    const data = loadPersistedState();
    expect(data.levelProgress[1]?.attempts).toBe(1);
    expect(data.levelProgress[1]?.lastResult).toBeNull();
    expect(data.levelProgress[2]?.attempts).toBe(0);
    expect(data.levelProgress[2]?.lastResult).toBeNull();
  });

  it('defaults dailyLogin.claimedStreakMilestones and adBonusDateKey for legacy saves (#14)', async () => {
    const { loadPersistedState } = await import('./storage');
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        dailyLogin: {
          currentDayIndex: 2,
          lastClaimDateKey: '2026-11-24',
          streakCount: 2,
          streakShields: 1,
          totalClaims: 2,
        },
      })
    );
    const data = loadPersistedState();
    expect(data.dailyLogin.claimedStreakMilestones).toEqual([]);
    expect(data.dailyLogin.adBonusDateKey).toBeNull();
  });

  it('back-fills dailyLogin.longestStreak from streakCount, defaults recoverable/lastRecoveryDateKey, and clamps freezes to 3 (#15)', async () => {
    const { loadPersistedState } = await import('./storage');
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        dailyLogin: {
          currentDayIndex: 4,
          lastClaimDateKey: '2026-11-24',
          streakCount: 9,
          streakShields: 7,
          totalClaims: 9,
        },
      })
    );
    const data = loadPersistedState();
    expect(data.dailyLogin.longestStreak).toBe(9);
    expect(data.dailyLogin.streakShields).toBe(3);
    expect(data.dailyLogin.recoverable).toBeNull();
    expect(data.dailyLogin.lastRecoveryDateKey).toBeNull();
  });

  it('migrates legacy dailyMissions with title/description to Mission[] and defaults weeklyMissions & milestoneIndex (#16)', async () => {
    const { loadPersistedState } = await import('./storage');
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        dailyMissions: {
          dateKey: '2026-11-25',
          missions: [
            {
              id: '2026-11-25-m1-levels_completed',
              metric: 'levels_completed',
              title: 'Cozy Explorer',
              description: 'Complete 2 puzzle levels',
              target: 2,
              progress: 1,
              rewardCoins: 30,
              claimed: false,
            },
          ],
        },
      })
    );
    const data = loadPersistedState();
    expect(data.dailyMissions).not.toBeNull();
    expect(data.dailyMissions!.rerollUsed).toBe(false);
    expect(data.dailyMissions!.missions).toHaveLength(1);
    const first = data.dailyMissions!.missions[0]!;
    expect(first.scope).toBe('daily');
    expect(first.progress).toBe(1);
    expect(first.claimed).toBe(false);
    expect('title' in first).toBe(false);
    expect('description' in first).toBe(false);
    expect(data.weeklyMissions).toBeNull();
    expect(data.milestoneIndex).toBe(0);
  });

  it('back-fills catUnlockLog for already unlocked cats and sanitizes favouriteCatIds (#18)', async () => {
    const { loadPersistedState } = await import('./storage');
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        unlockedCatIds: ['mochi', 'marmalade', 'pebble'],
        favouriteCatIds: ['marmalade', 'unknown_cat', 'marmalade'],
      })
    );
    const data = loadPersistedState();
    expect(data.catUnlockLog.mochi).toBeDefined();
    expect(data.catUnlockLog.mochi!.source).toBeNull();
    expect(data.catUnlockLog.marmalade).toEqual({ dateKey: '', source: null });
    expect(data.catUnlockLog.pebble).toEqual({ dateKey: '', source: null });
    expect(data.favouriteCatIds).toEqual(['marmalade']);

    // Default favouriteCatIds when missing
    ls.set('meowdoku_state_v2', JSON.stringify(savedProgress));
    expect(loadPersistedState().favouriteCatIds).toEqual([]);
  });

  it('sanitizes unlockedAccessoryIds, activeAccessoryId, and claimedSetIds (#19)', async () => {
    const { loadPersistedState } = await import('./storage');

    // Missing -> defaults
    ls.set('meowdoku_state_v2', JSON.stringify(savedProgress));
    const fresh = loadPersistedState();
    expect(fresh.unlockedAccessoryIds).toEqual([]);
    expect(fresh.activeAccessoryId).toBeNull();
    expect(fresh.claimedSetIds).toEqual([]);

    // Unknown ids dropped; locked activeAccessoryId cleared
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        unlockedAccessoryIds: ['scarf', 'bogus_hat', 'scarf'],
        activeAccessoryId: 'starCrown',
        claimedSetIds: ['village', 'bogus_set', 'village'],
      })
    );
    const lockedActive = loadPersistedState();
    expect(lockedActive.unlockedAccessoryIds).toEqual(['scarf']);
    expect(lockedActive.activeAccessoryId).toBeNull();
    expect(lockedActive.claimedSetIds).toEqual(['village']);

    // Unlocked activeAccessoryId preserved
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        unlockedAccessoryIds: ['scarf', 'roundGlasses'],
        activeAccessoryId: 'roundGlasses',
      })
    );
    expect(loadPersistedState().activeAccessoryId).toBe('roundGlasses');
  });

  it('sanitizes seasonProgress and drops invalid season keys (#20)', async () => {
    const { loadPersistedState } = await import('./storage');

    ls.set('meowdoku_state_v2', JSON.stringify(savedProgress));
    expect(loadPersistedState().seasonProgress).toBeNull();

    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        seasonProgress: { seasonKey: 'winter-2026', dailySolved: 3, threeStarWins: 7 },
      })
    );
    expect(loadPersistedState().seasonProgress).toEqual({
      seasonKey: 'winter-2026',
      dailySolved: 3,
      threeStarWins: 7,
    });

    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        seasonProgress: { seasonKey: 'bogus', dailySolved: 99, threeStarWins: 99 },
      })
    );
    expect(loadPersistedState().seasonProgress).toBeNull();
  });

  it('defaults chests for legacy saves, sanitizes them, and keeps the stored bonus across reloads (#21)', async () => {
    const { loadPersistedState, savePersistedState } = await import('./storage');

    // Legacy save without chests → fresh track with a seeded RNG
    ls.set('meowdoku_state_v2', JSON.stringify(savedProgress));
    const legacy = loadPersistedState().chests;
    expect(legacy.progress).toBe(0);
    expect(legacy.pending).toEqual([]);
    expect(legacy.opened).toBe(0);
    expect(legacy.sinceLastAccessory).toBe(0);
    expect(Number.isInteger(legacy.rngState)).toBe(true);

    // Malformed entries are dropped, numbers clamped, pending capped at 20
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: `c${i}`,
      earnedAt: i,
      bonus: { kind: 'coins', amount: 15 },
    }));
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        chests: {
          progress: 99,
          rngState: 'nope',
          opened: -4,
          sinceLastAccessory: 3.7,
          pending: [
            { id: 'bad1', bonus: { kind: 'booster', id: 'bogus' } },
            { id: 'bad2', bonus: { kind: 'accessory', id: 'scarfzz' } },
            { bonus: { kind: 'coins', amount: 15 } },
            ...many,
          ],
        },
      })
    );
    const dirty = loadPersistedState().chests;
    expect(dirty.progress).toBe(2);
    expect(dirty.opened).toBe(0);
    expect(dirty.sinceLastAccessory).toBe(3);
    expect(dirty.pending).toHaveLength(20);
    expect(dirty.pending[0]!.id).toBe('c0');
    expect(Number.isInteger(dirty.rngState)).toBe(true);

    // Save → reload keeps the exact same pending bonus (no re-roll)
    const pendingBonus = { kind: 'accessory', id: 'pawCharm' } as const;
    savePersistedState({
      ...loadPersistedState(),
      chests: {
        progress: 1,
        pending: [{ id: 'chest-1', earnedAt: 5, bonus: pendingBonus }],
        rngState: 123456,
        opened: 4,
        sinceLastAccessory: 2,
      },
    });
    const first = loadPersistedState().chests;
    const second = loadPersistedState().chests;
    expect(first.pending[0]!.bonus).toEqual(pendingBonus);
    expect(second).toEqual(first);
    expect(first.rngState).toBe(123456);
  });

  it('defaults perfectBonusLevels to [] for legacy saves (no back-fill) and sanitizes it (#22)', async () => {
    const { loadPersistedState } = await import('./storage');

    // Legacy save with an already-perfect level: no back-fill, it can earn the bonus next time
    ls.set('meowdoku_state_v2', JSON.stringify(savedProgress));
    expect(loadPersistedState().perfectBonusLevels).toEqual([]);

    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({ ...savedProgress, perfectBonusLevels: [7, 2, 2, 0, 25, 3.5, '4', 24] })
    );
    expect(loadPersistedState().perfectBonusLevels).toEqual([2, 7, 24]);
  });

  it('defaults skillProfile for legacy saves and sanitizes it (#23)', async () => {
    const { loadPersistedState } = await import('./storage');

    ls.set('meowdoku_state_v2', JSON.stringify(savedProgress));
    expect(loadPersistedState().skillProfile).toEqual({
      version: 1,
      classic: {},
      practice: {},
      hintTechniqueCounts: {},
      recent: [],
    });

    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        skillProfile: {
          version: 1,
          classic: {
            easy: { samples: 4, timeRatio: 1.2, hints: -3, mistakes: 'x', successRate: 7 },
            legendary: { samples: 9, timeRatio: 1, hints: 0, mistakes: 0, successRate: 1 },
            hard: { samples: 0, timeRatio: 1, hints: 0, mistakes: 0, successRate: 1 },
          },
          practice: { normal: { samples: 2.9, timeRatio: Infinity, hints: 1, mistakes: 1, successRate: 0.5 } },
          hintTechniqueCounts: { naked_pair_regions: 3, made_up: 4, contradiction_chain: -1 },
          recent: [
            ...Array.from({ length: 12 }, (_, i) => ({ at: i, success: 1 })),
            { at: 99, success: 2 },
            { at: 'x', success: 0 },
          ],
        },
      })
    );
    const p = loadPersistedState().skillProfile;
    expect(p.classic).toEqual({
      easy: { samples: 4, timeRatio: 1.2, hints: 0, mistakes: 0, successRate: 1 },
    });
    expect(p.practice).toEqual({
      normal: { samples: 2, timeRatio: 0, hints: 1, mistakes: 1, successRate: 0.5 },
    });
    expect(p.hintTechniqueCounts).toEqual({ naked_pair_regions: 3 });
    expect(p.recent).toHaveLength(10);
    expect(p.recent[0]).toEqual({ at: 2, success: 1 });
  });

  it('defaults recommendationDismissed / dailyVariant for legacy saves and sanitizes them (#24)', async () => {
    const { loadPersistedState } = await import('./storage');

    ls.set('meowdoku_state_v2', JSON.stringify(savedProgress));
    const legacy = loadPersistedState();
    expect(legacy.recommendationDismissed).toEqual({});
    expect(legacy.dailyVariant).toBeNull();

    const board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 'empty'));
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        ...savedProgress,
        recommendationDismissed: { golden_trial: '2026-11-20', bogus_kind: '2026-11-20', practice_mode: 'yesterday' },
        dailyVariant: { dateKey: '2026-11-26', variant: 'relaxed' },
        activeSpecialPuzzles: {
          '2026-11-26': { levelId: 0, board, elapsedSec: 3, hintsUsed: 0, dailyVariant: 'relaxed' },
          '2026-11-25': { levelId: 0, board, elapsedSec: 3, hintsUsed: 0, dailyVariant: 'ultra' },
        },
      })
    );
    const loaded = loadPersistedState();
    expect(loaded.recommendationDismissed).toEqual({ golden_trial: '2026-11-20' });
    expect(loaded.dailyVariant).toEqual({ dateKey: '2026-11-26', variant: 'relaxed' });
    expect(loaded.activeSpecialPuzzles['2026-11-26']?.dailyVariant).toBe('relaxed');
    expect(loaded.activeSpecialPuzzles['2026-11-25']?.dailyVariant).toBeUndefined();

    for (const bad of [{ dateKey: '2026-11-26', variant: 'easy' }, { dateKey: 'today', variant: 'tricky' }, 'relaxed']) {
      ls.set('meowdoku_state_v2', JSON.stringify({ ...savedProgress, dailyVariant: bad }));
      expect(loadPersistedState().dailyVariant).toBeNull();
    }
  });

  it('back-fills hasSeenTutorial to true for saves with play and keeps false for empty saves (#32)', async () => {
    const { loadPersistedState } = await import('./storage');

    // Empty storage keeps false
    expect(loadPersistedState().hasSeenTutorial).toBe(false);

    // Empty JSON save keeps false
    ls.set('meowdoku_state_v2', JSON.stringify({ schemaVersion: 2, hasSeenTutorial: false }));
    expect(loadPersistedState().hasSeenTutorial).toBe(false);

    // Save with hasSeenTutorial: false and completed level 1 back-fills to true
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        schemaVersion: 2,
        hasSeenTutorial: false,
        unlockedLevelId: 1,
        levelProgress: { 1: { levelId: 1, completed: true, stars: 2 } },
      })
    );
    expect(loadPersistedState().hasSeenTutorial).toBe(true);

    // Save with completedDailyDates non-empty back-fills to true
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        schemaVersion: 2,
        hasSeenTutorial: false,
        completedDailyDates: ['2026-11-25'],
      })
    );
    expect(loadPersistedState().hasSeenTutorial).toBe(true);

    // Save with unlockedLevelId > 1 back-fills to true
    ls.set(
      'meowdoku_state_v2',
      JSON.stringify({
        schemaVersion: 2,
        hasSeenTutorial: false,
        unlockedLevelId: 2,
      })
    );
    expect(loadPersistedState().hasSeenTutorial).toBe(true);
  });
});
