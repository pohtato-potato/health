import { addDays, type DayKey } from './dates';
import type { Day } from './types';

/** The usual wake time: the median over the last 8 days, once there are at least 3 nights. */
export function usualWake(days: Day[], today: DayKey): number | undefined {
  const wakes = days
    .filter((d) => d.sleep && d.date > addDays(today, -8) && d.date <= today)
    .map((d) => d.sleep!.woke)
    .sort((a, b) => a - b);
  return wakes.length >= 3 ? wakes[Math.floor(wakes.length / 2)] : undefined;
}
