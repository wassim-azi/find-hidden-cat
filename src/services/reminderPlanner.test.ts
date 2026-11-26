import { describe, expect, it } from 'vitest';
import {
  BACKOFF_AFTER_IGNORED,
  buildReminderPlan,
  computeAutoReminderMinutes,
  countIgnoredReminders,
  EngagementLog,
  recordSession,
  ReminderGameContext,
  ReminderPlanSettings,
  shouldAskToKeepReminders,
  STOP_AFTER_IGNORED,
  toDateKey,
} from './reminderPlanner';

const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const NOW = at(2026, 11, 25, 9, 0); // Wednesday 25 Nov 2026, 09:00

const settings: ReminderPlanSettings = {
  enabled: true,
  timingMode: 'auto',
  manualMinutes: 19 * 60,
  quietHoursEnabled: true,
  quietStartMinutes: 22 * 60,
  quietEndMinutes: 8 * 60,
  categories: { streak: true, dailyPuzzle: true, specialChallenges: true, continueAdventure: true },
};
const ctx: ReminderGameContext = {
  completedDailyDates: [],
  nextLevelId: 7,
  allLevelsCompleted: false,
  lastLoginClaimDateKey: null,
  loginStreak: 0,
  isGoldenDoneForDate: () => false,
  pendingChests: 0,
  weeklyMissionNearlyDoneWeekKey: null,
  familyMode: false,
};
const copy = (kind: string, p: { count?: number; level?: number }) => ({
  title: 'T',
  body: `${kind}:${p.count ?? ''}:${p.level ?? ''}`,
});
const log = (sessionStarts: number[] = [], sentLog: EngagementLog['sentLog'] = []): EngagementLog => ({
  sessionStarts,
  sentLog,
  pauseAskedFor: null,
});
const plan = (l: EngagementLog, c: Partial<ReminderGameContext> = {}, s: Partial<ReminderPlanSettings> = {}, now = NOW) =>
  buildReminderPlan({ ...settings, ...s }, l, { ...ctx, ...c }, now, copy);

describe('1. Automatic timing', () => {
  it('aims about 30 minutes before the time the player usually opens the game', () => {
    const sessions = [21, 22, 23, 24].map((d) => at(2026, 11, d, 20, 10));
    const r = computeAutoReminderMinutes(sessions, NOW, { enabled: true, start: 22 * 60, end: 8 * 60 });
    expect(r.learned).toBe(true);
    expect(r.minutes).toBe(19 * 60 + 30);
  });

  it('weights the most common time, and follows a recent change of habit', () => {
    const old = [1, 2, 3, 4, 5].map((d) => at(2026, 11, d, 12, 15)); // 3+ weeks ago → ignored
    const lunch = [10, 12].map((d) => at(2026, 11, d, 12, 40));
    const morning = [20, 22, 23, 24].map((d) => at(2026, 11, d, 8, 20));
    const r = computeAutoReminderMinutes([...old, ...lunch, ...morning], NOW, { enabled: true, start: 22 * 60, end: 7 * 60 });
    expect(r.minutes).toBe(7 * 60 + 30);
  });

  it('needs at least 3 different days before trusting the pattern', () => {
    const r = computeAutoReminderMinutes([at(2026, 11, 24, 8, 0), at(2026, 11, 24, 12, 0), at(2026, 11, 23, 8, 0)], NOW, {
      enabled: false, start: 0, end: 0,
    });
    expect(r).toEqual({ minutes: 19 * 60, learned: false });
  });

  it('never aims into quiet hours', () => {
    const night = [21, 22, 23, 24].map((d) => at(2026, 11, d, 23, 0));
    const r = computeAutoReminderMinutes(night, NOW, { enabled: true, start: 22 * 60, end: 8 * 60 });
    expect(r.minutes).toBe(21 * 60 + 30);
  });

  it('manual mode uses the chosen time, and sessions are deduplicated', () => {
    const p = plan(log(), {}, { timingMode: 'manual', manualMinutes: 18 * 60 + 15 });
    expect(p[0]!.notBeforeMinutes).toBe(18 * 60 + 15);
    const l = recordSession(recordSession(log(), NOW), NOW + 20 * 60_000);
    expect(l.sessionStarts).toHaveLength(1);
    expect(recordSession(l, NOW + 2 * 3600_000).sessionStarts).toHaveLength(2);
  });
});

describe('2. No reminder on a day the player already played', () => {
  it('skips today after a visit, but plans tomorrow', () => {
    const p = plan(log([at(2026, 11, 25, 8, 30)]));
    expect(p[0]!.dateKey).toBe('2026-11-26');
  });

  it('plans today when the last visit was yesterday', () => {
    expect(plan(log([at(2026, 11, 24, 20, 0)]))[0]!.dateKey).toBe('2026-11-25');
  });

  it('skips today when a reminder was already sent today', () => {
    expect(plan(log([], [{ dateKey: '2026-11-25', sentAt: at(2026, 11, 25, 7, 0), kind: 'dailyPuzzle' }]))[0]!.dateKey).toBe('2026-11-26');
  });
});

