/**
 * Single source of truth for campaign bonuses (#22). Map, Victory and the store import
 * these values; no literals elsewhere.
 */

/** Paid once per campaign level for a Classic solve with 0 hints and 0 mistakes (time ignored). */
export const PERFECT_LEVEL_BONUS_COINS = 10;

/** First clear (any mode) of these levels grants 1 extra Puzzle chest (#21). */
export const CAMPAIGN_CHEST_LEVELS = [5, 10, 15, 20] as const;

export function isCampaignChestLevel(levelId: number): boolean {
  return (CAMPAIGN_CHEST_LEVELS as readonly number[]).includes(levelId);
}

/** True when a finished campaign run earns the one-time perfect-level bonus. */
export function earnsPerfectLevelBonus(input: {
  isCampaign: boolean;
  isPractice: boolean;
  hintsUsed: number;
  mistakesCount: number;
  levelId: number;
  perfectBonusLevels: readonly number[];
}): boolean {
  return (
    input.isCampaign &&
    !input.isPractice &&
    input.hintsUsed === 0 &&
    input.mistakesCount === 0 &&
    !input.perfectBonusLevels.includes(input.levelId)
  );
}
