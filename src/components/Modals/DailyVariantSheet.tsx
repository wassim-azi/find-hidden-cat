import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Feather, Flame, Sparkles } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { useGameStore } from '../../store/gameStore';
import { DAILY_VARIANTS, DailyVariant, getTodayDateKey } from '../../game/levels';
import { classify, SkillLevel } from '../../game/skillProfile';

const VARIANT_ICONS: Record<DailyVariant, React.ReactNode> = {
  relaxed: <Feather className="w-5 h-5" />,
  standard: <Sparkles className="w-5 h-5" />,
  tricky: <Flame className="w-5 h-5" />,
};

/** "Recommended" chip (#24): a suggestion only — every option pays the same reward. */
export function getRecommendedDailyVariant(level: SkillLevel): DailyVariant {
  if (level === 'struggling') return 'relaxed';
  if (level === 'cruising') return 'tricky';
  return 'standard';
}

interface DailyVariantSheetProps {
  open: boolean;
  /** Visually highlights one option (e.g. when a recommendation suggested it). */
  highlight: DailyVariant | null;
  onPick: (variant: DailyVariant) => void;
  onClose: () => void;
}

export const DailyVariantSheet: React.FC<DailyVariantSheetProps> = ({
  open,
  highlight,
  onPick,
  onClose,
}) => {
  const { t } = useTranslation();
  const skillProfile = useGameStore((s) => s.skillProfile);
  const recommended = getRecommendedDailyVariant(classify(skillProfile));

  return (
    <ModalSheet id="daily-variant-sheet" open={open} onClose={onClose} ariaLabel={t('dailyVariant.title')}>
      <div className="p-5 flex flex-col gap-2.5">
        <h2 className="text-[18px] font-black text-[#3A312C] leading-tight text-center">
          {t('dailyVariant.title')}
        </h2>

        {DAILY_VARIANTS.map((variant) => {
          const isHighlighted = highlight === variant;
          return (
            <button
              key={variant}
              id={`btn-daily-variant-${variant}`}
              type="button"
              onClick={() => onPick(variant)}
              className={`w-full rounded-2xl border-2 px-3.5 py-3 flex items-center gap-3 text-left cursor-pointer active:scale-[0.98] transition-all ${
                isHighlighted
                  ? 'border-[#FF8787] bg-[#FFF0F0] shadow-[0_0_0_3px_rgba(255,135,135,0.22)]'
                  : 'border-[#EAE0D2] bg-[#FAF5EC] hover:border-[#F2CFA0]'
              }`}
            >
              <span className="w-10 h-10 rounded-xl bg-white border border-[#EDE3D4] text-[#C46A3C] flex items-center justify-center shrink-0">
                {VARIANT_ICONS[variant]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold text-[#3A312C] leading-snug">
                  {t(`dailyVariant.${variant}`)}
                </span>
                {recommended === variant && (
                  <span
                    data-recommended-variant={variant}
                    className="inline-block mt-1 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full bg-[#E8F7EE] text-[#357D56]"
                  >
                    {t('dailyVariant.recommended')}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        <p className="text-[11px] font-bold text-[#7E7067] text-center mt-1">
          {t('dailyVariant.sameReward')}
        </p>

        <TactileButton
          id="btn-daily-variant-cancel"
          variant="ghost"
          size="sm"
          fullWidth
          onClick={onClose}
        >
          {t('common.cancel')}
        </TactileButton>
      </div>
    </ModalSheet>
  );
};

/**
 * Starts today's Daily directly when a variant is already locked for today; otherwise asks
 * the player to choose with the variant sheet.
 */
export function useDailyVariantPicker(): {
  requestDaily: (highlight?: DailyVariant) => void;
  sheet: React.ReactElement;
} {
  const dailyVariant = useGameStore((s) => s.dailyVariant);
  const startDailyChallenge = useGameStore((s) => s.startDailyChallenge);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<DailyVariant | null>(null);

  const requestDaily = useCallback(
    (nextHighlight?: DailyVariant) => {
      if (dailyVariant?.dateKey === getTodayDateKey()) {
        startDailyChallenge();
        return;
      }
      setHighlight(nextHighlight ?? null);
      setOpen(true);
    },
    [dailyVariant, startDailyChallenge]
  );

  const sheet = (
    <DailyVariantSheet
      open={open}
      highlight={highlight}
      onClose={() => setOpen(false)}
      onPick={(variant) => {
        setOpen(false);
        startDailyChallenge(variant);
      }}
    />
  );

  return { requestDaily, sheet };
}
