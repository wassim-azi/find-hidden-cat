import { describe, expect, it } from 'vitest';
import {
  allowedReminderCategories,
  generateParentGate,
  hashFamilyPin,
  isAdUiAllowed,
  isStreakUiAllowed,
  isValidParentGateAnswer,
  verifyFamilyPin,
} from './familyMode';

describe('familyMode helpers (#29)', () => {
  it('enforces ad, streak, and reminder-category rules from settings.familyMode', () => {
    expect(isAdUiAllowed({ familyMode: false })).toBe(true);
    expect(isAdUiAllowed({ familyMode: true })).toBe(false);

    expect(isStreakUiAllowed({ familyMode: false })).toBe(true);
    expect(isStreakUiAllowed({ familyMode: true })).toBe(false);

    expect(allowedReminderCategories({ familyMode: false })).toEqual([
      'streak',
      'dailyPuzzle',
      'specialChallenges',
      'continueAdventure',
    ]);
    expect(allowedReminderCategories({ familyMode: true })).toEqual(['dailyPuzzle']);
  });

  it('hashes PINs with SHA-256 and verifies matching vs wrong PINs', async () => {
    const hash = await hashFamilyPin('2468');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('2468');

    expect(await verifyFamilyPin('2468', hash)).toBe(true);
    expect(await verifyFamilyPin('0000', hash)).toBe(false);
    expect(await verifyFamilyPin('246', hash)).toBe(false);
    expect(await verifyFamilyPin('abcd', hash)).toBe(false);
    expect(await verifyFamilyPin('2468', 'invalid')).toBe(false);
  });

  it('generates parent gate multiplications with a in 10..99, b in 2..9 and exact answer', () => {
    const min = generateParentGate(() => 0);
    expect(min).toEqual({ a: 10, b: 2, answer: 20 });

    const max = generateParentGate(() => 0.999999);
    expect(max).toEqual({ a: 99, b: 9, answer: 891 });

    for (let i = 0; i < 40; i++) {
      const c = generateParentGate();
      expect(c.a).toBeGreaterThanOrEqual(10);
      expect(c.a).toBeLessThanOrEqual(99);
      expect(c.b).toBeGreaterThanOrEqual(2);
      expect(c.b).toBeLessThanOrEqual(9);
      expect(c.answer).toBe(c.a * c.b);
      expect(isValidParentGateAnswer(c, String(c.answer))).toBe(true);
      expect(isValidParentGateAnswer(c, ` ${c.answer} `)).toBe(true);
      expect(isValidParentGateAnswer(c, String(c.answer + 1))).toBe(false);
      expect(isValidParentGateAnswer(c, 'abc')).toBe(false);
    }
  });
});
