import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import {
  ChestBonus,
  CHEST_ACCESSORY_FALLBACK_COINS,
  CHEST_GUARANTEED,
  createInitialChestState,
  PendingChest,
} from '../game/chests';

const S = () => useGameStore.getState();

function solveCurrentPuzzle(): void {
  for (const cat of S().puzzle.solution) {
    if (S().board[cat.row]![cat.col] !== 'cat') S().attemptPlaceCat(cat);
  }
}

function seedChest(bonus: ChestBonus): PendingChest {
  const chest: PendingChest = { id: 'chest-test-1', earnedAt: 1, bonus };
  useGameStore.setState({ chests: { ...createInitialChestState(7), pending: [chest] } });
  return chest;
}

describe('Puzzle chests in the store (#21)', () => {
  beforeEach(() => {
    S().resetAllProgress();
  });

  it('opens a coin-bonus chest: exactly guaranteed + bonus', () => {
    seedChest({ kind: 'coins', amount: 15 });
    const before = { coins: S().fishCoins, boosters: { ...S().boosters } };
    expect(S().openNextChest()).toBe(true);
    expect(S().fishCoins - before.coins).toBe(CHEST_GUARANTEED.coins + 15);
    expect(S().boosters.hint - before.boosters.hint).toBe(CHEST_GUARANTEED.boosters.hint);
    expect(S().boosters.superHint).toBe(before.boosters.superHint);
    expect(S().chests.pending).toHaveLength(0);
    expect(S().chests.opened).toBe(1);
    expect(S().chestRevealModal?.coins).toBe(CHEST_GUARANTEED.coins + 15);
    expect(S().openNextChest()).toBe(false);
  });

  it('opens a booster-bonus chest', () => {
    seedChest({ kind: 'booster', id: 'superHint' });
    const before = { coins: S().fishCoins, boosters: { ...S().boosters } };
    S().openNextChest();
    expect(S().fishCoins - before.coins).toBe(CHEST_GUARANTEED.coins);
    expect(S().boosters.hint - before.boosters.hint).toBe(1);
    expect(S().boosters.superHint - before.boosters.superHint).toBe(1);
    expect(S().chestRevealModal?.items).toHaveLength(2);
  });

  it('opens an accessory-bonus chest into unlockedAccessoryIds', () => {
    seedChest({ kind: 'accessory', id: 'roundGlasses' });
    const before = S().fishCoins;
    S().openNextChest();
    expect(S().unlockedAccessoryIds).toContain('roundGlasses');
    expect(S().fishCoins - before).toBe(CHEST_GUARANTEED.coins);
  });

  it('pays the fallback coins for a converted accessory outcome', () => {
    seedChest({ kind: 'coins', amount: CHEST_ACCESSORY_FALLBACK_COINS, convertedFromAccessory: true });
    const before = S().fishCoins;
    S().openNextChest();
    expect(S().fishCoins - before).toBe(CHEST_GUARANTEED.coins + CHEST_ACCESSORY_FALLBACK_COINS);
  });

  it('earns a chest after 3 first clears in Classic, but not from Practice', () => {
    useGameStore.setState({ unlockedLevelId: 24 });
    S().updateSetting('gameMode', 'practice');
    S().startLevel(11, false); // not a campaign chest milestone level (#22)
    solveCurrentPuzzle();
    expect(S().chests.progress).toBe(0);
    expect(S().chests.pending).toHaveLength(0);

    S().updateSetting('gameMode', 'classic');
    for (const id of [1, 2, 3]) {
      S().startLevel(id, false);
      solveCurrentPuzzle();
    }
    expect(S().chests.progress).toBe(0);
    expect(S().chests.pending).toHaveLength(1);

    // A replay without improvement does not count
    useGameStore.setState({ elapsedSec: 9999 });
    S().startLevel(1, false);
    useGameStore.setState({ elapsedSec: 9999 });
    solveCurrentPuzzle();
    expect(S().chests.progress).toBe(0);
  });
});
