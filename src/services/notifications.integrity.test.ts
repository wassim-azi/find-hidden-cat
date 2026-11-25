import { describe, expect, it, vi } from 'vitest';
import swRaw from '../../public/sw.js?raw';
import {
  DEFAULT_NOTIFICATION_PREFS,
  evaluateDueReminder,
  mergeLastSentDates,
} from './localNotifications';

describe('Reminder duplicate prevention across page and Service Worker', () => {
  it('keeps the most recent send per category from either source', () => {
    const merged = mergeLastSentDates(
      { dailyPuzzle: '2026-11-24', continueAdventure: null, specialChallenges: '2026-11-25' },
      { dailyPuzzle: '2026-11-25', continueAdventure: '2026-11-20' }
    );
    expect(merged).toEqual({
      dailyPuzzle: '2026-11-25',
      continueAdventure: '2026-11-20',
      specialChallenges: '2026-11-25',
    });
  });

  it('the page does not send again on a day the Service Worker already sent', () => {
    const now = new Date(2026, 10, 25, 20, 0);
    const pagePrefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true, quietHoursEnabled: false };
    expect(evaluateDueReminder(pagePrefs, now).due).toBe(true);
    const withSw = {
      ...pagePrefs,
      lastSentDateByCategory: mergeLastSentDates(pagePrefs.lastSentDateByCategory, {
        continueAdventure: '2026-11-25',
      }),
    };
    const ev = evaluateDueReminder(withSw, now);
    expect(ev.due).toBe(false);
    expect(ev.reason).toBe('already_sent_today');
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

describe('Service Worker periodic reminder', () => {
  const basePrefs = {
    ...DEFAULT_NOTIFICATION_PREFS,
    enabled: true,
    quietHoursEnabled: false,
    language: 'fr',
  };

  it('sends at most one reminder per day, in the saved language', async () => {
    const sw = loadServiceWorker(basePrefs, new Date(2026, 10, 25, 20, 0));
    await sw.fire();
    await sw.fire();
    await sw.fire();
    expect(sw.shown).toHaveLength(1);
    expect(sw.shown[0]!.options.tag).toContain('2026-11-25');
    const body = (sw.shown[0]!.options as unknown as { body: string }).body;
    expect(body).toMatch(/[àâçéèêëîïôûùüÿœ]|chat|Chat|défi/);
    const sent = Object.values(
      (sw.getStored() as { lastSentDateByCategory: Record<string, string | null> }).lastSentDateByCategory
    );
    expect(sent).toContain('2026-11-25');
  });

  it('does not send when the page already sent today, before the chosen time, or when disabled', async () => {
    const alreadySent = loadServiceWorker(
      { ...basePrefs, lastSentDateByCategory: { ...basePrefs.lastSentDateByCategory, specialChallenges: '2026-11-25' } },
      new Date(2026, 10, 25, 21, 0)
    );
    await alreadySent.fire();
    expect(alreadySent.shown).toHaveLength(0);

    const early = loadServiceWorker(basePrefs, new Date(2026, 10, 25, 9, 0));
    await early.fire();
    expect(early.shown).toHaveLength(0);

    const disabled = loadServiceWorker({ ...basePrefs, enabled: false }, new Date(2026, 10, 25, 21, 0));
    await disabled.fire();
    expect(disabled.shown).toHaveLength(0);
  });
});
