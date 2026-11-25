/**
 * Browser-Only Daily Notification System (ZERO Server / ZERO Push Provider).
 * Uses standard Web Notification API + Service Worker notifications where supported,
 * optional Periodic Background Sync as a progressive enhancement, and missed-reminder
 * launch checks with strict duplicate prevention and quiet hours.
 */

import i18n, { AppLanguage, getCurrentLanguage } from '../i18n';
import { idbGet, idbPut, STORE_NOTIFICATION_PREFS } from '../utils/idbStorage';
import { getSwRegistration } from './swManager';

export type NotificationCategory =
  | 'dailyPuzzle'
  | 'continueAdventure'
  | 'specialChallenges';

export type BrowserPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export type PeriodicSyncStatus = 'registered' | 'unsupported' | 'denied';

export interface NotificationPreferences {
  enabled: boolean;
  reminderTime: string; // Local "HH:MM"
  quietHoursEnabled: boolean;
  quietStart: string; // Local "HH:MM"
  quietEnd: string; // Local "HH:MM"
  categories: Record<NotificationCategory, boolean>;
  onboardingDismissed: boolean;
  lastSentDateByCategory: Record<NotificationCategory, string | null>;
}

const NOTIF_STORAGE_KEY = 'meowdoku_notifications_v1';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: false,
  reminderTime: '19:00',
  quietHoursEnabled: true,
  quietStart: '22:00',
  quietEnd: '08:00',
  categories: {
    dailyPuzzle: true,
    continueAdventure: true,
    specialChallenges: true,
  },
  onboardingDismissed: false,
  lastSentDateByCategory: {
    dailyPuzzle: null,
    continueAdventure: null,
    specialChallenges: null,
  },
};

export interface ReminderMessagePayload {
  title: string;
  body: string;
  route: 'daily' | 'map' | 'missions';
  category: NotificationCategory;
}

const REMINDER_MESSAGES: Record<
  AppLanguage,
  Record<NotificationCategory, readonly string[]>
> = {
  en: {
    dailyPuzzle: [
      'Your cats are waiting! 🐱 A new puzzle is ready.',
      'Ready for another purr-fect challenge?',
      'Today’s 8×8 Daily Kitty grid just arrived! 🐾',
    ],
    continueAdventure: [
      'Ready for another purr-fect challenge?',
      'Your Cat Journey awaits! Come unlock the next cozy stop. 🐾',
      'Take a relaxing 2-minute logic break with your cats! 🐱',
    ],
    specialChallenges: [
      'A special Golden Cat challenge is waiting in Events! ✨',
      'Check your Daily Missions & claim shiny Fish Coins! 🐟',
    ],
  },
  fr: {
    dailyPuzzle: [
      "Tes chats t'attendent ! 🐱 Un nouveau puzzle est prêt.",
      'Prêt pour un nouveau défi ronronnant ?',
      'La grille Chat du Jour 8×8 vient tout juste d’arriver ! 🐾',
    ],
    continueAdventure: [
      'Prêt pour un nouveau défi ronronnant ?',
      'Ton aventure féline t’attend ! Viens débloquer la prochaine étape. 🐾',
      'Accorde-toi une pause logique toute douce avec tes chats ! 🐱',
    ],
    specialChallenges: [
      'Un défi spécial Chat Doré t’attend dans les Événements ! ✨',
      'Découvre tes missions du jour et récolte des pièces poisson ! 🐟',
    ],
  },
};

const CATEGORY_ROUTES: Record<NotificationCategory, 'daily' | 'map' | 'missions'> = {
  dailyPuzzle: 'daily',
  continueAdventure: 'map',
  specialChallenges: 'missions',
};

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseTimeToMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return 19 * 60;
  const h = Math.max(0, Math.min(23, Number(match[1])));
  const m = Math.max(0, Math.min(59, Number(match[2])));
  return h * 60 + m;
}

/**
 * Checks whether `nowMinutes` (0..1439) falls inside `[startMinutes, endMinutes)`,
 * properly supporting overnight ranges such as 22:00 -> 08:00.
 */
