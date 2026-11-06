// Physio and discipline (spec §8.3), and day statuses (§8.4).
import { addDays, type DayKey } from '../domain/dates';
import type { Status } from '../domain/types';
import { AXES, allAxes, clamp, type AxisValues, type Mod } from './types';

export interface MedDay { date: DayKey; allTaken: boolean }
/** Consecutive missed medicine days ending on `end`. */
function runEndingOn(days: Map<DayKey, boolean>, end: DayKey): number {
  let n = 0;
  for (let d = end; days.get(d) === false; d = addDays(d, -1)) n++;
  return n;
}
/**
 * Knocks for the match on `date`, from the medicine days before it.
 * One missed day: a knock, −2 Rest next match. Two in a row: an injury, −4 Rest for two matches
 * (three in a row with the physio room).
 */
export function physio(medDays: MedDay[], date: DayKey, physioRoom: boolean): { state: 'fit' | 'knock' | 'injury'; mods: Mod[] } {
  const m = new Map(medDays.map((d) => [d.date, d.allTaken]));
  const thr = physioRoom ? 3 : 2;
  const y1 = addDays(date, -1), y2 = addDays(date, -2);
  if (runEndingOn(m, y1) >= thr || runEndingOn(m, y2) >= thr) return { state: 'injury', mods: [{ axis: 'Rest', d: -4, why: 'Injury', kind: 'knock' }] };
  if (m.get(y1) === false) return { state: 'knock', mods: [{ axis: 'Rest', d: -2, why: 'Knock', kind: 'knock' }] };
  return { state: 'fit', mods: [] };
}
/** A night out the day before is a yellow card; two within 14 days make a red: Rest plays at half value. */
export function cards(nightOuts: DayKey[], date: DayKey): { yellow: boolean; red: boolean } {
  const y = addDays(date, -1);
  const yellow = nightOuts.includes(y);
  const red = yellow && nightOuts.some((d) => d !== y && d < y && d >= addDays(y, -13));
  return { yellow, red };
}
export const redCardMod = (rest: number): Mod => ({ axis: 'Rest', d: -Math.ceil(rest / 2), why: 'Red card', kind: 'card' });

/** The rotation shape: the 28-day median on each axis, minus 2. */
export function rotationShape(last28: AxisValues[]): AxisValues {
  if (!last28.length) return allAxes(8);
  const out = {} as AxisValues;
  for (const a of AXES) {
    const xs = last28.map((v) => v[a]).sort((x, y) => x - y);
    const mid = xs.length >> 1;
    const med = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
    out[a] = clamp(Math.round(med - 2), 1, 20);
  }
  return out;
}
/** Sick, injured, a break or an occasion: the Rotation XI plays. Travelling changes nothing. */
export const usesRotation = (s?: Status) => s === 'sick' || s === 'injured' || s === 'break' || s === 'occasion';
