// An open session left quiet (finding 17, O42): after four hours with no set logged, the next open asks once whether
// to finish it with the sets logged, carry on, or throw it away. Until then its clock stops at the last set.
import type { SetEntry, TrainingSession } from './types';

export const QUIET_MS = 4 * 3_600_000;

/** When the session last moved: its newest set, or its start. */
export function lastMoved(s: Pick<TrainingSession, 'startedAt'>, sets: Pick<SetEntry, 'at'>[]): number {
  return sets.reduce((t, x) => Math.max(t, x.at), s.startedAt);
}
export const isQuiet = (s: Pick<TrainingSession, 'startedAt'>, sets: Pick<SetEntry, 'at'>[], now: number) => now - lastMoved(s, sets) >= QUIET_MS;
/** The session's clock: running, or stopped at the last set once it has been quiet four hours. */
export const sessionClock = (s: Pick<TrainingSession, 'startedAt'>, sets: Pick<SetEntry, 'at'>[], now: number) =>
  (isQuiet(s, sets, now) ? lastMoved(s, sets) : now) - s.startedAt;
/** Ask once per quiet spell: not again for the same last set once answered "carry on". */
export const askQuiet = (s: Pick<TrainingSession, 'startedAt' | 'quietAsked'>, sets: Pick<SetEntry, 'at'>[], now: number) =>
  isQuiet(s, sets, now) && s.quietAsked !== lastMoved(s, sets);
