/**
 * Browser-Only Daily Notification System (ZERO Server / ZERO Push Provider).
 * Uses standard Web Notification API + Service Worker notifications where supported,
 * optional Periodic Background Sync as a progressive enhancement, and missed-reminder
 * launch checks with strict duplicate prevention and quiet hours.
 */

import i18n, { AppLanguage, getCurrentLanguage } from '../i18n';
import { idbGet, idbPut, STORE_NOTIFICATION_PREFS } from '../utils/idbStorage';
import { getSwRegistration } from './swManager';
import {
  buildReminderPlan,
  EMPTY_ENGAGEMENT,
  EngagementLog,
  getEffectiveReminderMinutes,
  MAX_SENT_LOG,
  mergeSentLogs,
  minutesToHHMM,
  recordSession,
  ReminderCopyFn,
  ReminderGameContext,
  ReminderKind,
  ReminderPlanEntry,
  ReminderPlanSettings,
  ReminderRoute,
  selectDueEntry,
  shouldAskToKeepReminders,
  } from './reminderPlanner';

/** 'streak' = daily-reward streak about to lapse */
export type NotificationCategory = ReminderKind;

/** 'auto' learns from when the player usually opens the game; 'manual' uses reminderTime. */
export type ReminderTimingMode = 'auto' | 'manual';

export type BrowserPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export type PeriodicSyncStatus = 'registered' | 'unsupported' | 'denied';

export interface NotificationPreferences {
  enabled: boolean;
  timingMode: ReminderTimingMode;
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
  timingMode: 'auto',
  reminderTime: '19:00',
  quietHoursEnabled: true,
  quietStart: '22:00',
  quietEnd: '08:00',
  categories: {
    streak: true,
    dailyPuzzle: true,
    continueAdventure: true,
    specialChallenges: true,
  },
  onboardingDismissed: false,
  lastSentDateByCategory: {
    streak: null,
    dailyPuzzle: null,
    continueAdventure: null,
    specialChallenges: null,
  },
};

export interface ReminderMessagePayload {
  title: string;
  body: string;
  route: ReminderRoute;
  category: NotificationCategory;
}

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
    const timingMode: ReminderTimingMode =
      parsed.timingMode === 'auto' || parsed.timingMode === 'manual'
        ? parsed.timingMode
        : // Saves from before Automatic timing: keep a time the player deliberately changed
          typeof parsed.reminderTime === 'string' && parsed.reminderTime !== '19:00'
          ? 'manual'
          : 'auto';
    return {
      enabled: Boolean(parsed.enabled),
      timingMode,
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
        streak: typeof parsed.categories?.streak === 'boolean' ? parsed.categories.streak : true,
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
        streak: parsed.lastSentDateByCategory?.streak ?? null,
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
  'streak',
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

/** Shape of the record shared with the Service Worker in IndexedDB. */
interface ReminderMirror extends Partial<NotificationPreferences> {
  language?: AppLanguage;
  plan?: ReminderPlanEntry[];
  sentLog?: EngagementLog['sentLog'];
}

const ENGAGEMENT_STORAGE_KEY = 'meowdoku_reminder_engagement_v1';

/** On-device history used for timing and back-off; it never leaves the browser. */
export function loadEngagement(): EngagementLog {
  if (typeof window === 'undefined') return { ...EMPTY_ENGAGEMENT };
  try {
    const raw = window.localStorage.getItem(ENGAGEMENT_STORAGE_KEY);
    if (!raw) return { ...EMPTY_ENGAGEMENT };
    const parsed = JSON.parse(raw) as Partial<EngagementLog>;
    return {
      sessionStarts: Array.isArray(parsed.sessionStarts)
        ? parsed.sessionStarts.filter((t): t is number => typeof t === 'number').slice(-40)
        : [],
      sentLog: mergeSentLogs(Array.isArray(parsed.sentLog) ? parsed.sentLog : []),
      pauseAskedFor: typeof parsed.pauseAskedFor === 'number' ? parsed.pauseAskedFor : null,
    };
  } catch {
    return { ...EMPTY_ENGAGEMENT };
  }
}

function saveEngagement(log: EngagementLog): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ENGAGEMENT_STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Ignore quota errors
  }
}

let contextProvider: (() => ReminderGameContext) | null = null;

/** The app registers a getter for the game state the planner needs (avoids a store import). */
export function setReminderContextProvider(provider: (() => ReminderGameContext) | null): void {
  contextProvider = provider;
}

function toPlanSettings(prefs: NotificationPreferences): ReminderPlanSettings {
  return {
    enabled: prefs.enabled,
    timingMode: prefs.timingMode,
    manualMinutes: parseTimeToMinutes(prefs.reminderTime),
    quietHoursEnabled: prefs.quietHoursEnabled,
    quietStartMinutes: parseTimeToMinutes(prefs.quietStart),
    quietEndMinutes: parseTimeToMinutes(prefs.quietEnd),
    categories: prefs.categories,
  };
}

