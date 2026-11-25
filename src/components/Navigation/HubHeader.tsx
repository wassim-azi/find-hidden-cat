import React from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, Settings, Star } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { canClaimDailyReward } from '../../game/dailyRewards';
import { getTodayDateKey } from '../../game/levels';
import { FishCoinPill } from '../Currency/FishCoinIcon';

interface HubHeaderProps {
  title?: string;
}

export const HubHeader: React.FC<HubHeaderProps> = ({ title }) => {
  const { t } = useTranslation();
  const fishCoins = useGameStore((s) => s.fishCoins);
  const levelProgress = useGameStore((s) => s.levelProgress);
  const dailyLogin = useGameStore((s) => s.dailyLogin);
  const goToScreen = useGameStore((s) => s.goToScreen);
  const setDailyCalendarOpen = useGameStore((s) => s.setDailyCalendarOpen);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);

  const totalStars = Object.values(levelProgress).reduce((sum, p) => sum + p.stars, 0);
  const canClaimDaily = canClaimDailyReward(dailyLogin, getTodayDateKey());

  return (
    <header className="px-3.5 pt-2.5 pb-2 flex items-center justify-between gap-2 shrink-0 z-20">
      <div className="flex items-center gap-1.5 shrink-0">
        <FishCoinPill coins={fishCoins} onClick={() => goToScreen('shop')} />
        <div className="inline-flex items-center gap-1 bg-white/95 border border-[#EAE0D2] rounded-full px-2.5 py-1 shadow-[0_2px_8px_rgba(92,69,52,0.06)]">
          <Star className="w-3.5 h-3.5 text-[#F4B942] fill-[#F4B942]" />
          <span className="text-[12.5px] font-black text-[#3A312C] tabular-nums leading-none">
            {totalStars}
          </span>
        </div>
      </div>

      {title && (
        <span className="text-[14.5px] font-black text-[#3A312C] tracking-tight truncate text-center">
          {title}
        </span>
      )}

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          id="btn-hud-daily"
          type="button"
          onClick={() => setDailyCalendarOpen(true)}
          aria-label={t('welcome.openDailyAria')}
          className={`relative w-9 h-9 rounded-full border shadow-[0_2px_8px_rgba(92,69,52,0.08)] flex items-center justify-center active:scale-92 transition-transform cursor-pointer ${
            canClaimDaily
              ? 'bg-gradient-to-b from-[#FFE39A] to-[#F7BD48] border-[#E8A328] text-[#6B4209]'
              : 'bg-white border-[#EAE0D2] text-[#6B5D54]'
          }`}
        >
          <Gift className="w-4.5 h-4.5" />
          {canClaimDaily && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FF5B6B] border-2 border-white" />
          )}
        </button>

        <button
          id="btn-hud-settings"
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('welcome.openSettingsAria')}
          className="w-9 h-9 rounded-full bg-white border border-[#EAE0D2] shadow-[0_2px_8px_rgba(92,69,52,0.06)] flex items-center justify-center text-[#5A4E47] active:scale-92 transition-transform cursor-pointer"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
};
