import type { DayKey } from './dates';

export type RingKey = 'kcal' | 'protein' | 'steps' | 'sleep';
export type RingMoment = { kind: 'ring'; ring: RingKey } | { kind: 'perfect' };

const RINGS: RingKey[] = ['kcal', 'protein', 'steps', 'sleep'];
export const RING_WORD: Record<RingKey, string> = { kcal: 'Calories', protein: 'Protein', steps: 'Steps', sleep: 'Sleep' };
export const RING_INK: Record<RingKey, string> = { kcal: 'var(--kcal)', protein: 'var(--protein)', steps: 'var(--steps)', sleep: 'var(--sleep)' };

/** The key a moment is recorded under, so it plays once a day however often the page opens. */
export const ringMomentKey = (date: DayKey, what: RingKey | 'perfect') => `ringmoment:${date}:${what}`;

/**
 * The moments still owed today. The last ring closing makes the perfect day, which takes in any ring not yet
 * celebrated, so the two never play one after the other for the same ring.
 */
export function ringMomentsDue(date: DayKey, closed: Partial<Record<RingKey, boolean>>, seen: (key: string) => boolean, rings: RingKey[] = RINGS): RingMoment[] {
  if (rings.every((r) => closed[r])) return seen(ringMomentKey(date, 'perfect')) ? [] : [{ kind: 'perfect' }];
  return rings.filter((r) => closed[r] && !seen(ringMomentKey(date, r))).map((ring) => ({ kind: 'ring', ring }));
}

/** Everything a moment marks as played. */
export function ringMomentMarks(date: DayKey, m: RingMoment): string[] {
  return m.kind === 'perfect' ? [ringMomentKey(date, 'perfect'), ...RINGS.map((r) => ringMomentKey(date, r))] : [ringMomentKey(date, m.ring)];
}

/**
 * How many rings show gold. A playing perfect day counts them in itself; otherwise they stay plain until its moment
 * has been played, so a save that closes the last ring doesn't flash gold first. `played` is undefined while loading.
 */
export function ringsGold(i: { counting: number | null; perfect: boolean; played: boolean | undefined }): number {
  if (i.counting !== null) return i.counting;
  return i.perfect && i.played !== false ? RINGS.length : 0;
}
