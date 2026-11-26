/**
 * Future-Ready Rewarded Advertisement Service Abstraction.
 *
 * IMPORTANT:
 * - No real ad SDK is integrated yet.
 * - Always returns NOT_IMPLEMENTED / unavailable instead of pretending an ad played.
 * - Callers MUST check `result.status === 'COMPLETED' && result.granted === true`
 *   before awarding any coins or boosters.
 * - Replace `PlaceholderRewardedAdProvider` with AdMob / Unity Ads / Web H5 Games Ads
 *   provider in a future phase without changing any game economy or UI code.
 */

import i18n from '../i18n';

export type RewardedAdPlacement =
  | 'free_hint'
  | 'bonus_coins'
  | 'extra_undo'
  | 'daily_bonus'
  | 'booster_pack'
  | 'challenge_retry';

export type RewardedAdStatus =
  | 'COMPLETED'
  | 'DISMISSED'
  | 'UNAVAILABLE'
  | 'NOT_IMPLEMENTED'
  | 'ERROR';

export interface RewardedAdResult {
  placement: RewardedAdPlacement;
  status: RewardedAdStatus;
  /** Strictly true ONLY when a real ad SDK confirms full completion */
  granted: boolean;
  message: string;
}

export interface RewardedAdProvider {
  readonly providerName: string;
  isAvailable(placement: RewardedAdPlacement): boolean;
  showRewardedAd(placement: RewardedAdPlacement): Promise<RewardedAdResult>;
}

export interface RewardedAdOffer {
  placement: RewardedAdPlacement;
  headline: string;
  rewardLabel: string;
  coinAlternativeCost: number;
}

export const REWARDED_AD_OFFERS: Record<RewardedAdPlacement, RewardedAdOffer> = {
  free_hint: {
    placement: 'free_hint',
    headline: 'Need a little help?',
    rewardLabel: '1 Free Hint',
    coinAlternativeCost: 20,
  },
  bonus_coins: {
    placement: 'bonus_coins',
    headline: 'Want extra Fish Coins?',
    rewardLabel: '+30 Fish Coins',
    coinAlternativeCost: 0,
  },
  extra_undo: {
    placement: 'extra_undo',
    headline: 'Need a Heart Refill?',
    rewardLabel: '1 Heart Refill',
    coinAlternativeCost: 25,
  },
  daily_bonus: {
    placement: 'daily_bonus',
    headline: 'Bonus Fish Coins?',
    rewardLabel: '+30 Fish Coins',
    coinAlternativeCost: 0,
  },
  booster_pack: {
    placement: 'booster_pack',
    headline: 'Stock Up for Tough Grids?',
    rewardLabel: '1 Mistake Shield',
    coinAlternativeCost: 30,
  },
  challenge_retry: {
    placement: 'challenge_retry',
    headline: 'Try Again Fresh?',
    rewardLabel: '1 Free Super Hint',
    coinAlternativeCost: 35,
  },
};

class PlaceholderRewardedAdProvider implements RewardedAdProvider {
  public readonly providerName = 'PlaceholderAdProvider';

  public isAvailable(_placement: RewardedAdPlacement): boolean {
    return false;
  }

  public async showRewardedAd(
    placement: RewardedAdPlacement
  ): Promise<RewardedAdResult> {
    return {
      placement,
      status: 'NOT_IMPLEMENTED',
      granted: false,
      message: i18n.t('ads.notImplementedMsg'),
    };
  }
}

let activeProvider: RewardedAdProvider = new PlaceholderRewardedAdProvider();

export const rewardedAdService = {
  setProvider(provider: RewardedAdProvider): void {
    activeProvider = provider;
  },
  getProviderName(): string {
    return activeProvider.providerName;
  },
  isAvailable(placement: RewardedAdPlacement): boolean {
    return activeProvider.isAvailable(placement);
  },
  async requestReward(placement: RewardedAdPlacement): Promise<RewardedAdResult> {
    return activeProvider.showRewardedAd(placement);
  },
};
