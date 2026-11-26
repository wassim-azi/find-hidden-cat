/**
 * Pure, on-device reminder planning (no server, no network).
 *
 * The app records when the player opens it and when reminders were sent. From that it builds
 * a short day-by-day plan that both the page and the Service Worker follow:
 *  1. Automatic timing — aim shortly before the time the player usually plays.
 *  2. No reminder on a day the player already opened the game.
 *  3. Event-based messages — streak about to lapse, today's Daily Kitty, the weekly Golden
 *     Cat, or the next campaign level — instead of generic nudges.
 *  4. Back-off — after 3 ignored reminders send every other day; after 5, stop entirely
 *     (the app asks once, on the player's next visit, whether to keep them).
 *
 * The plan assumes the player does NOT come back; every visit recomputes it, so returning
 * players automatically get the normal schedule again.
 */

import { getWeekKey } from '../game/dateKeys';

export type NotificationCategory =
  | 'streak'
  | 'dailyPuzzle'
  | 'specialChallenges'
  | 'continueAdventure';

export type ReminderKind = NotificationCategory | 'chestReady' | 'missionAlmostDone';
export type ReminderRoute = 'daily' | 'map' | 'missions' | 'rewards';

export const CATEGORY_OF_KIND: Record<ReminderKind, NotificationCategory> = {
  streak: 'streak',
  dailyPuzzle: 'dailyPuzzle',
  specialChallenges: 'specialChallenges',
  continueAdventure: 'continueAdventure',
  chestReady: 'continueAdventure',
  missionAlmostDone: 'continueAdventure',
};

export interface SentReminder {
  dateKey: string;
  sentAt: number;
  kind: ReminderKind;
}

export interface EngagementLog {
  /** Epoch ms of app sessions (deduplicated: one per SESSION_GAP_MS) */
  sessionStarts: number[];
  /** Reminders delivered by the page or the Service Worker */
  sentLog: SentReminder[];
  /** sentAt of the last reminder we already asked about after a pause (ask only once) */
  pauseAskedFor: number | null;
}

export const EMPTY_ENGAGEMENT: EngagementLog = {
  sessionStarts: [],
  sentLog: [],
  pauseAskedFor: null,
};

export interface ReminderGameContext {
  completedDailyDates: string[];
  /** Level the "Continue" button would open */
  nextLevelId: number;
  allLevelsCompleted: boolean;
  lastLoginClaimDateKey: string | null;
  loginStreak: number;
  /** True when this week's Golden Cat trial (for the given day) is already solved */
  isGoldenDoneForDate: (date: Date) => boolean;
  /** Number of earned Puzzle chests waiting to be opened */
  pendingChests: number;
  /** Week key (`YYYY-WNN`) when an unclaimed weekly mission has target - progress === 1 */
  weeklyMissionNearlyDoneWeekKey: string | null;
}

export interface ReminderPlanSettings {
  enabled: boolean;
  timingMode: 'auto' | 'manual';
  manualMinutes: number;
  quietHoursEnabled: boolean;
  quietStartMinutes: number;
  quietEndMinutes: number;
  categories: Record<NotificationCategory, boolean>;
}

export interface ReminderPlanEntry {
  dateKey: string;
  notBeforeMinutes: number;
  kind: ReminderKind;
  route: ReminderRoute;
  title: string;
  body: string;
}

export type ReminderCopyFn = (
  kind: ReminderKind,
  params: { count?: number; level?: number; variant: number }
) => { title: string; body: string };

export const SESSION_GAP_MS = 90 * 60 * 1000;
export const MAX_SESSIONS = 40;
export const MAX_SENT_LOG = 20;
export const DEFAULT_REMINDER_MINUTES = 19 * 60;
/** Ignored reminders before switching to every other day */
export const BACKOFF_AFTER_IGNORED = 3;
/** Ignored reminders before stopping entirely */
export const STOP_AFTER_IGNORED = 5;
const LEARNING_WINDOW_DAYS = 21;
const MIN_DISTINCT_DAYS = 3;
const LEAD_MINUTES = 30;
const BIN_MINUTES = 30;
const DAY_MS = 86_400_000;

const ROUTE_BY_KIND: Record<ReminderKind, ReminderRoute> = {
  streak: 'rewards',
  dailyPuzzle: 'daily',
  specialChallenges: 'missions',
  continueAdventure: 'map',
  chestReady: 'map',
  missionAlmostDone: 'missions',
};

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, days: number): string {
  const d = dateFromKey(key);
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((dateFromKey(toKey).getTime() - dateFromKey(fromKey).getTime()) / DAY_MS);
}

