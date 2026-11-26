import { PlayerSettings } from './gameTypes';
import { NotificationCategory } from '../services/reminderPlanner';

export const ALL_NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
  'streak',
  'dailyPuzzle',
  'specialChallenges',
  'continueAdventure',
];

export function isAdUiAllowed(settings: Pick<PlayerSettings, 'familyMode'>): boolean {
  return !settings.familyMode;
}

export function isStreakUiAllowed(settings: Pick<PlayerSettings, 'familyMode'>): boolean {
  return !settings.familyMode;
}

export function allowedReminderCategories(
  settings: Pick<PlayerSettings, 'familyMode'>
): NotificationCategory[] {
  return settings.familyMode ? ['dailyPuzzle'] : [...ALL_NOTIFICATION_CATEGORIES];
}

const PIN_SALT = 'meowdoku-family:';

export async function hashFamilyPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${PIN_SALT}${pin}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyFamilyPin(
  pin: string,
  expectedHash: string
): Promise<boolean> {
  if (!/^\d{4}$/.test(pin) || !/^[0-9a-f]{64}$/.test(expectedHash)) return false;
  const actual = await hashFamilyPin(pin);
  return actual === expectedHash;
}

export interface ParentGateChallenge {
  a: number;
  b: number;
  answer: number;
}

export function generateParentGate(
  rand: () => number = Math.random
): ParentGateChallenge {
  const r1 = Math.min(0.999999999, Math.max(0, rand()));
  const r2 = Math.min(0.999999999, Math.max(0, rand()));
  const a = 10 + Math.floor(r1 * 90);
  const b = 2 + Math.floor(r2 * 8);
  return { a, b, answer: a * b };
}

export function isValidParentGateAnswer(
  challenge: ParentGateChallenge,
  input: string
): boolean {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return false;
  return Number(trimmed) === challenge.answer;
}
