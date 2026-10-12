import { addDays, parseDay, type DayKey } from './dates';
import { valuesFor } from './foods';
import type { Day, Food, FoodEntry, Meal } from './types';

/** How far back "usual" looks. */
export const USUAL_WEEKS = 8;

/**
 * The foods usually eaten at this meal, best first: most often at the same place over
 * the last 8 weeks, then on the same weekday there, then anywhere, then most recent.
 */
export function usualsFor(
  meal: Meal,
  place: string,
  weekday: number,
  entries: Pick<FoodEntry, 'date' | 'meal' | 'foodId'>[],
  foods: Food[],
  days: Map<DayKey, Pick<Day, 'place' | 'home'>>,
  today: DayKey,
  limit = 6,
): Food[] {
  const from = addDays(today, -USUAL_WEEKS * 7);
  const byId = new Map(foods.filter((f) => !f.archived).map((f) => [f.id, f]));
  const score = new Map<string, { here: number; weekday: number; any: number; last: DayKey }>();
  for (const e of entries) {
    if (e.meal !== meal || !e.foodId || e.date < from || e.date > today || !byId.has(e.foodId)) continue;
    const d = days.get(e.date);
    const here = (d?.place ?? d?.home) === place;
    const s = score.get(e.foodId) ?? { here: 0, weekday: 0, any: 0, last: '' };
    s.any++;
    if (here) s.here++;
    if (here && parseDay(e.date).getDay() === weekday) s.weekday++;
    if (e.date > s.last) s.last = e.date;
    score.set(e.foodId, s);
  }
  return [...score.entries()]
    .sort(([, a], [, b]) => b.here - a.here || b.weekday - a.weekday || b.any - a.any || b.last.localeCompare(a.last))
    .slice(0, limit)
    .map(([id]) => byId.get(id)!);
}

export type Size = 's' | 'm' | 'l';
export const SIZE_NAMES: Record<Size, string> = { s: 'Small', m: 'Regular', l: 'Large' };

/** Calories and protein for an outside dish's size; sizes scale the usual amount. */
export function sizeValues(food: Food, size: Size): { kcal: number; protein: number } {
  return valuesFor(food, sizeAmount(food, size));
}

export function sizeAmount(food: Food, size: Size): number {
  return food.defaultAmount * (food.sizes?.[size] ?? 1);
}
