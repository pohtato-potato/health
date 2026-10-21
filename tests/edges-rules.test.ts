import { describe, expect, it } from 'vitest';
import { adaptiveRest, loadBlocks, plateChange, plateChanges, usualLength } from '../src/domain/sessionEdges';
import type { ExerciseDef } from '../src/domain/plan';
import type { SetEntry, TrainingSession } from '../src/domain/types';

const MIN = 60_000;
let n = 0;
const sess = (minutes: number, p: Partial<TrainingSession> = {}): TrainingSession => {
  const startedAt = ++n * 86_400_000;
  return { id: `s${n}`, date: '2026-10-01', session: 'C', planName: 'P', startedAt, endedAt: startedAt + minutes * MIN, status: 'done', short: false, exercises: [], ...p };
};
const set = (p: Partial<SetEntry>): SetEntry => ({ id: `x${++n}`, sessionId: 's', date: '2026-10-01', session: 'C', exerciseId: 'curl', exercise: 'Curl', setNo: 1, side: 'both', loadKg: 10, at: n * 1000, ...p });
/** Sets spread a few minutes apart, like a real session. */
const spread = (id: string, k = 5) => Array.from({ length: k }, (_, i) => set({ sessionId: id, at: i * 4 * MIN }));

describe('usual length', () => {
  it('is the median of the last five sessions of the same name', () => {
    const ss = [sess(200), sess(80), sess(90), sess(95), sess(100), sess(110)];
    const sets = ss.flatMap((s) => spread(s.id));
    expect(usualLength(ss, sets, 'C', 60)).toEqual({ min: 95, fromHistory: true });
  });
  it('leaves out sessions logged later', () => {
    const ss = [sess(90), sess(100), sess(5)];
    const sets = [...spread(ss[0].id), ...spread(ss[1].id), ...Array.from({ length: 6 }, (_, i) => set({ sessionId: ss[2].id, at: i * 5000 }))];
    expect(usualLength(ss, sets, 'C', 60).min).toBe(95);
  });
  it('falls back to the plan with under two sessions', () => {
    const ss = [sess(90)];
    expect(usualLength(ss, spread(ss[0].id), 'C', 60)).toEqual({ min: 60, fromHistory: false });
  });
  it('ignores other session names and active sessions', () => {
    const ss = [sess(90), sess(100), sess(30, { session: 'A' }), sess(10, { status: 'active', endedAt: undefined })];
    expect(usualLength(ss, ss.flatMap((s) => spread(s.id)), 'C', 60).min).toBe(95);
  });
});

describe('adaptive rest', () => {
  const reps = (...rs: number[]) => rs.map((r, i) => set({ setNo: i + 1, reps: r }));
  it('rests longer when reps fell off last time', () => {
    const r = adaptiveRest(90, reps(18, 16, 14));
    expect(r.sec).toBe(105);
    expect(r.why).toBe('Rest is 1:45 here: your reps dropped from 18 to 14 across sets last time.');
  });
  it('rests longer still for a bigger drop, up to 45 s more', () => {
    expect(adaptiveRest(90, reps(20, 14, 11)).sec).toBe(120);
    expect(adaptiveRest(90, reps(20, 10, 4)).sec).toBe(135);
  });
  it('rests shorter when reps held', () => {
    expect(adaptiveRest(90, reps(12, 12, 11)).sec).toBe(80);
    const r = adaptiveRest(90, reps(12, 12, 12));
    expect(r.sec).toBe(70);
    expect(r.why).toBe('Rest is 1:10 here: your reps held at 12 last time.');
  });
  it('keeps the base rest with no history or one set', () => {
    expect(adaptiveRest(90, [])).toEqual({ sec: 90 });
    expect(adaptiveRest(90, reps(12))).toEqual({ sec: 90 });
  });
  it('ignores drop sets and skipped sets', () => {
    const last = [...reps(12, 12), set({ setNo: 3, reps: 4, drop: true }), set({ setNo: 3, reps: 1, skipped: true })];
    expect(adaptiveRest(90, last).sec).toBe(70);
  });
});

const ex = (id: string, order: string): ExerciseDef => ({ id, order, name: id, sets: 3, reps: [8, 12], load: 'pair' });

describe('load blocks', () => {
  it('groups by load in plan order and counts plate changes', () => {
    const exs = [ex('a', '1'), ex('b', '2'), ex('c', '3'), ex('d', '4'), ex('e', '5')];
    const kg: Record<string, number> = { a: 10, b: 10, c: 5, d: 5, e: 10 };
    const blocks = loadBlocks(exs, (e) => kg[e.id]);
    expect(blocks.map((b) => b.exs.map((e) => e.id))).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    expect(plateChanges(blocks)).toBe(2);
  });
  it('never splits a superset', () => {
    const blocks = loadBlocks([ex('a', '3a'), ex('b', '3b')], (e) => (e.id === 'a' ? 5 : 10));
    expect(blocks).toHaveLength(1);
  });
  it('lets bodyweight sit in whichever block it is in', () => {
    const blocks = loadBlocks([ex('a', '1'), ex('b', '2'), ex('c', '3')], (e) => (e.id === 'b' ? null : 10));
    expect(blocks).toHaveLength(1);
    expect(plateChanges(blocks)).toBe(0);
  });
});

describe('a plate change', () => {
  it('between two dumbbell loads', () => expect(plateChange(10, 5)).toEqual({ from: 10, to: 5 }));
  it('not to or from bodyweight, and not at the same load', () => {
    expect(plateChange(10, null)).toBeUndefined();
    expect(plateChange(undefined, 5)).toBeUndefined();
    expect(plateChange(5, 5)).toBeUndefined();
  });
});
