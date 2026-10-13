import type { Mark, SetEntry, Side } from './types';

export interface SetLike {
  setNo: number;
  side: Side;
  loadKg: number | null;
  reps?: number;
  seconds?: number;
  tempo?: boolean;
  drop?: boolean;
  steps?: number;
  cleanReps?: number;
  challenges?: string[];
}

const load = (s: SetLike) => s.loadKg ?? 0;

/**
 * Chess-style marks for a set.
 * !! a record: more than ever before at this load or heavier, or a heavier load than ever.
 * !  beats the same set last time: heavier, more reps, or the same reps with a slower lowering.
 * =  matches the same set last time.
 * Fewer gets no mark at all. The first session is the baseline, so it gets none either.
 * v2: a new challenge at the same reps and load is progress (!). With `clean`, records
 * count clean reps, so 13 clean beats 15 with 9 clean.
 */
export function markFor(set: SetLike, prior: SetEntry[], lastSets: SetEntry[], minValue = 1, opts: { clean?: boolean } = {}): Mark | undefined {
  if (set.drop) return undefined;
  const earlier = prior.filter((p) => !p.drop && !p.skipped && p.side === set.side);
  if (!earlier.length) return undefined;
  const value = (s: SetLike) => (opts.clean && s.reps !== undefined ? s.cleanReps ?? s.reps : s.reps ?? s.seconds ?? s.steps ?? 0);

  const v = value(set);
  const kg = load(set);
  const maxLoad = Math.max(...earlier.map(load));
  if (kg > maxLoad && v >= minValue) return '!!';
  const atOrAbove = earlier.filter((p) => load(p) >= kg);
  if (atOrAbove.length && v > Math.max(...atOrAbove.map(value))) return '!!';

  const last = lastSets.find((p) => !p.drop && !p.skipped && p.setNo === set.setNo && p.side === set.side);
  if (!last) return undefined;
  if (kg > load(last) && v >= minValue) return '!';
  if (kg < load(last)) return undefined;
  if (v > value(last)) return '!';
  if (v < value(last)) return undefined;
  if (set.tempo && !last.tempo) return '!';
  if ((set.challenges ?? []).some((c) => !(last.challenges ?? []).includes(c))) return '!';
  if (!!set.tempo === !!last.tempo) return '=';
  return undefined;
}

/** One mark for a whole exercise: its best set mark, or = only when every set matched. */
export function exerciseMark(sets: Pick<SetEntry, 'mark' | 'drop'>[]): Mark | undefined {
  const working = sets.filter((s) => !s.drop);
  if (working.some((s) => s.mark === '!!')) return '!!';
  if (working.some((s) => s.mark === '!')) return '!';
  if (working.length && working.every((s) => s.mark === '=')) return '=';
  return undefined;
}