describe('3. Event-based messages', () => {
  it('streak reminder on the day after the last reward claim, with the real streak count', () => {
    const p = plan(log(), { lastLoginClaimDateKey: '2026-11-24', loginStreak: 6 });
    expect(p[0]).toMatchObject({ dateKey: '2026-11-25', kind: 'streak', route: 'rewards', body: 'streak:6:7' });
    // only that one day — afterwards the streak is gone, so no further streak messages
    expect(p.slice(1).every((e) => e.kind !== 'streak')).toBe(true);
  });

  it('no streak message for a 1-day streak or when the category is off', () => {
    expect(plan(log(), { lastLoginClaimDateKey: '2026-11-24', loginStreak: 1 })[0]!.kind).toBe('dailyPuzzle');
    expect(
      plan(log(), { lastLoginClaimDateKey: '2026-11-24', loginStreak: 5 }, {
        categories: { ...settings.categories, streak: false },
      })[0]!.kind
    ).toBe('dailyPuzzle');
  });

  it("Daily Kitty when today's daily is unsolved, next level when it is solved", () => {
    expect(plan(log())[0]).toMatchObject({ kind: 'dailyPuzzle', route: 'daily' });
    const p = plan(log(), { completedDailyDates: ['2026-11-25'] });
    expect(p[0]).toMatchObject({ dateKey: '2026-11-25', kind: 'continueAdventure', body: 'continueAdventure:0:7' });
  });

  it('Golden Cat on Saturday only while this week’s trial is unsolved', () => {
    const saturday = at(2026, 11, 28, 9, 0);
    const visitedFriday = log([at(2026, 11, 27, 20, 0)]);
    expect(plan(visitedFriday, {}, {}, saturday)[0]).toMatchObject({ dateKey: '2026-11-28', kind: 'specialChallenges', route: 'missions' });
    expect(plan(visitedFriday, { isGoldenDoneForDate: () => true }, {}, saturday)[0]!.kind).toBe('dailyPuzzle');
    // Not on other weekdays
    expect(plan(log([at(2026, 11, 24, 20, 0)]))[0]!.kind).toBe('dailyPuzzle');
  });

  it('nothing to say → no reminder', () => {
    const p = plan(log(), { completedDailyDates: ['2026-11-25'], allLevelsCompleted: true, isGoldenDoneForDate: () => true });
    expect(p.find((e) => e.dateKey === '2026-11-25')).toBeUndefined();
    expect(plan(log(), {}, { enabled: false })).toEqual([]);
  });
});

describe('4. Back-off when reminders are ignored', () => {
  const sent = (days: number[]) =>
    days.map((d) => ({ dateKey: toDateKey(new Date(2026, 10, d)), sentAt: at(2026, 11, d, 19, 30), kind: 'dailyPuzzle' as const }));

  it('a visit after a reminder counts as answered', () => {
    expect(countIgnoredReminders(log([at(2026, 11, 22, 21, 0)], sent([20, 21, 22])))).toBe(0);
    expect(countIgnoredReminders(log([at(2026, 11, 21, 21, 0)], sent([20, 21, 22, 23])))).toBe(2);
  });

  it('sends daily, then every other day after 3 ignored, then stops after 5', () => {
    const p = plan(log([at(2026, 11, 20, 8, 0)]));
    const days = p.map((e) => Number(e.dateKey.slice(-2)));
    // 25, 26, 27 daily (3 ignored) → 29, Dec 1 every other day → stop at 5
    expect(days).toEqual([25, 26, 27, 29, 1]);
    expect(BACKOFF_AFTER_IGNORED).toBe(3);
    expect(STOP_AFTER_IGNORED).toBe(5);
  });

  it('continues the back-off from reminders already ignored', () => {
    const p = plan(log([at(2026, 11, 19, 8, 0)], sent([21, 22, 23, 24])));
    expect(p.map((e) => e.dateKey)).toEqual(['2026-11-26']);
  });

  it('stops after 5 ignored, asks once on return, and the return resumes reminders', () => {
    const l = log([at(2026, 11, 10, 8, 0)], sent([18, 19, 20, 22, 24]));
    expect(plan(l)).toEqual([]);
    expect(shouldAskToKeepReminders(true, l)).toBe(true);
    expect(shouldAskToKeepReminders(true, { ...l, pauseAskedFor: l.sentLog[4]!.sentAt })).toBe(false);
    expect(shouldAskToKeepReminders(false, l)).toBe(false);
    const back = recordSession(l, NOW);
    expect(countIgnoredReminders(back)).toBe(0);
    expect(plan(back)[0]!.dateKey).toBe('2026-11-26');
  });
});

