import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, WifiOff } from 'lucide-react';
import { ScreenName, useGameStore } from './store/gameStore';
import { WelcomeScreen } from './screens/WelcomeScreen/WelcomeScreen';
import { ParticleCanvas } from './components/Effects/ParticleCanvas';
import {
  applyPendingSwUpdate,
  onSwRouteMessage,
  onSwUpdateStatus,
  precacheLoadedAppAssets,
} from './services/swManager';
import {
  getPwaInstallState,
  PwaInstallState,
  subscribePwaInstall,
} from './services/pwaInstall';
import {
  getBrowserNotificationPermission,
  loadNotificationPrefs,
  startLocalReminderScheduler,
} from './services/localNotifications';

// Route-based & modal code splitting — keeps initial Welcome bundle ultra-light!
const MapScreen = lazy(() =>
  import('./screens/MapScreen/MapScreen').then((m) => ({ default: m.MapScreen }))
);
const CatsCollectionScreen = lazy(() =>
  import('./screens/CatsCollectionScreen/CatsCollectionScreen').then((m) => ({
    default: m.CatsCollectionScreen,
  }))
);
const MissionsScreen = lazy(() =>
  import('./screens/MissionsScreen/MissionsScreen').then((m) => ({
    default: m.MissionsScreen,
  }))
);
const ShopScreen = lazy(() =>
  import('./screens/ShopScreen/ShopScreen').then((m) => ({ default: m.ShopScreen }))
);
const ProfileScreen = lazy(() =>
  import('./screens/ProfileScreen/ProfileScreen').then((m) => ({
    default: m.ProfileScreen,
  }))
);
const GameScreen = lazy(() =>
  import('./screens/GameScreen/GameScreen').then((m) => ({ default: m.GameScreen }))
);
const BottomNav = lazy(() =>
  import('./components/Navigation/BottomNav').then((m) => ({ default: m.BottomNav }))
);
const SettingsScreen = lazy(() =>
  import('./screens/SettingsScreen/SettingsScreen').then((m) => ({
    default: m.SettingsScreen,
  }))
);
const TutorialScreen = lazy(() =>
  import('./screens/TutorialScreen/TutorialScreen').then((m) => ({
    default: m.TutorialScreen,
  }))
);
const DailyCalendarModal = lazy(() =>
  import('./components/Modals/DailyCalendarModal').then((m) => ({
    default: m.DailyCalendarModal,
  }))
);
const RewardedAdModal = lazy(() =>
  import('./components/Modals/RewardedAdModal').then((m) => ({
    default: m.RewardedAdModal,
  }))
);
const CelebrationModals = lazy(() =>
  import('./components/Modals/CelebrationModals').then((m) => ({
    default: m.CelebrationModals,
  }))
);
const InstallPromptModal = lazy(() =>
  import('./components/Modals/InstallPromptModal').then((m) => ({
    default: m.InstallPromptModal,
  }))
);
const NotificationOnboardingModal = lazy(() =>
  import('./components/Modals/NotificationOnboardingModal').then((m) => ({
    default: m.NotificationOnboardingModal,
  }))
);
const NotificationSettingsModal = lazy(() =>
  import('./components/Modals/NotificationSettingsModal').then((m) => ({
    default: m.NotificationSettingsModal,
  }))
);

const HUB_SCREENS = new Set<ScreenName>([
  'map',
  'cats',
  'missions',
  'shop',
  'profile',
]);

const ScreenFallback: React.FC = () => (
  <div className="h-full w-full flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-3 border-[#FF8585]/30 border-t-[#FF7A7A] animate-spin" />
  </div>
);

