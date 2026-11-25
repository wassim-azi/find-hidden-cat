import React from 'react';
import {
  Award,
  BookOpen,
  Compass,
  Flame,
  Settings,
  Shield,
  Star,
  Trophy,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TOTAL_LEVELS } from '../../game/levels';
import { getCollectibleCat, COLLECTIBLE_CATS } from '../../game/collectibleCats';
import { getWorldForLevel, WORLDS } from '../../game/worlds';
import { ACHIEVEMENTS } from '../../game/achievements';
import { CatIllustration } from '../../components/Cat/CatIllustration';
import { HubHeader } from '../../components/Navigation/HubHeader';
import { TactileButton } from '../../components/Buttons/TactileButton';

export const ProfileScreen: React.FC = () => {
  const activeMascotCatId = useGameStore((s) => s.activeMascotCatId);
  const levelProgress = useGameStore((s) => s.levelProgress);
  const unlockedLevelId = useGameStore((s) => s.unlockedLevelId);
  const achievements = useGameStore((s) => s.achievements);
  const zeroMistakeSolves = useGameStore((s) => s.zeroMistakeSolves);
  const unlockedCatIds = useGameStore((s) => s.unlockedCatIds);
  const unlockedAchievementIds = useGameStore((s) => s.unlockedAchievementIds);
  const dailyLogin = useGameStore((s) => s.dailyLogin);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const setTutorialOpen = useGameStore((s) => s.setTutorialOpen);
  const goToScreen = useGameStore((s) => s.goToScreen);

  const mascot = getCollectibleCat(activeMascotCatId);
  const currentWorld = getWorldForLevel(unlockedLevelId);
  const solvedCount = Object.values(levelProgress).filter((p) => p.completed).length;
  const totalStars = Object.values(levelProgress).reduce((sum, p) => sum + p.stars, 0);
  const worldsUnlocked = WORLDS.filter((w) => unlockedLevelId >= w.levelStart).length;

  const stats = [
    {
      label: 'Levels Solved',
      value: `${solvedCount}/${TOTAL_LEVELS}`,
      icon: <Trophy className="w-4 h-4 text-[#E59C1E]" />,
    },
    {
      label: 'Stars Earned',
      value: `${totalStars}/${TOTAL_LEVELS * 3}`,
      icon: <Star className="w-4 h-4 text-[#F4B942] fill-[#F4B942]" />,
    },
    {
      label: 'Worlds Reached',
      value: `${worldsUnlocked}/${WORLDS.length}`,
      icon: <Compass className="w-4 h-4 text-[#6EB58E]" />,
    },
    {
      label: 'Zero-Mistake Wins',
      value: `${zeroMistakeSolves}`,
      icon: <Shield className="w-4 h-4 text-[#4D91B5]" />,
    },
    {
      label: 'Cats Collected',
      value: `${unlockedCatIds.length}/${COLLECTIBLE_CATS.length}`,
      icon: <Award className="w-4 h-4 text-[#E86A7B]" />,
    },
    {
      label: 'Login Streak',
      value: `${dailyLogin.streakCount}d`,
      icon: <Flame className="w-4 h-4 text-[#E87A2A]" />,
    },
  ];

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <HubHeader title="Player Profile" />

      <div className="flex-1 soft-scroll px-3.5 pb-4 flex flex-col gap-3">
        {/* Hero Mascot Identity Card */}
        <div className="meow-card rounded-[26px] p-4 flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => goToScreen('cats')}
            aria-label="Change companion cat"
            className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-[#FFF3D6] to-[#FFE0E6] border-2 border-white shadow-sm flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <CatIllustration breed={mascot.breed} mood="happy" className="w-17 h-17" />
          </button>

          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FF7A7A] bg-[#FFF0F0] px-2 py-0.5 rounded-full">
              {currentWorld.name}
            </span>
            <h2 className="text-[20px] font-black text-[#3A312C] leading-tight mt-1">
              {mascot.name}&apos;s Keeper
            </h2>
            <p className="text-[11.5px] font-bold text-[#7E7067] mt-0.5">
              {achievements.totalCatsFound} hidden cats discovered •{' '}
              {unlockedAchievementIds.length}/{ACHIEVEMENTS.length} badges
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((st) => (
            <div
              key={st.label}
              className="meow-card rounded-[20px] p-3 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8A7B70]">
                {st.icon}
                {st.label}
              </div>
              <div className="text-[21px] font-black text-[#3A312C] tabular-nums leading-tight">
                {st.value}
              </div>
            </div>
          ))}
        </div>

        {/* Utility Actions */}
        <div className="flex flex-col gap-2 mt-1">
          <TactileButton
            variant="secondary"
            fullWidth
            onClick={() => setTutorialOpen(true)}
          >
            <BookOpen className="w-4.5 h-4.5 text-[#9B86D4]" />
            How to Play &amp; Voice Guide
          </TactileButton>

          <TactileButton
            variant="secondary"
            fullWidth
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-4.5 h-4.5 text-[#5A4E47]" />
            Game Settings &amp; Preferences
          </TactileButton>
        </div>
      </div>
    </div>
  );
};
