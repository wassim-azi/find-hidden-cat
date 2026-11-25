import React from 'react';
import { Calendar, Clock, Pause, Settings } from 'lucide-react';
import { MeowdokuLogo } from '../Cat/MeowdokuLogo';
import { Difficulty } from '../../game/gameTypes';
import { formatTime } from '../../utils/format';
import { useGameStore } from '../../store/gameStore';

interface GameHeaderProps {
  levelId: number;
  dailyDateKey?: string;
  difficulty: Difficulty;
  onPause: () => void;
  onOpenSettings: () => void;
  onLogoClick: () => void;
}

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: 'bg-[#E5F4EC] text-[#3B7C59]',
  medium: 'bg-[#FEF2DC] text-[#A8721D]',
  hard: 'bg-[#FCE8E8] text-[#B84A4A]',
};

/**
 * Isolated timer subscription: ensures the 1-second timer tick ONLY re-renders
 * these 4 characters and NEVER causes GameScreen or GameBoard to re-render!
 */
const LiveTimer: React.FC = React.memo(() => {
  const elapsedSec = useGameStore((s) => s.elapsedSec);
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#7E7067] tabular-nums whitespace-nowrap">
      <Clock className="w-3 h-3 text-[#A99B90]" />
      {formatTime(elapsedSec)}
    </span>
  );
});
LiveTimer.displayName = 'LiveTimer';

export const GameHeader: React.FC<GameHeaderProps> = React.memo(
  ({ levelId, dailyDateKey, difficulty, onPause, onOpenSettings, onLogoClick }) => {
    return (
      <header className="flex items-center justify-between gap-1.5 px-3 pt-2 pb-1 shrink-0">
        <button
          id="btn-header-logo"
          type="button"
          onClick={onLogoClick}
          aria-label="Back to level selection"
          className="flex items-center active:scale-95 transition-transform cursor-pointer rounded-xl shrink-0 focus-visible:outline-2 focus-visible:outline-[#FF7A7A]"
        >
          <MeowdokuLogo compact />
        </button>

        {/* Level / Daily & Isolated Live Timer pill */}
        <div className="flex items-center gap-1.5 bg-white/95 border border-[#EAE0D2] rounded-full px-2.5 py-1 shadow-[0_2px_8px_rgba(92,69,52,0.06)] shrink-0">
          {dailyDateKey ? (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-black text-[#8B5E14] bg-[#FFF2CE] px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
              <Calendar className="w-3 h-3" />
              Daily
            </span>
          ) : (
            <>
              <span className="text-[12px] font-extrabold text-[#3A312C] tracking-tight whitespace-nowrap">
                Lvl {levelId}
              </span>
              <span
                className={`hidden min-[360px]:inline-block text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap ${DIFFICULTY_STYLES[difficulty]}`}
              >
                {difficulty}
              </span>
            </>
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
            aria-label="Pause game"
            className="w-8 h-8 min-[360px]:w-9 min-[360px]:h-9 rounded-full bg-white border border-[#EAE0D2] shadow-[0_2px_8px_rgba(92,69,52,0.06)] flex items-center justify-center text-[#5A4E47] active:scale-92 transition-transform cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 fill-current" />
          </button>
          <button
            id="btn-game-settings"
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            className="w-8 h-8 min-[360px]:w-9 min-[360px]:h-9 rounded-full bg-white border border-[#EAE0D2] shadow-[0_2px_8px_rgba(92,69,52,0.06)] flex items-center justify-center text-[#5A4E47] active:scale-92 transition-transform cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4" />
          </button>
        </div>
      </header>
    );
  }
);

GameHeader.displayName = 'GameHeader';
