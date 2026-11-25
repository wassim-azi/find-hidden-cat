import React, { useState } from 'react';
import { Check, Flame, Gift, Shield, Sparkles, X } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { FishCoinIcon } from '../Currency/FishCoinIcon';
import {
  canClaimDailyReward,
  SEVEN_DAY_REWARDS,
} from '../../game/dailyRewards';
import { getTodayDateKey } from '../../game/levels';
import { useGameStore } from '../../store/gameStore';

export const DailyCalendarModal: React.FC = () => {
  const open = useGameStore((s) => s.isDailyCalendarOpen);
  const dailyLogin = useGameStore((s) => s.dailyLogin);
  const claimTodaysDailyReward = useGameStore((s) => s.claimTodaysDailyReward);
  const setDailyCalendarOpen = useGameStore((s) => s.setDailyCalendarOpen);
  const openRewardedAdPrompt = useGameStore((s) => s.openRewardedAdPrompt);

  const [justClaimedText, setJustClaimedText] = useState<string | null>(null);

  const todayKey = getTodayDateKey();
  const claimable = canClaimDailyReward(dailyLogin, todayKey);
  const activeDayIdx = dailyLogin.currentDayIndex;

  const handleClaim = () => {
    const res = claimTodaysDailyReward();
    if (res.claimed && res.reward) {
      setJustClaimedText(
        res.usedStreakShield
          ? `Streak Shield saved your streak! Claimed ${res.reward.title}!`
          : `Claimed Day ${res.reward.day}: ${res.reward.title}!`
      );
    }
  };

  const handleClose = () => {
    setJustClaimedText(null);
    setDailyCalendarOpen(false);
  };

  return (
    <ModalSheet open={open} onClose={handleClose} ariaLabel="7-Day Daily Rewards Calendar">
      <div className="p-5 flex flex-col max-h-[86dvh] soft-scroll">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFE49B] to-[#F4B942] flex items-center justify-center text-[#6B4209] shadow-xs">
              <Gift className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-[19px] font-black text-[#3A312C] leading-none">
                Daily Treats
              </h2>
              <p className="text-[11px] font-bold text-[#8A7B70] mt-0.5">
                Come back each day for bigger prizes!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close daily rewards"
            className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Streak & Forgiving Shield Strip */}
        <div className="grid grid-cols-2 gap-2 mb-3.5">
          <div className="rounded-2xl bg-[#FFF5E4] border border-[#F3DCAD] px-3 py-2 flex items-center gap-2">
            <Flame className="w-4.5 h-4.5 text-[#E87A2A] shrink-0" />
            <div>
              <div className="text-[14px] font-black text-[#3A312C] leading-none">
                {dailyLogin.streakCount} Day{dailyLogin.streakCount === 1 ? '' : 's'}
              </div>
              <div className="text-[10px] font-bold text-[#946C2B] mt-0.5">Login Streak</div>
            </div>
          </div>
          <div className="rounded-2xl bg-[#EBF7F0] border border-[#C3E5D1] px-3 py-2 flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-[#3B8B61] shrink-0" />
            <div>
              <div className="text-[14px] font-black text-[#3A312C] leading-none">
                {dailyLogin.streakShields} Shield{dailyLogin.streakShields === 1 ? '' : 's'}
              </div>
              <div className="text-[10px] font-bold text-[#3D7A5A] mt-0.5">Streak Guard</div>
            </div>
          </div>
        </div>

        {/* 7-Day Reward Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {SEVEN_DAY_REWARDS.map((slot, idx) => {
            const isPast = claimable ? idx < activeDayIdx : idx < activeDayIdx || (activeDayIdx === 0 && dailyLogin.totalClaims > 0);
            const isToday = claimable && idx === activeDayIdx;
            const isGrand = slot.isGrandPrize;

            return (
              <div
                key={slot.day}
                className={`relative rounded-2xl p-2.5 border flex flex-col items-center text-center transition-all ${
                  isGrand ? 'col-span-3 flex-row justify-between px-4 py-3 text-left' : ''
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
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isToday
                        ? 'bg-[#F0B840] text-white'
                        : isPast
                          ? 'bg-[#6EB58E] text-white'
                          : 'bg-[#EAE0D2] text-[#7E7067]'
                    }`}
                  >
                    Day {slot.day}
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
                    <div className="text-[12px] font-black text-[#3A312C] leading-tight">
                      {slot.title}
                    </div>
                    <div className="text-[10px] font-bold text-[#8A7B70] mt-0.5 leading-tight">
                      {slot.subtitle}
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
            className="relative overflow-hidden btn-shimmer"
          >
            <Gift className="w-5 h-5" />
            Claim Day {activeDayIdx + 1} Reward
          </TactileButton>
        ) : (
          <div className="flex flex-col gap-2">
            <TactileButton variant="secondary" size="md" fullWidth onClick={handleClose}>
              <Check className="w-4 h-4 text-[#4B9B6E]" />
              Claimed Today — See You Tomorrow!
            </TactileButton>
            <button
              type="button"
              onClick={() => {
                handleClose();
                openRewardedAdPrompt('daily_bonus');
              }}
              className="text-[11.5px] font-extrabold text-[#9B86D4] hover:underline py-1 cursor-pointer"
            >
              Optional: Double Daily Bonus (Future Ad Preview)
            </button>
          </div>
        )}
      </div>
    </ModalSheet>
  );
};
