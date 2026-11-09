import { slipCount } from './checks';
import type { CheckMark, Mark, SetEntry, Side } from './types';

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
  checks?: Record<string, CheckMark>;
}

/** A set's load for comparing. With `lower` (an assisted machine) less assist is heavier, so loads compare backwards. */
const load = (s: Pick<SetLike, 'loadKg'>, lower?: boolean) => (lower ? -1 : 1) * (s.loadKg ?? 0);

export interface RecordOpts {
  clean?: boolean;
  /** An assisted machine: less assist is progress. */
  lowerIsHarder?: boolean;
}

/** What a set counts for records: with `clean`, its clean reps. */
function valueFor(s: SetLike, clean?: boolean): number {
  if (clean && s.reps !== undefined) return s.cleanReps ?? s.reps;
  return s.reps ?? s.seconds ?? s.steps ?? 0;
}

/** The set that holds the record a new set has to beat: the best at this load or heavier, counted as records are. */
export function recordHolder(set: Pick<SetLike, 'side' | 'loadKg'>, prior: SetEntry[], opts: RecordOpts = {}): SetEntry | undefined {
  const lo = opts.lowerIsHarder;
  const kg = load(set, lo);
  return prior
    .filter((p) => !p.drop && !p.skipped && p.side === set.side && load(p, lo) >= kg)
    .sort((a, b) => valueFor(b, opts.clean) - valueFor(a, opts.clean))[0];
}

/** What a set counts for records, as shown. */
export const recordValue = (s: SetLike, clean?: boolean) => valueFor(s, clean);

/** Heavier than every earlier set on this side: a first time at this load, with no best to show. */
export function newLoad(set: Pick<SetLike, 'side' | 'loadKg'>, prior: SetEntry[], opts: RecordOpts = {}): boolean {
  const lo = opts.lowerIsHarder;
  const earlier = prior.filter((p) => !p.drop && !p.skipped && p.side === set.side);
  return earlier.length > 0 && load(set, lo) > Math.max(...earlier.map((p) => load(p, lo)));
}

/**
 * What a set has to beat to be a record: the best at this load or heavier, on this side.
 * At a load heavier than ever, anything from `minValue` counts. None before the first time.
 */
export function recordBar(set: Pick<SetLike, 'side' | 'loadKg' | 'drop'>, prior: SetEntry[], minValue = 1, opts: RecordOpts = {}): number | undefined {
  if (set.drop) return undefined;
  const lo = opts.lowerIsHarder;
  const earlier = prior.filter((p) => !p.drop && !p.skipped && p.side === set.side);
  if (!earlier.length) return undefined;
  const kg = load(set, lo);
  if (kg > Math.max(...earlier.map((p) => load(p, lo)))) return minValue - 1;
  return Math.max(...earlier.filter((p) => load(p, lo) >= kg).map((p) => valueFor(p, opts.clean)));
}

/**
 * Chess-style marks for a set.
 * !! a record: more than ever before at this load or heavier, or a heavier load than ever.
 * !  beats the same set last time: heavier, more reps, or the same reps with a slower lowering.
 * =  matches the same set last time.
 * Fewer gets no mark at all. The first session is the baseline, so it gets none either.
 * v2: a new challenge at the same reps and load is progress (!). With `clean`, records
 * count clean reps, so 13 clean beats 15 with 9 clean.
 */
export function markFor(set: SetLike, prior: SetEntry[], lastSets: SetEntry[], minValue = 1, opts: RecordOpts = {}): Mark | undefined {
  const lo = opts.lowerIsHarder;
  const bar = recordBar(set, prior, minValue, opts);
  if (bar === undefined) return undefined;
  // With `clean`, a set where a form check slipped can't be a record; it still counts against last time.
  const value = (s: SetLike) => valueFor(s, opts.clean);
  const v = value(set);
  if (v > bar && !(opts.clean && slipCount(set) > 0)) return '!!';
  const kg = load(set, lo);

  const last = lastSets.find((p) => !p.drop && !p.skipped && p.setNo === set.setNo && p.side === set.side);
  if (!last) return undefined;
  if (kg > load(last, lo) && v >= minValue) return '!';
  if (kg < load(last, lo)) return undefined;
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
