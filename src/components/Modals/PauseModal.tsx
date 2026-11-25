import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Map, Play, RotateCcw } from 'lucide-react';
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
  const { t } = useTranslation();
  const elapsedSec = useGameStore((s) => (open ? s.elapsedSec : 0));

  const subtitle =
    levelId <= 0
      ? `${levelTitle} • ${formatTime(elapsedSec)}`
      : `${t('common.level', { id: levelId })} • ${t(`levels.${levelId}`, { defaultValue: levelTitle })} • ${formatTime(elapsedSec)}`;

  return (
    <ModalSheet open={open} onClose={onResume} ariaLabel={t('pause.dialogAria')}>
      <div className="p-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FAF2E4] flex items-center justify-center mb-3 shadow-inner">
          <CatIllustration breed="cream" mood="idle" className="w-14 h-14" />
        </div>

        <h2 className="text-[22px] font-black text-[#3A312C] tracking-tight">
          {t('pause.title')}
        </h2>
        <p className="text-[12.5px] font-bold text-[#8A7B70] mt-0.5 mb-5">
          {subtitle}
        </p>

        <div className="w-full flex flex-col gap-2.5">
          <TactileButton
            id="btn-pause-resume"
            variant="primary"
            fullWidth
            onClick={onResume}
          >
            <Play className="w-4 h-4 fill-current" />
            {t('pause.resume')}
          </TactileButton>

          <TactileButton
            id="btn-pause-restart"
            variant="secondary"
            fullWidth
            onClick={onRestart}
          >
            <RotateCcw className="w-4 h-4" />
            {t('pause.restart')}
          </TactileButton>

          <TactileButton
            id="btn-pause-rules"
            variant="secondary"
            fullWidth
            onClick={onOpenRules}
          >
            <BookOpen className="w-4 h-4" />
            {t('pause.howToPlay')}
          </TactileButton>

          <TactileButton
            id="btn-pause-levels"
            variant="ghost"
            fullWidth
            onClick={onExitToLevels}
          >
            <Map className="w-4 h-4" />
            {t('pause.backToMap')}
          </TactileButton>
        </div>
      </div>
    </ModalSheet>
  );
};
