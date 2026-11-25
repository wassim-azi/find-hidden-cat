/**
 * Returns the game's canonical weekly bucket key (`YYYY-WNN`) for a local Date:
 * Sunday-start weeks that reset on January 1.
 *
 * Shared by Golden Cat Trial seeding/saves and weekly event tracking.
 * Do NOT change this formula without migrating weekly event and Golden Cat keys.
 */
export function getWeekKey(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
