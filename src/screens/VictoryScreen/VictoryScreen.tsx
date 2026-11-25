import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  Lightbulb,
  Map,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { VictorySummary } from '../../store/gameStore';
import { TOTAL_LEVELS } from '../../game/levels';
import { TactileButton } from '../../components/Buttons/TactileButton';
import { FishCoinIcon } from '../../components/Currency/FishCoinIcon';
import { formatTime } from '../../utils/format';

interface VictoryScreenProps {
  summary: VictorySummary | null;
  reducedMotion: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onLevels: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  summary,
  onNextLevel,
  onReplay,
  onLevels,
}) => {
  const { t } = useTranslation();
  const isDaily = Boolean(summary?.dailyDateKey);
  const isFinalLevel = !isDaily && summary ? summary.levelId >= TOTAL_LEVELS : false;

  return (
    <AnimatePresence>
      {summary && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={
            isDaily
              ? t('victory.challengeComplete')
              : t('victory.levelComplete', { id: summary.levelId })
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-[#2E241E]/52 backdrop-blur-[5px] overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.84, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="relative w-full max-w-[356px] bg-[#FFFDF9] rounded-[32px] border border-[#EAE0D2] shadow-[0_28px_60px_rgba(46,36,30,0.3)] overflow-hidden text-center"
          >
            <div className="relative w-full h-[136px] bg-[#FAF2E4] overflow-hidden">
              <img
                src="/media/images/victory-celebration.webp"
                alt={t('victory.imgAlt')}
                className="w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FFFDF9] to-transparent"
              />
            </div>

            <div className="px-5 pb-5 -mt-3 relative">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F6EE] text-[#357D56] text-[11px] font-black uppercase tracking-wider shadow-xs">
                <Trophy className="w-3.5 h-3.5" />
                {isDaily
                  ? t('victory.challengeComplete')
                  : t('victory.levelComplete', { id: summary.levelId })}
              </span>

              <h2 className="text-[23px] font-black text-[#3A312C] tracking-tight mt-1.5">
                {t('victory.title')}
              </h2>

              <div className="flex items-center justify-center gap-2 my-2.5">
                {[1, 2, 3].map((starIndex) => {
                  const earned = starIndex <= summary.stars;
                  return (
                    <motion.div
                      key={starIndex}
                      initial={{ scale: 0, rotate: -25 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 18,
                        delay: 0.1 * starIndex,
                      }}
                      className={starIndex === 2 ? '-mt-2' : ''}
                    >
                      <Star
                        className={`w-9 h-9 ${
                          earned
                            ? 'text-[#F4B942] fill-[#F4B942] drop-shadow-[0_3px_6px_rgba(244,185,66,0.4)]'
                            : 'text-[#E3D8C8] fill-[#EFE7DA]'
                        }`}
                      />
                    </motion.div>
                  );
                })}
              </div>

              <div className="inline-flex items-center gap-1.5 bg-[#FFF5DC] border border-[#F0D492] px-3.5 py-1.5 rounded-full mb-3">
                <FishCoinIcon className="w-5 h-5" />
                <span className="text-[14.5px] font-black text-[#6B4812] tabular-nums">
                  {t('victory.coinsEarned', { count: summary.coinsAwarded })}
                </span>
              </div>

              {(summary.unlockedNextWorld || summary.newlyUnlockedCats.length > 0) && (
                <div className="mb-3 rounded-2xl bg-[#F4EEFD] border border-[#DFD2F8] px-3 py-1.5 text-[11.5px] font-extrabold text-[#5D439E] flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  {summary.unlockedNextWorld
                    ? t('victory.unlockedWorld', {
                        world: t(`worlds.${summary.unlockedNextWorld.id}.name`),
                      })
                    : t('victory.unlockedCat', {
                        cat: summary.newlyUnlockedCats[0]!.name,
                      })}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] py-2 px-1 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#8A7B70] inline-flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {t('victory.time')}
                  </span>
                  <span className="text-[15px] font-black text-[#3A312C] tabular-nums mt-0.5">
                    {formatTime(summary.elapsedSec)}
                  </span>
                </div>

                <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] py-2 px-1 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#8A7B70] inline-flex items-center gap-0.5">
                    <Lightbulb className="w-3 h-3" />
                    {t('victory.hints')}
                  </span>
                  <span className="text-[15px] font-black text-[#3A312C] tabular-nums mt-0.5">
                    {summary.hintsUsed}
                  </span>
                </div>

                <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] py-2 px-1 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#8A7B70]">
                    {t('victory.mistakes')}
                  </span>
                  <span className="text-[15px] font-black text-[#3A312C] tabular-nums mt-0.5">
                    {summary.mistakesCount}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <TactileButton
                  id="btn-victory-next"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={onNextLevel}
                  className="relative overflow-hidden btn-shimmer text-[15.5px]"
                >
                  {isDaily
                    ? t('victory.backToMap')
                    : isFinalLevel
                      ? t('victory.replayFrom1')
                      : t('victory.nextLevel', { id: summary.levelId + 1 })}
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </TactileButton>

                <div className="grid grid-cols-2 gap-2">
                  <TactileButton
                    id="btn-victory-levels"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={onLevels}
                  >
                    <Map className="w-4 h-4" />
                    {t('victory.mapButton')}
                  </TactileButton>
                  <TactileButton
                    id="btn-victory-replay"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={onReplay}
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('victory.replayButton')}
                  </TactileButton>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
