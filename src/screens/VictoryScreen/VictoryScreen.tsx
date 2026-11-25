import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  Grid2x2,
  Lightbulb,
  RotateCcw,
  Star,
  Trophy,
} from 'lucide-react';
import { VictorySummary } from '../../store/gameStore';
import { TOTAL_LEVELS } from '../../game/levels';
import { TactileButton } from '../../components/Buttons/TactileButton';
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
  const isDaily = Boolean(summary?.dailyDateKey);
  const isFinalLevel = !isDaily && summary ? summary.levelId >= TOTAL_LEVELS : false;

  return (
    <AnimatePresence>
      {summary && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={
            isDaily ? 'Daily Kitty puzzle completed' : `Level ${summary.levelId} completed`
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-[#2E241E]/50 backdrop-blur-[5px] overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.84, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="relative w-full max-w-[356px] bg-[#FFFDF9] rounded-[32px] border border-[#EAE0D2] shadow-[0_28px_60px_rgba(46,36,30,0.3)] overflow-hidden text-center"
          >
            {/* Full-bleed Gemini Nano Banana Victory Illustration */}
            <div className="relative w-full h-[146px] bg-[#FAF2E4] overflow-hidden">
              <img
                src="/media/images/victory-celebration.webp"
                alt="Celebrating cats jumping with stars and hearts"
                className="w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FFFDF9] to-transparent"
              />
            </div>

            <div className="px-6 pb-6 -mt-3 relative">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F6EE] text-[#357D56] text-[11px] font-black uppercase tracking-wider shadow-xs">
                <Trophy className="w-3.5 h-3.5" />
                {isDaily ? 'Daily Kitty Complete!' : `Level ${summary.levelId} Complete!`}
              </span>

              <h2 className="text-[26px] font-black text-[#3A312C] tracking-tight mt-2">
                Purr-fect Solve!
              </h2>

              {/* Animated 3-Star Rating */}
              <div className="flex items-center justify-center gap-2.5 my-3">
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
                      className={starIndex === 2 ? '-mt-2.5' : ''}
                    >
                      <Star
                        className={`w-10 h-10 ${
                          earned
                            ? 'text-[#F4B942] fill-[#F4B942] drop-shadow-[0_3px_6px_rgba(244,185,66,0.4)]'
                            : 'text-[#E3D8C8] fill-[#EFE7DA]'
                        }`}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-2.5 my-3.5">
                <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-2.5 flex flex-col items-center">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#8A7B70]">
                    <Clock className="w-3.5 h-3.5" />
                    Time
                  </div>
                  <div className="text-[20px] font-black text-[#3A312C] tabular-nums leading-tight mt-0.5">
                    {formatTime(summary.elapsedSec)}
                  </div>
                  {summary.isNewBestTime && (
                    <span className="text-[10px] font-extrabold text-[#4B9B6E] mt-0.5">
                      New Best!
                    </span>
                  )}
                </div>

                <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-2.5 flex flex-col items-center">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#8A7B70]">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Hints Used
                  </div>
                  <div className="text-[20px] font-black text-[#3A312C] tabular-nums leading-tight mt-0.5">
                    {summary.hintsUsed}
                  </div>
                  <span className="text-[10px] font-extrabold text-[#8A7B70] mt-0.5">
                    {summary.hintsUsed === 0 ? 'Pure Logic!' : 'Smart Assist'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2.5 mt-2">
                <TactileButton
                  id="btn-victory-next"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={onNextLevel}
                  className="relative overflow-hidden btn-shimmer"
                >
                  {isDaily
                    ? 'Continue Campaign'
                    : isFinalLevel
                      ? 'Play Again from Level 1'
                      : `Next Level (${summary.levelId + 1})`}
                  <ArrowRight className="w-5 h-5" />
                </TactileButton>

                <div className="grid grid-cols-2 gap-2.5">
                  <TactileButton
                    id="btn-victory-levels"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={onLevels}
                  >
                    <Grid2x2 className="w-4 h-4" />
                    Levels
                  </TactileButton>
                  <TactileButton
                    id="btn-victory-replay"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={onReplay}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Replay
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
