import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cat,
  Film,
  Grid,
  Heart,
  Lightbulb,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BoosterId, SHOP_ITEMS } from '../../game/economy';
import { HubHeader } from '../../components/Navigation/HubHeader';
import { FishCoinIcon } from '../../components/Currency/FishCoinIcon';
import { TactileButton } from '../../components/Buttons/TactileButton';

const BOOSTER_ICONS: Record<BoosterId, React.ReactNode> = {
  hint: <Lightbulb className="w-5 h-5" />,
  superHint: <Sparkles className="w-5 h-5" />,
  revealCat: <Cat className="w-5 h-5" />,
  undoToken: <Heart className="w-5 h-5" />,
  mistakeShield: <Shield className="w-5 h-5" />,
  revealRegion: <Grid className="w-5 h-5" />,
};

export const ShopScreen: React.FC = () => {
  const { t } = useTranslation();
  const fishCoins = useGameStore((s) => s.fishCoins);
  const boosters = useGameStore((s) => s.boosters);
  const purchaseBooster = useGameStore((s) => s.purchaseBooster);
  const openRewardedAdPrompt = useGameStore((s) => s.openRewardedAdPrompt);

  const nextGoalItem = SHOP_ITEMS.find((i) => i.priceCoins > fishCoins);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <HubHeader title={t('shop.headerTitle')} />

      <div className="px-3.5 pb-2.5 shrink-0">
        <div className="rounded-[22px] bg-gradient-to-r from-[#FFF4D6] to-[#FFE7D9] border border-[#F2D29B] px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-[#9A6514]">
              {t('shop.yourCoins')}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <FishCoinIcon className="w-6 h-6" />
              <span className="text-[24px] font-black text-[#3A312C] leading-none tabular-nums">
                {fishCoins}
              </span>
            </div>
            <p className="text-[11px] font-bold text-[#8A6128] mt-1">
              {nextGoalItem
                ? t('shop.nudgeNextItem', {
                    diff: nextGoalItem.priceCoins - fishCoins,
                    item: t(`shop.items.${nextGoalItem.id}.name`),
                  })
                : t('shop.nudgeDefault')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 soft-scroll px-3.5 pb-4 flex flex-col gap-2.5">
        {SHOP_ITEMS.map((item) => {
          const owned = boosters[item.id];
          const canAfford = fishCoins >= item.priceCoins;
          const badgeKey =
            item.badge === 'Popular'
              ? 'shop.badges.popular'
              : item.badge === 'Best'
                ? 'shop.badges.best'
                : null;

          return (
            <div
              key={item.id}
              className="meow-card rounded-[22px] p-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  style={{ backgroundColor: item.bgSoft, color: item.accentColor }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative"
                >
                  {BOOSTER_ICONS[item.id]}
                  <span className="absolute -bottom-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#3A312C] text-white text-[10px] font-black flex items-center justify-center border-2 border-white tabular-nums">
                    {owned}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-[14px] font-black text-[#3A312C] leading-tight">
                      {t(`shop.items.${item.id}.name`)}
                    </h3>
                    {badgeKey && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-[#FFF0F0] text-[#E05A66]">
                        {t(badgeKey)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-[#7E7067] leading-snug mt-0.5">
                    {t(`shop.items.${item.id}.desc`)}
                  </p>
                </div>
              </div>

              <TactileButton
                id={`btn-buy-${item.id}`}
                variant={canAfford ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => purchaseBooster(item.id)}
                className="h-9 px-3 shrink-0"
              >
                <FishCoinIcon className="w-4 h-4" />
                <span className="text-[12.5px] tabular-nums">{item.priceCoins}</span>
              </TactileButton>
            </div>
          );
        })}

        <div className="mt-1 rounded-[22px] bg-[#F4EEFD] border border-[#DFD2F8] p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-4 h-4 text-[#7859C4] shrink-0" />
            <h3 className="text-[13px] font-black text-[#4B367E]">
              {t('shop.optionalRewardsTitle')}
            </h3>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-white text-[#7859C4] whitespace-nowrap">
              {t('common.comingSoon')}
            </span>
          </div>
          <p className="text-[11px] font-bold text-[#6E5B9B] mb-3">
            {t('shop.optionalRewardsDesc')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-shop-ad-coins"
              type="button"
              onClick={() => openRewardedAdPrompt('bonus_coins')}
              className="rounded-xl bg-white border border-[#DFD2F8] px-2.5 py-2 text-[11px] font-extrabold text-[#5D439E] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Film className="w-3.5 h-3.5 shrink-0" />
              {t('shop.adCoinsBtn')}
            </button>
            <button
              id="btn-shop-ad-hint"
              type="button"
              onClick={() => openRewardedAdPrompt('free_hint')}
              className="rounded-xl bg-white border border-[#DFD2F8] px-2.5 py-2 text-[11px] font-extrabold text-[#5D439E] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Film className="w-3.5 h-3.5 shrink-0" />
              {t('shop.adHintBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
