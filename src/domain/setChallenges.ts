import { CHALLENGE_IDS, CHALLENGE_NAMES, measureOf, type ExerciseDef } from './plan';
import type { SetEntry } from './types';

/** The twelve ways to make the same load harder (spec §5.5). */
export const CHALLENGES = CHALLENGE_IDS.map((id) => ({ id, name: CHALLENGE_NAMES[id] }));

/** "Shorter rest" cuts the rest by a third; otherwise the plan's rest. */
export function challengeRest(ex: Pick<ExerciseDef, 'restSec' | 'measure' | 'seconds'>, set: Pick<SetEntry, 'challenges'>): number {
  const base = ex.restSec ?? (measureOf(ex as ExerciseDef) === 'seconds' ? 60 : 90);
  return set.challenges?.includes('shorter-rest') ? Math.round((base * 2) / 3) : base;
}
