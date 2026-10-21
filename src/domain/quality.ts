import type { ExerciseDef } from './plan';
import { okCount, slipCount } from './checks';
import type { SetEntry } from './types';

/** Form, 1 to 5. */
export const FORM_LABELS = ['sloppy', 'shaky', 'okay', 'solid', 'textbook'] as const;

export const FAULTS = [
  { id: 'rushed-lowering', name: 'Rushed lowering', cue: 'Lower for a slow three. Own the way down.' },
  { id: 'partial-range', name: 'Partial range', cue: 'Full range: all the way down, all the way up.' },
  { id: 'elbows-flared', name: 'Elbows flared', cue: 'Elbows in, about 45 degrees from your sides.' },
  { id: 'hips-shifted', name: 'Hips shifted', cue: 'Hips square. Brace before you move.' },
  { id: 'back-rounded', name: 'Back rounded', cue: 'Chest proud, back flat. Hinge from the hips.' },
  { id: 'knee-caved', name: 'Knee caved', cue: 'Knee tracks over the toes. Push the floor apart.' },
  { id: 'lost-balance', name: 'Lost balance', cue: 'Slow down and plant your feet. A hand on the wall is fine.' },
] as const;
export type FaultId = (typeof FAULTS)[number]['id'];

/** Form, 1 to 5: the old score where there is one, else the share of form checks that went well. */
export function formScore(s: Pick<SetEntry, 'form' | 'checks'>): 1 | 2 | 3 | 4 | 5 | undefined {
  if (s.form !== undefined) return s.form;
  const ok = okCount(s);
  const all = ok + slipCount(s);
  return all ? ((1 + Math.round((4 * ok) / all)) as 1 | 2 | 3 | 4 | 5) : undefined;
}

/** Textbook: scored 5, or every form check went well. */
export function isTextbook(s: Pick<SetEntry, 'form' | 'checks'>): boolean {
  return s.form === 5 || (s.form === undefined && okCount(s) > 0 && slipCount(s) === 0);
}

/** Reps that were clean before form slipped; all of them when not said. */
export function cleanOf(s: Pick<SetEntry, 'reps' | 'cleanReps'>): number {
  return s.cleanReps ?? s.reps ?? 0;
}

/** The fault seen most often across the last three sessions of this exercise. */
export function topFault(exerciseSets: Pick<SetEntry, 'sessionId' | 'at' | 'faults'>[]): FaultId | undefined {
  const order = [...new Set([...exerciseSets].sort((a, b) => b.at - a.at).map((s) => s.sessionId))].slice(0, 3);
  const recent = new Set(order);
  const counts = new Map<string, number>();
  for (const s of exerciseSets) if (recent.has(s.sessionId)) for (const f of s.faults ?? []) counts.set(f, (counts.get(f) ?? 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best && FAULTS.some((f) => f.id === best[0]) ? (best[0] as FaultId) : undefined;
}

/** Your one cue before a set: aimed at your most common fault, or the plan's own cue. */
export function cueFor(ex: Pick<ExerciseDef, 'cue'>, exerciseSets: Pick<SetEntry, 'sessionId' | 'at' | 'faults'>[]): string | undefined {
  const f = topFault(exerciseSets);
  return f ? FAULTS.find((x) => x.id === f)!.cue : ex.cue;
}
