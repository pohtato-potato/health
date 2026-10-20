import { musclesOf } from './muscles';
import { isPlaceholder, realSets, rotationOf, valueOfSet, type ExerciseDef, type PlanDef } from './plan';
import type { MuscleId, SetEntry, TrainingSession } from './types';

/** A set under this share of what it is compared with asks "Real set, or skip?". */
export const PLACEHOLDER_SHARE = 0.3;

export type MovementKind = 'legs' | 'push' | 'pull' | 'core';

const KIND_OF: Record<MuscleId, MovementKind> = {
  quads: 'legs', hamstrings: 'legs', glutes: 'legs', calves: 'legs',
  chest: 'push', 'front-delts': 'push', 'side-delts': 'push', triceps: 'push',
  lats: 'pull', 'upper-back': 'pull', 'rear-delts': 'pull', biceps: 'pull', forearms: 'pull',
  abs: 'core',
};

/** Legs, push, pull or core, from the exercise's first primary muscle. */
export function movementKind(ex: Pick<ExerciseDef, 'id' | 'name'>): MovementKind | undefined {
  const first = musclesOf(ex).primary[0];
  return first ? KIND_OF[first] : undefined;
}

/** True when a set this small next to its reference was most likely not really done. */
export function looksUnfinished(set: { reps?: number; seconds?: number; steps?: number; loadKg: number | null }, reference: number | undefined): boolean {
  if (isPlaceholder(set)) return true;
  const v = valueOfSet(set);
  return v !== undefined && reference !== undefined && reference > 0 && v < reference * PLACEHOLDER_SHARE;
}

/**
 * Saved sets that look like placeholders: "1 rep, no weight", or under 30% of the best set of the
 * same exercise that session or the session before (RDL 8, 1, 1).
 */
export function suspiciousSets(sets: SetEntry[], kept: string[] = []): SetEntry[] {
  const keep = new Set(kept);
  const real = realSets(sets).filter((s) => !s.drop);
  const byEx = new Map<string, SetEntry[]>();
  for (const s of real) byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), s]);
  const out: SetEntry[] = [];
  for (const xs of byEx.values()) {
    const sessions: string[] = [];
    for (const s of [...xs].sort((a, b) => a.at - b.at)) if (!sessions.includes(s.sessionId)) sessions.push(s.sessionId);
    const best = (id: string | undefined) => (id ? Math.max(0, ...xs.filter((s) => s.sessionId === id).map((s) => valueOfSet(s) ?? 0)) : 0);
    sessions.forEach((id, i) => {
      const ref = Math.max(best(id), best(sessions[i - 1]));
      for (const s of xs.filter((x) => x.sessionId === id)) if (!keep.has(s.id) && looksUnfinished(s, ref)) out.push(s);
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

export interface Neglected {
  exerciseId: string;
  name: string;
  sessionId: string;
  /** Sessions in a row it was on the list and not done. */
  missed: number;
}

/** Exercises left out of the last `n` sessions that had them on the list: time to move, swap or drop them. */
export function neglectedExercises(plan: PlanDef, sessions: TrainingSession[], sets: SetEntry[], n = 3, dismissed: Record<string, number> = {}): Neglected[] {
  const done = sessions.filter((s) => s.status === 'done').sort((a, b) => a.startedAt - b.startedAt);
  const didIt = new Set(realSets(sets).map((s) => `${s.sessionId}|${s.exerciseId}`));
  const out: Neglected[] = [];
  for (const def of plan.sessions.filter((s) => rotationOf(plan).includes(s.id))) {
    for (const ex of def.exercises) {
      const mine = done.filter((s) => s.session === def.id && s.exercises.includes(ex.id) && s.startedAt > (dismissed[ex.id] ?? 0));
      let missed = 0;
      for (const s of [...mine].reverse()) {
        if (didIt.has(`${s.id}|${ex.id}`)) break;
        missed++;
      }
      if (missed >= n) out.push({ exerciseId: ex.id, name: ex.name, sessionId: def.id, missed });
    }
  }
  return out;
}

/** Average gap under this between sets means they were typed in afterwards, not lifted live. */
export const LOGGED_LATER_GAP_S = 30;

/** True for a session logged after the fact: sets typed in one after another (28 sets in 9 minutes). */
export function loggedLater(sets: Pick<SetEntry, 'at' | 'skipped'>[]): boolean {
  const ts = sets.filter((s) => !s.skipped).map((s) => s.at).sort((a, b) => a - b);
  if (ts.length < 4) return false;
  return (ts[ts.length - 1] - ts[0]) / (ts.length - 1) < LOGGED_LATER_GAP_S * 1000;
}
