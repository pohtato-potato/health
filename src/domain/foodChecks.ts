import { valuesFor } from './foods';
import type { Food } from './types';

/** A default portion above this asks "is that right?". */
export const LARGE_PORTION_KCAL = 800;
/** Pure fat is about 900 kcal per 100 g; nothing denser exists. */
export const MAX_KCAL_PER_100 = 900;

/** The default portion's calories, when they are large enough to double-check. */
export function portionWarning(food: Pick<Food, 'unit' | 'per' | 'kcal' | 'protein' | 'defaultAmount' | 'name'>): { kcal: number } | null {
  const { kcal } = valuesFor(food as Food, food.defaultAmount);
  return kcal > LARGE_PORTION_KCAL ? { kcal } : null;
}

/** True when a gram or millilitre food claims more energy than pure fat. */
export function impossibleDensity(food: Pick<Food, 'unit' | 'per' | 'kcal'>): boolean {
  if (food.unit !== 'g' && food.unit !== 'ml') return false;
  return (food.kcal / (food.per || 1)) * 100 > MAX_KCAL_PER_100;
}

const FILLER = new Set(['with', 'and', 'the']);

function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w))
    .join(' ');
}

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** Words too common to say two foods are the same thing on their own. */
const COMMON = new Set(['chicken', 'paneer', 'rice', 'water', 'milk', 'curry', 'masala', 'egg', 'eggs', 'roti', 'bread', 'fried', 'boiled', 'grilled', 'homemade', 'home', 'small', 'large', 'plain', 'sweet', 'salad', 'cooked', 'raw']);
const distinctive = (w: string) => w.length >= 4 && !COMMON.has(w);

/**
 * A saved food that looks like the same thing under another name: a near-identical spelling
 * ("Chiken breast"), one name inside the other ("Seekh" in "Chicken seekh kebab"), or two
 * names sharing a distinctive word plus another ("Asitis whey water", "Whey with water").
 * "Dal" does not match "Dal makhani": three letters say too little.
 */
export function similarFood(name: string, foods: Food[]): Food | null {
  const n = normalise(name);
  if (!n) return null;
  const nWords = n.split(' ');
  for (const f of foods) {
    if (f.archived) continue;
    const m = normalise(f.name);
    if (!m) continue;
    if (n === m) return f;
    const [short, long] = n.length <= m.length ? [n, m] : [m, n];
    if (long.includes(short) && short.split(' ').length >= 2) return f;
    if (Math.min(n.length, m.length) >= 5 && levenshtein(n, m) <= 2) return f;
    if (!short.includes(' ') && distinctive(short) && long.split(' ').includes(short)) return f;
    const shared = nWords.filter((w) => m.split(' ').includes(w));
    if (shared.length >= 2 && shared.some(distinctive)) return f;
  }
  return null;
}

/** Above this per 100 g, a salad, sabzi or dal is probably a typo or the wrong label. */
export const LIGHT_DISH_KCAL_PER_100 = 250;
const LIGHT_DISH = /\b(salad|sabzi|sabji|subzi|dal|daal|dhal|raita|soup)\b/i;

/** True for a light dish by name whose per-100 g calories look too high. */
export function lightDishWarning(food: Pick<Food, 'name' | 'unit' | 'per' | 'kcal'>): boolean {
  if (food.unit !== 'g' && food.unit !== 'ml') return false;
  return LIGHT_DISH.test(food.name) && (food.kcal / (food.per || 1)) * 100 > LIGHT_DISH_KCAL_PER_100;
}

const MEAT = /\b(chicken|mutton|lamb|goat|fish|prawns?|shrimp|keema|beef|pork|turkey|salmon|tuna|basa|meat)\b/i;

/** Meat weighed in grams: raw and cooked weights differ by about a quarter, so it matters which. */
export function isWeighedMeat(food: Pick<Food, 'name' | 'unit'>): boolean {
  return food.unit === 'g' && MEAT.test(food.name);
}

/** Cooked meat weighs about 75% of raw (water lost in cooking). */
export const COOKED_PER_RAW = 0.75;

/** The amount in the food's own basis, from what was weighed. 200 g raw of a cooked-basis food is 150 g. */
export function toFoodBasis(food: Pick<Food, 'weighed'>, grams: number, weighed: 'raw' | 'cooked'): number {
  if (!food.weighed || food.weighed === weighed) return grams;
  return Math.round(weighed === 'raw' ? grams * COOKED_PER_RAW : grams / COOKED_PER_RAW);
}

/** Two taps on the same food this close together ask "Add again?". */
export const DOUBLE_TAP_MS = 2 * 60_000;

/** The same food already logged on this date in the last two minutes, if any. */
export function recentTwin<T extends { date: string; at: number; foodId?: string; name: string }>(entries: T[], e: { date: string; foodId?: string; name: string }, now: number): T | undefined {
  return entries.find((x) => x.date === e.date && (e.foodId ? x.foodId === e.foodId : x.name === e.name) && Math.abs(now - x.at) < DOUBLE_TAP_MS);
}

/** Above this, a quick estimate with 0 g protein suggests "Not sure" instead. */
export const QUICK_PROTEIN_KCAL = 500;
