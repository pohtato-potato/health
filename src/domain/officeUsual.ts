import { addDays, type DayKey } from './dates';
import type { Day, FoodEntry, Meal, Place } from './types';
import type { DraftEntry } from './usualDay';

/**
 * One tap for the office usual (y-office, 11 Nov). On an office day, a meal that came out the same on most recent
 * office days (the same foods, or the same typed items) is offered as one button on Today. Lunch first; breakfast
 * too when it repeats. Nothing is saved until tapped.
 */
export const OFFICE_LOOKBACK = 8;
/** At least this many office days with the meal logged, and the usual on more than half of them. */
export const OFFICE_MIN_DAYS = 2;

const sig = (xs: Pick<FoodEntry, 'foodId' | 'name' | 'kcal'>[]) => xs.map((e) => e.foodId ?? `${e.name.trim().toLowerCase()}|${Math.round(e.kcal)}`).sort().join('+');

/** An office day: marked by hand (d-office, matchday §5), else the day's place is an office. */
export function isOfficeDay(day: Pick<Day, 'place' | 'home' | 'office'> | undefined, places: Pick<Place, 'id' | 'kind'>[] = []): boolean {
  if (day?.office !== undefined) return day.office;
  const id = day?.place ?? day?.home;
  return !!id && places.some((p) => p.id === id && p.kind === 'office');
}

/** The usual for one meal on office days, from the last few office days before today. Empty when none repeats. */
export function officeUsual(meal: Meal, days: Map<DayKey, Pick<Day, 'place' | 'home' | 'office'>>, places: Pick<Place, 'id' | 'kind'>[], entries: FoodEntry[], today: DayKey): DraftEntry[] {
  const from = addDays(today, -7 * OFFICE_LOOKBACK);
  const byDate = new Map<DayKey, FoodEntry[]>();
  for (const e of entries) {
    if (e.meal !== meal || e.date >= today || e.date < from || e.kind === 'drink' || e.range) continue;
    if (!isOfficeDay(days.get(e.date), places)) continue;
    byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  }
  if (byDate.size < OFFICE_MIN_DAYS) return [];
  const count = new Map<string, { n: number; last: DayKey; xs: FoodEntry[] }>();
  for (const [date, xs] of byDate) {
    const k = sig(xs);
    const c = count.get(k) ?? { n: 0, last: '', xs };
    c.n++;
    if (date > c.last) { c.last = date; c.xs = xs; }
    count.set(k, c);
  }
  const best = [...count.values()].sort((a, b) => b.n - a.n || b.last.localeCompare(a.last))[0];
  if (!best || best.n < OFFICE_MIN_DAYS || best.n * 2 <= byDate.size) return [];
  return best.xs.map((e) => ({ meal, kind: e.kind, foodId: e.foodId, name: e.name, amount: e.amount, portion: e.portion, kcal: e.kcal, protein: e.protein }));
}
