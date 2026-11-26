import { describe, expect, it } from 'vitest';
import * as chestsModule from './chests';
import {
  applyChestProgress,
  CHEST_ACCESSORY_FALLBACK_COINS,
  CHEST_ACCESSORY_ORDER,
  CHEST_BONUS_TABLE,
  CHEST_EVERY,
  ChestState,
  createInitialChestState,
  getChestOdds,
  grantChest,
  MAX_PENDING_CHESTS,
  mulberry32Next,
  PITY_AFTER,
  rollBonus,
} from './chests';
import { SHOP_ITEMS } from './economy';
import { REWARDED_AD_OFFERS } from '../services/rewardedAds';
import type { PuzzleCompletedEvent } from './progressStats';

let seq = 0;
function completion(overrides: Partial<PuzzleCompletedEvent> = {}): PuzzleCompletedEvent {
  seq += 1;
  return {
    type: 'puzzle_completed',
    id: `L1:${seq}`,
    at: 1_700_000_000_000 + seq,
    dateKey: '2026-11-26',
    weekKey: '2026-W48',
    source: 'campaign',
    puzzleKey: 'L1',
    levelId: 1,
    worldId: 1,
    mode: 'classic',
    firstCompletion: true,
    stars: 3,
    previousBestStars: 0,
    hintsUsed: 0,
    mistakesCount: 0,
    elapsedSec: 40,
    previousBestTimeSec: null,
    firstNoHint: true,
    firstNoMistake: true,
    improvedBest: false,
    catsFound: 6,
    techniques: [],
    tier: 'easy',
    parTimeSec: 60,
    ...overrides,
  };
}

describe('mulberry32Next', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const a = mulberry32Next(12345);
    const b = mulberry32Next(12345);
    expect(a).toEqual(b);
    let state = 42;
    for (let i = 0; i < 1000; i++) {
      const r = mulberry32Next(state);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      expect(Number.isInteger(r.next)).toBe(true);
      expect(r.next).toBeGreaterThanOrEqual(0);
      state = r.next;
    }
  });
});

describe('rollBonus odds', () => {
  it('matches the published 70 / 25 / 5% table over 100,000 rolls (±0.7)', () => {
    const counts = { coins: 0, booster: 0, accessory: 0 };
    let rng = 0xc0ffee;
    const N = 100_000;
    for (let i = 0; i < N; i++) {
      const { bonus, nextRng } = rollBonus(rng, [], 0);
      counts[bonus.kind] += 1;
      rng = nextRng;
    }
    expect(Math.abs((counts.coins / N) * 100 - 70)).toBeLessThanOrEqual(0.7);
    expect(Math.abs((counts.booster / N) * 100 - 25)).toBeLessThanOrEqual(0.7);
    expect(Math.abs((counts.accessory / N) * 100 - 5)).toBeLessThanOrEqual(0.7);
  });

  it('publishes percentages generated from CHEST_BONUS_TABLE', () => {
    expect(getChestOdds().map((l) => l.percent)).toEqual([70, 25, 5]);
    expect(getChestOdds().map((l) => l.entry)).toEqual([...CHEST_BONUS_TABLE]);
  });

  it('guarantees the first unowned accessory once pity is reached', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { bonus } = rollBonus(seed, [], PITY_AFTER);
      expect(bonus).toEqual({ kind: 'accessory', id: 'goldBell' });
    }
    expect(rollBonus(7, ['goldBell'], PITY_AFTER).bonus).toEqual({
      kind: 'accessory',
      id: 'pawCharm',
    });
  });

  it('converts the accessory outcome to +50 coins when every chest accessory is owned', () => {
    const owned = [...CHEST_ACCESSORY_ORDER];
    let rng = 99;
    let sawConverted = false;
    for (let i = 0; i < 2000; i++) {
      const { bonus, nextRng } = rollBonus(rng, owned, PITY_AFTER);
      expect(bonus.kind).not.toBe('accessory');
      if ('convertedFromAccessory' in bonus) {
        expect(bonus.amount).toBe(CHEST_ACCESSORY_FALLBACK_COINS);
        sawConverted = true;
      }
      rng = nextRng;
    }
    expect(sawConverted).toBe(true);
  });
});

describe('applyChestProgress', () => {
  const base = (): ChestState => createInitialChestState(1234);

  it('ignores Practice completions', () => {
    const s = base();
    expect(applyChestProgress(s, completion({ mode: 'practice' }), [])).toBe(s);
  });

  it('earns exactly one pending chest after 3 qualifying events and resets progress', () => {
    let s = base();
    s = applyChestProgress(s, completion(), []);
    s = applyChestProgress(s, completion({ source: 'daily', levelId: null, puzzleKey: '2026-11-26' }), []);
    expect(s.progress).toBe(2);
    expect(s.pending).toHaveLength(0);
    s = applyChestProgress(s, completion({ firstCompletion: false, improvedBest: true }), []);
    expect(s.progress).toBe(0);
    expect(s.pending).toHaveLength(1);
    expect(s.rngState).not.toBe(1234);
    expect(CHEST_EVERY).toBe(3);
  });

  it('does not count a campaign replay without improvement or a repeated Daily', () => {
    const s = base();
    expect(applyChestProgress(s, completion({ firstCompletion: false, improvedBest: false }), [])).toBe(s);
    expect(
      applyChestProgress(s, completion({ source: 'daily', firstCompletion: false, levelId: null }), [])
    ).toBe(s);
  });

  it('treats accessories waiting in unopened chests as owned (no duplicate rolls)', () => {
    let s: ChestState = { ...base(), sinceLastAccessory: PITY_AFTER };
    s = grantChest(s, [], 1);
    expect(s.pending[0]!.bonus).toEqual({ kind: 'accessory', id: 'goldBell' });
    expect(s.sinceLastAccessory).toBe(0);
    s = grantChest({ ...s, sinceLastAccessory: PITY_AFTER }, [], 2);
    expect(s.pending[1]!.bonus).toEqual({ kind: 'accessory', id: 'pawCharm' });
  });

  it('caps the unopened queue', () => {
    let s = base();
    for (let i = 0; i < MAX_PENDING_CHESTS + 5; i++) s = grantChest(s, [], i);
    expect(s.pending).toHaveLength(MAX_PENDING_CHESTS);
  });
});

describe('chests are never purchasable', () => {
  it('has no shop item, ad offer or coin price for chests', () => {
    for (const item of SHOP_ITEMS) {
      expect(item.id.toLowerCase()).not.toContain('chest');
    }
    for (const [placement, offer] of Object.entries(REWARDED_AD_OFFERS)) {
      expect(placement.toLowerCase()).not.toContain('chest');
      expect(offer.rewardLabel.toLowerCase()).not.toContain('chest');
    }
    const hasPrice = (v: unknown): boolean => {
      if (!v || typeof v !== 'object') return false;
      if (Array.isArray(v)) return v.some(hasPrice);
      return Object.entries(v).some(([k, val]) => k === 'priceCoins' || hasPrice(val));
    };
    for (const value of Object.values(chestsModule)) {
      expect(hasPrice(value)).toBe(false);
    }
  });
});
