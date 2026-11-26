import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, RotateCcw, Sparkles, Star } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getLevelPuzzle } from '../../game/levels';
import { formatTime } from '../../utils/format';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';

interface LevelDetailsSheetProps {
  levelId: number | null;
  onClose: () => void;
}

export const LevelDetailsSheet: React.FC<LevelDetailsSheetProps> = ({
  levelId,
  onClose,
}) => {
  const { t } = useTranslation();
  const levelProgress = useGameStore((s) => s.levelProgress);
  const campaignSaveLevelIds = useGameStore((s) => s.campaignSaveLevelIds);
  const startLevel = useGameStore((s) => s.startLevel);

  const open = levelId !== null;
  const puzzle = levelId !== null ? getLevelPuzzle(levelId) : null;
  const prog = levelId !== null ? levelProgress[levelId] : undefined;
  const hasSavedSlot = levelId !== null && campaignSaveLevelIds.includes(levelId);

  const localizedTitle =
    levelId !== null && puzzle
      ? t(`levels.${levelId}`, { defaultValue: puzzle.title })
      : '';
  const headerText =
    levelId !== null
      ? t('levelDetails.title', { id: levelId, title: localizedTitle })
      : '';

  const stars = prog?.stars ?? 0;
  const lastResult = prog?.lastResult ?? null;
  const lastResultText = lastResult
    ? `${lastResult.stars}★ · ${formatTime(lastResult.timeSec)} · ${t(
        lastResult.mode === 'classic' ? 'settings.modeClassic' : 'settings.modePractice'
      )}`
    : '—';

  const rows = [
    {
      label: t('levelDetails.bestTime'),
      value:
        prog?.bestTimeSec !== null && prog?.bestTimeSec !== undefined
          ? formatTime(prog.bestTimeSec)
          : '—',
    },
    {
      label: t('levelDetails.fewestMistakes'),
      value:
        prog?.bestMistakes !== null && prog?.bestMistakes !== undefined
          ? String(prog.bestMistakes)
          : '—',
    },
    {
      label: t('levelDetails.fewestHints'),
      value:
        prog?.bestHintsUsed !== null && prog?.bestHintsUsed !== undefined
          ? String(prog.bestHintsUsed)
          : '—',
    },
    {
      label: t('levelDetails.timesCompleted'),
      value: String(prog?.attempts ?? (prog?.completed ? 1 : 0)),
    },
    {
      label: t('levelDetails.lastResult'),
      value: lastResultText,
    },
  ];

  const handlePlay = () => {
    if (levelId === null) return;
    startLevel(levelId, true);
    onClose();
  };

  return (
    <ModalSheet
      id="level-details-sheet"
      open={open}
      onClose={onClose}
      ariaLabel={headerText || t('levelDetails.close')}
    >
      {levelId !== null && puzzle && (
        <div className="p-5 flex flex-col items-center text-center">
          <h2 className="text-[18px] font-black text-[#3A312C] tracking-tight leading-snug">
            {headerText}
          </h2>

          <div className="flex items-center justify-center gap-1.5 my-3">
            {[1, 2, 3].map((starIndex) => {
              const earned = starIndex <= stars;
              return (
                <Star
                  key={starIndex}
                  className={`w-7 h-7 ${
                    earned
                      ? 'text-[#F4B942] fill-[#F4B942] drop-shadow-[0_2px_4px_rgba(244,185,66,0.35)]'
                      : 'text-[#E3D8C8] fill-[#EFE7DA]'
                  }`}
                />
              );
            })}
          </div>

          <dl className="w-full rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] divide-y divide-[#EFE6D8] text-left">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-2 px-3.5 py-2"
              >
                <dt className="text-[11.5px] font-bold text-[#7E7067]">
                  {row.label}
                </dt>
                <dd className="text-[12px] font-black text-[#3A312C] tabular-nums text-right">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          {stars < 3 && (
            <p className="mt-3 w-full rounded-xl bg-[#FFF6DF] border border-[#F2DDA3] px-3 py-2 text-[11px] font-bold text-[#7B5614] flex items-center justify-center gap-1.5 leading-snug">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#D99118]" />
              <span>
                {t('levelDetails.threeStarTip', {
                  time: formatTime(puzzle.parTimeSec),
                })}
              </span>
            </p>
          )}

          <div className="w-full flex flex-col gap-2 mt-4">
            <TactileButton
              id="btn-level-details-play"
              variant="primary"
              size="md"
              fullWidth
              onClick={handlePlay}
            >
              {hasSavedSlot ? (
                <Play className="w-4 h-4 fill-current" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {hasSavedSlot ? t('levelDetails.continue') : t('levelDetails.replay')}
            </TactileButton>

            <TactileButton
              id="btn-level-details-close"
              variant="secondary"
              size="sm"
              fullWidth
              onClick={onClose}
            >
              {t('levelDetails.close')}
            </TactileButton>
          </div>
        </div>
      )}
    </ModalSheet>
  );
};
