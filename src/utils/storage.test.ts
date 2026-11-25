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
});
