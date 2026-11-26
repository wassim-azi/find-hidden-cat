import { AccessoryId } from './accessories';

export type CatSetId = 'village' | 'garden' | 'night';

export interface CatSetDef {
  readonly id: CatSetId;
  readonly catIds: readonly string[];
  readonly rewardCoins: number;
  readonly rewardAccessory: AccessoryId;
}

export const CAT_SETS: readonly CatSetDef[] = [
  {
    id: 'village',
    catIds: ['mochi', 'marmalade', 'pebble', 'biscuit'],
    rewardCoins: 60,
    rewardAccessory: 'scarf',
  },
  {
    id: 'garden',
    catIds: ['cleo', 'luna', 'patches'],
    rewardCoins: 80,
    rewardAccessory: 'flowerCrown',
  },
  {
    id: 'night',
    catIds: ['snowbell', 'nori', 'aurelia'],
    rewardCoins: 120,
    rewardAccessory: 'starCrown',
  },
] as const;

export const VALID_CAT_SET_IDS: ReadonlySet<string> = new Set(
  CAT_SETS.map((s) => s.id)
);

export function getSetProgress(
  set: CatSetDef,
  unlockedCatIds: readonly string[]
): { owned: number; total: number; complete: boolean } {
  const unlocked = new Set(unlockedCatIds);
  const owned = set.catIds.filter((id) => unlocked.has(id)).length;
  const total = set.catIds.length;
  return { owned, total, complete: owned >= total };
}

export function getCatSetForCat(catId: string): CatSetDef {
  return CAT_SETS.find((s) => s.catIds.includes(catId)) ?? CAT_SETS[0]!;
}
