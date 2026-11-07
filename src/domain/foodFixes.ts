import { per100FromTotal, valuesFor } from './foods';
import type { Food, FoodEntry } from './types';

/**
 * Corrections to saved foods, sent as a small file (by the coach, say). The app offers each one
 * once: the food changes only on Use it, and past entries only on a second yes. The numbers live
 * in the file, never in the app.
 */
export const FOOD_FIX_FORMAT = 'health-food-fixes';

export interface FoodFix {
  /** Stable, so a fix is offered once however often the file is opened. */
  id: string;
  /** The saved food's name, matched ignoring case. */
  food: string;
  /** The amount the numbers are for: 100 for a label, 300 for "a 300 g serving". */
  per: number;
  kcal: number;
  protein: number;
  /** For meat: the numbers are for raw or cooked weight. */
  weighed?: 'raw' | 'cooked';
  /** Replaces the food's note, e.g. "raw". */
  note?: string;
  /** Why, in a line. */
  why?: string;
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** The fixes in a file, or what's wrong with it. */
export function parseFoodFixes(raw: unknown): FoodFix[] | string {
  const f = raw as { format?: unknown; fixes?: unknown };
  if (!f || typeof f !== 'object' || f.format !== FOOD_FIX_FORMAT) return 'This isn’t a food fix file.';
  if (!Array.isArray(f.fixes) || !f.fixes.length) return 'The file has no fixes in it.';
  const out: FoodFix[] = [];
  for (const x of f.fixes as Record<string, unknown>[]) {
    if (typeof x?.id !== 'string' || typeof x.food !== 'string' || !x.food.trim()) return 'A fix is missing its id or food name.';
    if (!isNum(x.per) || x.per <= 0 || !isNum(x.kcal) || x.kcal < 0 || !isNum(x.protein) || x.protein < 0) return `The numbers for ${x.food} don’t add up.`;
    out.push({
      id: x.id,
      food: x.food.trim(),
      per: x.per,
      kcal: x.kcal,
      protein: x.protein,
      weighed: x.weighed === 'raw' || x.weighed === 'cooked' ? x.weighed : undefined,
      note: typeof x.note === 'string' ? x.note : undefined,
      why: typeof x.why === 'string' ? x.why : undefined,
    });
  }
  return out;
}

/** The saved food a fix is for: the same name, ignoring case and archived foods. */
export function findFoodFor(fix: FoodFix, foods: Food[]): Food | undefined {
  const want = fix.food.toLowerCase();
  return foods.find((f) => !f.archived && f.name.trim().toLowerCase() === want);
}

/** The food with the fix in: gram and ml foods keep per 100, with a per-serving fix divided down. */
export function fixFood(food: Food, fix: FoodFix): Food {
  const byWeight = food.unit === 'g' || food.unit === 'ml';
  const nums = byWeight ? per100FromTotal(fix.per, fix.kcal, fix.protein)! : { kcal: fix.kcal, protein: fix.protein };
  return {
    ...food,
    per: byWeight ? 100 : food.per,
    ...nums,
    // A fix for a set serving ("per 300 g") makes that serving the usual amount.
    defaultAmount: byWeight && fix.per !== 100 ? fix.per : food.defaultAmount,
    ...(fix.weighed ? { weighed: fix.weighed } : {}),
    ...(fix.note !== undefined ? { note: fix.note || undefined } : {}),
  };
}

/** Each past entry of the food that would change at the new numbers. Entries with their own numbers keep them. */
export function pastEntryFixes(entries: FoodEntry[], food: Food): { id: string; kcal: number; protein: number; was: { kcal: number; protein: number } }[] {
  return entries
    .filter((e) => e.foodId === food.id && e.kind === 'food' && !e.own && e.amount !== undefined)
    .map((e) => ({ id: e.id, ...valuesFor(food, e.amount!), was: { kcal: e.kcal, protein: e.protein } }))
    .filter((x) => x.kcal !== x.was.kcal || x.protein !== x.was.protein);
}
