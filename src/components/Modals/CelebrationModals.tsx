import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Gift, Sparkles, Trophy } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { CatIllustration } from '../Cat/CatIllustration';
import { FishCoinIcon } from '../Currency/FishCoinIcon';
import { useGameStore } from '../../store/gameStore';

export const CelebrationModals: React.FC = () => {
  const { t } = useTranslation();
  const unlockedWorldModal = useGameStore((s) => s.unlockedWorldModal);
  const unlockedCatModal = useGameStore((s) => s.unlockedCatModal);
  const chestRevealModal = useGameStore((s) => s.chestRevealModal);
  const dismissUnlockedWorld = useGameStore((s) => s.dismissUnlockedWorld);
  const dismissUnlockedCat = useGameStore((s) => s.dismissUnlockedCat);
  const dismissChestReveal = useGameStore((s) => s.dismissChestReveal);
  const selectMascotCat = useGameStore((s) => s.selectMascotCat);

  const worldName = unlockedWorldModal
    ? t(`worlds.${unlockedWorldModal.id}.name`)
    : '';
  const worldSubtitle = unlockedWorldModal
    ? t(`worlds.${unlockedWorldModal.id}.subtitle`)
    : '';

  return (
    <>
      {/* World Unlocked Celebration */}
      <ModalSheet
        open={Boolean(unlockedWorldModal)}
        onClose={dismissUnlockedWorld}
        ariaLabel={t('celebrations.newWorldBadge')}
      >
        {unlockedWorldModal && (
          <div className="overflow-hidden text-center">
            <div className="relative h-[145px] w-full">
              <img
                src={unlockedWorldModal.bannerImage}
                alt={worldName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#FFFDF9] to-transparent" />
            </div>
            <div className="px-6 pb-6 -mt-3 relative">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FFF2D6] text-[#9A6514] text-[11px] font-black uppercase">
                <Trophy className="w-3.5 h-3.5" />
                {t('celebrations.newWorldBadge')}
              </span>
              <h2 className="text-[24px] font-black text-[#3A312C] mt-2">
                {worldName}
              </h2>
              <p className="text-[13px] font-bold text-[#7E7067] mt-1 mb-5">
                {worldSubtitle}
              </p>
              <TactileButton variant="primary" size="lg" fullWidth onClick={dismissUnlockedWorld}>
                {t('celebrations.exploreWorld', { world: worldName })}
              </TactileButton>
            </div>
          </div>
        )}
      </ModalSheet>

      {/* New Collectible Cat Reveal */}
      <ModalSheet
        open={Boolean(unlockedCatModal)}
        onClose={dismissUnlockedCat}
        ariaLabel={t('celebrations.newCatBadge', {
          rarity: unlockedCatModal ? t(`cats.rarity.${unlockedCatModal.rarity}`) : '',
        })}
      >
        {unlockedCatModal && (
          <div className="p-6 text-center flex flex-col items-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F3ECFD] text-[#6B4EB5] text-[11px] font-black uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              {t('celebrations.newCatBadge', {
                rarity: t(`cats.rarity.${unlockedCatModal.rarity}`),
              })}
            </span>

            <motion.div
              initial={{ scale: 0.4, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              className="w-28 h-28 rounded-[28px] bg-gradient-to-br from-[#FFF4DC] to-[#FFE1E6] border-2 border-white shadow-md flex items-center justify-center my-4"
            >
              <CatIllustration
                breed={unlockedCatModal.breed}
                mood="celebrate"
                className="w-24 h-24"
              />
            </motion.div>

            <h2 className="text-[24px] font-black text-[#3A312C] leading-none">
              {unlockedCatModal.name}
            </h2>
            <p className="text-[12px] font-extrabold text-[#FF7A7A] mt-1">
              {t(`cats.roster.${unlockedCatModal.id}.title`)}
            </p>
            <p className="text-[13px] font-semibold text-[#7E7067] mt-2 mb-5">
              {t(`cats.roster.${unlockedCatModal.id}.personality`)}
            </p>

            <div className="w-full flex flex-col gap-2">
              <TactileButton
                variant="primary"
                fullWidth
                onClick={() => {
                  selectMascotCat(unlockedCatModal.id);
                  dismissUnlockedCat();
                }}
              >
                {t('celebrations.setAsCompanion')}
              </TactileButton>
              <TactileButton variant="ghost" size="sm" fullWidth onClick={dismissUnlockedCat}>
                {t('common.awesome')}
              </TactileButton>
            </div>
          </div>
        )}
      </ModalSheet>

      {/* Treasure Chest Reveal */}
      <ModalSheet
        open={Boolean(chestRevealModal)}
        onClose={dismissChestReveal}
        ariaLabel={chestRevealModal?.title ?? ''}
      >
        {chestRevealModal && (
          <div className="p-6 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFE396] to-[#F3B038] text-[#6B4209] flex items-center justify-center shadow-md mb-3">
              <Gift className="w-8 h-8" />
            </div>
            <h2 className="text-[22px] font-black text-[#3A312C]">
              {chestRevealModal.title}
            </h2>
            <p className="text-[12.5px] font-bold text-[#8A7B70] mt-1 mb-4">
              {chestRevealModal.subtitle}
            </p>

            <div className="w-full rounded-2xl bg-[#FAF5EC] border border-[#EDE3D4] p-3.5 flex items-center justify-center gap-4 mb-5">
              <div className="flex items-center gap-1.5">
                <FishCoinIcon className="w-6 h-6" />
                <span className="text-[18px] font-black text-[#6B4812]">
                  +{chestRevealModal.coins}
                </span>
              </div>
              {chestRevealModal.boosterLabel && (
                <>
                  <span className="w-px h-5 bg-[#E0D4C2]" />
                  <span className="text-[13px] font-black text-[#6B4EB5]">
                    +{chestRevealModal.boosterLabel}
                  </span>
                </>
              )}
            </div>

            <TactileButton variant="primary" fullWidth onClick={dismissChestReveal}>
              {t('celebrations.collectTreasure')}
            </TactileButton>
          </div>
        )}
      </ModalSheet>
    </>
  );
};
