import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, Lock, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  CatRarity,
  COLLECTIBLE_CATS,
} from '../../game/collectibleCats';
import { buildUnlockContext } from '../../game/unlockContext';
import { CatIllustration, CatSilhouette } from '../../components/Cat/CatIllustration';
import { HubHeader } from '../../components/Navigation/HubHeader';

const RARITY_STYLES: Record<CatRarity, { bg: string; text: string }> = {
  common: { bg: 'bg-[#EEF4F0]', text: 'text-[#4B7B5D]' },
  rare: { bg: 'bg-[#EAF3FB]', text: 'text-[#3B76A8]' },
  epic: { bg: 'bg-[#F3ECFD]', text: 'text-[#6D4EB8]' },
  legendary: { bg: 'bg-[#FFF3D1]', text: 'text-[#A66E12]' },
};

export const CatsCollectionScreen: React.FC = () => {
  const { t } = useTranslation();
  const unlockedCatIds = useGameStore((s) => s.unlockedCatIds);
  const activeMascotCatId = useGameStore((s) => s.activeMascotCatId);
  const levelProgress = useGameStore((s) => s.levelProgress);
  const unlockedLevelId = useGameStore((s) => s.unlockedLevelId);
  const progressStats = useGameStore((s) => s.progressStats);
  const unlockedAchievementIds = useGameStore((s) => s.unlockedAchievementIds);
  const selectMascotCat = useGameStore((s) => s.selectMascotCat);

  const ctx = buildUnlockContext({
    levelProgress,
    unlockedLevelId,
    progressStats,
    unlockedAchievementIds,
    unlockedCatIds,
  });

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <HubHeader title={t('cats.headerTitle')} />

      <div className="px-3.5 pb-2.5 shrink-0">
        <div className="meow-card rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[14px] font-black text-[#3A312C] leading-none">
              {t('cats.collectedCount', {
                owned: unlockedCatIds.length,
                total: COLLECTIBLE_CATS.length,
              })}
            </div>
            <p className="text-[11px] font-bold text-[#8A7B70] mt-1">
              {t('cats.tapToSelect')}
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-[#9B86D4] shrink-0" />
        </div>
      </div>

      <div className="flex-1 soft-scroll px-3.5 pb-4">
        <div className="grid grid-cols-2 gap-2.5">
          {COLLECTIBLE_CATS.map((cat) => {
            const unlocked = unlockedCatIds.includes(cat.id);
            const isActive = activeMascotCatId === cat.id;
            const rarity = RARITY_STYLES[cat.rarity];

            return (
              <motion.button
                key={cat.id}
                id={`cat-card-${cat.id}`}
                type="button"
                whileTap={unlocked ? { scale: 0.96 } : undefined}
                onClick={() => unlocked && selectMascotCat(cat.id)}
                className={`relative rounded-[22px] p-3 flex flex-col items-center text-center border transition-all ${
                  isActive
                    ? 'bg-white border-[#FF8585] ring-2 ring-[#FF8585]/25 shadow-[0_6px_18px_rgba(255,122,122,0.18)] cursor-pointer'
                    : unlocked
                      ? 'bg-white border-[#EAE0D2] shadow-[0_3px_10px_rgba(92,69,52,0.06)] cursor-pointer'
                      : 'bg-[#F5EFE6]/85 border-[#E7DDD0] cursor-default'
                }`}
              >
                <div className="w-full flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full leading-none ${rarity.bg} ${rarity.text}`}
                  >
                    {t(`cats.rarity.${cat.rarity}`)}
                  </span>
                  {isActive ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-white bg-[#6EB58E] px-1.5 py-0.5 rounded-full leading-none">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      {t('cats.activeBadge')}
                    </span>
                  ) : !unlocked ? (
                    <Lock className="w-3.5 h-3.5 text-[#A99B90]" />
                  ) : null}
                </div>

                <div
                  className={`w-18 h-18 rounded-2xl flex items-center justify-center mb-2 ${
                    unlocked
                      ? 'bg-gradient-to-br from-[#FFF6E4] to-[#FFE7EC]'
                      : 'bg-[#EAE1D4]'
                  }`}
                >
                  {unlocked ? (
                    <CatIllustration
                      breed={cat.breed}
                      mood={isActive ? 'happy' : 'idle'}
                      className="w-15 h-15"
                    />
                  ) : (
                    <CatSilhouette color="#B8AC9F" className="w-13 h-13 opacity-80" />
                  )}
                </div>

                <h3 className="text-[15px] font-black text-[#3A312C] leading-tight">
                  {unlocked ? cat.name : t('cats.mysteryName')}
                </h3>
                <p className="text-[10.5px] font-extrabold text-[#FF7A7A] mt-0.5 leading-tight">
                  {unlocked
                    ? t(`cats.roster.${cat.id}.title`)
                    : t(`cats.roster.${cat.id}.req`)}
                </p>

                <p className="text-[10.5px] font-semibold text-[#7E7067] mt-1.5 leading-snug line-clamp-2">
                  {unlocked
                    ? t(`cats.roster.${cat.id}.personality`)
                    : cat.progressHint(ctx)}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
