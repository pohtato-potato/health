// Office days are away games (matchday spec §5, d-office A, 12 Nov). Mark a day as an office day, or let the place
// do it. On an away day the missing morning weigh-in is expected, so Shape isn't fogged for it, and the Commuter
// player gets his game. The fixture's own home or away stays as it is (decision 9.6).
import { addDays, type DayKey } from './dates';
import { isOfficeDay } from './officeUsual';
import { placeFor } from './places';
import type { Day, Settings } from './types';

/** An away day for the Commuter: an office day (marked or by place) or a trip. A day unmarked by hand is never office. */
export function awayDay(day: Pick<Day, 'place' | 'home' | 'office' | 'placeChanges'> | undefined, settings: Pick<Settings, 'places'>): boolean {
  if (isOfficeDay(day, settings.places ?? [])) return true;
  const k = placeFor(day, settings).kind;
  return k === 'trip' || (k === 'office' && day?.office !== false);
}

/** Office days in the week to `date` with no weigh-in: each counts as weighed for Shape (expected, not missed). */
export function excusedWeighIns(days: Iterable<Pick<Day, 'date' | 'weightKg' | 'place' | 'home' | 'office'>>, date: DayKey, settings: Pick<Settings, 'places'>): number {
  const from = addDays(date, -7);
  let n = 0;
  for (const d of days) if (d.date > from && d.date <= date && d.weightKg == null && isOfficeDay(d, settings.places ?? [])) n++;
  return n;
}
