import { describe, expect, it } from 'vitest';
import { formFocus, fourWeeksAgo, monthSoFar, tonight, volumeLine, weekVolume } from '../src/domain/trainView';
import type { PlanDef } from '../src/domain/plan';
import type { SetEntry, TrainingSession } from '../src/domain/types';

const MIN = 60_000;
const DAY = 86_400_000;
const at = (date: string, h = 18) => new Date(`${date}T${String(h).padStart(2, '0')}:00:00`).getTime();
let n = 0;
const sess = (date: string, p: Partial<TrainingSession> = {}): TrainingSession => ({ id: `s${++n}`, date, session: 'C', planName: 'P', startedAt: at(date), endedAt: at(date) + 60 * MIN, status: 'done', short: false, exercises: ['rdl', 'curl'], ...p });
const set = (s: TrainingSession, p: Partial<SetEntry>): SetEntry => ({ id: `x${++n}`, sessionId: s.id, date: s.date, session: s.session, exerciseId: 'rdl', exercise: 'Romanian deadlift', setNo: 1, side: 'both', loadKg: 10, reps: 10, at: s.startedAt + (++n % 50) * MIN, ...p });
/** Sets spread through a session, so it isn't taken for one logged later. */
const spread = (s: TrainingSession, ps: Partial<SetEntry>[]) => ps.map((p, i) => set(s, { at: s.startedAt + i * 5 * MIN, ...p }));

const plan = {
  format: 'health-plan', version: 2, name: 'P', from: '2026-09-01', rotation: ['C'], flags: [],
  sessions: [{ id: 'C', name: 'Session C', focus: '', minutes: 60, short: [], exercises: [
    { id: 'rdl', order: '1', name: 'Romanian deadlift', sets: 3, reps: [8, 12], load: 'pair', checks: [{ id: 'head', text: 'Head in line', kind: 'do' }] },
    { id: 'curl', order: '2', name: 'Curl', sets: 3, reps: [10, 15], load: 'pair' },
  ] }],
} as unknown as PlanDef;

describe('you, four weeks ago', () => {
  const then = sess('2026-09-23');
  const now = sess('2026-10-21');
  const sets = [...spread(then, [{ reps: 14 }, { exerciseId: 'curl', exercise: 'Curl', reps: 12 }]), ...spread(now, [{ reps: 19 }, { exerciseId: 'curl', exercise: 'Curl', reps: 11 }])];
  it('compares the same session then and now', () => {
    const f = fourWeeksAgo([then, now], sets, 'C', '2026-10-21')!;
    expect(f.then).toBe('2026-09-23');
    expect(f.rows).toEqual([
      { name: 'Romanian deadlift', then: '10 × 14', now: '10 × 19', up: true },
      { name: 'Curl', then: '10 × 12', now: '10 × 11', up: false },
    ]);
  });
  it('is left out when that session wasn’t done three to five weeks back', () => {
    const recent = sess('2026-10-10');
    expect(fourWeeksAgo([recent, now], [...spread(recent, [{}]), ...spread(now, [{}])], 'C', '2026-10-21')).toBeUndefined();
    expect(fourWeeksAgo([], [], 'C', '2026-10-21')).toBeUndefined();
  });
});

describe('this week on your body', () => {
  const s = sess('2026-10-20');
  const sets = spread(s, [{ rir: 1 }, { rir: 2 }, { rir: 5 }, { exerciseId: 'curl', exercise: 'Curl' }]);
  it('counts each hard set once per group, against the targets', () => {
    const v = weekVolume(sets, plan, '2026-10-21');
    expect(v.find((g) => g.name === 'Legs')).toEqual({ name: 'Legs', sets: 2, lo: 10, hi: 16, state: 'low' });
    expect(v.find((g) => g.name === 'Arms')?.sets).toBe(1);
    expect(v.find((g) => g.name === 'Back')?.sets).toBe(0);
    expect(v.map((g) => g.name)).toEqual(['Shoulders', 'Back', 'Chest', 'Arms', 'Legs', 'Core']);
  });
  it('uses the plan’s own targets when it has them', () => {
    const own = { ...plan, weeklyTargets: { Legs: [1, 2] } } as PlanDef;
    expect(weekVolume(sets, own, '2026-10-21').find((g) => g.name === 'Legs')?.state).toBe('ok');
  });
  it('names the biggest gap', () => {
    expect(volumeLine(weekVolume(sets, plan, '2026-10-21'))).toBe('Shoulders are 10 sets short of 10 this week.');
    expect(volumeLine([{ name: 'Legs', sets: 12, lo: 10, hi: 16, state: 'ok' }])).toBeUndefined();
  });
});

describe('this month so far', () => {
  const a = sess('2026-10-03', { endedAt: at('2026-10-03') + 80 * MIN });
  const b = sess('2026-10-14', { endedAt: at('2026-10-14') + 90 * MIN });
  const c = sess('2026-09-28');
  const sets = [...spread(a, [{ exerciseId: 'curl', exercise: 'Curl', reps: 10 }]), ...spread(b, [{ exerciseId: 'curl', exercise: 'Curl', reps: 13, mark: '!!' }]), ...spread(c, [{}])];
  it('counts sessions, records, the usual length and the most improved', () => {
    expect(monthSoFar([a, b, c], sets, '2026-10-21')).toEqual({ sessions: 2, records: 1, usualMin: 85, improved: { name: 'Curl', pct: 30 } });
  });
  it('is empty with nothing this month', () => expect(monthSoFar([c], sets, '2026-10-21')).toEqual({ sessions: 0, records: 0 }));
});

describe('tonight', () => {
  const early = sess('2026-10-21', { startedAt: at('2026-10-21', 7), endedAt: at('2026-10-21', 8) });
  const late = sess('2026-10-21', { quality: 88 });
  const sets = [...spread(early, [{}]), ...spread(late, [{ mark: '!!' }, { checks: { head: 'ok' } }, { checks: { head: 'slip' } }])];
  it('sums up the latest session done today', () => {
    const t = tonight([early, late], sets, '2026-10-21')!;
    expect(t.session.id).toBe(late.id);
    expect(t.records).toHaveLength(1);
    expect(t.sets).toBe(3);
    expect(t.mins).toBe(60);
    expect(t.quality).toBe(88);
    expect(t.checks).toBe(0.5);
  });
  it('is none before a session today', () => expect(tonight([sess('2026-10-20')], [], '2026-10-21')).toBeUndefined());
});

describe('form focus', () => {
  const runs = [sess('2026-10-07'), sess('2026-10-14'), sess('2026-10-21')];
  it('is the check slipped most across the last three runs', () => {
    const sets = runs.flatMap((s) => spread(s, [{ checks: { head: 'slip' } }]));
    expect(formFocus(sets, plan, 'C')).toBe('Head in line');
  });
  it('is none without slips', () => expect(formFocus([], plan, 'C')).toBeUndefined());
});
void DAY;