export function isWithinQuietHours(
  nowMinutes: number,
  startMinutes: number,
  endMinutes: number
): boolean {
  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export function getLocalizedReminderCopy(
  category: NotificationCategory,
  lang: AppLanguage = getCurrentLanguage(),
  date = new Date()
): ReminderMessagePayload {
  const pool = REMINDER_MESSAGES[lang][category];
  const daySeed = date.getDate() + date.getMonth() * 31;
  const body = pool[daySeed % pool.length]!;
  return {
    title: 'Meowdoku 🐱',
    body,
    route: CATEGORY_ROUTES[category],
    category,
  };
}

export interface DueReminderEvaluation {
  due: boolean;
  reason:
    | 'disabled'
    | 'before_time'
    | 'quiet_hours'
    | 'already_sent_today'
    | 'no_categories'
    | 'due';
  category?: NotificationCategory;
  route?: 'daily' | 'map' | 'missions';
  dateKey: string;
}

/**
 * Pure, deterministic scheduler check evaluating whether a daily reminder is due right now
 * (or missed earlier today on launch) while strictly preventing duplicates and respecting quiet hours.
 */
export function evaluateDueReminder(
  prefs: NotificationPreferences,
  now = new Date()
): DueReminderEvaluation {
  const dateKey = getLocalDateKey(now);
  if (!prefs.enabled) {
    return { due: false, reason: 'disabled', dateKey };
  }

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const targetMin = parseTimeToMinutes(prefs.reminderTime);
  if (nowMin < targetMin) {
    return { due: false, reason: 'before_time', dateKey };
  }

  if (
    prefs.quietHoursEnabled &&
    isWithinQuietHours(
      nowMin,
      parseTimeToMinutes(prefs.quietStart),
      parseTimeToMinutes(prefs.quietEnd)
    )
  ) {
    return { due: false, reason: 'quiet_hours', dateKey };
  }

  const orderedCategories: NotificationCategory[] = [
    'dailyPuzzle',
    'continueAdventure',
    'specialChallenges',
  ];

  const enabledCats = orderedCategories.filter((c) => prefs.categories[c]);
  if (enabledCats.length === 0) {
    return { due: false, reason: 'no_categories', dateKey };
  }

  // Strictly send at most ONE friendly reminder per day across active categories (no spam!)
  const alreadySentAnyToday = orderedCategories.some(
    (c) => prefs.lastSentDateByCategory[c] === dateKey
  );
  if (alreadySentAnyToday) {
    return { due: false, reason: 'already_sent_today', dateKey };
  }

  // Rotate enabled categories gently by day-of-week so reminders stay varied and fresh
  const chosen = enabledCats[now.getDay() % enabledCats.length]!;
  return {
    due: true,
    reason: 'due',
    category: chosen,
    route: CATEGORY_ROUTES[chosen],
    dateKey,
  };
}

export function getBrowserNotificationPermission(): BrowserPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as BrowserPermissionState;
}

