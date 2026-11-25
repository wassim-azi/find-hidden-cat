export type BoosterId =
  | 'hint'
  | 'superHint'
  | 'revealCat'
  | 'undoToken'
  | 'mistakeShield'
  | 'revealRegion';

export type BoosterInventory = Record<BoosterId, number>;

export interface ShopItemDefinition {
  id: BoosterId;
  name: string;
  shortName: string;
  description: string;
  priceCoins: number;
  badge?: string;
  accentColor: string;
  bgSoft: string;
}

export const INITIAL_FISH_COINS = 75;

export const INITIAL_BOOSTERS: BoosterInventory = {
  hint: 3,
  superHint: 1,
  revealCat: 1,
  undoToken: 2,
  mistakeShield: 1,
  revealRegion: 1,
};

export const SHOP_ITEMS: readonly ShopItemDefinition[] = [
  {
    id: 'hint',
    name: 'Hint',
    shortName: 'Hint',
    description: 'Highlights a logical next tile and explains why it matters.',
    priceCoins: 20,
    accentColor: '#DF991E',
    bgSoft: '#FFF6DF',
  },
  {
    id: 'superHint',
    name: 'Super Hint',
    shortName: 'Super',
    description: 'Deduces a safe cat spot AND auto-clears impossible tiles with ×.',
    priceCoins: 35,
    badge: 'Popular',
    accentColor: '#8B6CD6',
    bgSoft: '#F3ECFD',
  },
  {
    id: 'revealCat',
    name: 'Reveal Cat',
    shortName: 'Reveal',
    description: 'Instantly finds and places one guaranteed valid cat on the board.',
    priceCoins: 50,
    badge: 'Best',
    accentColor: '#E86A7B',
    bgSoft: '#FFF0F3',
  },
  {
    id: 'undoToken',
    name: 'Smart Rewind',
    shortName: 'Rewind',
    description: 'Rewinds back to your last clean, mistake-free board state.',
    priceCoins: 15,
    accentColor: '#4D91B5',
    bgSoft: '#EAF5FB',
  },
  {
    id: 'mistakeShield',
    name: 'Mistake Shield',
    shortName: 'Shield',
    description: 'Absorbs your next conflict mistake with zero penalty to stars.',
    priceCoins: 30,
    accentColor: '#489A70',
    bgSoft: '#E8F7EE',
  },
  {
    id: 'revealRegion',
    name: 'Reveal Region',
    shortName: 'Region',
    description: 'Marks all empty decoy tiles in an unsolved color region with ×.',
    priceCoins: 45,
    accentColor: '#DB7B45',
    bgSoft: '#FFF2E8',
  },
] as const;

export function getShopItem(id: BoosterId): ShopItemDefinition {
  return SHOP_ITEMS.find((i) => i.id === id) ?? SHOP_ITEMS[0]!;
}

export interface LevelRewardBreakdown {
  baseCoins: number;
  firstClearBonus: number;
  starBonus: number;
  specialNodeBonus: number;
  worldMilestoneBonus: number;
  totalCoins: number;
}

/**
 * Balanced Fish Coin payout for completing a level.
 */
export function calculateLevelCoinReward(params: {
  difficulty: 'easy' | 'medium' | 'hard';
  stars: number;
  isFirstCompletion: boolean;
  specialNodeBonus: number;
  worldMilestoneBonus: number;
  isDaily?: boolean;
}): LevelRewardBreakdown {
  // A Daily / Golden puzzle pays out once: replaying an already-solved one (whose answer the
  // player now knows) must not mint the daily reward again.
  if (params.isDaily && !params.isFirstCompletion) {
    return {
      baseCoins: 0,
      firstClearBonus: 0,
      starBonus: 0,
      specialNodeBonus: 0,
      worldMilestoneBonus: 0,
      totalCoins: 0,
    };
  }

  const baseCoins = params.isDaily
    ? 45
    : params.difficulty === 'easy'
      ? 18
      : params.difficulty === 'medium'
        ? 26
        : 35;

  const firstClearBonus = params.isFirstCompletion ? 15 : 0;
  const starBonus = params.stars === 3 ? 15 : params.stars === 2 ? 6 : 0;
  const specialNodeBonus = params.isFirstCompletion ? params.specialNodeBonus : 0;
  const worldMilestoneBonus = params.isFirstCompletion ? params.worldMilestoneBonus : 0;

  return {
    baseCoins,
    firstClearBonus,
    starBonus,
    specialNodeBonus,
    worldMilestoneBonus,
    totalCoins:
      baseCoins +
      firstClearBonus +
      starBonus +
      specialNodeBonus +
      worldMilestoneBonus,
  };
}
