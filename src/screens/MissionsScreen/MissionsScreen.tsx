import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Calendar,
  Check,
  Compass,
  Gem,
  Gift,
  Heart,
  PawPrint,
  Play,
  Shield,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { ACHIEVEMENTS, AchievementDefinition } from '../../game/achievements';
import {
  EventRewardPreview,
  getCurrentWeekKey,
  getEventRewardPreview,
  WORLD_EVENTS,
} from '../../game/events';
import { canClaimDailyReward, getWeeklyClaimCount } from '../../game/dailyRewards';
import { getTodayDateKey } from '../../game/levels';
import { HubHeader } from '../../components/Navigation/HubHeader';
import { FishCoinIcon } from '../../components/Currency/FishCoinIcon';
import { TactileButton } from '../../components/Buttons/TactileButton';

type MissionsTab = 'daily' | 'events' | 'achievements';

function formatEventReward(preview: EventRewardPreview, t: TFunction): string {
  const coinsPart =
    preview.minCoins === preview.maxCoins
      ? t('events.rewardFixed', { coins: preview.minCoins })
      : t('events.rewardRange', { min: preview.minCoins, max: preview.maxCoins });

  if (preview.booster) {
    const boosterPart = t('events.rewardBooster', {
      name: t(`shop.items.${preview.booster}.name`),
    });
    return `${coinsPart} ${boosterPart}`;
  }
  return coinsPart;
}

const ACH_ICONS: Record<AchievementDefinition['icon'], React.ReactNode> = {
  paw: <PawPrint className="w-4.5 h-4.5" />,
  sparkles: <Sparkles className="w-4.5 h-4.5" />,
  star: <Star className="w-4.5 h-4.5" />,
  trophy: <Trophy className="w-4.5 h-4.5" />,
  shield: <Shield className="w-4.5 h-4.5" />,
  compass: <Compass className="w-4.5 h-4.5" />,
  gem: <Gem className="w-4.5 h-4.5" />,
  heart: <Heart className="w-4.5 h-4.5" />,
};

