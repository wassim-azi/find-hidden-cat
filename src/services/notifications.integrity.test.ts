import { describe, expect, it, vi } from 'vitest';
import swRaw from '../../public/sw.js?raw';
import { DEFAULT_NOTIFICATION_PREFS, mergeLastSentDates } from './localNotifications';
import { ReminderPlanEntry, selectDueEntry } from './reminderPlanner';

describe('Reminder duplicate prevention across page and Service Worker', () => {
  it('keeps the most recent send per category from either source', () => {
    const merged = mergeLastSentDates(
      { dailyPuzzle: '2026-11-24', continueAdventure: null, specialChallenges: '2026-11-25' },
      { dailyPuzzle: '2026-11-25', continueAdventure: '2026-11-20' }
    );
    expect(merged).toEqual({
      streak: null,
      dailyPuzzle: '2026-11-25',
      continueAdventure: '2026-11-20',
      specialChallenges: '2026-11-25',
    });
  });

  it('the page does not send again on a day the Service Worker already sent', () => {
    const now = new Date(2026, 10, 25, 20, 0);
    const plan: ReminderPlanEntry[] = [
      { dateKey: '2026-11-25', notBeforeMinutes: 19 * 60, kind: 'dailyPuzzle', route: 'daily', title: 't', body: 'b' },
    ];
    const quiet = { quietHoursEnabled: false, quietStartMinutes: 0, quietEndMinutes: 0 };
    expect(selectDueEntry(plan, quiet, [], now)).not.toBeNull();
    const merged = mergeLastSentDates(DEFAULT_NOTIFICATION_PREFS.lastSentDateByCategory, {
      continueAdventure: '2026-11-25',
    });
    expect(selectDueEntry(plan, quiet, Object.values(merged), now)).toBeNull();
  });
});

/** Runs public/sw.js in a sandbox and fires `periodicsync` events at it. */
function loadServiceWorker(prefs: Record<string, unknown>, now: Date) {
  const listeners = new Map<string, (e: unknown) => void>();
  const shown: { title: string; options: { tag: string } }[] = [];
  let stored = structuredClone(prefs);

  const makeReq = <T,>(result: () => T) => {
    const req: { result?: T; onsuccess?: () => void; onerror?: () => void } = {};
    queueMicrotask(() => {
      req.result = result();
      req.onsuccess?.();
    });
    return req;
  };
  const db = {
    objectStoreNames: { contains: () => true },
    transaction: () => {
      const tx: { oncomplete?: () => void; onerror?: () => void; objectStore: () => unknown } = {
        objectStore: () => ({
          get: () => makeReq(() => structuredClone(stored)),
          put: (value: Record<string, unknown>) => {
            stored = structuredClone(value);
            queueMicrotask(() => tx.oncomplete?.());
          },
        }),
      };
      return tx;
    },
  };

  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(now.getTime());
      else super(...(args as [number]));
    }
  }

  const self = {
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    registration: {
      showNotification: vi.fn(async (title: string, options: { tag: string }) => {
        shown.push({ title, options });
      }),
    },
    clients: { claim: () => Promise.resolve() },
    location: { origin: 'https://example.test' },
  };
  // Evaluate the real worker source with its globals injected as parameters
  const sandbox: Record<string, unknown> = {
    self,
    indexedDB: { open: () => makeReq(() => db) },
    caches: {},
    Date: FixedDate,
    Response: class {},
    Request: class {},
  };
  new Function(...Object.keys(sandbox), swRaw)(...Object.values(sandbox));

  const fire = async () => {
    let done: Promise<unknown> = Promise.resolve();
    listeners.get('periodicsync')!({
      tag: 'meowdoku-daily-reminder',
      waitUntil: (p: Promise<unknown>) => {
        done = p;
      },
    });
    await done;
  };
  return { fire, shown, getStored: () => stored };
}

