import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Cat, Map, ShoppingBag, Trophy, User } from 'lucide-react';
import { hasClaimableDailyOrMission, ScreenName, useGameStore } from '../../store/gameStore';

interface NavTab {
  id: ScreenName;
  labelKey: string;
  icon: React.FC<{ className?: string; strokeWidth?: number }>;
}

const TABS: readonly NavTab[] = [
  { id: 'map', labelKey: 'nav.map', icon: Map },
  { id: 'cats', labelKey: 'nav.cats', icon: Cat },
  { id: 'missions', labelKey: 'nav.missions', icon: Trophy },
  { id: 'shop', labelKey: 'nav.shop', icon: ShoppingBag },
  { id: 'profile', labelKey: 'nav.profile', icon: User },
];

export const BottomNav: React.FC = () => {
  const { t } = useTranslation();
  const screen = useGameStore((s) => s.screen);
  const goToScreen = useGameStore((s) => s.goToScreen);
  const state = useGameStore();
  const { dailyClaimable, missionsClaimableCount, achievementsClaimableCount } =
    hasClaimableDailyOrMission(state);

  const missionBadges =
    missionsClaimableCount + achievementsClaimableCount + (dailyClaimable ? 1 : 0);

  return (
    <nav
      aria-label={t('nav.mainNavAria')}
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
                className={`text-[9.5px] min-[360px]:text-[10px] leading-none mt-1 truncate max-w-full px-0.5 ${
                  active ? 'font-black' : 'font-bold'
                }`}
              >
                {t(tab.labelKey)}
              </span>
              {showBadge && (
                <span className="absolute top-1 right-2 min-w-4 h-4 px-1 rounded-full bg-[#FF5B6B] text-white text-[9px] font-black flex items-center justify-center border border-white">
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
