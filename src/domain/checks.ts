import type { ExerciseDef, FormCheck } from './plan';
import type { CheckMark, SetEntry } from './types';

/** The form points ticked after a set: the plan's own, at most six. None without them. */
export function checksFor(ex: Pick<ExerciseDef, 'checks'>): FormCheck[] {
  return ex.checks?.slice(0, 6) ?? [];
}

/** One tap: went well. Two: slipped. Three: unset again. */
export function cycleCheck(m: CheckMark | undefined): CheckMark | undefined {
  return m === undefined ? 'ok' : m === 'ok' ? 'slip' : undefined;
}

const count = (s: Pick<SetEntry, 'checks'>, m: CheckMark) => Object.values(s.checks ?? {}).filter((v) => v === m).length;
export const slipCount = (s: Pick<SetEntry, 'checks'>) => count(s, 'slip');
export const okCount = (s: Pick<SetEntry, 'checks'>) => count(s, 'ok');