export function loadNotificationPrefs(): NotificationPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_NOTIFICATION_PREFS };
  try {
    const raw = window.localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      enabled: Boolean(parsed.enabled),
      reminderTime:
        typeof parsed.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(parsed.reminderTime)
          ? parsed.reminderTime
          : DEFAULT_NOTIFICATION_PREFS.reminderTime,
      quietHoursEnabled:
        typeof parsed.quietHoursEnabled === 'boolean'
          ? parsed.quietHoursEnabled
          : DEFAULT_NOTIFICATION_PREFS.quietHoursEnabled,
      quietStart:
        typeof parsed.quietStart === 'string' && /^\d{2}:\d{2}$/.test(parsed.quietStart)
          ? parsed.quietStart
          : DEFAULT_NOTIFICATION_PREFS.quietStart,
      quietEnd:
        typeof parsed.quietEnd === 'string' && /^\d{2}:\d{2}$/.test(parsed.quietEnd)
          ? parsed.quietEnd
          : DEFAULT_NOTIFICATION_PREFS.quietEnd,
      categories: {
        dailyPuzzle:
          typeof parsed.categories?.dailyPuzzle === 'boolean'
            ? parsed.categories.dailyPuzzle
            : true,
        continueAdventure:
          typeof parsed.categories?.continueAdventure === 'boolean'
            ? parsed.categories.continueAdventure
            : true,
        specialChallenges:
          typeof parsed.categories?.specialChallenges === 'boolean'
            ? parsed.categories.specialChallenges
            : true,
      },
      onboardingDismissed: Boolean(parsed.onboardingDismissed),
      lastSentDateByCategory: {
        dailyPuzzle: parsed.lastSentDateByCategory?.dailyPuzzle ?? null,
        continueAdventure: parsed.lastSentDateByCategory?.continueAdventure ?? null,
        specialChallenges: parsed.lastSentDateByCategory?.specialChallenges ?? null,
      },
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

const prefListeners = new Set<(prefs: NotificationPreferences) => void>();

export function subscribeNotificationPrefs(
  cb: (prefs: NotificationPreferences) => void
): () => void {
  prefListeners.add(cb);
  cb(loadNotificationPrefs());
  return () => prefListeners.delete(cb);
}

const CATEGORY_KEYS: readonly NotificationCategory[] = [
  'dailyPuzzle',
  'continueAdventure',
  'specialChallenges',
];

/**
 * Merges "last sent" dates from two sources, keeping the most recent date per category.
 * The page (LocalStorage) and the Service Worker (IndexedDB) can both send reminders, so
 * neither copy may overwrite a newer send recorded by the other — that is what prevents a
 * second reminder on the same day.
 */
export function mergeLastSentDates(
  a: Partial<Record<NotificationCategory, string | null>> | undefined,
  b: Partial<Record<NotificationCategory, string | null>> | undefined
): Record<NotificationCategory, string | null> {
  const out = {} as Record<NotificationCategory, string | null>;
  for (const k of CATEGORY_KEYS) {
    const x = typeof a?.[k] === 'string' ? a[k]! : null;
    const y = typeof b?.[k] === 'string' ? b[k]! : null;
    out[k] = x && y ? (x > y ? x : y) : (x ?? y);
  }
  return out;
}

async function readServiceWorkerSentDates(): Promise<
  Partial<Record<NotificationCategory, string | null>> | undefined
> {
  const fromIdb = await idbGet<Partial<NotificationPreferences>>(STORE_NOTIFICATION_PREFS, 'prefs');
  return fromIdb?.lastSentDateByCategory;
}

export function saveNotificationPrefs(prefs: NotificationPreferences): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore quota errors
    }
  }
  // Mirror to IndexedDB with current language so the Service Worker can read it offline,
  // without discarding a send the Service Worker recorded there in the meantime.
  void readServiceWorkerSentDates()
    .catch(() => undefined)
    .then((swDates) =>
      idbPut(STORE_NOTIFICATION_PREFS, 'prefs', {
        ...prefs,
        lastSentDateByCategory: mergeLastSentDates(prefs.lastSentDateByCategory, swDates),
        language: getCurrentLanguage(),
      })
    );
  for (const cb of prefListeners) {
    cb(prefs);
  }
}

/**
 * Explicitly requests browser notification permission ONLY after user interaction.
 */
export async function requestBrowserNotificationPermission(): Promise<BrowserPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result as BrowserPermissionState;
  } catch {
    return 'denied';
  }
}

/**
 * Optional progressive enhancement: registers Periodic Background Sync if genuinely supported
 * by the browser (e.g. installed Android Chrome PWA). Never fakes support on unsupported browsers.
 */
export async function registerPeriodicSyncIfSupported(): Promise<PeriodicSyncStatus> {
  try {
    const reg =
      getSwRegistration() ??
      (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        ? await navigator.serviceWorker.ready.catch(() => null)
        : null);

    if (!reg || !('periodicSync' in reg)) {
      return 'unsupported';
    }

    if ('permissions' in navigator) {
      try {
        const perm = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });
        if (perm.state !== 'granted') {
          return 'denied';
        }
      } catch {
        // Some Chromium builds don't expose query name; fall through to register attempt
      }
    }

    const periodicSync = (
      reg as ServiceWorkerRegistration & {
        periodicSync?: {
          register: (tag: string, opts: { minInterval: number }) => Promise<void>;
          unregister: (tag: string) => Promise<void>;
        };
      }
    ).periodicSync;

    if (!periodicSync) return 'unsupported';
    await periodicSync.register('meowdoku-daily-reminder', {
      minInterval: 12 * 60 * 60 * 1000, // 12 hours
    });
    return 'registered';
  } catch {
    return 'unsupported';
  }
}

