import { describe, expect, it } from 'vitest';
import { liveFields, restAfter, rowsFor } from '../src/screens/session/rows';
import type { ExerciseDef } from '../src/domain/plan';

const ex = (id: string, p: Partial<ExerciseDef> = {}): ExerciseDef => ({ id, order: '1', name: id, sets: 2, reps: [8, 12], load: 'pair', ...p });
const none = () => false;

describe('rest after a round', () => {
  const rows = rowsFor([ex('row', { perSide: true, lead: 'L' })], {});
  const at = (key: string) => rows.find((r) => r.key === key)!;
  it('goes straight on to the second side', () => expect(restAfter(rows, none, at('row:1:L'))).toBe('none'));
  it('rests once both sides are done', () => expect(restAfter(rows, none, at('row:1:R'))).toBe('rest'));
  it('rests after the last set', () => expect(restAfter(rows, none, at('row:2:R'))).toBe('rest'));

  const ss = rowsFor([ex('a', { order: '3a', sets: 1 }), ex('b', { order: '3b', sets: 1 })], {});
  it('glides to the superset partner', () => expect(restAfter(ss, none, ss[0])).toBe('glide'));
  it('rests after the partner', () => expect(restAfter(ss, none, ss[1])).toBe('rest'));
  it('rests when the rest of the round is already logged', () => expect(restAfter(ss, (r) => r.key === ss[1].key, ss[0])).toBe('rest'));
});

describe('the live fields of a saved set', () => {
  const stored = { startedAt: 1, endedAt: 9, burnAt: 7, checks: { a: 'ok' as const } };
  it('keeps them when the set is edited from the list', () => expect(liveFields(stored, undefined)).toEqual(stored));
  it('takes new ones from the live screens', () => {
    expect(liveFields(stored, { val: 10, checks: { a: 'slip' }, endedAt: 12 })).toEqual({ startedAt: 1, endedAt: 12, burnAt: 7, checks: { a: 'slip' } });
  });
  it('is empty for a set never counted live', () => expect(liveFields(undefined, undefined)).toEqual({}));
});

import { nextGroupIndex } from '../src/screens/session/rows';
describe('the next exercise', () => {
  it('is the next unfinished group after this one', () => expect(nextGroupIndex([true, false, true, false], 1)).toBe(3));
  it('wraps to the first unfinished group', () => expect(nextGroupIndex([false, true, true], 2)).toBe(0));
  it('is none when every group is done', () => expect(nextGroupIndex([true, true], 0)).toBeUndefined());
});
