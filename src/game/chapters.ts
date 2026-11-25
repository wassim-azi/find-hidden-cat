import { Difficulty } from './gameTypes';

export interface ChapterInfo {
  id: Difficulty;
  title: string;
  subtitle: string;
  levelRange: [number, number];
  imageSrc: string;
  accentBg: string;
  accentText: string;
}

export const CHAPTERS: readonly ChapterInfo[] = [
  {
    id: 'easy',
    title: 'Sunbeam Garden',
    subtitle: 'Cozy 6×6 warm-up puzzles',
    levelRange: [1, 8],
    imageSrc: '/media/images/chapter-easy.webp',
    accentBg: 'bg-[#E5F4EC]/95',
    accentText: 'text-[#2D6E4B]',
  },
  {
    id: 'medium',
    title: 'Moonlit Rooftops',
    subtitle: 'Clever 6×6 & 8×8 twilight grids',
    levelRange: [9, 16],
    imageSrc: '/media/images/chapter-medium.webp',
    accentBg: 'bg-[#FEF2DC]/95',
    accentText: 'text-[#8E5B12]',
  },
  {
    id: 'hard',
    title: 'Starlight Palace',
    subtitle: 'Master 8×8 royal logic trials',
    levelRange: [17, 24],
    imageSrc: '/media/images/chapter-hard.webp',
    accentBg: 'bg-[#F3ECFD]/95',
    accentText: 'text-[#5C449E]',
  },
] as const;

export function getChapterForDifficulty(difficulty: Difficulty): ChapterInfo {
  return CHAPTERS.find((c) => c.id === difficulty) ?? CHAPTERS[0]!;
}
