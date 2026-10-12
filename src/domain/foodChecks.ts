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

/**
 * A saved food that looks like the same thing under another spelling. Only genuinely close
 * names match: "Dal" does not match "Dal makhani", "Chiken breast" matches "Chicken breast".
 */
export function similarFood(name: string, foods: Food[]): Food | null {
  const n = normalise(name);
  if (!n) return null;
  for (const f of foods) {
    if (f.archived) continue;
    const m = normalise(f.name);
    if (!m) continue;
    if (n === m) return f;
    const [short, long] = n.length <= m.length ? [n, m] : [m, n];
    if (long.includes(short) && short.split(' ').length >= 2) return f;
    if (Math.min(n.length, m.length) >= 5 && levenshtein(n, m) <= 2) return f;
  }
  return null;
}
