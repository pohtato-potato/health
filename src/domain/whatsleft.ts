import { fmtInt } from './format';
import type { Totals } from './rings';
import type { Food, Targets } from './types';
import { portionFor, valuesFor } from './foods';

export interface Room {
  /** Calories still needed to reach the floor. Negative once past it. */
  kcalLo: number;
  /** Calories left before the ceiling. Infinite on a free-meal day. */
  kcalHi: number;
  protein: number;
}

export function roomLeft(t: Totals, targets: Targets): Room {
  return {
    kcalLo: targets.kcalMin - t.kcal,
    kcalHi: (t.freeMeal ? Infinity : targets.kcalMax) - t.kcal,
    protein: Math.max(0, targets.proteinG - t.protein),
  };
}

export interface FitItem {
  food: Food;
  amount: number;
  portion: string;
  kcal: number;
  protein: number;
}

export interface Fit {
  items: FitItem[];
  kcal: number;
  protein: number;
  inRange: boolean;
  closesProtein: boolean;
  why: string;
}

/**
 * Suggests one to three of your own saved foods, at their usual portions, that
 * land you in your calorie range and close protein. Never suggests going over.
 */
export function bestFits(
  foods: Food[],
  room: Room,
  totals: Totals,
  targets: Targets,
  opts: { max?: number; home?: string; usage?: Map<string, number> } = {},
): Fit[] {
  const usage = opts.usage ?? new Map<string, number>();
  const pool = foods
    .filter((f) => !f.archived)
    .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.name.localeCompare(b.name))
    .slice(0, 14)
    .map((food) => ({ food, amount: food.defaultAmount, portion: portionFor(food, food.defaultAmount), ...valuesFor(food, food.defaultAmount) }));

  const combos: FitItem[][] = [];
  for (let i = 0; i < pool.length; i++) {
    combos.push([pool[i]]);
    for (let j = i + 1; j < pool.length; j++) {
      combos.push([pool[i], pool[j]]);
      for (let k = j + 1; k < pool.length; k++) combos.push([pool[i], pool[j], pool[k]]);
    }
  }

  const scored = combos
    .map((items) => {
      const kcal = items.reduce((s, x) => s + x.kcal, 0);
      const protein = items.reduce((s, x) => s + x.protein, 0);
      return { items, kcal, protein };
    })
    .filter((c) => c.kcal <= room.kcalHi)
    .map((c) => {
      const kcalShort = Math.max(0, room.kcalLo - c.kcal);
      const proteinShort = Math.max(0, room.protein - c.protein);
      let score = kcalShort + proteinShort * 10 + (c.items.length - 1) * 40;
      for (const it of c.items) {
        if (it.food.home && opts.home && it.food.home !== opts.home) score += 200;
        if (it.food.home && it.food.home === opts.home) score -= 30;
      }
      return { ...c, score, inRange: c.kcal >= room.kcalLo, closesProtein: c.protein >= room.protein };
    })
    .sort((a, b) => a.score - b.score);

  const max = opts.max ?? 4;
  const picked = scored.slice(0, max);
  const densest = pool.length ? pool.reduce((a, b) => (b.protein / Math.max(b.kcal, 1) > a.protein / Math.max(a.kcal, 1) ? b : a)) : undefined;
  return picked.map((c) => ({
    items: c.items,
    kcal: Math.round(c.kcal),
    protein: Math.round(c.protein),
    inRange: c.inRange,
    closesProtein: c.closesProtein,
    why: whyText(c, room, totals, targets, c.items.length === 1 && c.items[0].food.id === densest?.food.id),
  }));
}

function whyText(
  c: { kcal: number; protein: number; inRange: boolean; closesProtein: boolean },
  room: Room,
  totals: Totals,
  targets: Targets,
  densest: boolean,
): string {
  const endKcal = Math.round(totals.kcal + c.kcal);
  const proteinLeft = Math.round(room.protein - c.protein);
  const kcalShort = Math.round(room.kcalLo - c.kcal);
  if (c.inRange && c.closesProtein) {
    const past = Math.round(totals.protein + c.protein) - targets.proteinG;
    return `You'd finish on ${fmtInt(endKcal)} kcal, inside your range, with protein ${past <= 3 ? `right at ${targets.proteinG} g` : `past ${targets.proteinG} g`}.`;
  }
  if (c.closesProtein) {
    const exact = -proteinLeft <= 3 ? 'Closes protein exactly.' : 'Closes protein.';
    return `${exact} Calories stop ${fmtInt(kcalShort)} short of your range.`;
  }
  if (densest) return 'The most protein per calorie in your list.';
  if (c.inRange) return `Lands in your calorie range. Leaves ${proteinLeft} g of protein open.`;
  return `Leaves ${proteinLeft} g of protein open.`;
}
