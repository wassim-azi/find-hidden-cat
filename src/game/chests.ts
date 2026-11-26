import type { AccessoryId } from './accessories';
import type { BoosterId } from './economy';
import type { PuzzleCompletedEvent } from './progressStats';

/**
 * Puzzle chests (#21): a recurring chest track earned only by playing.
 *
 * - Every CHEST_EVERY qualifying Classic completions earn one chest.
 * - Each chest always contains CHEST_GUARANTEED plus exactly one bonus rolled from
 *   CHEST_BONUS_TABLE (odds are published in-app from this same table).
 * - The bonus is rolled when the chest is EARNED with a persisted seeded RNG, stored, and
 *   only revealed on open, so reloading can never re-roll it.
 * - Chests are never purchasable: no shop item, no ad placement, no coin price.
 */

export const CHEST_EVERY = 3;
export const CHEST_GUARANTEED = { coins: 30, boosters: { hint: 1 } } as const;
export const CHEST_BONUS_TABLE = [
  { kind: 'coins', amount: 15, weight: 70 },
  { kind: 'booster', id: 'superHint', weight: 25 },
  { kind: 'accessory', weight: 5 },
] as const;
export const CHEST_ACCESSORY_FALLBACK_COINS = 50;
export const PITY_AFTER = 9;
/** Chest-only accessories, granted in this order (first one not yet owned). */
export const CHEST_ACCESSORY_ORDER: readonly AccessoryId[] = ['goldBell', 'pawCharm', 'roundGlasses'];
export const MAX_PENDING_CHESTS = 20;

export type ChestBonus =
  | { kind: 'coins'; amount: number }
  | { kind: 'booster'; id: BoosterId }
  | { kind: 'accessory'; id: AccessoryId }
  | { kind: 'coins'; amount: number; convertedFromAccessory: true };

export interface PendingChest {
  id: string;
  earnedAt: number;
  bonus: ChestBonus;
}

export interface ChestState {
  progress: number;
  pending: PendingChest[];
  rngState: number;
  opened: number;
  sinceLastAccessory: number;
}

export interface ChestOddsLine {
  entry: (typeof CHEST_BONUS_TABLE)[number];
  /** Exact percentage: weight / total weight × 100. */
  percent: number;
}

export function getChestTotalWeight(): number {
  return CHEST_BONUS_TABLE.reduce((sum, e) => sum + e.weight, 0);
}

/** Published odds, generated from the same table the RNG rolls against. */
export function getChestOdds(): ChestOddsLine[] {
  const total = getChestTotalWeight();
  return CHEST_BONUS_TABLE.map((entry) => ({
    entry,
    percent: Math.round((entry.weight / total) * 10000) / 100,
  }));
}

/** One-time RNG seed: crypto when available, else the clock. */
export function createChestRngSeed(): number {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      return crypto.getRandomValues(new Uint32Array(1))[0]! >>> 0;
    }
  } catch {
    // fall through to the clock
  }
  return Date.now() >>> 0;
}

export function createInitialChestState(rngState: number = createChestRngSeed()): ChestState {
  return { progress: 0, pending: [], rngState: rngState >>> 0, opened: 0, sinceLastAccessory: 0 };
}

/** mulberry32: returns a value in [0, 1) and the next 32-bit state. */
export function mulberry32Next(state: number): { value: number; next: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, next };
}

function firstUnownedChestAccessory(owned: readonly AccessoryId[]): AccessoryId | null {
  return CHEST_ACCESSORY_ORDER.find((id) => !owned.includes(id)) ?? null;
}

/**
 * Rolls one chest bonus. Always consumes exactly one RNG step.
 * Pity: after PITY_AFTER chests without an accessory, the next bonus IS the accessory
 * (while any chest accessory remains).
 */
export function rollBonus(
  rngState: number,
  ownedAccessories: AccessoryId[],
  sinceLastAccessory: number
): { bonus: ChestBonus; nextRng: number } {
  const { value, next } = mulberry32Next(rngState);
  const available = firstUnownedChestAccessory(ownedAccessories);

  if (available && sinceLastAccessory >= PITY_AFTER) {
    return { bonus: { kind: 'accessory', id: available }, nextRng: next };
  }

  const total = getChestTotalWeight();
  let roll = value * total;
  let picked: (typeof CHEST_BONUS_TABLE)[number] = CHEST_BONUS_TABLE[CHEST_BONUS_TABLE.length - 1]!;
  for (const entry of CHEST_BONUS_TABLE) {
    if (roll < entry.weight) {
      picked = entry;
      break;
    }
    roll -= entry.weight;
  }

  if (picked.kind === 'coins') {
    return { bonus: { kind: 'coins', amount: picked.amount }, nextRng: next };
  }
  if (picked.kind === 'booster') {
    return { bonus: { kind: 'booster', id: picked.id }, nextRng: next };
  }
  if (available) {
    return { bonus: { kind: 'accessory', id: available }, nextRng: next };
  }
  return {
    bonus: { kind: 'coins', amount: CHEST_ACCESSORY_FALLBACK_COINS, convertedFromAccessory: true },
    nextRng: next,
  };
}

/** True when a completion counts toward the chest track. Practice never counts. */
export function isQualifyingCompletion(e: PuzzleCompletedEvent): boolean {
  if (e.mode !== 'classic') return false;
  if (e.source === 'campaign') return e.firstCompletion || e.improvedBest;
  return e.firstCompletion;
}

/** Accessories already owned or already sitting (unrevealed) in a pending chest. */
function effectiveOwned(s: ChestState, owned: readonly AccessoryId[]): AccessoryId[] {
  const result = [...owned];
  for (const chest of s.pending) {
    if (chest.bonus.kind === 'accessory' && !result.includes(chest.bonus.id)) {
      result.push(chest.bonus.id);
    }
  }
  return result;
}

/**
 * Earns one chest now: rolls its bonus and stores it. The RNG state advances in the same
 * returned state, so persisting it together with the chest makes the roll final.
 * A full queue (MAX_PENDING_CHESTS unopened chests) earns nothing until some are opened.
 */
export function grantChest(s: ChestState, owned: AccessoryId[], now: number): ChestState {
  if (s.pending.length >= MAX_PENDING_CHESTS) return s;
  const { bonus, nextRng } = rollBonus(s.rngState, effectiveOwned(s, owned), s.sinceLastAccessory);
  const chest: PendingChest = {
    id: `chest-${now}-${s.opened + s.pending.length + 1}`,
    earnedAt: now,
    bonus,
  };
  return {
    ...s,
    pending: [...s.pending, chest],
    rngState: nextRng,
    sinceLastAccessory: bonus.kind === 'accessory' ? 0 : s.sinceLastAccessory + 1,
  };
}

/** Adds a pending chest when progress reaches CHEST_EVERY (progress then resets to 0). */
export function applyChestProgress(
  s: ChestState,
  e: PuzzleCompletedEvent,
  owned: AccessoryId[]
): ChestState {
  if (!isQualifyingCompletion(e)) return s;
  const progress = s.progress + 1;
  if (progress < CHEST_EVERY) return { ...s, progress };
  return grantChest({ ...s, progress: 0 }, owned, e.at);
}

/** Total Fish Coins a chest pays when opened (guaranteed + coin bonus, if any). */
export function getChestCoins(bonus: ChestBonus): number {
  return CHEST_GUARANTEED.coins + (bonus.kind === 'coins' ? bonus.amount : 0);
}
