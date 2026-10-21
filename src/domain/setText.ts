import { fmtKg } from './loads';
import { valueOfSet } from './plan';
import type { SetEntry } from './types';

/** A set in words, as records show it: "10 kg × 12", "12" for bodyweight, "45 s" for a timed set. */
export function fmtSet(s: SetEntry): string {
  return `${s.loadKg !== null ? `${fmtKg(s.loadKg)} kg × ` : ''}${valueOfSet(s) ?? 0}${s.seconds !== undefined && s.reps === undefined ? ' s' : ''}`;
}
