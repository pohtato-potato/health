import { fmtKg } from './loads';
import { valueOfSet } from './plan';
import type { LoadUnit, SetEntry } from './types';

/** A load in words: "10 kg", or for gym kit by its unit: "4 plates", "stack 7 lb", "assist 25 kg". */
export function loadWords(kg: number, unit?: LoadUnit): string {
  const n = fmtKg(kg);
  switch (unit) {
    case 'lb':
      return `stack ${n} lb`;
    case 'stack':
      return `stack ${n}`;
    case 'plates':
      return `${n} plate${kg === 1 ? '' : 's'}`;
    case 'assist-kg':
      return `assist ${n} kg`;
    case 'assist-lb':
      return `assist ${n} lb`;
    case 'assist-stack':
      return `assist ${n}`;
    default:
      return `${n} kg`;
  }
}

/** A set in words, as records show it: "10 kg × 12", "12" for bodyweight, "45 s" for a timed set. */
export function fmtSet(s: SetEntry): string {
  return `${s.loadKg !== null ? `${loadWords(s.loadKg, s.loadUnit)} × ` : ''}${valueOfSet(s) ?? 0}${s.seconds !== undefined && s.reps === undefined ? ' s' : ''}`;
}
