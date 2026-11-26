import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Gift, Play, Sparkles, Trophy, X } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { LastVisitSnapshot } from '../../game/gameTypes';
import { buildWelcomeBackContent } from '../../game/welcomeBack';
import { getCampaignSavesSnapshot, useGameStore } from '../../store/gameStore';

interface WelcomeBackSheetProps {
  open: boolean;
  lastVisitForSummary: LastVisitSnapshot | null;
  onClose: () => void;
  onPlayDaily: () => void;
}

export const WelcomeBackSheet: React.FC<WelcomeBackSheetProps> = ({
  open,
  lastVisitForSummary,
  onClose,
  onPlayDaily,
}) => {
  const { t } = useTranslation();

  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const unlockedLevelId = useGameStore((s) => s.unlockedLevelId);
  const campaignSaveLevelIds = useGameStore((s) => s.campaignSaveLevelIds);
  const dailyLogin = useGameStore((s) => s.dailyLogin);
  const completedDailyDates = useGameStore((s) => s.completedDailyDates);
  const dailyMissions = useGameStore((s) => s.dailyMissions);
  const weeklyMissions = useGameStore((s) => s.weeklyMissions);
  const unlockedAchievementIds = useGameStore((s) => s.unlockedAchievementIds);
  const claimedAchievementIds = useGameStore((s) => s.claimedAchievementIds);

  const startLevel = useGameStore((s) => s.startLevel);
  const setDailyCalendarOpen = useGameStore((s) => s.setDailyCalendarOpen);

  const content = useMemo(() => {
    if (!open) return null;
    return buildWelcomeBackContent(
      {
        currentLevelId,
        unlockedLevelId,
        campaignSaveLevelIds,
        campaignSaves: getCampaignSavesSnapshot(),
        dailyLogin,
        completedDailyDates,
        dailyMissions,
        weeklyMissions,
        unlockedAchievementIds,
        claimedAchievementIds,
      },
      lastVisitForSummary,
      Date.now()
    );
  }, [
    open,
    currentLevelId,
    unlockedLevelId,
    campaignSaveLevelIds,
    dailyLogin,
    completedDailyDates,
    dailyMissions,
    weeklyMissions,
    unlockedAchievementIds,
    claimedAchievementIds,
    lastVisitForSummary,
  ]);

  const continueText = content
    ? content.continueCard.kind === 'saved'
      ? t('welcomeBack.continueSaved', {
          id: content.continueCard.levelId,
          found: content.continueCard.found,
          total: content.continueCard.total,
        })
      : t('welcomeBack.continueNext', { id: content.continueCard.levelId })
    : '';

  const hasWhatsNew = Boolean(
    content &&
      (content.whatsNew.newWeek ||
        content.whatsNew.newSeason !== null ||
        content.whatsNew.badgesReadyCount > 0)
  );

  return (
    <ModalSheet
      id="welcome-back-sheet"
      open={open}
      onClose={onClose}
      ariaLabel={t('welcomeBack.title')}
    >
      {content && (
        <div className="p-5 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[20px] font-black text-[#3A312C] tracking-tight">
              {t('welcomeBack.title')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer active:scale-92"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Continue Card (always shown) */}
          <div className="rounded-2xl bg-[#FFF4EB] border border-[#F5D6BC] p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-[#3A312C] leading-snug">
                {continueText}
              </p>
            </div>
            <TactileButton
              id="btn-welcome-back-continue"
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                startLevel(content.continueCard.levelId, true);
              }}
              className="shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t('welcomeBack.continueBtn')}</span>
            </TactileButton>
          </div>

          {/* Daily Reward Row */}
          {content.rewardReady && (
            <div className="rounded-2xl bg-[#FFF8E6] border border-[#F2DFB4] px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Gift className="w-4 h-4 text-[#C48216] shrink-0" />
                <span className="text-[12.5px] font-extrabold text-[#5E4110] leading-snug">
                  {t('welcomeBack.rewardReady')}
                </span>
              </div>
              <TactileButton
                id="btn-welcome-back-claim"
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  setDailyCalendarOpen(true);
                }}
                className="shrink-0"
              >
                {t('welcomeBack.claimBtn')}
              </TactileButton>
            </div>
          )}

          {/* Daily Kitty Row */}
          {content.dailyKittyReady && (
            <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Calendar className="w-4 h-4 text-[#D95B6B] shrink-0" />
                <span className="text-[12.5px] font-extrabold text-[#3A312C] leading-snug">
                  {t('welcomeBack.dailyReady')}
                </span>
              </div>
              <TactileButton
                id="btn-welcome-back-daily"
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onPlayDaily();
                }}
                className="shrink-0"
              >
                {t('welcomeBack.dailyBtn')}
              </TactileButton>
            </div>
          )}

          {/* Active Missions */}
          {content.missions.length > 0 && (
            <div className="rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] px-3.5 py-2.5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#8A7B70]">
                <Trophy className="w-3.5 h-3.5 text-[#E59C1E]" />
                <span>{t('welcomeBack.missionsTitle')}</span>
              </div>
              {content.missions.map((m) => (
                <p
                  key={m.id}
                  className="text-[12.5px] font-bold text-[#3A312C] leading-snug"
                >
                  {t(`missions.items.${m.metric}.title`)} — {m.progress}/{m.target}
                </p>
              ))}
            </div>
          )}

          {/* What's new */}
          {hasWhatsNew && (
            <div className="rounded-2xl bg-[#F4EEFD] border border-[#DFD2F8] px-3.5 py-2.5 flex flex-col gap-1">
              {content.whatsNew.newWeek && (
                <p className="text-[12px] font-extrabold text-[#5D439E] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('welcomeBack.newWeek')}</span>
                </p>
              )}
              {content.whatsNew.newSeason !== null && (
                <p className="text-[12px] font-extrabold text-[#5D439E] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {t('welcomeBack.newSeason', {
                      season: t(`seasons.namesLower.${content.whatsNew.newSeason}`),
                    })}
                  </span>
                </p>
              )}
              {content.whatsNew.badgesReadyCount > 0 && (
                <p className="text-[12px] font-extrabold text-[#5D439E] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {t('welcomeBack.badgesReady', {
                      count: content.whatsNew.badgesReadyCount,
                    })}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Dismiss */}
          <TactileButton
            id="btn-welcome-back-dismiss"
            variant="ghost"
            size="sm"
            fullWidth
            onClick={onClose}
          >
            {t('welcomeBack.dismiss')}
          </TactileButton>
        </div>
      )}
    </ModalSheet>
  );
};
