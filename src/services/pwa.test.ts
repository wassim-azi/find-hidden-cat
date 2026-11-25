import { describe, expect, it } from 'vitest';
import manifestRaw from '../../public/manifest.webmanifest?raw';
import swRaw from '../../public/sw.js?raw';
import {
  DEFAULT_NOTIFICATION_PREFS,
  evaluateDueReminder,
  getLocalizedReminderCopy,
  isWithinQuietHours,
  NotificationPreferences,
  parseTimeToMinutes,
} from './localNotifications';
import { detectIsIosSafari } from './pwaInstall';

describe('PWA Manifest, Service Worker, & Browser-Only Notifications', () => {
  it('has a complete, valid PWA manifest with standalone portrait config and all required icon variants', () => {
    const manifest = JSON.parse(manifestRaw) as {
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      orientation: string;
      theme_color: string;
      background_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
      shortcuts: Array<{ name: string; url: string }>;
    };

    expect(manifest.name).toContain('Meowdoku');
    expect(manifest.short_name).toBe('Meowdoku');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.theme_color).toMatch(/^#/);
    expect(manifest.background_color).toMatch(/^#/);
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(2);

    const purposes = manifest.icons.map((i) => `${i.sizes}:${i.purpose}`);
    expect(purposes).toContain('192x192:any');
    expect(purposes).toContain('512x512:any');
    expect(purposes).toContain('192x192:maskable');
    expect(purposes).toContain('512x512:maskable');
    expect(purposes).toContain('1024x1024:any');

    // Service Worker precaches essential offline shell & icons, and skips large video precaching
    expect(swRaw).toContain('/icons/icon-192.png');
    expect(swRaw).toContain('/icons/apple-touch-icon-180.png');
    expect(swRaw).toContain('SKIP_WAITING');
    expect(swRaw).toContain('periodicsync');
    expect(swRaw).toContain('notificationclick');
  });

  it('correctly detects iOS Safari vs Android Chrome vs iOS Chrome user agents', () => {
    const iosSafariUA =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
    const iosChromeUA =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.0.0 Mobile/15E148 Safari/604.1';
    const androidChromeUA =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36';

    expect(detectIsIosSafari(iosSafariUA)).toBe(true);
    expect(detectIsIosSafari(iosChromeUA)).toBe(false);
    expect(detectIsIosSafari(androidChromeUA)).toBe(false);
  });

  it('accurately evaluates overnight and daytime quiet hours', () => {
    const s = parseTimeToMinutes('22:00');
    const e = parseTimeToMinutes('08:00');
    expect(isWithinQuietHours(parseTimeToMinutes('23:30'), s, e)).toBe(true);
    expect(isWithinQuietHours(parseTimeToMinutes('03:15'), s, e)).toBe(true);
    expect(isWithinQuietHours(parseTimeToMinutes('08:00'), s, e)).toBe(false);
    expect(isWithinQuietHours(parseTimeToMinutes('19:00'), s, e)).toBe(false);

    // Same-day range
    expect(
      isWithinQuietHours(
        parseTimeToMinutes('14:00'),
        parseTimeToMinutes('13:00'),
        parseTimeToMinutes('15:00')
      )
    ).toBe(true);
  });

  it('enforces reminder time, quiet hours, disabled stop, and strict duplicate prevention', () => {
    const basePrefs: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
      reminderTime: '19:00',
      quietHoursEnabled: true,
      quietStart: '22:00',
      quietEnd: '08:00',
    };

    // Disabled -> never fires
    expect(
      evaluateDueReminder({ ...basePrefs, enabled: false }, new Date(2026, 10, 25, 20, 0))
        .reason
    ).toBe('disabled');

    // Before preferred time -> does not fire early
    expect(
      evaluateDueReminder(basePrefs, new Date(2026, 10, 25, 18, 30)).reason
    ).toBe('before_time');

    // Inside quiet hours -> suppressed
    expect(
      evaluateDueReminder(basePrefs, new Date(2026, 10, 25, 22, 30)).reason
    ).toBe('quiet_hours');

    // Due at 19:15 (outside quiet hours) -> fires once
    const dueRes = evaluateDueReminder(basePrefs, new Date(2026, 10, 25, 19, 15));
    expect(dueRes.due).toBe(true);
    expect(dueRes.category).toBeTruthy();
    expect(dueRes.dateKey).toBe('2026-11-25');

    // Already sent today -> strictly blocked (zero duplicate reminders!)
    const afterSent: NotificationPreferences = {
      ...basePrefs,
      lastSentDateByCategory: {
        ...basePrefs.lastSentDateByCategory,
        [dueRes.category!]: dueRes.dateKey,
      },
    };
    expect(
      evaluateDueReminder(afterSent, new Date(2026, 10, 25, 20, 45)).reason
    ).toBe('already_sent_today');

    // Next day -> eligible again!
    const nextDay = evaluateDueReminder(afterSent, new Date(2026, 10, 26, 19, 5));
    expect(nextDay.due).toBe(true);
    expect(nextDay.dateKey).toBe('2026-11-26');
  });

  it('provides warm localized English and French reminder copy linked to valid game routes', () => {
    const enDaily = getLocalizedReminderCopy('dailyPuzzle', 'en', new Date(2026, 10, 25));
    const frDaily = getLocalizedReminderCopy('dailyPuzzle', 'fr', new Date(2026, 10, 25));
    expect(enDaily.route).toBe('daily');
    expect(frDaily.route).toBe('daily');
    expect(enDaily.body).not.toBe(frDaily.body);
    expect(frDaily.body.length).toBeGreaterThan(15);

    const frAdv = getLocalizedReminderCopy('continueAdventure', 'fr', new Date(2026, 10, 25));
    expect(frAdv.route).toBe('map');

    const enSpec = getLocalizedReminderCopy('specialChallenges', 'en', new Date(2026, 10, 25));
    expect(enSpec.route).toBe('missions');
  });
});
