import type { Status } from './types';

/** What the one lit card on Today shows. */
export type MomentKind = 'rest' | 'closed' | 'morning' | 'perfect' | 'close' | 'protein' | 'steps' | 'glance';

export interface MomentInput {
  /** Log-day minutes: 00:30 is 1470, because until 04:00 it is still the evening before. */
  minutes: number;
  status?: Status;
  morningDone: boolean;
  perfect: boolean;
  dayClosed: boolean;
  proteinGapG: number;
  stepsLeft: number;
}

const H = 60;
const REST: Status[] = ['sick', 'injured', 'break'];

/** Minutes since midnight on the log day: before 04:00 counts on from the evening before. */
export function logMinutes(now: number): number {
  const d = new Date(now);
  const m = d.getHours() * H + d.getMinutes();
  return m < 4 * H ? m + 24 * H : m;
}

/** The first matching rule wins: rest, closed, morning, perfect, close, protein, steps, else the glance. */
export function momentFor(i: MomentInput): MomentKind {
  const m = i.minutes;
  if (i.status && REST.includes(i.status)) return 'rest';
  if (i.dayClosed) return 'closed';
  if (!i.morningDone && m < 14 * H) return 'morning';
  if (i.perfect && m >= 19 * H) return 'perfect';
  if (m >= 21 * H) return 'close';
  if (m >= 19 * H && i.proteinGapG > 0) return 'protein';
  if (m >= 11 * H && m < 19 * H && i.stepsLeft > 0) return 'steps';
  return 'glance';
}
