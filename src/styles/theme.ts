export type CatBreed =
  | 'tuxedo'
  | 'ginger'
  | 'gray'
  | 'cream'
  | 'calico'
  | 'lilac'
  | 'honey'
  | 'ragdoll';

export interface RegionTheme {
  id: number;
  name: string;
  bg: string;
  bgDark: string;
  bgLight: string;
  silhouette: string;
  breed: CatBreed;
  symbol: string;
}

/**
 * Curated pastel palette inspired by Meowdoku — high legibility for white X marks,
 * warm harmonious tones, and each region paired with a distinct cat personality & symbol.
 */
export const REGION_THEMES: readonly RegionTheme[] = [
  {
    id: 0,
    name: 'Honey',
    bg: '#E8C158',
    bgDark: '#C99E34',
    bgLight: '#F7E3A8',
    silhouette: '#E8C158',
    breed: 'ginger',
    symbol: '●',
  },
  {
    id: 1,
    name: 'Rose',
    bg: '#E87E8E',
    bgDark: '#C95A6C',
    bgLight: '#F7C2CA',
    silhouette: '#E87E8E',
    breed: 'tuxedo',
    symbol: '▲',
  },
  {
    id: 2,
    name: 'Sky',
    bg: '#86B4D0',
    bgDark: '#5E91B0',
    bgLight: '#C5DFEE',
    silhouette: '#86B4D0',
    breed: 'ragdoll',
    symbol: '■',
  },
  {
    id: 3,
    name: 'Sage',
    bg: '#79AE8D',
    bgDark: '#568B6A',
    bgLight: '#BFE0CB',
    silhouette: '#79AE8D',
    breed: 'gray',
    symbol: '◆',
  },
  {
    id: 4,
    name: 'Peach',
    bg: '#E79A66',
    bgDark: '#C97742',
    bgLight: '#F7CCB0',
    silhouette: '#E79A66',
    breed: 'calico',
    symbol: '★',
  },
  {
    id: 5,
    name: 'Lavender',
    bg: '#9B86D4',
    bgDark: '#7761B5',
    bgLight: '#CFC4ED',
    silhouette: '#9B86D4',
    breed: 'lilac',
    symbol: '✦',
  },
  {
    id: 6,
    name: 'Coral',
    bg: '#DE6E5B',
    bgDark: '#BC4E3C',
    bgLight: '#F3B8AE',
    silhouette: '#DE6E5B',
    breed: 'cream',
    symbol: '✚',
  },
  {
    id: 7,
    name: 'Teal',
    bg: '#59A1B8',
    bgDark: '#3D7E94',
    bgLight: '#AEDAE8',
    silhouette: '#59A1B8',
    breed: 'honey',
    symbol: '⬟',
  },
] as const;

export function getRegionTheme(regionId: number): RegionTheme {
  const index = Math.abs(regionId) % REGION_THEMES.length;
  return REGION_THEMES[index]!;
}
