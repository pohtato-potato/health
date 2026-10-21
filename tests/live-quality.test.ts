import { describe, expect, it } from 'vitest';
import { formScore, isTextbook } from '../src/domain/quality';
import { markFor, recordBar } from '../src/domain/marks';
import { formGate } from '../src/domain/progression';
import { sessionQuality } from '../src/domain/sessionQuality';
import { detectFirsts } from '../src/domain/firsts';
import type { SetEntry } from '../src/domain/types';

let n = 0;
const set = (p: Partial<SetEntry>): SetEntry => ({
  id: `s${++n}`,
  sessionId: 'x',
  date: '2026-10-01',
  session: 'A',
  exerciseId: 'curl',
  exercise: 'Curl',
  setNo: 1,
  side: 'both',
  loadKg: 10,
  reps: 10,
  at: n,
  ...p,
});
const allOk = { a: 'ok', b: 'ok', c: 'ok' } as const;

describe('form from checks', () => {
  it('keeps an old score, and scores checks by the share that went well', () => {
    expect(formScore({ form: 4 })).toBe(4);
    expect(formScore({ checks: { a: 'ok', b: 'ok', c: 'slip' } })).toBe(4);
    expect(formScore({ checks: allOk })).toBe(5);
    expect(formScore({})).toBeUndefined();
  });
  it('calls a set textbook when every check went well', () => {
    expect(isTextbook({ form: 5 })).toBe(true);
    expect(isTextbook({ checks: { a: 'ok' } })).toBe(true);
    expect(isTextbook({ checks: { a: 'ok', b: 'slip' } })).toBe(false);
    expect(isTextbook({})).toBe(false);
  });
});

describe('the record bar', () => {
  const prior = [set({ loadKg: 10, reps: 12 }), set({ loadKg: 8, reps: 15 })];
  it('is the best at this load or heavier', () => expect(recordBar({ side: 'both', loadKg: 10 }, prior, 1)).toBe(12));
  it('is below the minimum at a new heavier load', () => expect(recordBar({ side: 'both', loadKg: 12.5 }, prior, 1)).toBe(0));
  it('is missing for a side never done before', () => expect(recordBar({ side: 'L', loadKg: 10 }, prior, 1)).toBeUndefined());
  it('is missing for a drop set', () => expect(recordBar({ side: 'both', loadKg: 10, drop: true }, prior, 1)).toBeUndefined());
});

describe('records with clean reps', () => {
  const prior = [set({ reps: 12 })];
  it('a set with a slipped check is no record', () => {
    expect(markFor({ setNo: 1, side: 'both', loadKg: 10, reps: 13, checks: { a: 'ok', b: 'slip' } }, prior, [], 1, { clean: true })).not.toBe('!!');
  });
  it('the same set with every check passed is a record', () => {
    expect(markFor({ setNo: 1, side: 'both', loadKg: 10, reps: 13, checks: allOk }, prior, [], 1, { clean: true })).toBe('!!');
  });
});

describe('old scores and new checks agree', () => {
  it('readiness for heavier', () => {
    expect(formGate([set({ form: 4, rir: 1 })])).toBe(true);
    expect(formGate([set({ checks: allOk, rir: 1 })])).toBe(true);
    expect(formGate([set({ checks: { a: 'slip', b: 'slip', c: 'ok' }, rir: 1 })])).toBe(false);
  });
  it('session quality', () => {
    expect(sessionQuality([set({ form: 5, rir: 1 }), set({ form: 5, rir: 2 })])).toBe(sessionQuality([set({ checks: allOk, rir: 1 }), set({ checks: allOk, rir: 2 })]));
  });
  it('the first textbook set', () => {
    const before = [set({ loadKg: 10, reps: 10 })];
    const firsts = detectFirsts(before, [set({ loadKg: 10, reps: 10, checks: allOk })]);
    expect(firsts.map((f) => f.key)).toContain('clean:curl:10');
  });
});
