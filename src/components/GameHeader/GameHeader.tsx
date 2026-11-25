import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, Heart, Pause, Settings, Sparkles } from 'lucide-react';
import { MeowdokuLogo } from '../Cat/MeowdokuLogo';
import { DifficultyTier, GameMode, MAX_CLASSIC_HEARTS } from '../../game/gameTypes';
import { formatTime } from '../../utils/format';
import { useGameStore } from '../../store/gameStore';

interface GameHeaderProps {
  levelId: number;
  dailyDateKey?: string;
  difficultyTier: DifficultyTier;
  gameMode: GameMode;
  hearts: number;
  onPause: () => void;
  onOpenSettings: () => void;
  onLogoClick: () => void;
}

const TIER_STYLES: Record<DifficultyTier, string> = {
  beginner: 'bg-[#E6F6EE] text-[#2C7850]',
  easy: 'bg-[#EAF5EC] text-[#3B7C59]',
  normal: 'bg-[#FEF2DC] text-[#A8721D]',
  hard: 'bg-[#FCE8E8] text-[#B84A4A]',
  expert: 'bg-[#F1E8FC] text-[#6B44B0]',
};

const LiveTimer: React.FC = React.memo(() => {
  const elapsedSec = useGameStore((s) => s.elapsedSec);
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7E7067] tabular-nums whitespace-nowrap">
      <Clock className="w-3 h-3 text-[#A99B90]" />
      {formatTime(elapsedSec)}
    </span>
  );
});
LiveTimer.displayName = 'LiveTimer';

export const GameHeader: React.FC<GameHeaderProps> = React.memo(
  ({
    levelId,
    dailyDateKey,
    difficultyTier,
    gameMode,
    hearts,
    onPause,
    onOpenSettings,
    onLogoClick,
  }) => {
    const { t } = useTranslation();

    return (
      <header className="flex items-center justify-between gap-1 px-3 pt-2 pb-1 shrink-0">
        <button
          id="btn-header-logo"
          type="button"
          onClick={onLogoClick}
          aria-label={t('game.header.backToMapAria')}
          className="flex items-center active:scale-95 transition-transform cursor-pointer rounded-xl shrink-0 focus-visible:outline-2 focus-visible:outline-[#FF7A7A]"
        >
          <MeowdokuLogo compact iconOnly />
        </button>

        {/* Center Level + Tier + Hearts/Practice + Isolated Live Timer pill */}
        <div className="flex items-center gap-1.5 bg-white/95 border border-[#EAE0D2] rounded-full px-2.5 py-1 shadow-[0_2px_8px_rgba(92,69,52,0.06)] shrink-0">
          {dailyDateKey ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-[#8B5E14] bg-[#FFF2CE] px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
              <Calendar className="w-3 h-3" />
              {t('common.daily')}
            </span>
          ) : (
            <>
              <span className="text-[11px] font-extrabold text-[#3A312C] tracking-tight whitespace-nowrap">
                {t('common.levelShort', { id: levelId })}
              </span>
              <span
                className={`hidden min-[360px]:inline-block text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap ${TIER_STYLES[difficultyTier]}`}
              >
                {t(`difficulty.${difficultyTier}`)}
              </span>
            </>
          )}

          <span className="w-px h-3 bg-[#E5DACB]" aria-hidden="true" />

          {/* 3-Hearts (Classic) or Practice pill */}
          {gameMode === 'classic' ? (
            <div
              id="hud-hearts"
              className="flex items-center gap-0.5"
              aria-label={t('hearts.hudAria', { count: hearts, max: MAX_CLASSIC_HEARTS })}
            >
              {Array.from({ length: MAX_CLASSIC_HEARTS }, (_, idx) => {
                const alive = idx < hearts;
                return (
                  <Heart
                    key={idx}
                    className={`w-3.5 h-3.5 transition-all duration-200 ${
                      alive
                        ? 'text-[#F05A66] fill-[#F05A66] scale-100'
                        : 'text-[#DDD2C5] fill-transparent scale-90'
                    }`}
                    strokeWidth={2.4}
                  />
                );
              })}
            </div>
          ) : (
            <span
              id="hud-practice-badge"
              className="inline-flex items-center gap-0.5 text-[9.5px] font-black text-[#2D754E] bg-[#E8F7EE] px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap"
            >
              <Sparkles className="w-2.5 h-2.5" />
              {t('game.practiceShort')}
            </span>
          )}

          <span className="w-px h-3 bg-[#E5DACB]" aria-hidden="true" />
          <LiveTimer />
        </div>

        {/* Pause & Settings compact icon buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            id="btn-pause"
            type="button"
            onClick={onPause}
            aria-label={t('game.header.pauseAria')}
            className="w-8 h-8 min-[360px]:w-8.5 min-[360px]:h-8.5 rounded-full bg-white border border-[#EAE0D2] shadow-[0_2px_8px_rgba(92,69,52,0.06)] flex items-center justify-center text-[#5A4E47] active:scale-92 transition-transform cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            id="btn-game-settings"
            type="button"
            onClick={onOpenSettings}
            aria-label={t('game.header.settingsAria')}
            className="w-8 h-8 min-[360px]:w-8.5 min-[360px]:h-8.5 rounded-full bg-white border border-[#EAE0D2] shadow-[0_2px_8px_rgba(92,69,52,0.06)] flex items-center justify-center text-[#5A4E47] active:scale-92 transition-transform cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>
    );
  }
);

GameHeader.displayName = 'GameHeader';
