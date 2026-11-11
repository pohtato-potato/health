/**
 * A night out, item by item (round nine l-away; interview, 10 Nov). Each thing eaten out is light, medium or
 * heavy, and the app stores an honest range in place of a false exact number. The entry's kcal and protein are
 * the middle of the range, so rings and averages carry on as before; the range rides along on the entry.
 * Football plays Fuel on slightly wider dice on such a day, centred on the same value, so the odds stay honest.
 */
import type { FoodEntry, Targets } from './types';

export type OutSize = 'light' | 'medium' | 'heavy';
export interface Range { kcal: [number, number]; protein: [number, number] }

/** One plate, eaten out. Wide on purpose: restaurant food is a guess, and the guess is shown as one. */
export const OUT_SIZES: Record<OutSize, Range & { name: string; hint: string }> = {
  light: { name: 'Light', hint: 'A starter, a small plate, a side', kcal: [150, 350], protein: [5, 15] },
  medium: { name: 'Medium', hint: 'A normal main', kcal: [350, 700], protein: [15, 35] },
  heavy: { name: 'Heavy', hint: 'Rich, fried, or a big portion', kcal: [700, 1100], protein: [20, 45] },
};
export const OUT_ORDER: OutSize[] = ['light', 'medium', 'heavy'];

const mid = ([lo, hi]: [number, number]) => Math.round((lo + hi) / 2);

/** The entry fields for one item eaten out. */
export function outItem(name: string, size: OutSize): Pick<FoodEntry, 'name' | 'portion' | 'kcal' | 'protein' | 'range'> {
  const s = OUT_SIZES[size];
  return {
    name: name.trim() || 'Eaten out',
    portion: `${s.name}, ${s.kcal[0]}–${s.kcal[1]} kcal`,
    kcal: mid(s.kcal),
    protein: mid(s.protein),
    range: { size, kcal: [...s.kcal], protein: [...s.protein] },
  };
}

/** A day's totals as a range: exact entries add their own number to both ends. */
export function dayRange(entries: Pick<FoodEntry, 'kcal' | 'protein' | 'range'>[]): Range & { ranged: boolean } {
  const out: Range & { ranged: boolean } = { kcal: [0, 0], protein: [0, 0], ranged: false };
  for (const e of entries) {
    const k = e.range?.kcal ?? [e.kcal, e.kcal];
    const p = e.range?.protein ?? [e.protein, e.protein];
    out.kcal = [out.kcal[0] + k[0], out.kcal[1] + k[1]];
    out.protein = [out.protein[0] + p[0], out.protein[1] + p[1]];
    if (e.range) out.ranged = true;
  }
  return out;
}

/** Fuel's dice on a ranged day reach this far either side of the logged value: slightly wider, never more. */
export const SPREAD_MIN = 1;
export const SPREAD_MAX = 2;

/**
 * How far Fuel's dice reach either side, from how far apart the range's two ends score.
 * `score` is Football's own Fuel score (1–20). 0 when the day has no ranged entry.
 */
export function fuelSpread(r: Range & { ranged: boolean }, t: Targets, score: (kcal: number, protein: number, t: Targets) => number): number {
  if (!r.ranged) return 0;
  const a = score(r.kcal[0], r.protein[0], t);
  const b = score(r.kcal[1], r.protein[1], t);
  return Math.min(SPREAD_MAX, Math.max(SPREAD_MIN, Math.abs(a - b) / 2));
}