export const App: React.FC = () => {
  const { t } = useTranslation();
  const screen = useGameStore((s) => s.screen);
  const settings = useGameStore((s) => s.settings);
  const isSettingsOpen = useGameStore((s) => s.isSettingsOpen);
  const isTutorialOpen = useGameStore((s) => s.isTutorialOpen);
  const isDailyCalendarOpen = useGameStore((s) => s.isDailyCalendarOpen);
  const rewardedAdPlacement = useGameStore((s) => s.rewardedAdPlacement);
  const unlockedWorldModal = useGameStore((s) => s.unlockedWorldModal);
  const unlockedCatModal = useGameStore((s) => s.unlockedCatModal);
  const chestRevealModal = useGameStore((s) => s.chestRevealModal);
  const unlockedLevelId = useGameStore((s) => s.unlockedLevelId);
  const toastMessage = useGameStore((s) => s.toastMessage);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const markTutorialSeen = useGameStore((s) => s.markTutorialSeen);
  const updateSetting = useGameStore((s) => s.updateSetting);
  const resetAllProgress = useGameStore((s) => s.resetAllProgress);
  const showToast = useGameStore((s) => s.showToast);

  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false);
  const [notifOnboardingOpen, setNotifOnboardingOpen] = useState(false);
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [installState, setInstallState] = useState<PwaInstallState>(() =>
    getPwaInstallState()
  );

  const handleRouteAction = useCallback((action: string) => {
    const store = useGameStore.getState();
    if (action === 'daily') {
      store.startDailyChallenge();
    } else if (action === 'continue') {
      store.continueGame();
    } else if (action === 'map') {
      store.goToScreen('map');
    } else if (action === 'missions') {
      store.goToScreen('missions');
    }
  }, []);

  // Offline status, SW safe update listener, install state, and URL shortcut routing
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const unsubUpdate = onSwUpdateStatus(setSwUpdateReady);
    const unsubRoute = onSwRouteMessage(handleRouteAction);
    const unsubInstall = subscribePwaInstall(setInstallState);

    // Handle PWA shortcut / notification click URL params on cold launch
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action) {
        handleRouteAction(action);
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {
      // Ignore URL parsing errors
    }

    // Start browser-only daily reminder scheduler (zero server)
    const stopScheduler = startLocalReminderScheduler((payload) => {
      showToast(payload.body);
    });

    // Preload all lazy screens & modals during idle so every feature works 100% offline after first load!
    const preloadCoreChunks = () => {
      void Promise.all([
        import('./screens/GameScreen/GameScreen'),
        import('./screens/MapScreen/MapScreen'),
        import('./screens/TutorialScreen/TutorialScreen'),
        import('./screens/SettingsScreen/SettingsScreen'),
        import('./screens/CatsCollectionScreen/CatsCollectionScreen'),
        import('./screens/MissionsScreen/MissionsScreen'),
        import('./screens/ShopScreen/ShopScreen'),
        import('./screens/ProfileScreen/ProfileScreen'),
        import('./components/Navigation/BottomNav'),
        import('./components/Modals/NotificationSettingsModal'),
        import('./components/Modals/NotificationOnboardingModal'),
        import('./components/Modals/InstallPromptModal'),
        import('./components/Modals/DailyCalendarModal'),
      ]).then(() => {
        precacheLoadedAppAssets();
      });
    };
    const idleTimer = window.setTimeout(preloadCoreChunks, 2400);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      unsubUpdate();
      unsubRoute();
      unsubInstall();
      stopScheduler();
      window.clearTimeout(idleTimer);
    };
  }, [handleRouteAction, showToast]);

  // Offer gentle one-time notification onboarding AFTER player finishes Level 1 & returns to Map
  // Never re-asks users who declined or already enabled!
  useEffect(() => {
    if (screen !== 'map' || unlockedLevelId < 2) return;
    const prefs = loadNotificationPrefs();
    const perm = getBrowserNotificationPermission();
    if (!prefs.enabled && !prefs.onboardingDismissed && perm === 'default') {
      const timer = window.setTimeout(() => {
        setNotifOnboardingOpen(true);
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [screen, unlockedLevelId]);

  const showBottomNav = HUB_SCREENS.has(screen);
  const hasCelebrationModal = Boolean(
    unlockedWorldModal || unlockedCatModal || chestRevealModal
  );
  // NEVER interrupt an active puzzle with an update banner!
  const showSafeUpdateBanner = swUpdateReady && screen !== 'game';

  return (
    <div
      className={`app-backdrop w-full h-[100dvh] flex items-center justify-center sm:p-4 overflow-hidden ${
        settings.reducedMotion ? 'reduced-motion' : ''
      } ${settings.highContrast ? 'high-contrast' : ''} ${
        settings.largeText ? 'large-text' : ''
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
        {/* Subtle Non-Intrusive Offline Status Strip */}
        {isOffline && (
          <div
            id="offline-status-banner"
            role="status"
            className="px-3 py-1 bg-[#3A312C] text-white text-[10.5px] font-extrabold flex items-center justify-center gap-1.5 shrink-0"
          >
            <WifiOff className="w-3 h-3 text-[#FFE08A]" />
            <span>{t('pwa.offlineReadyBanner')}</span>
          </div>
        )}

        {/* Safe Non-Interrupting App Update Banner (strictly deferred while in active puzzle!) */}
        {showSafeUpdateBanner && (
          <div
            id="sw-update-banner"
            role="status"
            className="px-3 py-1.5 bg-[#E8F7EE] border-b border-[#BBE2CB] flex items-center justify-between gap-2 shrink-0"
          >
            <span className="text-[11px] font-extrabold text-[#2D754E] truncate">
              {t('pwa.updateReadyBanner')}
            </span>
            <button
              id="btn-apply-sw-update"
              type="button"
              onClick={applyPendingSwUpdate}
              className="px-2.5 py-1 rounded-full bg-[#3A9462] text-white text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              {t('pwa.updateNowBtn')}
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 relative overflow-hidden">
          {screen === 'welcome' && (
            <div className="h-full w-full">
              <WelcomeScreen onOpenInstall={() => setInstallModalOpen(true)} />
            </div>
          )}

          {screen !== 'welcome' && (
            <Suspense fallback={<ScreenFallback />}>
              {screen === 'map' && (
                <div className="h-full w-full">
                  <MapScreen />
                </div>
              )}
              {screen === 'cats' && (
                <div className="h-full w-full">
                  <CatsCollectionScreen />
                </div>
              )}
              {screen === 'missions' && (
                <div className="h-full w-full">
                  <MissionsScreen />
                </div>
              )}
              {screen === 'shop' && (
                <div className="h-full w-full">
                  <ShopScreen />
                </div>
              )}
              {screen === 'profile' && (
                <div className="h-full w-full">
                  <ProfileScreen
                    isPwaInstalled={installState.isInstalled}
                    onOpenNotifications={() => setNotifSettingsOpen(true)}
                    onOpenInstall={() => setInstallModalOpen(true)}
                  />
                </div>
              )}
              {screen === 'game' && (
                <div className="h-full w-full">
                  <GameScreen />
                </div>
              )}
            </Suspense>
          )}
        </div>

        {/* 5-Tab Bottom Navigation (strictly hidden on Welcome & active Puzzle Gameplay!) */}
        {showBottomNav && (
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        )}

        {/* Floating Non-Intrusive Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="absolute top-14 inset-x-4 z-70 flex justify-center pointer-events-none anim-x-pop"
          >
            <div className="bg-[#3A312C]/95 text-white text-[12px] font-extrabold px-4 py-2 rounded-full shadow-lg text-center">
              {toastMessage}
            </div>
          </div>
        )}

        {/* Lazy-loaded 120fps Canvas Particle Overlay (mounted only when playing/hub) */}
        {screen !== 'welcome' && !settings.reducedMotion && (
          <Suspense fallback={null}>
            <ParticleCanvas enabled={!settings.reducedMotion} />
          </Suspense>
        )}

        {/* Lazy-loaded Global Modals — 0 initial bundle overhead until opened! */}
        <Suspense fallback={null}>
          {isSettingsOpen && (
            <SettingsScreen
              open={isSettingsOpen}
              settings={settings}
              isPwaInstalled={installState.isInstalled}
              onOpenNotifications={() => setNotifSettingsOpen(true)}
              onOpenInstall={() => setInstallModalOpen(true)}
              onUpdateSetting={updateSetting}
              onResetProgress={resetAllProgress}
              onClose={() => setSettingsOpen(false)}
            />
          )}

          {isTutorialOpen && (
            <TutorialScreen open={isTutorialOpen} onClose={markTutorialSeen} />
          )}

          {isDailyCalendarOpen && <DailyCalendarModal />}
          {rewardedAdPlacement && <RewardedAdModal />}
          {hasCelebrationModal && <CelebrationModals />}

          {installModalOpen && (
            <InstallPromptModal
              open={installModalOpen}
              onClose={() => setInstallModalOpen(false)}
              onInstalledToast={showToast}
            />
          )}

          {notifOnboardingOpen && (
            <NotificationOnboardingModal
              open={notifOnboardingOpen}
              onClose={() => setNotifOnboardingOpen(false)}
              onToast={showToast}
            />
          )}

          {notifSettingsOpen && (
            <NotificationSettingsModal
              open={notifSettingsOpen}
              onClose={() => setNotifSettingsOpen(false)}
              onToast={showToast}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default App;
