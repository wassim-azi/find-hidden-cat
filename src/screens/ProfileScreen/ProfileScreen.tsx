import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Bell,
  BookOpen,
  Compass,
  Download,
  Flame,
  Settings,
  Shield,
  Star,
  Trophy,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TOTAL_LEVELS } from '../../game/levels';
import { getCurrentWeekKey } from '../../game/events';
import { getUpcomingGoals } from '../../game/upcomingGoals';
import { getCollectibleCat, COLLECTIBLE_CATS } from '../../game/collectibleCats';
import { getWorldForLevel, WORLDS } from '../../game/worlds';
import { ACHIEVEMENTS } from '../../game/achievements';
import { CatIllustration } from '../../components/Cat/CatIllustration';
import { HubHeader } from '../../components/Navigation/HubHeader';
import { GoalCard } from '../../components/ProgressIndicator/GoalCard';
import { TactileButton } from '../../components/Buttons/TactileButton';

interface ProfileScreenProps {
  isPwaInstalled?: boolean;
  onOpenNotifications?: () => void;
  onOpenInstall?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  isPwaInstalled = false,
  onOpenNotifications,
  onOpenInstall,
}) => {
  const { t } = useTranslation();
  const activeMascotCatId = useGameStore((s) => s.activeMascotCatId);
  const levelProgress = useGameStore((s) => s.levelProgress);
  const unlockedLevelId = useGameStore((s) => s.unlockedLevelId);
  const fishCoins = useGameStore((s) => s.fishCoins);
  const dailyMissions = useGameStore((s) => s.dailyMissions);
  const claimedEventIds = useGameStore((s) => s.claimedEventIds);
  const achievements = useGameStore((s) => s.achievements);
  const progressStats = useGameStore((s) => s.progressStats);
  const unlockedCatIds = useGameStore((s) => s.unlockedCatIds);
  const unlockedAchievementIds = useGameStore((s) => s.unlockedAchievementIds);
  const dailyLogin = useGameStore((s) => s.dailyLogin);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const setTutorialOpen = useGameStore((s) => s.setTutorialOpen);
  const goToScreen = useGameStore((s) => s.goToScreen);

  const mascot = getCollectibleCat(activeMascotCatId);
  const currentWorld = getWorldForLevel(unlockedLevelId);
  const solvedCount = Object.values(levelProgress).filter((p) => p.completed).length;
  const totalStars = Object.values(levelProgress).reduce((sum, p) => sum + p.stars, 0);
  const worldsUnlocked = WORLDS.filter((w) => unlockedLevelId >= w.levelStart).length;
  const upcomingGoals = getUpcomingGoals({
    levelProgress,
    unlockedLevelId,
    fishCoins,
    dailyMissions,
    claimedEventIds,
    dailyLogin,
    progressStats,
    unlockedCatIds,
    unlockedAchievementIds,
    weekKey: getCurrentWeekKey(),
  });

  const stats = [
    {
      label: t('profile.levelsSolved'),
      value: `${solvedCount}/${TOTAL_LEVELS}`,
      icon: <Trophy className="w-4 h-4 text-[#E59C1E]" />,
    },
    {
      label: t('profile.starsEarned'),
      value: `${totalStars}/${TOTAL_LEVELS * 3}`,
      icon: <Star className="w-4 h-4 text-[#F4B942] fill-[#F4B942]" />,
    },
    {
      label: t('profile.worldsReached'),
      value: `${worldsUnlocked}/${WORLDS.length}`,
      icon: <Compass className="w-4 h-4 text-[#6EB58E]" />,
    },
    {
      label: t('profile.zeroMistakeWins'),
      value: `${progressStats.lifetime.uniqueNoMistakePuzzles}`,
      icon: <Shield className="w-4 h-4 text-[#4D91B5]" />,
    },
    {
      label: t('profile.catsCollected'),
      value: `${unlockedCatIds.length}/${COLLECTIBLE_CATS.length}`,
      icon: <Award className="w-4 h-4 text-[#E86A7B]" />,
    },
    {
      label: t('profile.loginStreak'),
      value: t('common.days', { count: dailyLogin.streakCount }),
      icon: <Flame className="w-4 h-4 text-[#E87A2A]" />,
    },
    {
      label: t('profile.longestStreak'),
      value: t('common.days', {
        count: Math.max(dailyLogin.longestStreak, dailyLogin.streakCount),
      }),
      icon: <Flame className="w-4 h-4 text-[#D95B38]" />,
    },
  ];

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <HubHeader title={t('profile.headerTitle')} />

      <div className="flex-1 soft-scroll px-3.5 pb-4 flex flex-col gap-3">
        <div className="meow-card rounded-[26px] p-4 flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => goToScreen('cats')}
            aria-label={t('profile.changeCompanionAria')}
            className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-[#FFF3D6] to-[#FFE0E6] border-2 border-white shadow-sm flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <CatIllustration breed={mascot.breed} mood="happy" className="w-17 h-17" />
          </button>

          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FF7A7A] bg-[#FFF0F0] px-2 py-0.5 rounded-full">
              {t(`worlds.${currentWorld.id}.name`)}
            </span>
            <h2 className="text-[19px] font-black text-[#3A312C] leading-tight mt-1">
              {t('profile.keeperTitle', { name: mascot.name })}
            </h2>
            <p className="text-[11px] font-bold text-[#7E7067] mt-0.5">
              {t('profile.keeperStats', {
                cats: achievements.totalCatsFound,
                badges: unlockedAchievementIds.length,
                totalBadges: ACHIEVEMENTS.length,
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((st) => (
            <div
              key={st.label}
              className="meow-card rounded-[20px] p-3 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8A7B70]">
                {st.icon}
                <span className="truncate">{st.label}</span>
              </div>
              <div className="text-[20px] font-black text-[#3A312C] tabular-nums leading-tight">
                {st.value}
              </div>
            </div>
          ))}
        </div>

        {upcomingGoals.length > 0 && (
          <section id="profile-goals" className="flex flex-col gap-2">
            <h3 className="text-[12px] font-black uppercase tracking-wider text-[#8A7B70] px-1">
              {t('goals.profileTitle')}
            </h3>
            <div className="flex flex-col gap-2">
              {upcomingGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-2 mt-1">
          {onOpenNotifications && (
            <TactileButton
              id="btn-profile-notifications"
              variant="secondary"
              fullWidth
              onClick={onOpenNotifications}
            >
              <Bell className="w-4.5 h-4.5 text-[#E86A7B]" />
              {t('notifications.settingsTitle')}
            </TactileButton>
          )}

          {onOpenInstall && !isPwaInstalled && (
            <TactileButton
              id="btn-profile-install"
              variant="secondary"
              fullWidth
              onClick={onOpenInstall}
            >
              <Download className="w-4.5 h-4.5 text-[#6EB58E]" />
              {t('pwa.installTitle')}
            </TactileButton>
          )}

          <TactileButton
            variant="secondary"
            fullWidth
            onClick={() => setTutorialOpen(true)}
          >
            <BookOpen className="w-4.5 h-4.5 text-[#9B86D4]" />
            {t('profile.howToPlayBtn')}
          </TactileButton>

          <TactileButton
            variant="secondary"
            fullWidth
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-4.5 h-4.5 text-[#5A4E47]" />
            {t('profile.settingsBtn')}
          </TactileButton>
        </div>
      </div>
    </div>
  );
};
