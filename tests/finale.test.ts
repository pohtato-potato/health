import { describe, expect, it } from 'vitest';
import { bestMoment, formReport, hourSplit, recapRings, trackArt } from '../src/domain/finale';
import type { ExerciseDef, FormCheck } from '../src/domain/plan';
import type { SetEntry } from '../src/domain/types';
import type { RecordPage } from '../src/ui/Moments';

const S = 1000;
let n = 0;
const set = (p: Partial<SetEntry>): SetEntry => ({ id: `s${++n}`, sessionId: 'x', date: '2026-10-21', session: 'C', exerciseId: 'curl', exercise: 'Curl', setNo: 1, side: 'both', loadKg: 10, reps: 10, at: n, ...p });

describe('where the time went', () => {
  const session = { startedAt: 0, endedAt: 300 * S, restLog: [{ from: 60 * S, to: 150 * S, kind: 'rest' as const }] };
  it('splits lifting, resting and the time between', () => {
    const sets = [set({ startedAt: 0, endedAt: 60 * S }), set({ startedAt: 180 * S, endedAt: 240 * S })];
    expect(hourSplit(session, sets)).toEqual({ total: 300 * S, lift: 120 * S, rest: 90 * S, between: 90 * S, longestRest: 90 * S });
  });
  it('falls back to lifting = the rest of the time without set timers', () => {
    const h = hourSplit(session, [set({})]);
    expect(h.lift).toBe(210 * S);
    expect(h.between).toBe(0);
  });
  it('never goes negative', () => {
    const h = hourSplit(session, [set({ startedAt: 0, endedAt: 290 * S })]);
    expect(h.between).toBe(0);
  });
});

const checks: FormCheck[] = [
  { id: 'flat', text: 'Back stayed flat', kind: 'do' },
  { id: 'head', text: 'Head in line', kind: 'do' },
];
const checksOf = () => checks;

describe('the form report', () => {
  const sets = [
    set({ checks: { flat: 'ok', head: 'slip' } }),
    set({ checks: { flat: 'ok', head: 'slip' } }),
    set({ checks: { flat: 'ok', head: 'ok' } }),
    set({ checks: { flat: 'ok' } }),
  ];
  it('gives the share that went well, worst check first, and the most common slip', () => {
    const r = formReport(sets, checksOf);
    expect(r.share).toBeCloseTo(5 / 7);
    expect(r.rows[0]).toEqual({ text: 'Head in line', ok: 1, of: 3 });
    expect(r.rows[1]).toEqual({ text: 'Back stayed flat', ok: 4, of: 4 });
    expect(r.slip).toEqual({ text: 'Head in line', times: 2 });
  });
  it('is empty for sets without checks', () => expect(formReport([set({})], checksOf)).toEqual({ rows: [] }));
  it('says when left and right stayed within one rep', () => {
    const r = formReport([set({ side: 'L', reps: 12 }), set({ side: 'R', reps: 11 })], checksOf);
    expect(r.sides).toBe('Left and right were within one rep on every per-side set.');
  });
  it('names the biggest gap otherwise', () => {
    const r = formReport([set({ side: 'L', reps: 12, exercise: 'Row' }), set({ side: 'R', reps: 9, exercise: 'Row' })], checksOf);
    expect(r.sides).toBe('Biggest gap: row set 1, left 12, right 9.');
  });
  it('says nothing about sides with only one side logged', () => expect(formReport([set({ side: 'L' })], checksOf).sides).toBeUndefined());
});

const ex = (id: string, sets = 2): ExerciseDef => ({ id, order: '1', name: id, sets, reps: [10, 15], load: 'pair' });

describe('recap rings', () => {
  it('counts exercises done, sets in range and checks', () => {
    const sets = [set({ exerciseId: 'a', reps: 12, checks: { x: 'ok' } }), set({ exerciseId: 'a', reps: 8, checks: { x: 'slip' } }), set({ exerciseId: 'b', skipped: true })];
    expect(recapRings(sets, [ex('a'), ex('b'), ex('c')])).toEqual({ exercises: [1, 3], inRange: [1, 2], checks: 0.5 });
  });
  it('leaves the checks ring out without checks', () => expect(recapRings([set({ exerciseId: 'a' })], [ex('a')]).checks).toBeUndefined());
});

const page = (p: Partial<RecordPage>): RecordPage => ({ name: 'x', big: '1', bigLabel: 'REPS', detail: '', ...p });

describe('tonight’s best', () => {
  it('prefers a heavier load, then the bigger number', () => {
    expect(bestMoment([page({ big: '19' }), page({ big: '12.5', bigLabel: 'KG', name: 'kg' })])?.name).toBe('kg');
    expect(bestMoment([page({ big: '17', name: 'a' }), page({ big: '19', name: 'b' })])?.name).toBe('b');
  });
  it('is none without records', () => expect(bestMoment([])).toBeUndefined());
});

describe('track tiles', () => {
  it('are the same for the same track, and differ between tracks', () => {
    expect(trackArt('Midnight City')).toBe(trackArt('Midnight City'));
    expect(trackArt('A')).not.toBe(trackArt('B'));
    expect(trackArt('A')).toMatch(/^linear-gradient\(/);
  });
});

describe('review fixes', () => {
  const session = { startedAt: 0, endedAt: 300 * S, restLog: [{ from: 60 * S, to: 150 * S, kind: 'rest' as const }] };
  it('a session mixing timed and untimed sets uses the old split', () => {
    const h = hourSplit(session, [set({ startedAt: 0, endedAt: 60 * S }), set({})]);
    expect(h.lift).toBe(210 * S);
    expect(h.between).toBe(0);
  });
  it('says seconds for timed per-side sets', () => {
    const r = formReport([set({ side: 'L', reps: undefined, seconds: 30, exercise: 'Carry' }), set({ side: 'R', reps: undefined, seconds: 25, exercise: 'Carry' })], checksOf);
    expect(r.sides).toBe('Biggest gap: carry set 1, left 30 s, right 25 s.');
    const close = formReport([set({ side: 'L', reps: undefined, seconds: 30 }), set({ side: 'R', reps: undefined, seconds: 30 })], checksOf);
    expect(close.sides).toBe('Left and right were within a second on every per-side hold.');
  });
  it('leaves out checks no longer in the plan', () => {
    expect(formReport([set({ checks: { gone: 'slip', flat: 'ok' } })], checksOf).rows).toEqual([{ text: 'Back stayed flat', ok: 1, of: 1 }]);
  });
});