/** Localized, event-specific reminder text. */
export function makeReminderCopy(lang: AppLanguage): ReminderCopyFn {
  return (kind, { count, level, variant }) => {
    const t = (key: string, opts: Record<string, unknown> = {}) =>
      i18n.t(`notifications.msg.${key}`, { lng: lang, ...opts });
    const body =
      kind === 'streak'
        ? t('streak', { count })
        : kind === 'dailyPuzzle'
          ? t(`daily_${variant % 2}`)
          : kind === 'specialChallenges'
            ? t('golden')
            : t('continue', { level });
    return { title: t('title'), body };
  };
}

/** Learned/manual reminder time shown in settings. */
export function getReminderTimeInfo(
  prefs: NotificationPreferences = loadNotificationPrefs(),
  now = Date.now()
): { time: string; learned: boolean } {
  const { minutes, learned } = getEffectiveReminderMinutes(
    toPlanSettings(prefs),
    loadEngagement(),
    now
  );
  return { time: minutesToHHMM(minutes), learned };
}

export function computeReminderPlan(
  prefs: NotificationPreferences,
  log: EngagementLog,
  now = Date.now(),
  lang: AppLanguage = getCurrentLanguage()
): ReminderPlanEntry[] {
  if (!contextProvider) return [];
  return buildReminderPlan(toPlanSettings(prefs), log, contextProvider(), now, makeReminderCopy(lang));
}

/**
 * Pulls sends recorded by the Service Worker into local state, then writes the shared
 * IndexedDB record (prefs + merged send history + a fresh 14-day plan in the current
 * language). Calls are serialized so concurrent writes can never drop a send.
 */
let mirrorChain: Promise<void> = Promise.resolve();
function syncReminderMirror(): Promise<void> {
  mirrorChain = mirrorChain
    .catch(() => undefined)
    .then(async () => {
      const existing = await idbGet<ReminderMirror>(STORE_NOTIFICATION_PREFS, 'prefs').catch(
        () => null
      );
      const local = loadNotificationPrefs();
      const prefs: NotificationPreferences = {
        ...local,
        lastSentDateByCategory: mergeLastSentDates(
          local.lastSentDateByCategory,
          existing?.lastSentDateByCategory
        ),
      };
      const engagement = loadEngagement();
      const mergedLog: EngagementLog = {
        ...engagement,
        sentLog: mergeSentLogs(engagement.sentLog, existing?.sentLog),
      };
      saveEngagement(mergedLog);
      writeLocalPrefs(prefs);
      const mirror: ReminderMirror = {
        ...prefs,
        language: getCurrentLanguage(),
        plan: computeReminderPlan(prefs, mergedLog),
        sentLog: mergedLog.sentLog,
      };
      await idbPut(STORE_NOTIFICATION_PREFS, 'prefs', mirror);
    });
  return mirrorChain;
}

let refreshTimer: number | null = null;
/** Recompute the plan soon (debounced) — call after game-state changes. */
export function refreshReminderPlan(): void {
  if (typeof window === 'undefined') return;
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    void syncReminderMirror();
  }, 250);
}

/** Records that the player opened/returned to the game (deduplicated per 90 minutes). */
export function recordAppSession(now = Date.now()): void {
  const log = loadEngagement();
  const next = recordSession(log, now);
  if (next !== log) saveEngagement(next);
  refreshReminderPlan();
}

/** Reminders stopped after being ignored repeatedly — ask the returning player once. */
export function needsKeepRemindersCheckIn(): boolean {
  return shouldAskToKeepReminders(loadNotificationPrefs().enabled, loadEngagement());
}

export function markKeepRemindersAsked(): void {
  const log = loadEngagement();
  const lastSent = log.sentLog[log.sentLog.length - 1]?.sentAt ?? null;
  saveEngagement({ ...log, pauseAskedFor: lastSent });
}

function writeLocalPrefs(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore quota errors
  }
}

export function saveNotificationPrefs(prefs: NotificationPreferences): void {
  writeLocalPrefs(prefs);
  // Mirror to IndexedDB (with the plan and language) so the Service Worker can act offline
  void syncReminderMirror();
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
    if (!loadNotificationPrefs().enabled) return;
    // Pull in sends made by the Service Worker (Periodic Background Sync) while closed
    await syncReminderMirror();
    const prefs = loadNotificationPrefs();
    const log = loadEngagement();
    const now = new Date();
    const plan = computeReminderPlan(prefs, log, now.getTime());
    const sentDates = [
      ...Object.values(prefs.lastSentDateByCategory),
      ...log.sentLog.map((x) => x.dateKey),
    ];
    const entry = selectDueEntry(plan, toPlanSettings(prefs), sentDates, now);
    if (!entry) return;

    // Record the send BEFORE async dispatch so rapid checks can never duplicate it
    saveEngagement({
      ...log,
      sentLog: mergeSentLogs(log.sentLog, [
        { dateKey: entry.dateKey, sentAt: now.getTime(), kind: entry.kind },
      ]).slice(-MAX_SENT_LOG),
    });
    saveNotificationPrefs({
      ...prefs,
      lastSentDateByCategory: { ...prefs.lastSentDateByCategory, [entry.kind]: entry.dateKey },
    });

    const copy: ReminderMessagePayload = {
      title: entry.title,
      body: entry.body,
      route: entry.route,
      category: entry.kind,
    };
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

  // Re-localize the planned reminders whenever the player switches English <-> French
  const onLangChanged = () => {
    refreshReminderPlan();
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
