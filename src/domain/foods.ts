import { fmtInt } from './format';
import { atOn, type DayKey } from './dates';
import { homePlace } from './places';
import type { Food, FoodEntry, Meal, MealTimes, Place, Settings } from './types';

export function valuesFor(food: Food, amount: number): { kcal: number; protein: number } {
  const f = amount / (food.per || 1);
  return { kcal: Math.round(food.kcal * f), protein: Math.round(food.protein * f * 10) / 10 };
}

const num = (n: number) => (Number.isInteger(n) ? fmtInt(n) : String(Math.round(n * 100) / 100));

/** "125 g, cooked", "2 pieces", "2 roti, 1 katori dal", "1.5 × (1 scoop, 1 glass milk)". */
export function portionFor(food: Food, amount: number): string {
  let text: string;
  switch (food.unit) {
    case 'g':
      text = `${num(amount)} g`;
      break;
    case 'ml':
      text = `${num(amount)} ml`;
      break;
    case 'piece': {
      const one = food.unitName ?? 'piece';
      const many = food.unitPlural ?? `${one}s`;
      text = `${num(amount)} ${amount === 1 ? one : many}`;
      break;
    }
    case 'serving':
      if (food.servingDesc) text = amount === 1 ? food.servingDesc : `${num(amount)} × (${food.servingDesc})`;
      else text = `${num(amount)} ${amount === 1 ? 'serving' : 'servings'}`;
      break;
  }
  return food.note ? `${text}, ${food.note}` : text;
}

export function unitLabel(food: Food, amount: number): string {
  if (food.unit === 'g') return 'g';
  if (food.unit === 'ml') return 'ml';
  if (food.unit === 'piece') return amount === 1 ? food.unitName ?? 'piece' : food.unitPlural ?? `${food.unitName ?? 'piece'}s`;
  return amount === 1 ? 'serving' : 'servings';
}

export function stepFor(food: Food): number {
  if (food.step) return food.step;
  if (food.unit === 'g' || food.unit === 'ml') return food.per >= 100 ? 25 : 5;
  return food.unit === 'piece' ? 1 : 0.5;
}

/** The meal a new entry probably belongs to, from the clock. */
export function mealForTime(d: Date = new Date()): Meal {
  const h = d.getHours() + d.getMinutes() / 60;
  // Before 4 am it's still the night before: a late bite belongs with dinner.
  if (h < 4) return 'dinner';
  if (h < 11) return 'breakfast';
  if (h < 15.5) return 'lunch';
  if (h < 19) return 'snacks';
  return 'dinner';
}

/** How often each food has been logged, most recent first when tied. */
export function usageOf(entries: FoodEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) if (e.foodId) m.set(e.foodId, (m.get(e.foodId) ?? 0) + 1);
  return m;
}

export function recentFoodIds(entries: FoodEntry[], limit = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of [...entries].sort((a, b) => b.at - a.at)) {
    if (!e.foodId || seen.has(e.foodId)) continue;
    seen.add(e.foodId);
    out.push(e.foodId);
    if (out.length >= limit) break;
  }
  return out;
}

export interface DrinkType {
  id: string;
  name: string;
  measure: string;
  kcal: number;
  /** Standard drinks of 10 g of alcohol. */
  std: number;
}

/** Rough calories for common drinks, in the measures they come in here. */
export const DRINKS: DrinkType[] = [
  { id: 'beer', name: 'Beer', measure: '650 ml bottle', kcal: 290, std: 2.6 },
  { id: 'beer-pint', name: 'Beer', measure: '330 ml can', kcal: 150, std: 1.3 },
  { id: 'whisky', name: 'Whisky or rum', measure: '30 ml peg', kcal: 70, std: 1 },
  { id: 'vodka', name: 'Vodka or gin', measure: '30 ml peg', kcal: 65, std: 1 },
  { id: 'wine', name: 'Wine', measure: '150 ml glass', kcal: 120, std: 1.4 },
  { id: 'mixer', name: 'Cola mixer', measure: '200 ml', kcal: 90, std: 0 },
];

export interface FreeMealSize {
  id: string;
  name: string;
  kcal: number;
  hint: string;
}

export const FREE_MEAL_SIZES: FreeMealSize[] = [
  { id: 'small', name: 'Small', kcal: 600, hint: 'A burger, or a couple of slices' },
  { id: 'big', name: 'Big', kcal: 1000, hint: 'A full restaurant meal' },
  { id: 'feast', name: 'Feast', kcal: 1500, hint: 'Buffet, biryani and dessert' },
];

/**
 * Calories saved for the free meal this week: on each finished day that landed
 * in range, the room left under the ceiling. Days under the floor add nothing,
 * so eating too little never counts as saving.
 */
export function savedThisWeek(days: { date: string; kcal: number; logged: boolean; free: boolean; kcalMin: number; kcalMax: number }[]): number {
  let saved = 0;
  for (const d of days) {
    if (!d.logged || d.free || d.kcal < d.kcalMin) continue;
    saved += Math.max(0, d.kcalMax - d.kcal);
  }
  return Math.round(saved / 10) * 10;
}

/** Meal times for a place. Trips and friends' places keep home's rhythm. */
export function mealTimesFor(settings: Pick<Settings, 'places'>, place: Place): MealTimes {
  if (place.kind === 'home' || place.kind === 'office') return place.meals;
  return homePlace(settings).meals;
}

/** How close to a meal's time "now" still counts as eating it live. */
const LIVE_WINDOW_MS = 90 * 60_000;

/**
 * When a meal was eaten: now, if now is within 90 minutes of the meal's time on that date;
 * otherwise that date at the meal's time. Logging yesterday's dinner after midnight stays on yesterday.
 */
export function eatenAtFor(date: DayKey, meal: Meal, place: Place, settings: Pick<Settings, 'places'>, now = Date.now()): number {
  const planned = atOn(date, mealTimesFor(settings, place)[meal]);
  return Math.abs(now - planned) <= LIVE_WINDOW_MS ? now : planned;
}

/** The time an entry belongs to on the timeline. */
export function entryTime(e: Pick<FoodEntry, 'at' | 'eatenAt'>): number {
  return e.eatenAt ?? e.at;
}
