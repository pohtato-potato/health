import type { DayKey } from './dates';

/**
 * The monthly check-in falls on a fixed day of the month. It is due from that day until a
 * check-in has been done on or after it; before the day, last month's still counts.
 */
export function checkInDue(today: DayKey, day: number, lastCheckIn: DayKey | undefined): boolean {
  const [y, m, d] = today.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const thisMonth = `${y}-${pad(m)}-${pad(day)}`;
  const prev = m === 1 ? `${y - 1}-12-${pad(day)}` : `${y}-${pad(m - 1)}-${pad(day)}`;
  const since = d >= day ? thisMonth : prev;
  return !lastCheckIn || lastCheckIn < since;
}
