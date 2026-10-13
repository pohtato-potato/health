import { addDays, dayRange, type DayKey } from './dates';
import { entryTime } from './foods';
import { foodDaysFor } from './logged';
import { MEALS, type Day, type FoodEntry, type Meal, type Targets } from './types';

export interface Budget {
  used: number;
  budget: number;
  left: number;
  /** What is left spread over the rest of the week, today included. */
  perDayLeft: number;
}

/**
 * The week's calories (against seven ceilings) and protein (against seven targets), so a big
 * Saturday and a lighter Monday balance out. Only complete or logged days use budget.
 */
export function weekBudget(targets: Targets, days: Map<DayKey, Pick<Day, 'foodDone'>>, entries: FoodEntry[], weekFrom: DayKey, today: DayKey): { kcal: Budget; protein: Budget } {
  const range = dayRange(weekFrom, addDays(weekFrom, 6));
  const { counted } = foodDaysFor(range, days, entries.filter((e) => e.date >= weekFrom && e.date <= range[6]));
  const take = new Set(counted);
  const mine = entries.filter((e) => take.has(e.date));
  const remaining = Math.max(1, range.filter((d) => d >= today).length);
  const make = (used: number, perDay: number): Budget => {
    const budget = perDay * 7;
    const left = budget - used;
    return { used: Math.round(used), budget, left: Math.round(left), perDayLeft: Math.round(left / remaining) };
  };
  return {
    kcal: make(mine.reduce((n, e) => n + e.kcal, 0), targets.kcalMax),
    protein: make(mine.reduce((n, e) => n + e.protein, 0), targets.proteinG),
  };
}

/** Protein by meal, in grams. */
export function proteinSpread(entries: Pick<FoodEntry, 'meal' | 'protein'>[]): Record<Meal, number> {
  const out = Object.fromEntries(MEALS.map((m) => [m, 0])) as Record<Meal, number>;
  for (const e of entries) out[e.meal] += e.protein;
  for (const m of MEALS) out[m] = Math.round(out[m] * 10) / 10;
  return out;
}

/** From this hour, protein counts as late. */
export const LATE_PROTEIN_HOUR = 21;

/** True when more than half the day's protein was eaten after 21:00. */
export function lateHeavy(entries: Pick<FoodEntry, 'protein' | 'at' | 'eatenAt'>[]): boolean {
  const total = entries.reduce((n, e) => n + e.protein, 0);
  if (total <= 0) return false;
  const late = entries.filter((e) => new Date(entryTime(e)).getHours() >= LATE_PROTEIN_HOUR).reduce((n, e) => n + e.protein, 0);
  return late / total > 0.5;
}
