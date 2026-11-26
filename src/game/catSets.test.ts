import React from 'react';
import { describe, expect, it } from 'vitest';
import { ACCESSORIES } from './accessories';
import { CAT_SETS, getSetProgress } from './catSets';
import { COLLECTIBLE_CATS } from './collectibleCats';
import { renderAccessory } from '../components/Cat/accessories';
import { useGameStore } from '../store/gameStore';

describe('Cat sets & SVG accessories (#19)', () => {
  it('assigns every cat in COLLECTIBLE_CATS to exactly one set', () => {
    const counts = new Map<string, number>();
    for (const set of CAT_SETS) {
      for (const id of set.catIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    expect(counts.size).toBe(COLLECTIBLE_CATS.length);
    for (const cat of COLLECTIBLE_CATS) {
      expect(counts.get(cat.id), `${cat.id} should belong to exactly one set`).toBe(1);
    }
  });

  it('computes getSetProgress accurately', () => {
    const village = CAT_SETS[0]!;
    expect(getSetProgress(village, ['mochi'])).toEqual({
      owned: 1,
      total: 4,
      complete: false,
    });
    expect(getSetProgress(village, ['mochi', 'marmalade', 'pebble', 'biscuit'])).toEqual({
      owned: 4,
      total: 4,
      complete: true,
    });
  });

  it('renders a valid React SVG element for every AccessoryId', () => {
    expect(ACCESSORIES).toHaveLength(14);
    for (const acc of ACCESSORIES) {
      const el = renderAccessory(acc.id);
      expect(React.isValidElement(el)).toBe(true);
    }
  });

  it('claimCatSet fails when incomplete, grants exact coins + accessory once, and rejects second claim', () => {
    const S = () => useGameStore.getState();
    S().resetAllProgress();

    const coinsBefore = S().fishCoins;
    // Incomplete village set (only mochi) -> fails
    expect(S().claimCatSet('village')).toBe(false);
    expect(S().fishCoins).toBe(coinsBefore);
    expect(S().unlockedAccessoryIds).toEqual([]);

    // Complete village set -> succeeds once
    useGameStore.setState({
      unlockedCatIds: ['mochi', 'marmalade', 'pebble', 'biscuit'],
    });
    expect(S().claimCatSet('village')).toBe(true);
    expect(S().fishCoins).toBe(coinsBefore + 60);
    expect(S().unlockedAccessoryIds).toContain('scarf');
    expect(S().claimedSetIds).toContain('village');

    // Second claim -> fails
    expect(S().claimCatSet('village')).toBe(false);
    expect(S().fishCoins).toBe(coinsBefore + 60);
  });

  it('selectAccessory rejects locked ids and accepts unlocked ids and null', () => {
    const S = () => useGameStore.getState();
    S().resetAllProgress();

    expect(S().selectAccessory('starCrown')).toBe(false);
    expect(S().activeAccessoryId).toBeNull();

    useGameStore.setState({ unlockedAccessoryIds: ['scarf'] });
    expect(S().selectAccessory('scarf')).toBe(true);
    expect(S().activeAccessoryId).toBe('scarf');

    expect(S().selectAccessory('flowerCrown')).toBe(false);
    expect(S().activeAccessoryId).toBe('scarf');

    expect(S().selectAccessory(null)).toBe(true);
    expect(S().activeAccessoryId).toBeNull();
  });
});
