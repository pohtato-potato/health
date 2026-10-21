import { addDays, type DayKey } from './dates';
import { e1rm } from './insights';
import { realSets } from './plan';
import type { SetEntry } from './types';

/**
 * The strength index: for each lift, the best estimated one-rep max of the last two weeks
 * against the first month's, averaged and given as a per cent gain. 0 until there is both.
 */
export function strengthIndex(sets: SetEntry[], today: DayKey): number {
  const real = realSets(sets).filter((s) => s.loadKg && s.reps && !s.drop);
  if (!real.length) return 0;
  const first = real.reduce((m, s) => (s.date < m ? s.date : m), real[0].date);
  const early = addDays(first, 28);
  const recent = addDays(today, -14);
  const gains: number[] = [];
  for (const id of new Set(real.map((s) => s.exerciseId))) {
    const mine = real.filter((s) => s.exerciseId === id);
    const best = (xs: SetEntry[]) => Math.max(0, ...xs.map((s) => e1rm(s.loadKg!, s.reps!)));
    const a = best(mine.filter((s) => s.date < early));
    const b = best(mine.filter((s) => s.date >= recent && s.date >= early));
    if (a && b) gains.push(b / a - 1);
  }
  return gains.length ? Math.round((gains.reduce((x, y) => x + y, 0) / gains.length) * 100) : 0;
}
