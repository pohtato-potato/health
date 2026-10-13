/** Pure helpers behind the Wheel and Dial pickers. */

const decimalsOf = (n: number) => (String(n).split('.')[1] ?? '').length;

/** Snap to the nearest step counted from min, then clamp to [min, max]. */
export function dialSnap(value: number, step: number, min: number, max: number): number {
  const snapped = min + Math.round((value - min) / step) * step;
  const d = Math.max(decimalsOf(step), decimalsOf(min));
  const clean = Number(snapped.toFixed(d));
  return Math.min(max, Math.max(min, clean));
}

/** Index of the item equal to value, or for numbers the nearest one; ties go to the lower. -1 if empty. */
export function wheelIndexFor<T extends string | number>(value: T, items: readonly T[]): number {
  if (!items.length) return -1;
  const exact = items.indexOf(value);
  if (exact >= 0) return exact;
  if (typeof value !== 'number') return 0;
  let best = 0;
  items.forEach((it, i) => {
    if (Math.abs((it as number) - value) < Math.abs((items[best] as number) - value)) best = i;
  });
  return best;
}