export async function unregisterPeriodicSync(): Promise<void> {
  try {
    const reg =
      getSwRegistration() ??
      (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        ? await navigator.serviceWorker.ready.catch(() => null)
        : null);
    const periodicSync = (
      reg as (ServiceWorkerRegistration & {
        periodicSync?: { unregister: (tag: string) => Promise<void> };
      }) | null
    )?.periodicSync;
    if (periodicSync) {
      await periodicSync.unregister('meowdoku-daily-reminder');
    }
  } catch {
    // Ignore
  }
}

/**
 * Delivers a local browser notification via Service Worker (preferred) or standard Notification API.
 */
export async function deliverLocalNotification(
  payload: ReminderMessagePayload,
  options?: { tag?: string; isTest?: boolean }
): Promise<boolean> {
  const perm = getBrowserNotificationPermission();
  if (perm !== 'granted') return false;

  const tag =
    options?.tag ??
    `meowdoku-${payload.category}-${options?.isTest ? Date.now() : getLocalDateKey()}`;

  try {
    const reg =
      getSwRegistration() ??
      (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        ? await navigator.serviceWorker.getRegistration().catch(() => null)
        : null);

    if (reg && typeof reg.showNotification === 'function') {
      await reg.showNotification(payload.title, {
        body: payload.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/favicon-32.png',
        tag,
        data: { route: payload.route, category: payload.category },
      });
      return true;
    }

    if (typeof Notification !== 'undefined') {
      const notif = new Notification(payload.title, {
        body: payload.body,
        icon: '/icons/icon-192.png',
        tag,
      });
      notif.onclick = () => {
        window.focus();
      };
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

let schedulerInterval: number | null = null;

/**
 * Starts the browser-only foreground & launch-catch-up reminder scheduler.
 * Automatically stops firing when notifications are disabled.
 */
export function startLocalReminderScheduler(
  onInAppReminder?: (payload: ReminderMessagePayload) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let checking = false;
  const checkAndDeliver = async () => {
    if (checking) return;
    checking = true;
    try {
      await checkAndDeliverOnce();
    } finally {
      checking = false;
    }
  };

  const checkAndDeliverOnce = async () => {
    const stored = loadNotificationPrefs();
    if (!stored.enabled) return;
    // Include sends made by the Service Worker (Periodic Background Sync) while the app was closed
    const swDates = await readServiceWorkerSentDates().catch(() => undefined);
    const prefs: NotificationPreferences = {
      ...stored,
      lastSentDateByCategory: mergeLastSentDates(stored.lastSentDateByCategory, swDates),
    };
    const evaluation = evaluateDueReminder(prefs, new Date());
    if (!evaluation.due || !evaluation.category) return;

    const copy = getLocalizedReminderCopy(evaluation.category, getCurrentLanguage(), new Date());

    // Mark sent BEFORE async dispatch to guarantee zero duplicates on rapid checks
    const updated: NotificationPreferences = {
      ...prefs,
      lastSentDateByCategory: {
        ...prefs.lastSentDateByCategory,
        [evaluation.category]: evaluation.dateKey,
      },
    };
    saveNotificationPrefs(updated);

    // While the player is looking at the game, a gentle in-app message is enough;
    // a system notification is only useful when the app is in the background.
    const appInForeground =
      document.visibilityState === 'visible' &&
      (typeof document.hasFocus !== 'function' || document.hasFocus());
    const deliveredViaBrowser = appInForeground ? false : await deliverLocalNotification(copy);
    if (!deliveredViaBrowser && onInAppReminder) {
      onInAppReminder(copy);
    }
  };

  // Check missed reminder gently shortly after app launch
  const bootTimer = window.setTimeout(() => {
    void checkAndDeliver();
  }, 3500);

  if (schedulerInterval !== null) {
    window.clearInterval(schedulerInterval);
  }
  schedulerInterval = window.setInterval(() => {
    void checkAndDeliver();
  }, 60 * 1000);

  const onVisibility = () => {
    if (!document.hidden) {
      void checkAndDeliver();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // Keep IDB language synced whenever user switches English <-> French
  const onLangChanged = () => {
    saveNotificationPrefs(loadNotificationPrefs());
  };
  i18n.on('languageChanged', onLangChanged);

  return () => {
    window.clearTimeout(bootTimer);
    if (schedulerInterval !== null) {
      window.clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
    document.removeEventListener('visibilitychange', onVisibility);
    i18n.off('languageChanged', onLangChanged);
  };
}