export const MissionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<MissionsTab>('daily');

  const dailyMissions = useGameStore((s) => s.dailyMissions);
  const dailyLogin = useGameStore((s) => s.dailyLogin);
  const levelProgress = useGameStore((s) => s.levelProgress);
  const unlockedLevelId = useGameStore((s) => s.unlockedLevelId);
  const achievements = useGameStore((s) => s.achievements);
  const zeroMistakeSolves = useGameStore((s) => s.zeroMistakeSolves);
  const specialLevelsCompleted = useGameStore((s) => s.specialLevelsCompleted);
  const unlockedCatIds = useGameStore((s) => s.unlockedCatIds);
  const completedDailyDates = useGameStore((s) => s.completedDailyDates);
  const unlockedAchievementIds = useGameStore((s) => s.unlockedAchievementIds);
  const claimedAchievementIds = useGameStore((s) => s.claimedAchievementIds);
  const claimedEventIds = useGameStore((s) => s.claimedEventIds);

  const claimMissionReward = useGameStore((s) => s.claimMissionReward);
  const claimAchievementReward = useGameStore((s) => s.claimAchievementReward);
  const claimEventChest = useGameStore((s) => s.claimEventChest);
  const setDailyCalendarOpen = useGameStore((s) => s.setDailyCalendarOpen);
  const startDailyChallenge = useGameStore((s) => s.startDailyChallenge);
  const startGoldenCatTrial = useGameStore((s) => s.startGoldenCatTrial);

  const todayKey = getTodayDateKey();
  const weekKey = getCurrentWeekKey();
  const dailyClaimable = canClaimDailyReward(dailyLogin, todayKey);
  const solvedCount = Object.values(levelProgress).filter((p) => p.completed).length;
  const totalStars = Object.values(levelProgress).reduce((sum, p) => sum + p.stars, 0);
  const dailyOnlyCount = completedDailyDates.filter((d) => !d.startsWith('golden-')).length;

  const achCtx = {
    levelProgress,
    unlockedLevelId,
    noHintSolves: achievements.perfectLevels,
    zeroMistakeSolves,
    specialLevelsCompleted,
    unlockedCatsCount: unlockedCatIds.length,
    completedDailyCount: dailyOnlyCount,
    totalStars,
  };

  const claimableAchCount = unlockedAchievementIds.filter(
    (id) => !claimedAchievementIds.includes(id)
  ).length;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <HubHeader title={t('missions.headerTitle')} />

      {/* Daily Calendar Quick Banner */}
      <div className="px-3.5 pb-2 shrink-0">
        <button
          id="btn-missions-daily-calendar"
          type="button"
          onClick={() => setDailyCalendarOpen(true)}
          className="w-full rounded-2xl bg-gradient-to-r from-[#FFF3D1] to-[#FFE4D4] border border-[#F2CFA0] px-3.5 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-white/90 text-[#D9821E] flex items-center justify-center shadow-xs shrink-0">
              <Gift className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-black text-[#3A312C] leading-tight truncate">
                {t('missions.dailyRewardsBannerTitle')}
              </div>
              <div className="text-[10.5px] font-bold text-[#8A6128] mt-0.5 truncate">
                {dailyClaimable
                  ? t('missions.dailyRewardsReady', { day: dailyLogin.currentDayIndex + 1 })
                  : t('missions.dailyRewardsStreak', { count: dailyLogin.streakCount })}
              </div>
            </div>
          </div>
          <span
            className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${
              dailyClaimable ? 'bg-[#FF6B6B] text-white' : 'bg-white/90 text-[#6E5C4F]'
            }`}
          >
            {dailyClaimable ? t('missions.claimExclaim') : t('common.view')}
          </span>
        </button>
      </div>

      {/* Sub-Tabs */}
      <div className="px-3.5 pb-2.5 shrink-0">
        <div className="grid grid-cols-3 gap-1 bg-[#EFE6D8]/85 p-1 rounded-2xl">
          {(
            [
              { id: 'daily', label: t('missions.tabDaily') },
              { id: 'events', label: t('missions.tabEvents') },
              {
                id: 'achievements',
                label:
                  claimableAchCount > 0
                    ? t('missions.tabBadgesCount', { count: claimableAchCount })
                    : t('missions.tabBadges'),
              },
            ] as const
          ).map((tItem) => (
            <button
              key={tItem.id}
              id={`missions-tab-${tItem.id}`}
              type="button"
              onClick={() => setTab(tItem.id)}
              className={`py-1.5 rounded-xl text-[11.5px] font-extrabold transition-all cursor-pointer truncate px-1 ${
                tab === tItem.id
                  ? 'bg-white text-[#3A312C] shadow-xs'
                  : 'text-[#7E7067]'
              }`}
            >
              {tItem.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 soft-scroll px-3.5 pb-4 flex flex-col gap-2.5">
        {tab === 'daily' &&
          dailyMissions.missions.map((m) => {
            const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
            const isComplete = m.progress >= m.target;
            return (
              <div
                key={m.id}
                className="meow-card rounded-[22px] p-3.5 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[14px] font-black text-[#3A312C] leading-tight">
                      {t(`missions.items.${m.metric}.title`)}
                    </h3>
                    <p className="text-[11.5px] font-bold text-[#7E7067] mt-0.5">
                      {t(`missions.items.${m.metric}.desc`, { target: m.target })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#FFF6E4] border border-[#F0DCAD] px-2 py-0.5 rounded-full shrink-0">
                    <FishCoinIcon className="w-3.5 h-3.5" />
                    <span className="text-[11.5px] font-black text-[#6B4812]">
                      +{m.rewardCoins}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10.5px] font-extrabold text-[#8A7B70] mb-1">
                      <span>{t('missions.progressLabel')}</span>
                      <span className="tabular-nums">
                        {m.progress} / {m.target}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F2E9DC] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#FF8B8B] to-[#6EB58E] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {m.claimed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#4B9B6E] bg-[#E8F7EE] px-2.5 py-1.5 rounded-xl shrink-0">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      {t('common.claimed')}
                    </span>
                  ) : isComplete ? (
                    <TactileButton
                      variant="primary"
                      size="sm"
                      onClick={() => claimMissionReward(m.id)}
                      className="h-8 px-3 text-[11.5px]"
                    >
                      {t('common.claim')}
                    </TactileButton>
                  ) : (
                    <span className="text-[10.5px] font-extrabold text-[#A99B90] px-1.5 whitespace-nowrap">
                      {t('common.inPlay')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        {tab === 'events' &&
          WORLD_EVENTS.map((ev) => {
            const isDailySolved =
              ev.id === 'daily_cat' && completedDailyDates.includes(todayKey);
            const isGoldenSolved =
              ev.id === 'golden_cat' &&
              completedDailyDates.includes(`golden-${weekKey}`);
            const claimKey =
              ev.id === 'perfect_week' ? `${ev.id}-${weekKey}` : ev.id;
            const chestClaimed = claimedEventIds.includes(claimKey);
            const chestProgress =
              ev.id === 'treasure_hunt'
                ? solvedCount
                : getWeeklyClaimCount(dailyLogin, weekKey);
            const chestReady =
              ev.type === 'milestone_chest' &&
              !chestClaimed &&
              chestProgress >= ev.targetCount;

            return (
              <div
                key={ev.id}
                className={`rounded-[22px] p-3.5 border border-[#EAE0D2] bg-gradient-to-br ${ev.accentGradient} shadow-xs`}
              >
                <div>
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full bg-white/85 text-[#5A4E47]">
                    <Calendar className="w-3 h-3" />
                    {t(`events.${ev.id}.badge`)}
                  </span>
                  <h3 className="text-[15px] font-black text-[#3A312C] mt-1.5 leading-tight">
                    {t(`events.${ev.id}.title`)}
                  </h3>
                  <p className="text-[11.5px] font-bold text-[#6E6057] mt-0.5">
                    {t(`events.${ev.id}.subtitle`)}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-black text-[#6B4812] bg-white/80 px-2.5 py-1 rounded-2xl leading-snug">
                    {formatEventReward(getEventRewardPreview(ev), t)}
                  </span>

                  {ev.type === 'playable_puzzle' ? (
                    <TactileButton
                      id={`btn-event-${ev.id}`}
                      variant={isDailySolved || isGoldenSolved ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() =>
                        ev.id === 'daily_cat'
                          ? startDailyChallenge()
                          : startGoldenCatTrial()
                      }
                      className="h-8.5 px-3 text-[11.5px] shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {isDailySolved || isGoldenSolved
                        ? t('common.replay')
                        : t('common.play')}
                    </TactileButton>
                  ) : chestClaimed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#3B8B61] bg-white/90 px-2.5 py-1 rounded-full shrink-0">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      {t('common.opened')}
                    </span>
                  ) : chestReady ? (
                    <TactileButton
                      id={`btn-claim-event-${ev.id}`}
                      variant="primary"
                      size="sm"
                      onClick={() => claimEventChest(ev.id)}
                      className="h-8.5 px-3 text-[11px] shrink-0"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      {t('common.openChest')}
                    </TactileButton>
                  ) : (
                    <span className="text-[11.5px] font-black text-[#6E6057] bg-white/75 px-2.5 py-1 rounded-full tabular-nums shrink-0">
                      {Math.min(chestProgress, ev.targetCount)} / {ev.targetCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        {tab === 'achievements' &&
          ACHIEVEMENTS.map((ach) => {
            const current = Math.min(ach.target, ach.getProgress(achCtx));
            const unlocked = unlockedAchievementIds.includes(ach.id) || current >= ach.target;
            const claimed = claimedAchievementIds.includes(ach.id);
            const pct = Math.round((current / ach.target) * 100);

            return (
              <div
                key={ach.id}
                className="meow-card rounded-[20px] p-3 flex items-center gap-3"
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    unlocked
                      ? 'bg-gradient-to-br from-[#FFE396] to-[#F3B038] text-[#6B4209]'
                      : 'bg-[#F2EAE0] text-[#A99B90]'
                  }`}
                >
                  {ACH_ICONS[ach.icon]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-[13.5px] font-black text-[#3A312C] truncate">
                      {t(`achievements.${ach.id}.title`)}
                    </h3>
                    <span className="text-[10.5px] font-black text-[#8A7B70] tabular-nums shrink-0">
                      {current}/{ach.target}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#7E7067] leading-tight mt-0.5">
                    {t(`achievements.${ach.id}.desc`)}
                  </p>
                  <div className="w-full h-1.5 bg-[#F2E9DC] rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-[#F4B942] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="shrink-0">
                  {claimed ? (
                    <span className="w-8 h-8 rounded-full bg-[#E8F7EE] text-[#3B8B61] flex items-center justify-center">
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </span>
                  ) : unlocked ? (
                    <TactileButton
                      id={`btn-claim-ach-${ach.id}`}
                      variant="primary"
                      size="sm"
                      onClick={() => claimAchievementReward(ach.id)}
                      className="h-8 px-2.5 text-[11px]"
                    >
                      +{ach.rewardCoins}
                    </TactileButton>
                  ) : (
                    <div className="flex flex-col items-end text-[10px] font-black text-[#8A7B70]">
                      <span className="inline-flex items-center gap-0.5">
                        <FishCoinIcon className="w-3.5 h-3.5" />
                        {ach.rewardCoins}
                      </span>
                      {ach.rewardBooster && (
                        <span className="text-[#8366CC] text-[9px]">
                          +{t(`shop.items.${ach.rewardBooster}.short`)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
