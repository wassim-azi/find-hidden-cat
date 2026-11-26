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
});

