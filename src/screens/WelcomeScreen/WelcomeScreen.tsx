import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Download,
  Gift,
  Map,
  Play,
  Settings,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getTodayDateKey } from '../../game/levels';
import { canClaimDailyReward } from '../../game/dailyRewards';
import { formatLocalizedDate } from '../../i18n';
import {
  getPwaInstallState,
  PwaInstallState,
  subscribePwaInstall,
} from '../../services/pwaInstall';
import { MeowdokuLogo } from '../../components/Cat/MeowdokuLogo';
import { CatIllustration } from '../../components/Cat/CatIllustration';
import { TactileButton } from '../../components/Buttons/TactileButton';
import { FishCoinIcon } from '../../components/Currency/FishCoinIcon';
import { useDailyVariantPicker } from '../../components/Modals/DailyVariantSheet';

interface WelcomeScreenProps {
  onOpenInstall?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenInstall }) => {
  const { t, i18n } = useTranslation();
  const levelProgress = useGameStore((s) => s.levelProgress);
  const unlockedLevelId = useGameStore((s) => s.unlockedLevelId);
  const completedDailyDates = useGameStore((s) => s.completedDailyDates);
  const fishCoins = useGameStore((s) => s.fishCoins);
  const dailyLogin = useGameStore((s) => s.dailyLogin);
  const hasSeenTutorial = useGameStore((s) => s.hasSeenTutorial);
  const familyModeOffered = useGameStore((s) => s.familyModeOffered);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const continueGame = useGameStore((s) => s.continueGame);
  const { requestDaily, sheet: dailyVariantSheet } = useDailyVariantPicker();
  const goToScreen = useGameStore((s) => s.goToScreen);
  const setTutorialOpen = useGameStore((s) => s.setTutorialOpen);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const setDailyCalendarOpen = useGameStore((s) => s.setDailyCalendarOpen);
  const enableFamilyMode = useGameStore((s) => s.enableFamilyMode);
  const dismissFamilyModeOffer = useGameStore((s) => s.dismissFamilyModeOffer);

  const [installState, setInstallState] = useState<PwaInstallState>(() =>
    getPwaInstallState()
  );
  const [mountAmbientVideo, setMountAmbientVideo] = useState(false);

  useEffect(() => {
    return subscribePwaInstall(setInstallState);
  }, []);

  // Load ambient intro video strictly on-demand (after user interaction or 6.5s idle, never during cold LCP!)
  useEffect(() => {
    if (reducedMotion) return;
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    if (!navigator.onLine || nav.connection?.saveData) return;

    const activate = () => setMountAmbientVideo(true);
    const timer = window.setTimeout(activate, 6500);
    window.addEventListener('pointerdown', activate, { once: true, passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', activate);
    };
  }, [reducedMotion]);

  const hasStarted = Object.keys(levelProgress).length > 0 || unlockedLevelId > 1;
  const todayKey = getTodayDateKey();
  const dailySolved = completedDailyDates.includes(todayKey);
  const canClaimDaily = canClaimDailyReward(dailyLogin, todayKey);
  const lang = i18n.language.startsWith('fr') ? 'fr' : 'en';
  const formattedToday = formatLocalizedDate(todayKey, lang);
  const showFamilyOffer = !familyModeOffered && hasSeenTutorial;

  return (
    <main className="h-full w-full flex flex-col justify-between px-5 pt-4 pb-5 soft-scroll relative">
      {/* Top Bar: Coins + Optional Install + Daily Gift + Settings */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 bg-white/95 border border-[#EAE0D2] rounded-full px-3 py-1.5 shadow-[0_2px_8px_rgba(92,69,52,0.06)] shrink-0">
            <FishCoinIcon className="w-4.5 h-4.5" />
            <span className="text-[12.5px] font-black text-[#3A312C] tabular-nums">
              {fishCoins}
            </span>
          </div>

          {!installState.isInstalled && onOpenInstall && (
            <button
              id="btn-welcome-install"
              type="button"
              onClick={onOpenInstall}
              aria-label={t('pwa.installBtnAria')}
              className="inline-flex items-center gap-1 bg-[#FFF0F2] border border-[#F7C8CE] text-[#B83B4B] rounded-full px-2.5 py-1.5 text-[11px] font-black shadow-2xs active:scale-94 transition-transform cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{t('pwa.installShort')}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-welcome-daily-gift"
            type="button"
            onClick={() => setDailyCalendarOpen(true)}
            aria-label={t('welcome.openDailyAria')}
            className="relative w-10 h-10 rounded-full bg-[#FFF4D6] border border-[#F2D58A] shadow-xs flex items-center justify-center text-[#7D4F0C] active:scale-92 transition-transform cursor-pointer"
          >
            <Gift className="w-4.5 h-4.5" />
            {canClaimDaily && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FF6B6B] border-2 border-white animate-pulse" />
            )}
          </button>

          <button
            id="btn-welcome-settings"
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('welcome.openSettingsAria')}
            className="w-10 h-10 rounded-full bg-white/95 border border-[#EAE0D2] shadow-[0_3px_10px_rgba(92,69,52,0.07)] flex items-center justify-center text-[#5A4E47] active:scale-92 transition-transform cursor-pointer"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Hero Showcase (Instant WebP LCP + On-Demand Ambient Video) */}
      <div className="flex flex-col items-center text-center my-auto py-1">
        <div className="relative w-full max-w-[330px] mb-3.5">
          <div
            aria-hidden="true"
            className="absolute -inset-4 rounded-[36px] bg-gradient-to-tr from-[#FFE2B8]/70 via-[#FFD4DC]/55 to-[#D9D0F5]/60 blur-2xl pointer-events-none"
          />

          <div className="relative meow-board-frame w-full aspect-[4/3] rounded-[28px] p-1.5 overflow-hidden">
            <div className="relative w-full h-full rounded-[22px] overflow-hidden bg-[#FAF2E4]">
              <img
                src="/media/images/intro-hero.webp"
                alt={t('welcome.heroAlt')}
                width={640}
                height={480}
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover"
              />
              {mountAmbientVideo && !reducedMotion && (
                <video
                  src="/media/videos/intro-cinematic.mp4"
                  poster="/media/images/intro-hero.webp"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="none"
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#3A312C]/15 to-transparent pointer-events-none"
              />
            </div>
          </div>
        </div>

        <MeowdokuLogo />
        <p className="text-[14.5px] font-bold text-[#6B5D54] mt-1 tracking-tight">
          {t('welcome.tagline')}
        </p>

        {/* Daily Kitty Challenge Card */}
        <button
          id="btn-daily-challenge"
          type="button"
          onClick={() => requestDaily()}
          className="mt-3.5 w-full max-w-[330px] meow-card rounded-[20px] px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left cursor-pointer hover:border-[#F2CFA0] active:scale-[0.98] transition-all"
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
                  {t('welcome.dailyKittyTitle')}
                </span>
                <span className="text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded-full bg-[#FEF2DC] text-[#7D4F0C] leading-none whitespace-nowrap">
                  {t('welcome.dailyCoinsBadge')}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#6E6056] mt-1 leading-none">
                <Calendar className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {dailySolved
                    ? t('welcome.dailySolved')
                    : t('welcome.dailyFresh', { date: formattedToday })}
                </span>
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
        </button>
        {showFamilyOffer && (
          <div
            id="family-mode-offer"
            className="mt-2.5 w-full max-w-[330px] rounded-[20px] bg-[#EBF7F0] border border-[#C3E5D1] px-3.5 py-2.5 text-left"
          >
            <p className="text-[12px] font-black text-[#2D5E43] leading-snug">
              {t('family.offerTitle')}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <TactileButton
                id="btn-family-offer-yes"
                variant="primary"
                size="sm"
                onClick={enableFamilyMode}
                className="flex-1 text-[11px]"
              >
                {t('family.offerYes')}
              </TactileButton>
              <TactileButton
                id="btn-family-offer-no"
                variant="secondary"
                size="sm"
                onClick={dismissFamilyModeOffer}
                className="text-[11px]"
              >
                {t('family.offerNo')}
              </TactileButton>
            </div>
          </div>
        )}
      </div>

      {/* Primary Action Stack */}
      <div className="flex flex-col gap-2.5 w-full max-w-[330px] mx-auto shrink-0">
        <TactileButton
          id="btn-welcome-play"
          variant="primary"
          size="lg"
          fullWidth
          onClick={continueGame}
          className="relative overflow-hidden btn-shimmer text-[16px]"
        >
          <Play className="w-5 h-5 fill-current shrink-0" />
          {hasStarted
            ? t('welcome.continueLevel', { id: unlockedLevelId })
            : t('welcome.playLevel1')}
        </TactileButton>

        <div className="grid grid-cols-2 gap-2.5">
          <TactileButton
            id="btn-welcome-levels"
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => goToScreen('map')}
          >
            <Map className="w-4.5 h-4.5 text-[#FF7A7A] shrink-0" />
            {t('welcome.worldMap')}
          </TactileButton>

          <TactileButton
            id="btn-welcome-howto"
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setTutorialOpen(true)}
          >
            <BookOpen className="w-4.5 h-4.5 text-[#9B86D4] shrink-0" />
            {t('welcome.howToPlay')}
          </TactileButton>
        </div>
      </div>

      {dailyVariantSheet}
    </main>
  );
};
