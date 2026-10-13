import { fmtInt } from './format';
import { valuesFor } from './foods';
import type { Food, FoodEntry } from './types';

export interface GapPick {
  foodId: string;
  name: string;
  amount: number;
  proteinG: number;
  kcal: number;
}

/** From this hour the helper asks to close the day instead. */
export const CLOSE_THE_DAY_HOUR = 22;

/**
 * Which of the usual foods close today's protein gap, inside the calories left.
 * Only ever adds food. Ranked by protein per kcal, weighted by how often each is eaten.
 */
export function proteinGap(
  today: { protein: number; proteinTarget: number; kcal: number; kcalMax: number },
  foods: Food[],
  history: Pick<FoodEntry, 'foodId'>[],
  now: number,
  max = 2,
): { mode: 'gap' | 'close' | 'done'; gapG: number; picks: GapPick[] } {
  const gapG = Math.max(0, Math.round(today.proteinTarget - today.protein));
  if (new Date(now).getHours() >= CLOSE_THE_DAY_HOUR) return { mode: 'close', gapG, picks: [] };
  if (gapG <= 0) return { mode: 'done', gapG: 0, picks: [] };
  const eaten = new Map<string, number>();
  for (const e of history) if (e.foodId) eaten.set(e.foodId, (eaten.get(e.foodId) ?? 0) + 1);
  const ranked = foods
    .filter((f) => !f.archived && (eaten.get(f.id) ?? 0) > 0)
    .map((f) => ({ f, v: valuesFor(f, f.defaultAmount) }))
    .filter(({ v }) => v.protein > 0 && v.kcal > 0)
    .sort((a, b) => (b.v.protein / b.v.kcal) * Math.log2(1 + (eaten.get(b.f.id) ?? 0)) - (a.v.protein / a.v.kcal) * Math.log2(1 + (eaten.get(a.f.id) ?? 0)));
  let room = Math.max(0, today.kcalMax - today.kcal);
  // When one usual food closes the gap alone, the lightest such food is enough.
  const single = ranked.filter(({ v }) => v.protein >= gapG && v.kcal <= room).sort((a, b) => a.v.kcal - b.v.kcal)[0];
  if (single) return { mode: 'gap', gapG, picks: [{ foodId: single.f.id, name: single.f.name, amount: single.f.defaultAmount, proteinG: single.v.protein, kcal: single.v.kcal }] };
  let left = gapG;
  const picks: GapPick[] = [];
  for (const { f, v } of ranked) {
    if (picks.length >= max || left <= 0) break;
    if (v.kcal > room) continue;
    picks.push({ foodId: f.id, name: f.name, amount: f.defaultAmount, proteinG: v.protein, kcal: v.kcal });
    room -= v.kcal;
    left -= v.protein;
  }
  return { mode: 'gap', gapG, picks };
}

/** The pace the top-up assumes. */
const STEPS_PER_MIN = 100;

/** "3,200 to go, about a 30-minute walk." After 18:00 on eased days, when an hour's walk would do it. */
export function stepTopUp(t: { steps: number; goal: number; eased: boolean }, now: number): string | undefined {
  const left = t.goal - t.steps;
  if (!t.eased || left <= 0 || new Date(now).getHours() < 18) return undefined;
  const minutes = Math.max(5, Math.round(left / STEPS_PER_MIN / 5) * 5);
  if (minutes > 60) return undefined;
  return `${fmtInt(left)} to go, about a ${minutes}-minute walk.`;
}
