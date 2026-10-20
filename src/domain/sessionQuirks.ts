import { findExercise, groupKey, isSuperset, type PlanDef } from './plan';
import type { SetEntry } from './types';
import { loggedLater } from './trainingChecks';

export interface Quirks {
  /** The longest gap between two sets, and the set it came before. */
  longestRest?: { ms: number; before: SetEntry };
  /** The quickest trip round a superset, first set to the last one. */
  fastestSuperset?: { ms: number; names: string[] };
  tempo?: { sets: number; reps: number };
  mostReps?: SetEntry;
}

/** The small, odd facts about a session that the totals leave out. */
export function sessionQuirks(sets: SetEntry[], plan?: PlanDef): Quirks {
  const xs = [...sets].sort((a, b) => a.at - b.at);
  const out: Quirks = {};
  // Typed in afterwards, the gaps say nothing about rest: no timing quirks.
  const timed = !loggedLater(xs);
  for (let i = 1; timed && i < xs.length; i++) {
    const ms = xs[i].at - xs[i - 1].at;
    if (!out.longestRest || ms > out.longestRest.ms) out.longestRest = { ms, before: xs[i] };
  }
  if (plan && timed) {
    const group = (s: SetEntry) => {
      const ex = findExercise(plan, s.exerciseId);
      return ex && isSuperset(ex) ? groupKey(ex.order) : undefined;
    };
    // A round is a run of sets in one superset group without repeating an exercise.
    let start = 0;
    for (let i = 0; i <= xs.length; i++) {
      const g = i < xs.length ? group(xs[i]) : undefined;
      const runStart = xs[start];
      const sameRound = i < xs.length && g !== undefined && g === group(runStart) && !xs.slice(start, i).some((s) => s.exerciseId === xs[i].exerciseId);
      if (sameRound) continue;
      const round = xs.slice(start, i);
      const names = [...new Set(round.map((s) => s.exercise))];
      if (names.length >= 2) {
        const ms = round[round.length - 1].at - round[0].at;
        if (!out.fastestSuperset || ms < out.fastestSuperset.ms) out.fastestSuperset = { ms, names };
      }
      start = i;
    }
  }
  const tempo = xs.filter((s) => s.tempo && !s.drop);
  if (tempo.length) out.tempo = { sets: tempo.length, reps: tempo.reduce((n, s) => n + (s.reps ?? 0), 0) };
  const withReps = xs.filter((s) => (s.reps ?? 0) > 0);
  if (withReps.length) out.mostReps = withReps.reduce((a, b) => ((b.reps ?? 0) > (a.reps ?? 0) ? b : a));
  return out;
}

export function fmtGap(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
