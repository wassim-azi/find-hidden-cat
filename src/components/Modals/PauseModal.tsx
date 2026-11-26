import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Map, Play, RotateCcw } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { CatIllustration } from '../Cat/CatIllustration';
import { formatTime } from '../../utils/format';
import { useGameStore } from '../../store/gameStore';
import { consumeBreakNote, getContinuousMinutes } from '../../services/playSession';

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
  const gameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const breakReminderMinutes = useGameStore((s) => s.settings.breakReminderMinutes);
  const [breakNoteMinutes, setBreakNoteMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setBreakNoteMinutes(null);
      return;
    }
    const now = Date.now();
    if (consumeBreakNote(now, breakReminderMinutes)) {
      setBreakNoteMinutes(getContinuousMinutes(now));
    } else {
      setBreakNoteMinutes(null);
    }
  }, [open, breakReminderMinutes]);

  const subtitle =
    levelId <= 0
      ? `${levelTitle} • ${formatTime(elapsedSec)}`
      : `${t('common.level', { id: levelId })} • ${t(`levels.${levelId}`, { defaultValue: levelTitle })} • ${formatTime(elapsedSec)}`;

  return (
    <ModalSheet open={open} onClose={onResume} ariaLabel={t('pause.dialogAria')}>
      <div className="p-6 flex flex-col items-center text-center">
        {breakNoteMinutes !== null && (
          <div
            id="break-note"
            role="status"
            className="w-full mb-3.5 rounded-2xl bg-[#EEF6FA] border border-[#C6DFED] px-3.5 py-2.5 text-left flex items-center justify-between gap-2.5"
          >
            <p className="text-[11.5px] font-bold text-[#2C566E] leading-snug">
              {t('breakNote.text', { minutes: breakNoteMinutes })}
            </p>
            <button
              id="btn-break-note-ok"
              type="button"
              onClick={() => setBreakNoteMinutes(null)}
              className="shrink-0 px-2.5 py-1 rounded-xl bg-white border border-[#C6DFED] text-[11px] font-extrabold text-[#2C566E] cursor-pointer"
            >
              {t('breakNote.ok')}
            </button>
          </div>
        )}
        <div className="w-16 h-16 rounded-2xl bg-[#FAF2E4] flex items-center justify-center mb-3 shadow-inner">
          <CatIllustration breed="cream" mood="idle" className="w-14 h-14" />
        </div>

        <h2 className="text-[22px] font-black text-[#3A312C] tracking-tight">
          {t('pause.title')}
        </h2>
        <p className="text-[12.5px] font-bold text-[#8A7B70] mt-0.5 mb-3">
          {subtitle}
        </p>

        {/* Quick Classic vs Practice Mode Switcher */}
        <div className="w-full grid grid-cols-2 gap-1.5 bg-[#EFE6D8] p-1 rounded-2xl mb-4">
          <button
            id="btn-pause-mode-classic"
            type="button"
            onClick={() => setGameMode('classic')}
            className={`py-1.5 rounded-xl text-[12px] font-extrabold transition-all cursor-pointer ${
              gameMode === 'classic'
                ? 'bg-white text-[#3A312C] shadow-xs'
                : 'text-[#7E7067]'
            }`}
          >
            ♥ {t('settings.modeClassic')}
          </button>
          <button
            id="btn-pause-mode-practice"
            type="button"
            onClick={() => setGameMode('practice')}
            className={`py-1.5 rounded-xl text-[12px] font-extrabold transition-all cursor-pointer ${
              gameMode === 'practice'
                ? 'bg-white text-[#2D754E] shadow-xs'
                : 'text-[#7E7067]'
            }`}
          >
            ✦ {t('settings.modePractice')}
          </button>
        </div>

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
