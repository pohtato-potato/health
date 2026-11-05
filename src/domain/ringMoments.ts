import type { DayKey } from './dates';

export type RingKey = 'kcal' | 'protein' | 'steps';
export type RingMoment = { kind: 'ring'; ring: RingKey } | { kind: 'perfect' };

const RINGS: RingKey[] = ['kcal', 'protein', 'steps'];
export const RING_WORD: Record<RingKey, string> = { kcal: 'Calories', protein: 'Protein', steps: 'Steps' };
export const RING_INK: Record<RingKey, string> = { kcal: 'var(--kcal)', protein: 'var(--protein)', steps: 'var(--steps)' };

/** The key a moment is recorded under, so it plays once a day however often the page opens. */
export const ringMomentKey = (date: DayKey, what: RingKey | 'perfect') => `ringmoment:${date}:${what}`;

/**
 * The moments still owed today. The last ring closing makes the perfect day, which takes in any ring not yet
 * celebrated, so the two never play one after the other for the same ring.
 */
export function ringMomentsDue(date: DayKey, closed: Record<RingKey, boolean>, seen: (key: string) => boolean): RingMoment[] {
  if (RINGS.every((r) => closed[r])) return seen(ringMomentKey(date, 'perfect')) ? [] : [{ kind: 'perfect' }];
  return RINGS.filter((r) => closed[r] && !seen(ringMomentKey(date, r))).map((ring) => ({ kind: 'ring', ring }));
}

/** Everything a moment marks as played. */
export function ringMomentMarks(date: DayKey, m: RingMoment): string[] {
  return m.kind === 'perfect' ? [ringMomentKey(date, 'perfect'), ...RINGS.map((r) => ringMomentKey(date, r))] : [ringMomentKey(date, m.ring)];
}
