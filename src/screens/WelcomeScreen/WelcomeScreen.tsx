import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Grid2x2,
  Play,
  Settings,
  Star,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getTodayDateKey, TOTAL_LEVELS } from '../../game/levels';
import { CatIllustration } from '../../components/Cat/CatIllustration';
import { MeowdokuLogo } from '../../components/Cat/MeowdokuLogo';
import { TactileButton } from '../../components/Buttons/TactileButton';

export const WelcomeScreen: React.FC = () => {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const levelProgress = useGameStore((s) => s.levelProgress);
  const completedDailyDates = useGameStore((s) => s.completedDailyDates);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const continueGame = useGameStore((s) => s.continueGame);
  const startDailyChallenge = useGameStore((s) => s.startDailyChallenge);
  const goToScreen = useGameStore((s) => s.goToScreen);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const setTutorialOpen = useGameStore((s) => s.setTutorialOpen);

  const completedCount = Object.values(levelProgress).filter((p) => p.completed).length;
  const totalStars = Object.values(levelProgress).reduce((acc, p) => acc + p.stars, 0);
  const hasStarted = completedCount > 0 || currentLevelId > 1;
  const todayKey = getTodayDateKey();
  const dailySolved = completedDailyDates.includes(todayKey);

  return (
    <div className="relative h-full w-full flex flex-col justify-between px-5 pt-3.5 pb-5 overflow-hidden">
      {/* Top utility row */}
      <div className="flex items-center justify-between shrink-0">
        {completedCount > 0 ? (
          <div className="inline-flex items-center gap-2 bg-white/95 border border-[#EAE0D2] rounded-full px-3 py-1.5 shadow-[0_3px_10px_rgba(92,69,52,0.06)]">
            <Star className="w-4 h-4 text-[#F4B942] fill-[#F4B942]" />
            <span className="text-[13px] font-black text-[#3A312C] tabular-nums">
              {totalStars}
            </span>
            <span className="w-px h-3 bg-[#E3D8C8]" />
            <span className="text-[12px] font-extrabold text-[#7E7067] tabular-nums">
              {completedCount}/{TOTAL_LEVELS}
            </span>
          </div>
        ) : (
          <div />
        )}

        <button
          id="btn-welcome-settings"
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="w-10 h-10 rounded-full bg-white border border-[#EAE0D2] shadow-[0_3px_10px_rgba(92,69,52,0.07)] flex items-center justify-center text-[#5A4E47] active:scale-92 transition-transform cursor-pointer"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Hero Showcase with Gemini Nano Banana Storybook Key Art & Animated Cinemagraph */}
      <div className="flex flex-col items-center text-center my-auto py-1">
        <div className="relative w-full max-w-[330px] mb-3.5">
          {/* Warm ambient halo */}
          <div
            aria-hidden="true"
            className="absolute -inset-4 rounded-[36px] bg-gradient-to-tr from-[#FFE2B8]/70 via-[#FFD4DC]/55 to-[#D9D0F5]/60 blur-2xl pointer-events-none"
          />

          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative meow-board-frame w-full aspect-[4/3] rounded-[28px] p-1.5 overflow-hidden"
          >
            <div className="relative w-full h-full rounded-[22px] overflow-hidden bg-[#FAF2E4]">
              {reducedMotion ? (
                <img
                  src="/media/images/intro-hero.webp"
                  alt="Three adorable cats peeking over pastel Meowdoku puzzle tiles"
                  className="w-full h-full object-cover"
                  fetchPriority="high"
                />
              ) : (
                <video
                  src="/media/videos/intro-cinematic.mp4"
                  poster="/media/images/intro-hero.webp"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Animated intro showing adorable cats peeking over pastel Meowdoku puzzle tiles"
                  className="w-full h-full object-cover"
                />
              )}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#3A312C]/15 to-transparent pointer-events-none"
              />
            </div>
          </motion.div>
        </div>

        <MeowdokuLogo />
        <p className="text-[14.5px] font-bold text-[#7E7067] mt-1 tracking-tight">
          Think smart. Find the cats.
        </p>

        {/* Daily Kitty Challenge Card */}
        <motion.button
          id="btn-daily-challenge"
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={startDailyChallenge}
          className="mt-3.5 w-full max-w-[330px] meow-card rounded-[20px] px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left cursor-pointer hover:border-[#F2CFA0] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE7B3] to-[#FFC39E] flex items-center justify-center shrink-0 shadow-xs">
              <CatIllustration
                breed="lilac"
                mood={dailySolved ? 'celebrate' : 'idle'}
                className="w-9 h-9"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13.5px] font-black text-[#3A312C] leading-none">
                  Daily Kitty
                </span>
                <span className="text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded-full bg-[#FEF2DC] text-[#A46D1A] leading-none">
                  8×8
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#8A7B70] mt-1 leading-none">
                <Calendar className="w-3 h-3" />
                {dailySolved ? 'Solved today — replay anytime!' : `Fresh puzzle • ${todayKey}`}
              </div>
            </div>
          </div>

          {dailySolved ? (
            <span className="w-7 h-7 rounded-full bg-[#6EB58E] text-white flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" strokeWidth={3} />
            </span>
          ) : (
            <span className="w-7 h-7 rounded-full bg-[#FAF2E4] text-[#9A6818] flex items-center justify-center shrink-0">
              <ChevronRight className="w-4 h-4" strokeWidth={2.8} />
            </span>
          )}
        </motion.button>
      </div>

      {/* Primary Action Stack */}
      <div className="flex flex-col gap-2.5 w-full max-w-[330px] mx-auto shrink-0">
        <TactileButton
          id="btn-welcome-play"
          variant="primary"
          size="lg"
          fullWidth
          onClick={continueGame}
          className="relative overflow-hidden btn-shimmer"
        >
          <Play className="w-5 h-5 fill-current" />
          {hasStarted ? `Continue Level ${currentLevelId}` : 'Play Level 1'}
        </TactileButton>

        <div className="grid grid-cols-2 gap-2.5">
          <TactileButton
            id="btn-welcome-levels"
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => goToScreen('levels')}
          >
            <Grid2x2 className="w-4.5 h-4.5 text-[#FF7A7A]" />
            Levels
          </TactileButton>

          <TactileButton
            id="btn-welcome-howto"
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setTutorialOpen(true)}
          >
            <BookOpen className="w-4.5 h-4.5 text-[#9B86D4]" />
            How to Play
          </TactileButton>
        </div>
      </div>
    </div>
  );
};
