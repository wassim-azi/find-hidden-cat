import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, HeartOff, Map, RotateCcw, Sparkles } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { CatIllustration } from '../Cat/CatIllustration';

interface OutOfHeartsModalProps {
  open: boolean;
  onRetry: () => void;
  onContinuePractice: () => void;
  onExitToMap: () => void;
}

export const OutOfHeartsModal: React.FC<OutOfHeartsModalProps> = ({
  open,
  onRetry,
  onContinuePractice,
  onExitToMap,
}) => {
  const { t } = useTranslation();

  return (
    <ModalSheet
      open={open}
      onClose={onRetry}
      ariaLabel={t('hearts.outOfHeartsAria')}
    >
      <div className="p-5 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#FFF0F0] border-2 border-[#F8C8C8] flex items-center justify-center mb-3 relative">
          <CatIllustration breed="cream" mood="idle" className="w-13 h-13" />
          <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#E85B5B] text-white flex items-center justify-center border-2 border-white shadow-xs">
            <HeartOff className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Heart
              key={i}
              className="w-4.5 h-4.5 text-[#E5D8CA]"
              strokeWidth={2.2}
            />
          ))}
        </div>

        <h2 className="text-[20px] font-black text-[#3A312C] tracking-tight">
          {t('hearts.outTitle')}
        </h2>
        <p className="text-[12.5px] font-bold text-[#7E7067] mt-1 leading-snug max-w-[280px]">
          {t('hearts.outDesc')}
        </p>

        <div className="w-full flex flex-col gap-2.5 mt-4">
          <TactileButton
            id="btn-hearts-retry"
            variant="primary"
            size="md"
            fullWidth
            onClick={onRetry}
          >
            <RotateCcw className="w-4 h-4" />
            {t('hearts.retryBtn')}
          </TactileButton>

          <TactileButton
            id="btn-hearts-practice"
            variant="secondary"
            size="md"
            fullWidth
            className="bg-[#E8F7EE] border-[#BBE2CB] text-[#2B734B]"
            onClick={onContinuePractice}
          >
            <Sparkles className="w-4 h-4" />
            {t('hearts.practiceBtn')}
          </TactileButton>

          <TactileButton
            id="btn-hearts-map"
            variant="secondary"
            size="sm"
            fullWidth
            onClick={onExitToMap}
          >
            <Map className="w-4 h-4" />
            {t('pause.backToMap')}
          </TactileButton>
        </div>
      </div>
    </ModalSheet>
  );
};
