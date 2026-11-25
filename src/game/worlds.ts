import { Difficulty } from './gameTypes';
import { CatBreed } from '../styles/theme';

export type SpecialNodeType = 'normal' | 'treasure' | 'rescue' | 'mystery' | 'boss';

export interface WorldDefinition {
  id: number;
  name: string;
  subtitle: string;
  levelStart: number;
  levelEnd: number;
  difficulty: Difficulty;
  bannerImage: string;
  skyTop: string;
  skyBottom: string;
  pathColor: string;
  pathHighlight: string;
  nodeAccent: string;
  nodeShadow: string;
  badgeBg: string;
  badgeText: string;
  mascotBreed: CatBreed;
  milestoneCoins: number;
  decorType: 'meadow' | 'candy' | 'twilight' | 'starlight';
}

/**
 * Expandable World Progression configuration.
 * New worlds can be appended cleanly without modifying map rendering logic.
 */
export const WORLDS: readonly WorldDefinition[] = [
  {
    id: 1,
    name: 'Kitty Village',
    subtitle: 'Sunlit meadows & cozy 6×6 starts',
    levelStart: 1,
    levelEnd: 6,
    difficulty: 'easy',
    bannerImage: '/media/images/chapter-easy.webp',
    skyTop: '#F7F9E8',
    skyBottom: '#E9F4E4',
    pathColor: '#E5CFA8',
    pathHighlight: '#FFF8EB',
    nodeAccent: '#6EB58E',
    nodeShadow: '#4A8E69',
    badgeBg: 'bg-[#E5F4EC]',
    badgeText: 'text-[#2D6E4B]',
    mascotBreed: 'ginger',
    milestoneCoins: 60,
    decorType: 'meadow',
  },
  {
    id: 2,
    name: 'Candy Garden',
    subtitle: 'Sweet pastel paths & clever twists',
    levelStart: 7,
    levelEnd: 12,
    difficulty: 'medium',
    bannerImage: '/media/images/world-candy-garden.webp',
    skyTop: '#FFF1F3',
    skyBottom: '#FFEAD8',
    pathColor: '#F3C0C8',
    pathHighlight: '#FFF8F9',
    nodeAccent: '#FF7A8A',
    nodeShadow: '#D65666',
    badgeBg: 'bg-[#FFEAF0]',
    badgeText: 'text-[#B5415C]',
    mascotBreed: 'calico',
    milestoneCoins: 80,
    decorType: 'candy',
  },
  {
    id: 3,
    name: 'Moonlit Valley',
    subtitle: 'Twilight rooftops & 8×8 grids',
    levelStart: 13,
    levelEnd: 18,
    difficulty: 'medium',
    bannerImage: '/media/images/chapter-medium.webp',
    skyTop: '#ECEAF9',
    skyBottom: '#F8E7D8',
    pathColor: '#C5B8E6',
    pathHighlight: '#F7F4FF',
    nodeAccent: '#86B4D0',
    nodeShadow: '#5886A3',
    badgeBg: 'bg-[#FEF2DC]',
    badgeText: 'text-[#8E5B12]',
    mascotBreed: 'cream',
    milestoneCoins: 100,
    decorType: 'twilight',
  },
  {
    id: 4,
    name: 'Starlight Castle',
    subtitle: 'Royal 8×8 logic challenges',
    levelStart: 19,
    levelEnd: 24,
    difficulty: 'hard',
    bannerImage: '/media/images/chapter-hard.webp',
    skyTop: '#EAE4FA',
    skyBottom: '#F5E8F5',
    pathColor: '#B8A6E0',
    pathHighlight: '#FAF7FF',
    nodeAccent: '#9B86D4',
    nodeShadow: '#715AA8',
    badgeBg: 'bg-[#F3ECFD]',
    badgeText: 'text-[#5C449E]',
    mascotBreed: 'lilac',
    milestoneCoins: 150,
    decorType: 'starlight',
  },
] as const;

export const SPECIAL_LEVEL_NODES: Record<number, { type: SpecialNodeType; label: string; bonusCoins: number }> = {
  4: { type: 'treasure', label: 'Treasure Chest', bonusCoins: 40 },
  6: { type: 'boss', label: 'Village Boss', bonusCoins: 50 },
  9: { type: 'rescue', label: 'Cat Rescue', bonusCoins: 35 },
  12: { type: 'boss', label: 'Garden Boss', bonusCoins: 60 },
  15: { type: 'mystery', label: 'Mystery Gift', bonusCoins: 45 },
  18: { type: 'boss', label: 'Valley Boss', bonusCoins: 75 },
  21: { type: 'treasure', label: 'Royal Vault', bonusCoins: 65 },
  24: { type: 'boss', label: 'Grand Meowster', bonusCoins: 120 },
};

export function getWorldForLevel(levelId: number): WorldDefinition {
  return (
    WORLDS.find((w) => levelId >= w.levelStart && levelId <= w.levelEnd) ??
    WORLDS[0]!
  );
}

export function getSpecialNodeInfo(levelId: number): {
  type: SpecialNodeType;
  label: string;
  bonusCoins: number;
} {
  return (
    SPECIAL_LEVEL_NODES[levelId] ?? {
      type: 'normal',
      label: '',
      bonusCoins: 0,
    }
  );
}

export function isWorldFinalLevel(levelId: number): WorldDefinition | null {
  return WORLDS.find((w) => w.levelEnd === levelId) ?? null;
}

export function getNextWorldAfter(worldId: number): WorldDefinition | null {
  return WORLDS.find((w) => w.id === worldId + 1) ?? null;
}