export function minutesToHHMM(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function inQuiet(minute: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

/** Adds a session start unless the previous one is within SESSION_GAP_MS. */
export function recordSession(log: EngagementLog, now: number): EngagementLog {
  const last = log.sessionStarts[log.sessionStarts.length - 1];
  if (last !== undefined && now - last < SESSION_GAP_MS && now >= last) return log;
  return { ...log, sessionStarts: [...log.sessionStarts, now].slice(-MAX_SESSIONS) };
}

/** Merges sent logs from page and Service Worker (one entry per day, earliest send wins). */
export function mergeSentLogs(a: SentReminder[] = [], b: SentReminder[] = []): SentReminder[] {
  const byDay = new Map<string, SentReminder>();
  for (const s of [...a, ...b]) {
    if (!s || typeof s.dateKey !== 'string' || typeof s.sentAt !== 'number') continue;
    const prev = byDay.get(s.dateKey);
    if (!prev || s.sentAt < prev.sentAt) byDay.set(s.dateKey, s);
  }
  return [...byDay.values()].sort((x, y) => x.sentAt - y.sentAt).slice(-MAX_SENT_LOG);
}

/**
 * Learns the player's usual play time from recent sessions and returns a reminder time a
 * little before it. Needs sessions on at least 3 different days in the last 3 weeks;
 * otherwise `learned` is false and the fallback is used.
 */
export function computeAutoReminderMinutes(
  sessionStarts: number[],
  now: number,
  quiet: { enabled: boolean; start: number; end: number },
  fallbackMinutes = DEFAULT_REMINDER_MINUTES
): { minutes: number; learned: boolean } {
  const recent = sessionStarts.filter((t) => t <= now && now - t <= LEARNING_WINDOW_DAYS * DAY_MS);
  const days = new Set(recent.map((t) => toDateKey(new Date(t))));
  if (days.size < MIN_DISTINCT_DAYS) return { minutes: fallbackMinutes, learned: false };

  const bins = 1440 / BIN_MINUTES;
  const weights = new Array<number>(bins).fill(0);
  for (const t of recent) {
    const d = new Date(t);
    const minute = d.getHours() * 60 + d.getMinutes();
    // Sessions from the last week count double
    weights[Math.floor(minute / BIN_MINUTES)]! += now - t <= 7 * DAY_MS ? 2 : 1;
  }
  // Light smoothing with the neighbouring half-hours (circular)
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < bins; i++) {
    const score =
      weights[i]! * 2 + weights[(i + bins - 1) % bins]! + weights[(i + 1) % bins]!;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }

  let target = (best * BIN_MINUTES - LEAD_MINUTES + 1440) % 1440;
  if (quiet.enabled && inQuiet(target, quiet.start, quiet.end)) {
    // Never aim into quiet hours: move to just before they begin
    target = (quiet.start - LEAD_MINUTES + 1440) % 1440;
  }
  return { minutes: Math.round(target / 5) * 5, learned: true };
}

export function getEffectiveReminderMinutes(
  settings: Pick<
    ReminderPlanSettings,
    'timingMode' | 'manualMinutes' | 'quietHoursEnabled' | 'quietStartMinutes' | 'quietEndMinutes'
  >,
  log: EngagementLog,
  now: number
): { minutes: number; learned: boolean } {
  if (settings.timingMode === 'manual') return { minutes: settings.manualMinutes, learned: false };
  return computeAutoReminderMinutes(log.sessionStarts, now, {
    enabled: settings.quietHoursEnabled,
    start: settings.quietStartMinutes,
    end: settings.quietEndMinutes,
  });
}

/**
 * Number of most recent reminders in a row that were not followed by a visit
 * (a session starting after the reminder and before the next one).
 */
export function countIgnoredReminders(log: EngagementLog): number {
  const sent = [...log.sentLog].sort((a, b) => a.sentAt - b.sentAt);
  let ignored = 0;
  for (let i = sent.length - 1; i >= 0; i--) {
    const from = sent[i]!.sentAt;
    const until = sent[i + 1]?.sentAt ?? Number.POSITIVE_INFINITY;
    if (log.sessionStarts.some((t) => t >= from && t < until)) break;
    ignored += 1;
  }
  return ignored;
}

/** Reminders stopped because they kept being ignored, and we have not asked about it yet. */
export function shouldAskToKeepReminders(enabled: boolean, log: EngagementLog): boolean {
  if (!enabled) return false;
  if (countIgnoredReminders(log) < STOP_AFTER_IGNORED) return false;
  const lastSent = log.sentLog[log.sentLog.length - 1]?.sentAt ?? null;
  return lastSent !== null && log.pauseAskedFor !== lastSent;
}

function chooseKind(
  dateKey: string,
  ctx: ReminderGameContext,
  categories: Record<NotificationCategory, boolean>
): ReminderKind | null {
  const date = dateFromKey(dateKey);
  // A daily-reward streak is at risk on the day after the last claim
  if (
    categories[CATEGORY_OF_KIND.streak] &&
    ctx.loginStreak >= 2 &&
    ctx.lastLoginClaimDateKey !== null &&
    addDays(ctx.lastLoginClaimDateKey, 1) === dateKey
  ) {
    return 'streak';
  }
  // Saturdays: remind about the weekly Golden Cat if it is still unsolved
  if (
    categories[CATEGORY_OF_KIND.specialChallenges] &&
    date.getDay() === 6 &&
    !ctx.isGoldenDoneForDate(date)
  ) {
    return 'specialChallenges';
  }
  if (categories[CATEGORY_OF_KIND.dailyPuzzle] && !ctx.completedDailyDates.includes(dateKey)) {
    return 'dailyPuzzle';
  }
  if (categories[CATEGORY_OF_KIND.chestReady] && ctx.pendingChests > 0) {
    return 'chestReady';
  }
  if (
    categories[CATEGORY_OF_KIND.missionAlmostDone] &&
    ctx.weeklyMissionNearlyDoneWeekKey !== null &&
    getWeekKey(date) === ctx.weeklyMissionNearlyDoneWeekKey
  ) {
    return 'missionAlmostDone';
  }
  if (categories[CATEGORY_OF_KIND.continueAdventure] && !ctx.allLevelsCompleted) {
    return 'continueAdventure';
  }
  if (categories[CATEGORY_OF_KIND.specialChallenges] && !ctx.isGoldenDoneForDate(date)) {
    return 'specialChallenges';
  }
  return null;
}

/**
 * Builds the reminder plan for today and the next `days - 1` days, assuming the player does
 * not return (any visit recomputes it).
 */
export function buildReminderPlan(
  settings: ReminderPlanSettings,
  log: EngagementLog,
  ctx: ReminderGameContext,
  now: number,
  copy: ReminderCopyFn,
  days = 14
): ReminderPlanEntry[] {
  if (!settings.enabled) return [];
  const today = toDateKey(new Date(now));
  const { minutes } = getEffectiveReminderMinutes(settings, log, now);

  const playedToday = log.sessionStarts.some((t) => toDateKey(new Date(t)) === today);
  const sentToday = log.sentLog.some((s) => s.dateKey === today);
  let ignored = countIgnoredReminders(log);
  let lastSentDay = log.sentLog[log.sentLog.length - 1]?.dateKey ?? null;

  const plan: ReminderPlanEntry[] = [];
  for (let i = 0; i < days; i++) {
    const dateKey = addDays(today, i);
    if (i === 0 && (playedToday || sentToday)) continue;
    if (ignored >= STOP_AFTER_IGNORED) break;
    if (ignored >= BACKOFF_AFTER_IGNORED && lastSentDay && daysBetween(lastSentDay, dateKey) < 2) {
      continue;
    }
    const kind = chooseKind(dateKey, ctx, settings.categories);
    if (!kind) continue;
    const text = copy(kind, {
      count: ctx.loginStreak,
      level: ctx.nextLevelId,
      variant: dateFromKey(dateKey).getDate(),
    });
    plan.push({ dateKey, notBeforeMinutes: minutes, kind, route: ROUTE_BY_KIND[kind], ...text });
    ignored += 1;
    lastSentDay = dateKey;
  }
  return plan;
}

/** Today's entry if it may be shown now (time reached, not in quiet hours, nothing sent today). */
export function selectDueEntry(
  plan: ReminderPlanEntry[],
  settings: Pick<ReminderPlanSettings, 'quietHoursEnabled' | 'quietStartMinutes' | 'quietEndMinutes'>,
  sentDates: (string | null)[],
  now: Date
): ReminderPlanEntry | null {
  const today = toDateKey(now);
  const entry = plan.find((e) => e.dateKey === today);
  if (!entry) return null;
  const minute = now.getHours() * 60 + now.getMinutes();
  if (minute < entry.notBeforeMinutes) return null;
  if (
    settings.quietHoursEnabled &&
    inQuiet(minute, settings.quietStartMinutes, settings.quietEndMinutes)
  ) {
    return null;
  }
  if (sentDates.includes(today)) return null;
  return entry;
}
