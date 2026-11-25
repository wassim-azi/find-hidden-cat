import { describe, expect, it } from 'vitest';
import { getWeekKey } from './dateKeys';
import { getCurrentWeekKey } from './events';

describe('dateKeys.getWeekKey', () => {
  it('rolls over from Saturday to Sunday (Sunday-start weeks)', () => {
    const sat = new Date(2026, 10, 28); // Saturday, Nov 28, 2026
    const sun = new Date(2026, 10, 29); // Sunday, Nov 29, 2026
    expect(sat.getDay()).toBe(6);
    expect(sun.getDay()).toBe(0);
    expect(getWeekKey(sat)).not.toBe(getWeekKey(sun));
  });

  it('resets across the December 31 -> January 1 year boundary', () => {
    const dec31 = new Date(2026, 11, 31);
    const jan1 = new Date(2027, 0, 1);
    expect(getWeekKey(dec31)).not.toBe(getWeekKey(jan1));
    expect(getWeekKey(jan1)).toBe('2027-W01');
  });

  it('matches getCurrentWeekKey identically across 400 consecutive days from 2026-01-01', () => {
    for (let i = 0; i < 400; i++) {
      const d = new Date(2026, 0, 1 + i);
      expect(getWeekKey(d)).toBe(getCurrentWeekKey(d));
    }
  });
});
