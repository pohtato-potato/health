import { addDays, type DayKey } from './dates';
import type { Day } from './types';

const SLOT = 15;
/** Each night is read from 18:00 the evening before to 18:00 on the day. */
const START = 18 * 60;
const SLOTS = (24 * 60) / SLOT;

/** Asleep or awake in each 15-minute slot of one night's window. */
function nightVector(sleep: { asleep: number; woke: number }): boolean[] {
  // Minutes from the window's start (18:00 the evening before).
  const from = (sleep.asleep - START + 1440) % 1440;
  const to = (sleep.woke - START + 1440) % 1440;
  return Array.from({ length: SLOTS }, (_, i) => {
    const t = i * SLOT;
    return from <= to ? t >= from && t < to : t >= from || t < to;
  });
}

/**
 * Sleep regularity, 0–100: how often you were in the same state (asleep or awake) at the same
 * clock time on consecutive days, sampled every 15 minutes over the last 7 nights. An
 * approximation of the Sleep Regularity Index from logged sleep and wake times only.
 */
export function sri(days: Pick<Day, 'date' | 'sleep'>[]): number | undefined {
  const byDate = new Map(days.filter((d) => d.sleep).map((d) => [d.date, nightVector(d.sleep!)]));
  const dates = [...byDate.keys()].sort().slice(-7);
  let same = 0;
  let total = 0;
  for (const d of dates) {
    const next = byDate.get(addDays(d, 1));
    if (!next) continue;
    const cur = byDate.get(d)!;
    for (let i = 0; i < SLOTS; i++) {
      total++;
      if (cur[i] === next[i]) same++;
    }
  }
  return total ? Math.round((same / total) * 100) : undefined;
}

const clock = (m: number) => {
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
const hours = (m: number) => (m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`);

/** "Asleep by 12:45 am keeps 7 h before tomorrow's 7:45 am." */
export function tonightTarget(wake: number, needMin: number): { asleepBy: number; text: string } {
  const asleepBy = (wake - needMin + 1440) % 1440;
  return { asleepBy, text: `Asleep by ${clock(asleepBy)} keeps ${hours(needMin)} before tomorrow’s ${clock(wake)}.` };
}

/** The usual wake time on days at this place: the median over the last four weeks. */
export function usualWake(days: Pick<Day, 'date' | 'place' | 'sleep'>[], place: string, today: DayKey): number | undefined {
  const from = addDays(today, -28);
  const wakes = days.filter((d) => d.date >= from && d.date < today && d.place === place && d.sleep).map((d) => d.sleep!.woke).sort((a, b) => a - b);
  if (!wakes.length) return undefined;
  const mid = Math.floor(wakes.length / 2);
  return wakes.length % 2 ? wakes[mid] : Math.round((wakes[mid - 1] + wakes[mid]) / 2);
}
