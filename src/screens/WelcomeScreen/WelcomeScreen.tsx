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

  const previewTiles = [
    { bg: '#E8C158', content: 'x' },
    { bg: '#E8C158', content: 'cat', breed: 'ginger' as const },
    { bg: '#E87E8E', content: 'x' },
    { bg: '#86B4D0', content: 'x' },
    { bg: '#86B4D0', content: 'x' },
    { bg: '#E87E8E', content: 'cat', breed: 'tuxedo' as const },
    { bg: '#79AE8D', content: 'cat', breed: 'gray' as const },
    { bg: '#9B86D4', content: 'x' },
    { bg: '#9B86D4', content: 'x' },
  ];

  return (
    <div className="relative h-full w-full flex flex-col justify-between px-5 pt-4 pb-5 overflow-hidden">
      {/* Top utility row */}
      <div className="flex items-center justify-between">
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

      {/* Hero Showcase */}
      <div className="flex flex-col items-center text-center my-auto py-1">
        <div className="relative mb-4">
          <div
            aria-hidden="true"
            className="absolute -inset-6 rounded-full bg-gradient-to-tr from-[#FFE2B8]/65 via-[#FFD4DC]/55 to-[#D9D0F5]/60 blur-2xl pointer-events-none"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            className="relative meow-board-frame w-[174px] h-[174px] sm:w-[186px] sm:h-[186px] rounded-[30px] p-3 grid grid-cols-3 grid-rows-3 gap-2"
          >
            {previewTiles.map((tile, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.72, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.035 * i, type: 'spring', stiffness: 440, damping: 22 }}
                style={{ backgroundColor: tile.bg }}
                className="rounded-[12px] tile-gloss flex items-center justify-center"
              >
                {tile.content === 'cat' && tile.breed ? (
                  <motion.div
                    animate={reducedMotion ? undefined : { y: [0, -2.5, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2.3 + (i % 3) * 0.4,
                      ease: 'easeInOut',
                    }}
                    className="w-[88%] h-[88%]"
                  >
                    <CatIllustration
                      breed={tile.breed}
                      mood="idle"
                      blinkDelaySec={i * 0.7}
                      className="w-full h-full"
                    />
                  </motion.div>
                ) : (
                  <svg viewBox="0 0 40 40" className="w-[50%] h-[50%] opacity-90">
                    <path
                      d="M11 11 L29 29 M29 11 L11 29"
                      stroke="#FFFFFF"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </motion.div>
            ))}

            {/* Peeking Calico Badge */}
            <motion.div
              animate={reducedMotion ? undefined : { rotate: [-4, 4, -4], y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute -top-4.5 -right-4 w-14 h-14 rounded-2xl bg-white border-2 border-[#F5EBDC] shadow-[0_8px_20px_rgba(92,69,52,0.16)] flex items-center justify-center p-1"
            >
              <CatIllustration breed="calico" mood="happy" className="w-full h-full" />
            </motion.div>
          </motion.div>
        </div>

        <MeowdokuLogo />
        <p className="text-[15px] font-bold text-[#7E7067] mt-1.5 tracking-tight">
          Think smart. Find the cats.
        </p>

        {/* Daily Kitty Challenge Card */}
        <motion.button
          id="btn-daily-challenge"
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={startDailyChallenge}
          className="mt-4 w-full max-w-[340px] meow-card rounded-[20px] px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left cursor-pointer hover:border-[#F2CFA0] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE7B3] to-[#FFC39E] flex items-center justify-center shrink-0 shadow-xs">
              <CatIllustration breed="lilac" mood={dailySolved ? 'celebrate' : 'idle'} className="w-9 h-9" />
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
      <div className="flex flex-col gap-2.5 w-full max-w-[340px] mx-auto">
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
