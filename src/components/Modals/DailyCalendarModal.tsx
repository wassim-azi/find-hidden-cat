import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Flame, Gift, Info, Shield, Sparkles, Trophy, X } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { FishCoinIcon } from '../Currency/FishCoinIcon';
import {
  canClaimDailyReward,
  getRewardForSlot,
  isRecoverableActive,
  LUCKY_BONUS,
  SEVEN_DAY_REWARDS,
  STREAK_MILESTONES,
} from '../../game/dailyRewards';
import { formatRewardLabel } from '../../game/rewardLabels';
import { isAdUiAllowed, isStreakUiAllowed } from '../../game/familyMode';
import { getTodayDateKey } from '../../game/levels';
import { rewardedAdService } from '../../services/rewardedAds';
import { useGameStore } from '../../store/gameStore';

export const DailyCalendarModal: React.FC = () => {
  const { t } = useTranslation();
  const open = useGameStore((s) => s.isDailyCalendarOpen);
  const dailyLogin = useGameStore((s) => s.dailyLogin);
  const settings = useGameStore((s) => s.settings);
  const claimTodaysDailyReward = useGameStore((s) => s.claimTodaysDailyReward);
  const setDailyCalendarOpen = useGameStore((s) => s.setDailyCalendarOpen);
  const openRewardedAdPrompt = useGameStore((s) => s.openRewardedAdPrompt);
  const startDailyChallenge = useGameStore((s) => s.startDailyChallenge);

  const [justClaimedText, setJustClaimedText] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const todayKey = getTodayDateKey();
  const claimable = canClaimDailyReward(dailyLogin, todayKey);
  const activeDayIdx = dailyLogin.currentDayIndex;
  const completedFullWeekToday = !claimable && activeDayIdx === 0 && dailyLogin.totalClaims > 0;
  const displayCycle = completedFullWeekToday
    ? Math.floor((dailyLogin.totalClaims - 1) / 7)
    : Math.floor(dailyLogin.totalClaims / 7);

  const streakUiAllowed = isStreakUiAllowed(settings);
  const claimedMilestones = dailyLogin.claimedStreakMilestones ?? [];
  const nextMilestone =
    STREAK_MILESTONES.find((m) => !claimedMilestones.includes(m.days)) ?? null;
  const recoveryActive = streakUiAllowed && isRecoverableActive(dailyLogin, todayKey);

  const canShowDailyAd =
    isAdUiAllowed(settings) &&
    rewardedAdService.isAvailable('daily_bonus') &&
    dailyLogin.adBonusDateKey !== todayKey;

  const handleClaim = () => {
    const res = claimTodaysDailyReward();
    if (res.claimed && res.reward) {
      const rewardTitle = formatRewardLabel(
        res.reward.coins,
        res.reward.boosters,
        t,
        streakUiAllowed ? res.reward.streakShields : undefined
      );
      const parts: string[] = [
        streakUiAllowed && res.usedStreakShield
          ? t('dailyCalendar.shieldSavedToast', { title: rewardTitle })
          : t('dailyCalendar.claimedToast', { day: res.reward.day, title: rewardTitle }),
      ];
      if (res.luckyBonusCoins > 0) {
        parts.push(t('dailyCalendar.luckyToast', { coins: res.luckyBonusCoins }));
      }
      if (streakUiAllowed && res.milestone) {
        parts.push(t('dailyCalendar.milestoneToast', { days: res.milestone.days }));
      }
      setJustClaimedText(parts.join(' · '));
    }
  };

  const handleClose = () => {
    setInfoOpen(false);
    setJustClaimedText(null);
    setDailyCalendarOpen(false);
  };

  return (
    <>
      <ModalSheet open={open} onClose={handleClose} ariaLabel={t('dailyCalendar.dialogAria')}>
        <div className="p-5 flex flex-col max-h-[86dvh] soft-scroll">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFE49B] to-[#F4B942] flex items-center justify-center text-[#6B4209] shadow-xs">
                <Gift className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-[18.5px] font-black text-[#3A312C] leading-none">
                  {t('dailyCalendar.title')}
                </h2>
                <p className="text-[11px] font-bold text-[#8A7B70] mt-0.5">
                  {t('dailyCalendar.subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                id="btn-calendar-info"
                type="button"
                onClick={() => setInfoOpen(true)}
                aria-label={t('dailyCalendar.infoTitle')}
                className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer"
              >
                <Info className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                aria-label={t('common.close')}
                className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Streak & Friendly Streak Freeze Strip */}
          {streakUiAllowed && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-2xl bg-[#FFF5E4] border border-[#F3DCAD] px-3 py-2 flex items-center gap-2">
                <Flame className="w-4.5 h-4.5 text-[#E87A2A] shrink-0" />
                <div>
                  <div className="text-[13.5px] font-black text-[#3A312C] leading-none">
                    {t('common.days', { count: dailyLogin.streakCount })}
                  </div>
                  <div className="text-[10px] font-bold text-[#946C2B] mt-0.5">
                    {t('dailyCalendar.loginStreak')}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-[#EBF7F0] border border-[#C3E5D1] px-3 py-2 flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-[#3B8B61] shrink-0" />
                <div>
                  <div className="text-[11.5px] font-black text-[#3A312C] leading-tight">
                    {t('dailyCalendar.streakFreeze', { count: dailyLogin.streakShields })}
                  </div>
                  <div className="text-[10px] font-bold text-[#3D7A5A] mt-0.5">
                    {t('dailyCalendar.streakGuard')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* One-Tap Recovery Banner */}
          {recoveryActive && dailyLogin.recoverable && (
            <div
              id="streak-recovery-banner"
              className="mb-3 rounded-2xl bg-[#FFF4E5] border border-[#F0C27B] px-3 py-2.5 flex flex-col gap-2"
            >
              <p className="text-[11.5px] font-extrabold text-[#7B4B12] leading-snug">
                {t('dailyCalendar.recoveryBanner', { count: dailyLogin.recoverable.value })}
              </p>
              <TactileButton
                id="btn-streak-recover-play"
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => {
                  handleClose();
                  startDailyChallenge();
                }}
              >
                {t('dailyCalendar.recoverPlay')}
              </TactileButton>
            </div>
          )}

          {/* Next Streak Milestone */}
          {streakUiAllowed && nextMilestone && (
            <div
              id="calendar-next-milestone"
              className="mb-3 rounded-2xl bg-[#F4F0FA] border border-[#DFD4F3] px-3 py-2 flex items-center gap-2 text-[11px] font-extrabold text-[#574587]"
            >
              <Trophy className="w-4 h-4 text-[#7D65B8] shrink-0" />
              <span>
                {t('dailyCalendar.nextMilestone', {
                  days: nextMilestone.days,
                  remaining: Math.max(0, nextMilestone.days - dailyLogin.streakCount),
                  reward: formatRewardLabel(nextMilestone.coins, nextMilestone.boosters, t),
                })}
              </span>
            </div>
          )}

          {/* 7-Day Reward Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {SEVEN_DAY_REWARDS.map((_, idx) => {
              const slot = getRewardForSlot(idx, displayCycle);
              const isPast = claimable
                ? idx < activeDayIdx
                : idx < activeDayIdx || completedFullWeekToday;
              const isToday = claimable && idx === activeDayIdx;
              const stateAttr = isToday ? 'today' : isPast ? 'claimed' : 'upcoming';
              const isGrand = slot.isGrandPrize;
              const rewardLabel = formatRewardLabel(
                slot.coins,
                slot.boosters,
                t,
                streakUiAllowed ? slot.streakShields : undefined
              );

              return (
                <div
                  key={slot.day}
                  id={`calendar-day-${slot.day}`}
                  data-state={stateAttr}
                  className={`relative rounded-2xl p-2 border flex flex-col items-center text-center transition-all ${
                    isGrand ? 'col-span-3 flex-row justify-between px-3.5 py-3 text-left' : ''
                  } ${
                    isToday
                      ? 'bg-[#FFF8E6] border-[#F0B840] ring-2 ring-[#F0B840]/35 shadow-sm'
                      : isPast
                        ? 'bg-[#F0F7F2] border-[#CBE5D4] opacity-85'
                        : 'bg-[#FAF5EC] border-[#EAE0D2]'
                  }`}
                >
                  <div className={isGrand ? 'flex items-center gap-3' : 'flex flex-col items-center'}>
                    <span
                      className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${
                        isToday
                          ? 'bg-[#F0B840] text-white'
                          : isPast
                            ? 'bg-[#6EB58E] text-white'
                            : 'bg-[#EAE0D2] text-[#7E7067]'
                      }`}
                    >
                      {t('dailyCalendar.dayBadge', { day: slot.day })}
                    </span>

                    <div className={isGrand ? '' : 'mt-1.5 flex flex-col items-center'}>
                      {!isGrand && (
                        <div className="mb-1">
                          {slot.coins > 0 && Object.keys(slot.boosters).length === 0 ? (
                            <FishCoinIcon className="w-7 h-7" />
                          ) : (
                            <Sparkles className="w-6 h-6 text-[#9B86D4]" />
                          )}
                        </div>
                      )}
                      <div className="text-[11px] font-black text-[#3A312C] leading-tight">
                        {rewardLabel}
                      </div>
                      <div className="text-[9.5px] font-bold text-[#8A7B70] mt-0.5 leading-tight">
                        {t(`dailyCalendar.days.${slot.day}.subtitle`)}
                      </div>
                    </div>
                  </div>

                  {isGrand && <FishCoinIcon className="w-9 h-9 shrink-0" />}

                  {isPast && (
                    <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-[#6EB58E] text-white flex items-center justify-center">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {justClaimedText && (
            <div className="mb-3 rounded-2xl bg-[#E8F7EE] border border-[#A8DBBC] px-3 py-2 text-center text-[12px] font-extrabold text-[#2D754E]">
              {justClaimedText}
            </div>
          )}

          {/* Action Button */}
          {claimable ? (
            <TactileButton
              id="btn-claim-daily-reward"
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleClaim}
              className="relative overflow-hidden btn-shimmer text-[15px]"
            >
              <Gift className="w-5 h-5 shrink-0" />
              {t('dailyCalendar.claimButton', { day: activeDayIdx + 1 })}
            </TactileButton>
          ) : (
            <div className="flex flex-col gap-2">
              <TactileButton variant="secondary" size="md" fullWidth onClick={handleClose}>
                <Check className="w-4 h-4 text-[#4B9B6E] shrink-0" />
                {t('dailyCalendar.claimedToday')}
              </TactileButton>
              {canShowDailyAd && (
                <button
                  id="btn-calendar-ad"
                  type="button"
                  onClick={() => {
                    handleClose();
                    openRewardedAdPrompt('daily_bonus');
                  }}
                  className="text-[11px] font-extrabold text-[#9B86D4] hover:underline py-1 cursor-pointer"
                >
                  {t('dailyCalendar.doubleBonusAd')}
                </button>
              )}
            </div>
          )}

          {streakUiAllowed && (
            <p className="mt-2.5 text-center text-[10.5px] font-bold text-[#8A7B70] leading-snug">
              {t('dailyCalendar.missedDayRule')}
            </p>
          )}
        </div>
      </ModalSheet>

      {/* Info Sheet: published odds, cycle scaling & milestones */}
      <ModalSheet
        id="calendar-info-sheet"
        open={open && infoOpen}
        onClose={() => setInfoOpen(false)}
        ariaLabel={t('dailyCalendar.infoTitle')}
      >
        <div className="p-5 flex flex-col max-h-[82dvh] soft-scroll">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[17px] font-black text-[#3A312C]">
              {t('dailyCalendar.infoTitle')}
            </h3>
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              aria-label={t('common.close')}
              className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 text-[12.5px] font-bold text-[#5C4F47] mb-4">
            <p className="rounded-2xl bg-[#FFF8E6] border border-[#F3DCAD] px-3 py-2.5">
              {t('dailyCalendar.luckyOdds', {
                percent: Math.round(LUCKY_BONUS.chance * 100),
                coins: LUCKY_BONUS.coins,
              })}
            </p>
            <p className="rounded-2xl bg-[#FAF5EC] border border-[#EAE0D2] px-3 py-2.5">
              {t('dailyCalendar.cycleNote')}
            </p>
          </div>

          {streakUiAllowed && (
            <>
              <div className="text-[12px] font-black uppercase tracking-wider text-[#8A7B70] mb-2">
                {t('dailyCalendar.milestonesTitle')}
              </div>
              <div className="space-y-1.5">
                {STREAK_MILESTONES.map((m) => {
                  const reached = claimedMilestones.includes(m.days);
                  return (
                    <div
                      key={m.days}
                      className={`rounded-xl px-3 py-2 border flex items-center justify-between text-[12px] ${
                        reached
                          ? 'bg-[#EBF7F0] border-[#C3E5D1] text-[#2D754E]'
                          : 'bg-[#FAF5EC] border-[#EAE0D2] text-[#3A312C]'
                      }`}
                    >
                      <span className="font-black flex items-center gap-1.5">
                        {reached && <Check className="w-3.5 h-3.5 text-[#3B8B61]" />}
                        {t('common.days', { count: m.days })}
                      </span>
                      <span className="font-bold text-right">
                        {formatRewardLabel(m.coins, m.boosters, t)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </ModalSheet>
    </>
  );
};
