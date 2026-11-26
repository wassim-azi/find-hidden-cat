import type { TFunction } from 'i18next';
import type { BoosterId } from './economy';

/**
 * Generates a localized human-readable reward summary directly from coin and booster data.
 * Booster counts > 1 use `N × Name` to avoid language-specific plural errors.
 */
export function formatRewardLabel(
  coins: number,
  boosters: Partial<Record<BoosterId, number>> | undefined,
  t: TFunction,
  streakShields = 0
): string {
  const parts: string[] = [];

  if (boosters) {
    for (const [id, rawCount] of Object.entries(boosters)) {
      const count = typeof rawCount === 'number' ? Math.floor(rawCount) : 0;
      if (count <= 0) continue;
      const name = t(`shop.items.${id}.name`);
      parts.push(count > 1 ? `${count} × ${name}` : `1 ${name}`);
    }
  }

  if (coins > 0) {
    parts.push(t('dailyCalendar.coinsLabel', { count: Math.floor(coins) }));
  }

  if (streakShields > 0) {
    parts.push(t('common.shields', { count: Math.floor(streakShields) }));
  }

  return parts.join(' + ');
}
