import { addDays, dayRange, type DayKey } from './dates';
import type { CustomTrack, TrackValue } from './types';

/** Your own tracks: a number a day, a 1-to-5 scale, or a yes or no. */

export const KIND_NAMES: Record<CustomTrack['kind'], string> = {
  count: 'A number',
  scale: '1 to 5',
  yesno: 'Yes or no',
};

/** Whether a day's value counts as a good one. */
export function meets(t: CustomTrack, v: number): boolean {
  if (t.kind === 'yesno') return t.lowerIsBetter ? v === 0 : v === 1;
  if (t.target === undefined) return t.kind === 'scale' ? v >= 4 : v > 0;
  return t.lowerIsBetter ? v <= t.target : v >= t.target;
}

export function fmtTrackValue(t: CustomTrack, v: number): string {
  if (t.kind === 'yesno') return v ? 'Yes' : 'No';
  if (t.kind === 'scale') return `${v} / 5`;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}${t.unit ? ` ${t.unit}` : ''}`;
}

export interface TrackStats {
  today?: number;
  /** One value per day, oldest first, null when nothing was logged. */
  series: (number | null)[];
  avg7?: number;
  logged7: number;
  hit7: number;
  /** Good days in a row, ending today or yesterday. */
  streak: number;
}

export function trackStats(t: CustomTrack, values: TrackValue[], today: DayKey, days = 30): TrackStats {
  const byDate = new Map(values.filter((v) => v.trackId === t.id).map((v) => [v.date, v.value]));
  const range = dayRange(addDays(today, -(days - 1)), today);
  const week = dayRange(addDays(today, -6), today)
    .map((d) => byDate.get(d))
    .filter((v): v is number => v !== undefined);
  let streak = 0;
  // Today only breaks nothing until it's logged.
  let d = byDate.has(today) ? today : addDays(today, -1);
  while (byDate.has(d) && meets(t, byDate.get(d)!)) {
    streak++;
    d = addDays(d, -1);
  }
  return {
    today: byDate.get(today),
    series: range.map((x) => byDate.get(x) ?? null),
    avg7: week.length ? week.reduce((a, b) => a + b, 0) / week.length : undefined,
    logged7: week.length,
    hit7: week.filter((v) => meets(t, v)).length,
    streak,
  };
}