describe('Service Worker periodic reminder (delivers the on-device plan)', () => {
  const entry = (dateKey: string, extra: Partial<ReminderPlanEntry> = {}): ReminderPlanEntry => ({
    dateKey,
    notBeforeMinutes: 19 * 60 + 30,
    kind: 'streak',
    route: 'rewards',
    title: 'Meowdoku 🐱',
    body: 'Garde ta série de 6 jours — la récompense du jour t’attend ! 🐟',
    ...extra,
  });
  const basePrefs = {
    ...DEFAULT_NOTIFICATION_PREFS,
    enabled: true,
    quietHoursEnabled: false,
    language: 'fr',
    plan: [entry('2026-11-25'), entry('2026-11-26', { kind: 'dailyPuzzle', route: 'daily' })],
  };

  it('delivers today’s planned message once, at or after its time, and records the send', async () => {
    const sw = loadServiceWorker(basePrefs, new Date(2026, 10, 25, 20, 0));
    await sw.fire();
    await sw.fire();
    await sw.fire();
    expect(sw.shown).toHaveLength(1);
    const shown = sw.shown[0]! as unknown as { title: string; options: { body: string; tag: string; data: { route: string } } };
    expect(shown.options.body).toContain('série de 6 jours');
    expect(shown.options.data.route).toBe('rewards');
    expect(shown.options.tag).toContain('2026-11-25');
    const stored = sw.getStored() as { sentLog: { dateKey: string }[]; lastSentDateByCategory: Record<string, string> };
    expect(stored.sentLog.map((s) => s.dateKey)).toEqual(['2026-11-25']);
    expect(stored.lastSentDateByCategory.streak).toBe('2026-11-25');
  });

  it('sends nothing before the planned time, on unplanned days, after a page send, or when disabled', async () => {
    const early = loadServiceWorker(basePrefs, new Date(2026, 10, 25, 19, 0));
    await early.fire();
    expect(early.shown).toHaveLength(0);

    const unplanned = loadServiceWorker(basePrefs, new Date(2026, 10, 27, 20, 0));
    await unplanned.fire();
    expect(unplanned.shown).toHaveLength(0);

    const pageSent = loadServiceWorker(
      { ...basePrefs, sentLog: [{ dateKey: '2026-11-25', sentAt: 1, kind: 'dailyPuzzle' }] },
      new Date(2026, 10, 25, 21, 0)
    );
    await pageSent.fire();
    expect(pageSent.shown).toHaveLength(0);

    const disabled = loadServiceWorker({ ...basePrefs, enabled: false }, new Date(2026, 10, 25, 21, 0));
    await disabled.fire();
    expect(disabled.shown).toHaveLength(0);

    const quiet = loadServiceWorker(
      { ...basePrefs, quietHoursEnabled: true, quietStart: '19:00', quietEnd: '08:00' },
      new Date(2026, 10, 25, 20, 0)
    );
    await quiet.fire();
    expect(quiet.shown).toHaveLength(0);
  });
});

describe('Service Worker runtime asset pruning (#10)', () => {
  function setupSwWithCaches(fetchImpl: () => Promise<unknown>) {
    const listeners = new Map<string, (e: unknown) => void>();
    const cacheBuckets = new Map<string, Map<string, unknown>>();

    const makeCache = (name: string) => {
      let bucket = cacheBuckets.get(name);
      if (!bucket) {
        bucket = new Map<string, unknown>();
        cacheBuckets.set(name, bucket);
      }
      return {
        keys: async () => Array.from(bucket!.keys()).map((url) => ({ url })),
        delete: async (req: { url: string } | string) =>
          bucket!.delete(typeof req === 'string' ? req : req.url),
        match: async (req: { url: string } | string) =>
          bucket!.get(typeof req === 'string' ? req : req.url),
        put: async (req: { url: string } | string, res: unknown) => {
          bucket!.set(typeof req === 'string' ? req : req.url, res);
        },
      };
    };

    const caches = {
      open: async (name: string) => makeCache(name),
      keys: async () => Array.from(cacheBuckets.keys()),
      delete: async (name: string) => cacheBuckets.delete(name),
    };

    const self = {
      addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
      registration: { showNotification: vi.fn(async () => undefined) },
      clients: { claim: () => Promise.resolve() },
      location: { origin: 'https://example.test' },
    };

    const sandbox: Record<string, unknown> = {
      self,
      indexedDB: { open: () => ({}) },
      caches,
      fetch: fetchImpl,
      Response: class {},
      Request: class {},
    };
    new Function(...Object.keys(sandbox), swRaw)(...Object.values(sandbox));

    const runtime = makeCache('meowdoku-runtime-v6');
    const seed = async (paths: string[]) => {
      for (const p of paths) {
        await runtime.put(`https://example.test${p}`, { ok: true });
      }
    };
    const remainingPaths = async () =>
      (await runtime.keys()).map((r) => new URL(r.url).pathname).sort();

    const dispatchActivate = async () => {
      let done: Promise<unknown> = Promise.resolve();
      listeners.get('activate')!({
        waitUntil: (p: Promise<unknown>) => {
          done = p;
        },
      });
      await done;
    };

    return { seed, remainingPaths, dispatchActivate };
  }

  it('prunes stale /assets/* entries on activate while keeping current ones', async () => {
    const sw = setupSwWithCaches(async () => ({
      ok: true,
      json: async () => ({ files: ['/assets/a.js'] }),
    }));
    await sw.seed(['/assets/a.js', '/assets/old.js']);
    await sw.dispatchActivate();
    expect(await sw.remainingPaths()).toEqual(['/assets/a.js']);
  });

  it('keeps all cached assets when fetch rejects (offline)', async () => {
    const sw = setupSwWithCaches(async () => {
      throw new Error('offline');
    });
    await sw.seed(['/assets/a.js', '/assets/old.js']);
    await sw.dispatchActivate();
    expect(await sw.remainingPaths()).toEqual(['/assets/a.js', '/assets/old.js']);
  });

  it('never wipes cached assets when asset-list.json returns an empty array', async () => {
    const sw = setupSwWithCaches(async () => ({
      ok: true,
      json: async () => ({ files: [] }),
    }));
    await sw.seed(['/assets/a.js', '/assets/old.js']);
    await sw.dispatchActivate();
    expect(await sw.remainingPaths()).toEqual(['/assets/a.js', '/assets/old.js']);
  });
});
