import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getCurrentWeekKey } from '../../game/events';
import { getTodayDateKey } from '../../game/levels';
import { TECHNIQUE_RANK } from '../../game/logicalSolver';
import { getRecommendation, Recommendation } from '../../game/recommendations';
import { ModalSheet } from '../Modals/ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { useDailyVariantPicker } from '../Modals/DailyVariantSheet';

/** At most one recommendation card per app session (#24). */
let shownThisSession = false;

function recommendationParams(rec: Recommendation): Record<string, number> {
  if (rec.kind === 'no_hint_replay' || rec.kind === 'three_star_replay') {
    return { id: rec.levelId };
  }
  return {};
}

interface RecommendationCardProps {
  id: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ id }) => {
  const { t } = useTranslation();
  const updateSetting = useGameStore((s) => s.updateSetting);
  const showToast = useGameStore((s) => s.showToast);
  const startGoldenCatTrial = useGameStore((s) => s.startGoldenCatTrial);
  const startLevel = useGameStore((s) => s.startLevel);
  const dismissRecommendation = useGameStore((s) => s.dismissRecommendation);
  const { requestDaily, sheet: dailyVariantSheet } = useDailyVariantPicker();

  // Decided once per mount from the current state, so the card never flickers or swaps
  const [rec] = useState<Recommendation | null>(() => {
    if (shownThisSession) return null;
    const s = useGameStore.getState();
    return getRecommendation({
      profile: s.skillProfile,
      levelProgress: s.levelProgress,
      preferredMode: s.settings.gameMode,
      goldenSolvedThisWeek: s.completedDailyDates.includes(`golden-${getCurrentWeekKey()}`),
      dismissed: s.recommendationDismissed,
      todayKey: getTodayDateKey(),
    });
  });
  const [hidden, setHidden] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    if (rec) shownThisSession = true;
  }, [rec]);

  const onGo = () => {
    if (!rec) return;
    switch (rec.kind) {
      case 'practice_mode':
        updateSetting('gameMode', 'practice');
        showToast(t('recommend.practiceSetToast'));
        setHidden(true);
        return;
      case 'technique_tip':
        setTipOpen(true);
        return;
      case 'relaxed_daily':
        requestDaily('relaxed');
        return;
      case 'golden_trial':
        startGoldenCatTrial();
        return;
      case 'no_hint_replay':
      case 'three_star_replay':
        startLevel(rec.levelId, true);
        return;
    }
  };

  const onDismiss = () => {
    if (!rec) return;
    dismissRecommendation(rec.kind);
    setHidden(true);
  };

  return (
    <>
      {rec && !hidden && (
        <div
          id={id}
          data-recommendation-kind={rec.kind}
          className="meow-card rounded-2xl px-3 py-2 min-w-0"
        >
          <div className="flex items-start gap-2 min-w-0">
            <Lightbulb className="w-4 h-4 text-[#D99118] shrink-0 mt-0.5" />
            <p className="flex-1 min-w-0 text-[11.5px] font-extrabold text-[#5A4E47] leading-snug">
              {t(`recommend.${rec.kind}`, recommendationParams(rec))}
            </p>
          </div>
          <div className="mt-1.5 flex items-center justify-end gap-2">
            <button
              id="btn-recommendation-dismiss"
              type="button"
              onClick={onDismiss}
              className="text-[10.5px] font-black text-[#6E6057] bg-[#F4ECE0] px-2.5 py-1.5 rounded-xl cursor-pointer active:scale-95 whitespace-nowrap"
            >
              {t('recommend.dismiss')}
            </button>
            <button
              id="btn-recommendation-go"
              type="button"
              onClick={onGo}
              className="text-[10.5px] font-black text-white bg-[#F36A6A] px-2.5 py-1.5 rounded-xl cursor-pointer active:scale-95 whitespace-nowrap"
            >
              {t('recommend.go')}
            </button>
          </div>
        </div>
      )}

      {rec?.kind === 'technique_tip' && (
        <ModalSheet
          id="technique-tip-sheet"
          open={tipOpen}
          onClose={() => setTipOpen(false)}
          ariaLabel={t('recommend.technique_tip')}
        >
          <div className="p-5 flex flex-col gap-3 text-center items-center">
            <div className="w-11 h-11 rounded-xl bg-[#FFF6DF] text-[#D99118] flex items-center justify-center">
              <Lightbulb className="w-6 h-6" />
            </div>
            <p className="text-[14px] font-extrabold text-[#3A312C] leading-snug">
              {t(`techniqueTips.rank${TECHNIQUE_RANK[rec.technique]}`)}
            </p>
            <TactileButton
              id="btn-technique-tip-close"
              variant="secondary"
              fullWidth
              onClick={() => setTipOpen(false)}
            >
              {t('common.close')}
            </TactileButton>
          </div>
        </ModalSheet>
      )}

      {dailyVariantSheet}
    </>
  );
};
