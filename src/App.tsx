import React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useGameStore } from './store/gameStore';
import { WelcomeScreen } from './screens/WelcomeScreen/WelcomeScreen';
import { LevelSelectionScreen } from './screens/LevelSelectionScreen/LevelSelectionScreen';
import { GameScreen } from './screens/GameScreen/GameScreen';
import { SettingsScreen } from './screens/SettingsScreen/SettingsScreen';
import { TutorialScreen } from './screens/TutorialScreen/TutorialScreen';
import { ParticleCanvas } from './components/Effects/ParticleCanvas';

export const App: React.FC = () => {
  const screen = useGameStore((s) => s.screen);
  const settings = useGameStore((s) => s.settings);
  const isSettingsOpen = useGameStore((s) => s.isSettingsOpen);
  const isTutorialOpen = useGameStore((s) => s.isTutorialOpen);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const markTutorialSeen = useGameStore((s) => s.markTutorialSeen);
  const updateSetting = useGameStore((s) => s.updateSetting);
  const resetAllProgress = useGameStore((s) => s.resetAllProgress);

  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? 'always' : 'user'}>
      {/*
        Mobile-only app shell:
        - On smartphones (< 500px): fills 100vw x 100dvh edge-to-edge cleanly.
        - On desktop/tablet: centered narrow portrait phone container on a soft warm backdrop.
      */}
      <div
        className={`app-backdrop w-full h-[100dvh] flex items-center justify-center sm:p-4 overflow-hidden ${
          settings.reducedMotion ? 'reduced-motion' : ''
        }`}
      >
        <div
          className="
            mobile-viewport relative w-full h-full
            sm:w-[412px] sm:max-w-[430px] sm:h-[min(860px,calc(100dvh-32px))]
            sm:rounded-[38px] sm:border-[6px] sm:border-white/90
            sm:shadow-[0_28px_70px_rgba(74,52,36,0.22),0_4px_16px_rgba(74,52,36,0.08)]
            overflow-hidden flex flex-col
          "
        >
          <AnimatePresence mode="wait">
            {screen === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="h-full w-full"
              >
                <WelcomeScreen />
              </motion.div>
            )}

            {screen === 'levels' && (
              <motion.div
                key="levels"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.18 }}
                className="h-full w-full"
              >
                <LevelSelectionScreen />
              </motion.div>
            )}

            {screen === 'game' && (
              <motion.div
                key="game"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.985 }}
                transition={{ duration: 0.18 }}
                className="h-full w-full"
              >
                <GameScreen />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 120fps Hardware-Accelerated Canvas Particle Overlay */}
          <ParticleCanvas enabled={!settings.reducedMotion} />

          {/* Global Modals (mounted inside mobile shell so overlays stay scoped cleanly!) */}
          <SettingsScreen
            open={isSettingsOpen}
            settings={settings}
            onUpdateSetting={updateSetting}
            onResetProgress={resetAllProgress}
            onClose={() => setSettingsOpen(false)}
          />

          <TutorialScreen open={isTutorialOpen} onClose={markTutorialSeen} />
        </div>
      </div>
    </MotionConfig>
  );
};

export default App;
