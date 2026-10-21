import { addDays, type DayKey } from './dates';
import type { Food, FoodEntry, Meal } from './types';

const WINDOW_DAYS = 60;
const MIN_AT_MEAL = 3;

const inWindow = (e: FoodEntry, today: DayKey) => e.date > addDays(today, -WINDOW_DAYS) && e.date <= today;
const isFood = (e: FoodEntry): e is FoodEntry & { foodId: string; amount: number } => e.kind === 'food' && !!e.foodId && typeof e.amount === 'number';

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * The portion the owner usually eats of a food at a meal: the median over the last 60 days when it was logged
 * there at least 3 times, else the most recent amount at any meal, else the food's default.
 */
export function usualPortion(entries: FoodEntry[], food: Food, meal: Meal, today: DayKey): number {
  const mine = entries.filter(isFood).filter((e) => e.foodId === food.id);
  const atMeal = mine.filter((e) => e.meal === meal && inWindow(e, today));
  if (atMeal.length >= MIN_AT_MEAL) return median(atMeal.map((e) => e.amount));
  const latest = mine.filter((e) => e.date <= today).sort((a, b) => b.at - a.at)[0];
  return latest ? latest.amount : food.defaultAmount;
}

/** The foods logged most often at a meal over the last 60 days (ties to the most recent), with their usual portion. */
export function usualFoods(entries: FoodEntry[], foods: Food[], meal: Meal, today: DayKey, limit = 6): { food: Food; amount: number }[] {
  const byId = new Map(foods.filter((f) => !f.archived).map((f) => [f.id, f]));
  const stats = new Map<string, { count: number; last: number }>();
  for (const e of entries.filter(isFood)) {
    if (e.meal !== meal || !inWindow(e, today) || !byId.has(e.foodId)) continue;
    const s = stats.get(e.foodId) ?? { count: 0, last: 0 };
    stats.set(e.foodId, { count: s.count + 1, last: Math.max(s.last, e.at) });
  }
  return [...stats.entries()]
    .sort(([, a], [, b]) => b.count - a.count || b.last - a.last)
    .slice(0, limit)
    .map(([id]) => {
      const food = byId.get(id)!;
      return { food, amount: usualPortion(entries, food, meal, today) };
    });
}

/** Yesterday's entries at a meal, copied to today at the given time. `today` is the log day, so after midnight it is still the evening before. */
export function sameAsYesterday(entries: FoodEntry[], meal: Meal, today: DayKey, at: number): Omit<FoodEntry, 'id'>[] {
  const yesterday = addDays(today, -1);
  return entries
    .filter((e) => e.date === yesterday && e.meal === meal)
    .map(({ id: _id, ...rest }) => ({ ...rest, date: today, at }));
}
