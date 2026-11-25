import React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ScreenName, useGameStore } from './store/gameStore';
import { WelcomeScreen } from './screens/WelcomeScreen/WelcomeScreen';
import { MapScreen } from './screens/MapScreen/MapScreen';
import { CatsCollectionScreen } from './screens/CatsCollectionScreen/CatsCollectionScreen';
import { MissionsScreen } from './screens/MissionsScreen/MissionsScreen';
import { ShopScreen } from './screens/ShopScreen/ShopScreen';
import { ProfileScreen } from './screens/ProfileScreen/ProfileScreen';
import { GameScreen } from './screens/GameScreen/GameScreen';
import { SettingsScreen } from './screens/SettingsScreen/SettingsScreen';
import { TutorialScreen } from './screens/TutorialScreen/TutorialScreen';
import { ParticleCanvas } from './components/Effects/ParticleCanvas';
import { BottomNav } from './components/Navigation/BottomNav';
import { DailyCalendarModal } from './components/Modals/DailyCalendarModal';
import { RewardedAdModal } from './components/Modals/RewardedAdModal';
import { CelebrationModals } from './components/Modals/CelebrationModals';

const HUB_SCREENS = new Set<ScreenName>([
  'map',
  'cats',
  'missions',
  'shop',
  'profile',
]);

export const App: React.FC = () => {
  const screen = useGameStore((s) => s.screen);
  const settings = useGameStore((s) => s.settings);
  const isSettingsOpen = useGameStore((s) => s.isSettingsOpen);
  const isTutorialOpen = useGameStore((s) => s.isTutorialOpen);
  const toastMessage = useGameStore((s) => s.toastMessage);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const markTutorialSeen = useGameStore((s) => s.markTutorialSeen);
  const updateSetting = useGameStore((s) => s.updateSetting);
  const resetAllProgress = useGameStore((s) => s.resetAllProgress);

  const showBottomNav = HUB_SCREENS.has(screen);

  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? 'always' : 'user'}>
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
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {screen === 'welcome' && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                  className="h-full w-full"
                >
                  <WelcomeScreen />
                </motion.div>
              )}

              {screen === 'map' && (
                <motion.div
                  key="map"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="h-full w-full"
                >
                  <MapScreen />
                </motion.div>
              )}

              {screen === 'cats' && (
                <motion.div
                  key="cats"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="h-full w-full"
                >
                  <CatsCollectionScreen />
                </motion.div>
              )}

              {screen === 'missions' && (
                <motion.div
                  key="missions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="h-full w-full"
                >
                  <MissionsScreen />
                </motion.div>
              )}

              {screen === 'shop' && (
                <motion.div
                  key="shop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="h-full w-full"
                >
                  <ShopScreen />
                </motion.div>
              )}

              {screen === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="h-full w-full"
                >
                  <ProfileScreen />
                </motion.div>
              )}

              {screen === 'game' && (
                <motion.div
                  key="game"
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.985 }}
                  transition={{ duration: 0.16 }}
                  className="h-full w-full"
                >
                  <GameScreen />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5-Tab Bottom Navigation (strictly hidden on Welcome & active Puzzle Gameplay!) */}
          {showBottomNav && <BottomNav />}

          {/* Floating Non-Intrusive Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                key="toast"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: -14, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.94 }}
                className="absolute top-14 inset-x-4 z-70 flex justify-center pointer-events-none"
              >
                <div className="bg-[#3A312C]/95 text-white text-[12px] font-extrabold px-4 py-2 rounded-full shadow-lg text-center">
                  {toastMessage}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 120fps Hardware-Accelerated Canvas Particle Overlay */}
          <ParticleCanvas enabled={!settings.reducedMotion} />

          {/* Global Modals */}
          <SettingsScreen
            open={isSettingsOpen}
            settings={settings}
            onUpdateSetting={updateSetting}
            onResetProgress={resetAllProgress}
            onClose={() => setSettingsOpen(false)}
          />

          <TutorialScreen open={isTutorialOpen} onClose={markTutorialSeen} />
          <DailyCalendarModal />
          <RewardedAdModal />
          <CelebrationModals />
        </div>
      </div>
    </MotionConfig>
  );
};

export default App;
