import type { SetEntry } from './types';

/** How good one set's effort was: 1–2 reps left is the target; all-out or very easy count less. */
function effortOf(rir: number | undefined): number {
  if (rir === undefined) return 0.7;
  if (rir === 1 || rir === 2) return 1;
  if (rir === 0 || rir === 3) return 0.7;
  return 0.4;
}

/**
 * A session's quality, 0–100: form (40 %), effort against the 1–2 reps-left target (30 %)
 * and completion (30 %). Skipped sets lower completion only; unrated sets count as middling.
 */
export function sessionQuality(sets: Pick<SetEntry, 'skipped' | 'drop' | 'form' | 'rir'>[]): number {
  const working = sets.filter((s) => !s.drop);
  if (!working.length) return 0;
  const done = working.filter((s) => !s.skipped);
  const completion = done.length / working.length;
  if (!done.length) return Math.round(30 * completion);
  const rated = done.filter((s) => s.form !== undefined);
  const form = rated.length ? rated.reduce((n, s) => n + s.form!, 0) / rated.length / 5 : 0.7;
  const effort = done.reduce((n, s) => n + effortOf(s.rir), 0) / done.length;
  return Math.round(100 * (0.4 * form + 0.3 * effort + 0.3 * completion));
}
