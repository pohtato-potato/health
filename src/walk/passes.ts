import { addDays, type DayKey } from '../domain/dates';
import { e1rm } from '../domain/insights';
import { realSets } from '../domain/plan';
import type { SetEntry } from '../domain/types';
import { TOUR_ROUTE } from '../domain/walk';

const km = (name: string, back: number) => (TOUR_ROUTE.find((s) => s.name === name)?.km ?? 0) - back;

/**
 * Chapter 3's high passes. Each opens at a strength level (the strength index: per cent above
 * your first month); until then the walk waits at its foot. Training gets you over the mountains.
 */
export const PASSES = [
  { id: 'banihal', name: 'the Banihal pass', heightM: 2832, km: km('Srinagar', 110), need: 10 },
  { id: 'zoji', name: 'Zoji La', heightM: 3528, km: km('Srinagar', -100), need: 20 },
  { id: 'fotu', name: 'Fotu La', heightM: 4108, km: km('Leh', 130), need: 30 },
];

export type Pass = (typeof PASSES)[number];

export function passOpen(p: Pass, strengthIndex: number): boolean {
  return strengthIndex >= p.need;
}

/** How far the walk has really got: it stops at the foot of the first pass not yet open. */
export function effectiveKm(rawKm: number, strengthIndex: number): number {
  const closed = PASSES.find((p) => p.km < rawKm && !passOpen(p, strengthIndex));
  return closed ? closed.km : rawKm;
}

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

/** The best strength index reached on any training day so far: once a pass opens, it stays open. */
export function bestStrengthIndex(sets: SetEntry[], today: DayKey): number {
  const dates = [...new Set(realSets(sets).map((s) => s.date))].filter((d) => d <= today);
  return Math.max(strengthIndex(sets, today), ...dates.map((d) => strengthIndex(sets.filter((s) => s.date <= d), d)));
}
