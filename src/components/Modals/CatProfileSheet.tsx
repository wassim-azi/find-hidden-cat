import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Check, Heart, Lock, X } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { CatIllustration, CatSilhouette } from '../Cat/CatIllustration';
import { CatRarity, CatUnlockContext, CollectibleCat } from '../../game/collectibleCats';
import { formatLocalizedDate } from '../../i18n';
import { useGameStore } from '../../store/gameStore';

const RARITY_STYLES: Record<CatRarity, { bg: string; text: string }> = {
  common: { bg: 'bg-[#EEF4F0]', text: 'text-[#4B7B5D]' },
  rare: { bg: 'bg-[#EAF3FB]', text: 'text-[#3B76A8]' },
  epic: { bg: 'bg-[#F3ECFD]', text: 'text-[#6D4EB8]' },
  legendary: { bg: 'bg-[#FFF3D1]', text: 'text-[#A66E12]' },
};

interface CatProfileSheetProps {
  cat: CollectibleCat | null;
  open: boolean;
  onClose: () => void;
  ctx: CatUnlockContext;
}

export const CatProfileSheet: React.FC<CatProfileSheetProps> = ({
  cat,
  open,
  onClose,
  ctx,
}) => {
  const { t, i18n } = useTranslation();
  const unlockedCatIds = useGameStore((s) => s.unlockedCatIds);
  const activeMascotCatId = useGameStore((s) => s.activeMascotCatId);
  const catUnlockLog = useGameStore((s) => s.catUnlockLog);
  const favouriteCatIds = useGameStore((s) => s.favouriteCatIds);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const selectMascotCat = useGameStore((s) => s.selectMascotCat);
  const toggleFavouriteCat = useGameStore((s) => s.toggleFavouriteCat);

  const lang = i18n.language.startsWith('fr') ? 'fr' : 'en';

  const unlocked = cat ? unlockedCatIds.includes(cat.id) : false;
  const isCompanion = cat ? activeMascotCatId === cat.id : false;
  const isFavourite = cat ? favouriteCatIds.includes(cat.id) : false;
  const rarity = cat ? RARITY_STYLES[cat.rarity] : RARITY_STYLES.common;

  const formatJoinedText = (catId: string): string => {
    const entry = catUnlockLog[catId];
    if (!entry || !entry.dateKey) return '—';
    const date = formatLocalizedDate(entry.dateKey, lang);
    const src = entry.source;
    if (!src) return date;
    if (src.startsWith('L')) {
      return t('catProfile.joinedFromLevel', { date, level: src.slice(1) });
    }
    if (src.startsWith('golden-')) {
      return t('catProfile.joinedFromGolden', { date });
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(src)) {
      return t('catProfile.joinedFromDaily', { date });
    }
    return date;
  };

  const progress = cat ? cat.getProgress(ctx) : { current: 0, target: 1 };
  const pct =
    progress.target > 0
      ? Math.min(100, Math.round((progress.current / progress.target) * 100))
      : 0;
  const lockedDisplayName =
    cat && cat.rarity === 'common' ? cat.name : t('cats.mysteryName');

  return (
    <ModalSheet
      id="cat-profile-sheet"
      open={open && Boolean(cat)}
      onClose={onClose}
      ariaLabel={cat ? (unlocked ? cat.name : lockedDisplayName) : ''}
    >
      {cat && (
        <div className="p-5 flex flex-col items-center text-center max-h-[85dvh] soft-scroll">
          <div className="w-full flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${rarity.bg} ${rarity.text}`}
            >
              {t(`cats.rarity.${cat.rarity}`)}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('catProfile.close')}
              className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {unlocked ? (
            <>
              <div className="w-36 h-36 rounded-[28px] bg-gradient-to-br from-[#FFF6E4] to-[#FFE7EC] border-2 border-white shadow-sm flex items-center justify-center my-2">
                <CatIllustration
                  breed={cat.breed}
                  mood="happy"
                  size={140}
                  alive={!reducedMotion}
                />
              </div>

              <h2 className="text-[22px] font-black text-[#3A312C] leading-tight mt-1">
                {cat.name}
              </h2>
              <p className="text-[12px] font-extrabold text-[#FF7A7A] mt-0.5">
                {t(`cats.roster.${cat.id}.title`)}
              </p>
              <p className="text-[12.5px] font-semibold text-[#6E6057] mt-2 leading-snug">
                {t(`cats.roster.${cat.id}.personality`)}
              </p>

              {/* Joined History */}
              <div className="w-full mt-3 rounded-2xl bg-[#FAF5EC] border border-[#EAE0D2] px-3.5 py-2.5 flex items-center justify-between gap-2 text-left">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#8A7B70] shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  {t('catProfile.joined')}
                </span>
                <span className="text-[11.5px] font-black text-[#3A312C] text-right">
                  {formatJoinedText(cat.id)}
                </span>
              </div>

              {/* Actions */}
              <div className="w-full mt-4 flex flex-col gap-2">
                <TactileButton
                  id="btn-cat-profile-companion"
                  variant={isCompanion ? 'secondary' : 'primary'}
                  size="md"
                  fullWidth
                  disabled={isCompanion}
                  onClick={() => selectMascotCat(cat.id)}
                >
                  {isCompanion && <Check className="w-4 h-4 text-[#4B9B6E]" strokeWidth={3} />}
                  {isCompanion ? t('catProfile.isCompanion') : t('catProfile.makeCompanion')}
                </TactileButton>

                <button
                  id="btn-cat-profile-favourite"
                  type="button"
                  aria-pressed={isFavourite}
                  onClick={() => toggleFavouriteCat(cat.id)}
                  className={`w-full py-2.5 px-4 rounded-2xl border text-[13px] font-black flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    isFavourite
                      ? 'bg-[#FFF0F3] border-[#F6B4C2] text-[#D94D6A]'
                      : 'bg-[#FAF5EC] border-[#EAE0D2] text-[#6E6057]'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${isFavourite ? 'fill-[#E85B78] text-[#E85B78]' : ''}`}
                  />
                  {t('catProfile.favourite')}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-32 h-32 rounded-[28px] bg-[#EAE1D4] flex items-center justify-center my-2 relative">
                <CatSilhouette color="#A99C8E" className="w-24 h-24 opacity-85" />
                <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 text-[#8A7B70] flex items-center justify-center shadow-xs">
                  <Lock className="w-3.5 h-3.5" />
                </span>
              </div>

              <h2 className="text-[22px] font-black text-[#3A312C] leading-tight mt-1">
                {lockedDisplayName}
              </h2>

              <div className="w-full mt-3 rounded-2xl bg-[#FAF5EC] border border-[#EAE0D2] p-3.5 text-left">
                <div className="text-[10.5px] font-black uppercase tracking-wider text-[#8A7B70]">
                  {t('catProfile.howToUnlock')}
                </div>
                <p className="text-[13px] font-black text-[#3A312C] mt-1">
                  {t(`cats.roster.${cat.id}.req`)}
                </p>
                <p className="text-[11.5px] font-semibold text-[#7E7067] mt-0.5">
                  {cat.progressHint(ctx)}
                </p>

                <div className="mt-2.5">
                  <div className="flex justify-between text-[10.5px] font-extrabold text-[#8A7B70] mb-1">
                    <span>{t('missions.progressLabel')}</span>
                    <span className="tabular-nums">
                      {progress.current} / {progress.target}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={progress.current}
                    aria-valuemin={0}
                    aria-valuemax={progress.target}
                    aria-label={lockedDisplayName}
                    className="w-full h-2 bg-[#E9DFD1] rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF8B8B] to-[#6EB58E] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="w-full mt-4">
                <TactileButton variant="secondary" size="md" fullWidth onClick={onClose}>
                  {t('catProfile.close')}
                </TactileButton>
              </div>
            </>
          )}
        </div>
      )}
    </ModalSheet>
  );
};
