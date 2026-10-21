import { describe, expect, it } from 'vitest';
import { press, IDLE_PRESS, stateWord, type PressEvent } from '../src/domain/liveSet';
import { markFor, recordBar } from '../src/domain/marks';
import type { SetEntry } from '../src/domain/types';

const run = (...es: PressEvent[]) => {
  let s = IDLE_PRESS;
  const outs: string[] = [];
  for (const e of es) {
    const r = press(s, e);
    s = r.s;
    if (r.out) outs.push(r.out);
  }
  return outs.filter((o) => o === 'tap' || o === 'hold');
};

describe('a press on the tap area', () => {
  it('a quick press is a rep', () => expect(run({ t: 'down', primary: true }, { t: 'up', primary: true })).toEqual(['tap']));
  it('a long press marks the burn and adds no rep', () => expect(run({ t: 'down', primary: true }, { t: 'held' }, { t: 'up', primary: true })).toEqual(['hold']));
  it('a second finger cancels both', () => expect(run({ t: 'down', primary: true }, { t: 'down', primary: false }, { t: 'held' }, { t: 'up', primary: true })).toEqual([]));
  it('a scroll cancels both', () => expect(run({ t: 'down', primary: true }, { t: 'cancel' }, { t: 'held' }, { t: 'up', primary: true })).toEqual([]));
  it('a timed set ignores the hold: the release just starts the clock', () => expect(run({ t: 'down', primary: true, timed: true }, { t: 'held' }, { t: 'up', primary: true })).toEqual(['tap']));
});

let n = 0;
const set = (p: Partial<SetEntry>): SetEntry => ({ id: `s${++n}`, sessionId: 'x', date: '2026-10-01', session: 'A', exerciseId: 'curl', exercise: 'Curl', setNo: 1, side: 'both', loadKg: 10, reps: 10, at: n, ...p });

describe('last-time marks with slipped checks', () => {
  it('fewer reps than last time is no "!" even when last time slipped', () => {
    const last = set({ reps: 12, checks: { a: 'slip' } });
    expect(markFor({ setNo: 1, side: 'both', loadKg: 10, reps: 5, checks: { a: 'ok' } }, [last], [last], 1, { clean: true })).toBeUndefined();
  });
  it('two slipped sets with different reps do not "match"', () => {
    const last = set({ reps: 10, checks: { a: 'slip' } });
    expect(markFor({ setNo: 1, side: 'both', loadKg: 10, reps: 8, checks: { a: 'slip' } }, [last], [last], 1, { clean: true })).not.toBe('=');
  });
  it('a heavier load than last time keeps its "!" even with a slip', () => {
    const last = set({ reps: 10, loadKg: 10 });
    const prior = [last, set({ reps: 8, loadKg: 12.5 })];
    expect(markFor({ setNo: 1, side: 'both', loadKg: 12.5, reps: 8, checks: { a: 'slip' } }, prior, [last], 1, { clean: true })).toBe('!');
  });
});

describe('the first time at a load', () => {
  it('is a new load with no best to show', () => {
    expect(recordBar({ side: 'both', loadKg: 12.5 }, [set({ loadKg: 10, reps: 12 })], 10)).toBe(9);
    expect(stateWord('record', 9, true)).toBe('new record · first time at this load');
  });
});

import { newLoad } from '../src/domain/marks';
describe('a new load', () => {
  const prior = [set({ loadKg: 10, reps: 12 })];
  it('is heavier than every set before on that side', () => {
    expect(newLoad({ side: 'both', loadKg: 12.5 }, prior)).toBe(true);
    expect(newLoad({ side: 'both', loadKg: 10 }, prior)).toBe(false);
    expect(newLoad({ side: 'L', loadKg: 12.5 }, prior)).toBe(false);
  });
});