describe('5. Chest, near-done mission kinds & copy variants (#27)', () => {
  it('picks chestReady (route map) when Daily is solved and pendingChests > 0, and prefers dailyPuzzle when unsolved', () => {
    const chestPlan = plan(log(), { completedDailyDates: ['2026-11-25'], pendingChests: 1 });
    expect(chestPlan[0]!.dateKey).toBe('2026-11-25');
    expect(chestPlan[0]!.kind).toBe('chestReady');
    expect(chestPlan[0]!.route).toBe('map');

    const unsolvedPlan = plan(log(), { completedDailyDates: [], pendingChests: 1 });
    expect(unsolvedPlan[0]!.dateKey).toBe('2026-11-25');
    expect(unsolvedPlan[0]!.kind).toBe('dailyPuzzle');
  });

  it('picks missionAlmostDone only on dates in the matching weekKey', async () => {
    const { getWeekKey } = await import('../game/dateKeys');
    // NOW is Wed 2026-11-25; Sun 2026-11-29 begins the next week
    const matchingWeek = getWeekKey(new Date(2026, 10, 25));
    const solvedDates = ['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];
    const p = plan(log(), {
      completedDailyDates: solvedDates,
      weeklyMissionNearlyDoneWeekKey: matchingWeek,
      isGoldenDoneForDate: () => true,
    });
    const wed = p.find((e) => e.dateKey === '2026-11-25');
    const thu = p.find((e) => e.dateKey === '2026-11-26');
    const sunNextWeek = p.find((e) => e.dateKey === '2026-11-29');
    expect(wed?.kind).toBe('missionAlmostDone');
    expect(wed?.route).toBe('missions');
    expect(thu?.kind).toBe('missionAlmostDone');
    expect(sunNextWeek?.kind).toBe('continueAdventure');
  });

  it('continueAdventure = false suppresses chestReady, missionAlmostDone, and continueAdventure', async () => {
    const { getWeekKey } = await import('../game/dateKeys');
    const matchingWeek = getWeekKey(new Date(2026, 10, 25));
    const p = plan(
      log(),
      {
        completedDailyDates: ['2026-11-25'],
        pendingChests: 2,
        weeklyMissionNearlyDoneWeekKey: matchingWeek,
        isGoldenDoneForDate: () => true,
      },
      {
        categories: {
          streak: true,
          dailyPuzzle: true,
          specialChallenges: true,
          continueAdventure: false,
        },
      }
    );
    expect(p.find((e) => e.dateKey === '2026-11-25')).toBeUndefined();
    expect(p.some((e) => e.kind === 'chestReady' || e.kind === 'missionAlmostDone')).toBe(false);
  });

  it('rotates body copy across consecutive dates of the same kind (#27)', async () => {
    const { makeReminderCopy, REMINDER_VARIANT_COUNTS } = await import('./localNotifications');
    expect(REMINDER_VARIANT_COUNTS).toEqual({
      streak: 4,
      dailyPuzzle: 4,
      specialChallenges: 3,
      continueAdventure: 3,
      chestReady: 2,
      missionAlmostDone: 2,
    });

    const p = buildReminderPlan(settings, log(), ctx, NOW, makeReminderCopy('en'));
    expect(p[0]!.kind).toBe('dailyPuzzle');
    expect(p[1]!.kind).toBe('dailyPuzzle');
    expect(p[0]!.body).not.toBe(p[1]!.body);

    const chestP = buildReminderPlan(
      settings,
      log(),
      { ...ctx, completedDailyDates: ['2026-11-25', '2026-11-26'], pendingChests: 1 },
      NOW,
      makeReminderCopy('fr')
    );
    expect(chestP[0]!.kind).toBe('chestReady');
    expect(chestP[1]!.kind).toBe('chestReady');
    expect(chestP[0]!.body).not.toBe(chestP[1]!.body);
  });

  it('with familyMode=true only plans dailyPuzzle entries regardless of other triggers (#29)', () => {
    const p = plan(
      log(),
      {
        familyMode: true,
        lastLoginClaimDateKey: '2026-11-24',
        loginStreak: 6,
        pendingChests: 2,
        weeklyMissionNearlyDoneWeekKey: '2026-W48',
        completedDailyDates: ['2026-11-25'],
      },
      settings,
      NOW
    );
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((e) => e.kind === 'dailyPuzzle')).toBe(true);
    expect(p.some((e) => e.dateKey === '2026-11-25')).toBe(false);

    // If dailyPuzzle category is off while familyMode is on, no entries are planned
    const none = plan(
      log(),
      { familyMode: true, pendingChests: 2, loginStreak: 5, lastLoginClaimDateKey: '2026-11-24' },
      { categories: { ...settings.categories, dailyPuzzle: false } },
      NOW
    );
    expect(none).toEqual([]);
  });
});
