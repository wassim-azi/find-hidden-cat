import React from 'react';
import { motion } from 'framer-motion';
import { Cat, Map, ShoppingBag, Trophy, User } from 'lucide-react';
import { hasClaimableDailyOrMission, ScreenName, useGameStore } from '../../store/gameStore';

interface NavTab {
  id: ScreenName;
  label: string;
  icon: React.FC<{ className?: string; strokeWidth?: number }>;
}

const TABS: readonly NavTab[] = [
  { id: 'map', label: 'Map', icon: Map },
  { id: 'cats', label: 'Cats', icon: Cat },
  { id: 'missions', label: 'Missions', icon: Trophy },
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'profile', label: 'Profile', icon: User },
];

export const BottomNav: React.FC = () => {
  const screen = useGameStore((s) => s.screen);
  const goToScreen = useGameStore((s) => s.goToScreen);
  const state = useGameStore();
  const { dailyClaimable, missionsClaimableCount, achievementsClaimableCount } =
    hasClaimableDailyOrMission(state);

  const missionBadges =
    missionsClaimableCount + achievementsClaimableCount + (dailyClaimable ? 1 : 0);

  return (
    <nav
      aria-label="Main game navigation"
      className="px-3 pb-2.5 pt-1.5 shrink-0 z-30"
    >
      <div className="meow-toolbar rounded-[24px] px-1.5 py-1.5 grid grid-cols-5 gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = screen === tab.id;
          const showBadge = tab.id === 'missions' && missionBadges > 0;

          return (
            <motion.button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => goToScreen(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-[18px] transition-colors cursor-pointer select-none ${
                active
                  ? 'bg-[#FFF0F0] text-[#E85E6B]'
                  : 'text-[#84756B] hover:bg-[#FAF5EC]'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2.1} />
              <span
                className={`text-[10px] leading-none mt-1 ${
                  active ? 'font-black' : 'font-bold'
                }`}
              >
                {tab.label}
              </span>
              {showBadge && (
                <span className="absolute top-1 right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#FF5B6B] text-white text-[9px] font-black flex items-center justify-center border border-white">
                  {missionBadges}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
