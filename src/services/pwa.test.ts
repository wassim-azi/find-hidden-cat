import { describe, expect, it } from 'vitest';
import manifestRaw from '../../public/manifest.webmanifest?raw';
import swRaw from '../../public/sw.js?raw';
import { isWithinQuietHours, makeReminderCopy, parseTimeToMinutes } from './localNotifications';
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

  it('provides localized English and French reminder copy for every reminder type', () => {
    const en = makeReminderCopy('en');
    const fr = makeReminderCopy('fr');
    for (const kind of ['streak', 'dailyPuzzle', 'specialChallenges', 'continueAdventure'] as const) {
      const e = en(kind, { count: 6, level: 7, variant: 1 });
      const f = fr(kind, { count: 6, level: 7, variant: 1 });
      expect(e.body).not.toMatch(/\{\{|notifications\./);
      expect(f.body).not.toMatch(/\{\{|notifications\./);
      expect(e.body).not.toBe(f.body);
    }
    expect(en('streak', { count: 6, variant: 0 }).body).toContain('6-day');
    expect(fr('continueAdventure', { level: 7, variant: 0 }).body).toContain('niveau 7');
  });
});
