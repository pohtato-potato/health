import { addDays, type DayKey } from './dates';
import type { Day } from './types';

/** The usual day's water: the median of the last 14 days with any logged, to the nearest 250 ml. */
export function usualWater(days: Pick<Day, 'date' | 'waterMl'>[], today: DayKey): number | undefined {
  const from = addDays(today, -14);
  const xs = days.filter((d) => d.date >= from && d.date < today && (d.waterMl ?? 0) > 0).map((d) => d.waterMl!).sort((a, b) => a - b);
  if (xs.length < 3) return undefined;
  const mid = xs.length % 2 ? xs[(xs.length - 1) / 2] : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2;
  return Math.round(mid / 250) * 250;
}
