import React, { useState } from 'react';
import { AlertCircle, Film, X } from 'lucide-react';
import { ModalSheet } from './ModalSheet';
import { TactileButton } from '../Buttons/TactileButton';
import { FishCoinIcon } from '../Currency/FishCoinIcon';
import { REWARDED_AD_OFFERS, RewardedAdPlacement } from '../../services/rewardedAds';
import { BoosterId } from '../../game/economy';
import { useGameStore } from '../../store/gameStore';

const PLACEMENT_TO_BOOSTER: Partial<Record<RewardedAdPlacement, BoosterId>> = {
  free_hint: 'hint',
  extra_undo: 'undoToken',
  booster_pack: 'mistakeShield',
  challenge_retry: 'superHint',
};

export const RewardedAdModal: React.FC = () => {
  const placement = useGameStore((s) => s.rewardedAdPlacement);
  const lastAdFeedback = useGameStore((s) => s.lastAdFeedback);
  const fishCoins = useGameStore((s) => s.fishCoins);
  const attemptWatchRewardedAd = useGameStore((s) => s.attemptWatchRewardedAd);
  const purchaseBooster = useGameStore((s) => s.purchaseBooster);
  const closeRewardedAdPrompt = useGameStore((s) => s.closeRewardedAdPrompt);

  const [checking, setChecking] = useState(false);

  if (!placement) return null;
  const offer = REWARDED_AD_OFFERS[placement];
  const boosterId = PLACEMENT_TO_BOOSTER[placement];

  const handleWatchAd = async () => {
    setChecking(true);
    await attemptWatchRewardedAd(placement);
    setChecking(false);
  };

  const handleUseCoins = () => {
    if (!boosterId) return;
    if (purchaseBooster(boosterId)) {
      closeRewardedAdPrompt();
    }
  };

  return (
    <ModalSheet
      open={Boolean(placement)}
      onClose={closeRewardedAdPrompt}
      ariaLabel={offer.headline}
    >
      <div className="p-5 flex flex-col text-center">
        <div className="flex justify-end -mb-2">
          <button
            type="button"
            onClick={closeRewardedAdPrompt}
            aria-label="Close reward prompt"
            className="w-8 h-8 rounded-full bg-[#F5EFE5] flex items-center justify-center text-[#7E7067] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F3ECFD] text-[#8366CC] flex items-center justify-center mb-3">
          <Film className="w-7 h-7" />
        </div>

        <span className="text-[10.5px] font-black uppercase tracking-wider text-[#8366CC] bg-[#F3ECFD] px-2.5 py-0.5 rounded-full mx-auto">
          Optional Reward
        </span>

        <h2 className="text-[21px] font-black text-[#3A312C] mt-2 tracking-tight">
          {offer.headline}
        </h2>
        <p className="text-[13px] font-bold text-[#7E7067] mt-1">
          Watch an optional short video to receive{' '}
          <span className="text-[#3A312C] font-black">{offer.rewardLabel}</span>.
        </p>

        {/* Honest NOT_IMPLEMENTED / SDK unavailable feedback */}
        {lastAdFeedback && (
          <div
            role="status"
            className="mt-3.5 rounded-2xl bg-[#FFF6E6] border border-[#F2D396] p-3 text-left flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-[#C9851A] shrink-0 mt-0.5" />
            <p className="text-[11.5px] font-bold text-[#7D5515] leading-snug">
              {lastAdFeedback}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2.5 mt-4">
          <TactileButton
            id="btn-ad-watch"
            variant="primary"
            fullWidth
            disabled={checking}
            onClick={() => void handleWatchAd()}
          >
            <Film className="w-4.5 h-4.5" />
            {checking ? 'Checking Ad Provider...' : 'Watch Ad'}
          </TactileButton>

          {boosterId && offer.coinAlternativeCost > 0 && (
            <TactileButton
              id="btn-ad-use-coins"
              variant="secondary"
              fullWidth
              disabled={fishCoins < offer.coinAlternativeCost}
              onClick={handleUseCoins}
            >
              <FishCoinIcon className="w-5 h-5" />
              Use {offer.coinAlternativeCost} Fish Coins
            </TactileButton>
          )}

          <TactileButton
            id="btn-ad-later"
            variant="ghost"
            size="sm"
            fullWidth
            onClick={closeRewardedAdPrompt}
          >
            Maybe Later
          </TactileButton>
        </div>
      </div>
    </ModalSheet>
  );
};
