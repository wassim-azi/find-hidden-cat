import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeBreakNote,
  getContinuousMinutes,
  IDLE_RESET_MS,
  markActive,
  resetPlaySession,
} from './playSession';

describe('playSession (#26)', () => {
  beforeEach(() => {
    resetPlaySession();
  });

  it('triggers consumeBreakNote exactly once after 31 minutes with setting 30', () => {
    const t0 = 1_700_000_000_000;
    for (let min = 0; min <= 31; min++) {
      markActive(t0 + min * 60_000);
    }

    const at31 = t0 + 31 * 60_000;
    expect(getContinuousMinutes(at31)).toBe(31);
    expect(consumeBreakNote(at31, 30)).toBe(true);
    expect(consumeBreakNote(at31 + 60_000, 30)).toBe(false);
  });

  it('resets the session after an idle gap greater than IDLE_RESET_MS (15 min)', () => {
    const t0 = 1_700_000_000_000;
    markActive(t0);
    markActive(t0 + 20 * 60_000);
    expect(IDLE_RESET_MS).toBe(10 * 60_000);
    // 15-min idle gap (> 10 min) -> fresh session starts at t0 + 20m
    expect(getContinuousMinutes(t0 + 20 * 60_000)).toBe(0);

    // 31 min later, break note becomes eligible
    for (let min = 21; min <= 51; min++) {
      markActive(t0 + min * 60_000);
    }
    const afterRestart31 = t0 + 51 * 60_000;
    expect(getContinuousMinutes(afterRestart31)).toBe(31);
    expect(consumeBreakNote(afterRestart31, 30)).toBe(true);
  });

  it('never triggers break note when setting is 0', () => {
    const t0 = 1_700_000_000_000;
    for (let min = 0; min <= 90; min += 5) {
      markActive(t0 + min * 60_000);
    }
    expect(consumeBreakNote(t0 + 90 * 60_000, 0)).toBe(false);
  });
});
