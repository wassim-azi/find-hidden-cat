export const IDLE_RESET_MS = 10 * 60 * 1000;

let sessionStartAt: number | null = null;
let lastActiveAt: number | null = null;
let breakShown = false;

export function markActive(now: number = Date.now()): void {
  if (
    sessionStartAt === null ||
    lastActiveAt === null ||
    now - lastActiveAt > IDLE_RESET_MS
  ) {
    sessionStartAt = now;
    breakShown = false;
  }
  lastActiveAt = now;
}

export function getContinuousMinutes(now: number = Date.now()): number {
  if (sessionStartAt === null || now <= sessionStartAt) return 0;
  return Math.floor((now - sessionStartAt) / 60000);
}

export function consumeBreakNote(now: number, settingMinutes: number): boolean {
  if (settingMinutes <= 0 || breakShown) return false;
  if (getContinuousMinutes(now) < settingMinutes) return false;
  breakShown = true;
  return true;
}

export function resetPlaySession(): void {
  sessionStartAt = null;
  lastActiveAt = null;
  breakShown = false;
}
