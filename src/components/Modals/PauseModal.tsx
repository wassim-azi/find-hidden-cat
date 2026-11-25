import React from 'react';
import { BookOpen, Grid2x2, Play, RotateCcw } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { CatIllustration } from '../Cat/CatIllustration';
import { formatTime } from '../../utils/format';
import { useGameStore } from '../../store/gameStore';

interface PauseModalProps {
  open: boolean;
  levelId: number;
  levelTitle: string;
  onResume: () => void;
  onRestart: () => void;
  onOpenRules: () => void;
  onExitToLevels: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  open,
  levelId,
  levelTitle,
  onResume,
  onRestart,
  onOpenRules,
  onExitToLevels,
}) => {
  const elapsedSec = useGameStore((s) => (open ? s.elapsedSec : 0));

  return (
    <ModalSheet open={open} onClose={onResume} ariaLabel="Game paused">
      <div className="p-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FAF2E4] flex items-center justify-center mb-3 shadow-inner">
          <CatIllustration breed="cream" mood="idle" className="w-14 h-14" />
        </div>

        <h2 className="text-[22px] font-black text-[#3A312C] tracking-tight">
          Cat Nap Break
        </h2>
        <p className="text-[13px] font-bold text-[#8A7B70] mt-0.5 mb-5">
          {levelId === 0 ? levelTitle : `Level ${levelId} • ${levelTitle}`} • {formatTime(elapsedSec)}
        </p>

        <div className="w-full flex flex-col gap-2.5">
          <TactileButton
            id="btn-pause-resume"
            variant="primary"
            fullWidth
            onClick={onResume}
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Game
          </TactileButton>

          <TactileButton
            id="btn-pause-restart"
            variant="secondary"
            fullWidth
            onClick={onRestart}
          >
            <RotateCcw className="w-4 h-4" />
            Restart Level
          </TactileButton>

          <TactileButton
            id="btn-pause-rules"
            variant="secondary"
            fullWidth
            onClick={onOpenRules}
          >
            <BookOpen className="w-4 h-4" />
            How to Play
          </TactileButton>

          <TactileButton
            id="btn-pause-levels"
            variant="ghost"
            fullWidth
            onClick={onExitToLevels}
          >
            <Grid2x2 className="w-4 h-4" />
            Level Selection
          </TactileButton>
        </div>
      </div>
    </ModalSheet>
  );
};
