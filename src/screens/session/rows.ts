import { sidesFor, type ExerciseDef } from '../../domain/plan';
import type { CheckMark, SetEntry, Side } from '../../domain/types';
import type { Row } from './SetTable';

/** A group's rows in the order they're done: set by set, side by side, partners in turn. */
export function rowsFor(group: ExerciseDef[], extra: Record<string, number>, first: Record<string, 'L' | 'R'> = {}): Row[] {
  const count = (ex: ExerciseDef) => ex.sets + (extra[ex.id] ?? 0);
  const max = Math.max(...group.map(count));
  const rows: Row[] = [];
  for (let n = 1; n <= max; n++) {
    for (const ex of group) {
      if (n > count(ex)) continue;
      const sides: Side[] = sidesFor(ex, first[ex.id]);
      for (const side of sides) rows.push({ ex, setNo: n, side, drop: false, key: `${ex.id}:${n}:${side}` });
      if (n === ex.sets && ex.drop) for (const side of sides) rows.push({ ex, setNo: n, side, drop: true, key: `${ex.id}:${n}:${side}:drop` });
    }
  }
  return rows;
}

/**
 * What follows a row: a rest after the last row of a round, a glide to the superset partner,
 * or nothing between the two sides of a set. One rest covers both sides.
 */
export function restAfter(rows: Row[], logged: (r: Row) => boolean, r: Row): 'rest' | 'glide' | 'none' {
  const idx = rows.findIndex((x) => x.key === r.key);
  const next = rows[idx + 1];
  if (!next || next.setNo !== r.setNo || rows.slice(idx + 1).every(logged)) return 'rest';
  return next.ex.id !== r.ex.id ? 'glide' : 'none';
}

/** A set as the live screens counted it. */
export interface LiveInput {
  val: number;
  startedAt?: number;
  endedAt?: number;
  burnAt?: number;
  checks?: Record<string, CheckMark>;
  rir?: number;
}

type LiveFields = Pick<SetEntry, 'startedAt' | 'endedAt' | 'burnAt' | 'checks'>;

/** The timer, burn and checks to save: new ones from the live screens, else what the set already had. */
export function liveFields(existing: LiveFields | undefined, live: Partial<LiveInput> | undefined): LiveFields {
  const out: LiveFields = {};
  for (const k of ['startedAt', 'endedAt', 'burnAt', 'checks'] as const) {
    const v = live?.[k] ?? existing?.[k];
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
