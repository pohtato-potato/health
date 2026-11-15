// Train for plan v2 (look pass L2): any-order week, effort, the easy start, weights for next time, sets per muscle.
// Made-up plan and sets only.
import { describe, expect, it } from 'vitest';
import { DEFAULT_EQUIPMENT, DEFAULT_PLAN } from '../src/domain/defaultPlan';
import { groupExercises, validatePlan, type ExerciseDef, type PlanDef, type SessionDef } from '../src/domain/plan';
import { musclesOf } from '../src/domain/muscles';
import { alsoOffer, easySets, easyStartOn, effortOf, effortText, goUpHint, muscleWeek, nextWeight, slotIds, stepWeight, suggestNext, weekOf, weekWords } from '../src/domain/trainWeek';
import type { SetEntry, TrainingSession } from '../src/domain/types';

const ex = (id: string, order: string, extra: Partial<ExerciseDef> = {}): ExerciseDef => ({ id, order, name: id, sets: 3, reps: [10, 12], load: 'pair', ...extra });
const ses = (id: string, exs: ExerciseDef[]): SessionDef => ({ id, name: `Session ${id}`, focus: '', minutes: 60, short: [], exercises: exs });

const PLAN: PlanDef = {
  format: 'health-plan',
  version: 2,
  name: 'Test plan',
  from: '2026-01-05',
  planVersion: '9.9',
  rotation: ['HA', 'HB'],
  rotations: { home: ['HA', 'HB'], gym: ['GA', 'GB'] },
  weeklyTarget: { gym: 2, home: 2 },
  extra: ['HX'],
  flags: [],
  sessions: [
    ses('HA', [ex('ha-raise', '1', { isolation: true }), ex('ha-press', '2')]),
    ses('HB', [ex('hb-curl', '1', { isolation: true, load: 'single' }), ex('hb-plank', '2', { load: 'body', seconds: [30, 45] })]),
    ses('GA', [ex('ga-press', '1', { load: 'stack', kit: 'machine', name: 'Made-up press' }), ex('ga-lat', '2a', { load: 'stack', isolation: true, name: 'Made-up side raise' }), ex('ga-fly', '2b', { load: 'stack', isolation: true, name: 'Made-up rear-delt fly' })]),
    ses('GB', [ex('gb-ext', '1', { load: 'stack', name: 'Made-up squat', sets: 2 }), ex('gb-curl', '2', { load: 'stack', name: 'Made-up hinge', sets: 2 })]),
    ses('HX', [ex('hx-squat', '1')]),
  ],
};

let n = 0;
const done = (session: string, date: string, place?: 'home' | 'gym'): TrainingSession =>
  ({ id: `s${++n}`, session, date, status: 'done', startedAt: Date.parse(`${date}T18:00:00Z`) + n, exercises: [], ...(place ? { place } : {}) }) as unknown as TrainingSession;
const set = (exerciseId: string, date: string, extra: Partial<SetEntry> = {}): SetEntry =>
  ({ id: `x${++n}`, sessionId: 'sx', date, session: 'GA', exerciseId, exercise: exerciseId, setNo: 1, side: 'both', loadKg: 20, reps: 10, at: Date.parse(`${date}T18:00:00Z`) + n, ...extra }) as SetEntry;

// 2026-11-16 is a Monday.
const MON = '2026-11-16';
const THU = '2026-11-19';

describe('the week, in any order', () => {
  it('interleaves gym and home slots; no weekday is fixed', () => {
    expect(slotIds(PLAN)).toEqual(['GA', 'HA', 'GB', 'HB']);
    const w = weekOf(PLAN, [], THU);
    expect(w.target).toBe(4);
    expect(w.left).toEqual(['GA', 'HA', 'GB', 'HB']);
    expect(weekWords(0, 4)).toBe('Four to do');
  });

  it('fills slots from what was done this week, in whatever order', () => {
    const s = [done('GB', MON, 'gym'), done('HB', '2026-11-17', 'home'), done('GA', '2026-11-10', 'gym')];
    const w = weekOf(PLAN, s, THU);
    expect(w.slots.filter((x) => x.done).map((x) => `${x.sessionId} ${x.done!.day}`)).toEqual(['GB Mon', 'HB Tue']);
    expect(w.left).toEqual(['GA', 'HA']);
    expect(w.doneCount).toBe(2);
    expect(weekWords(w.doneCount, w.target)).toBe('Two done, two to go');
  });

  it('a repeat or an extra counts toward the week but fills no second slot', () => {
    const s = [done('GA', MON, 'gym'), done('GA', '2026-11-17', 'gym'), done('HX', '2026-11-18', 'home')];
    const w = weekOf(PLAN, s, THU);
    expect(w.left).toEqual(['HA', 'GB', 'HB']);
    expect(w.extra.map((e) => e.sessionId)).toEqual(['GA', 'HX']);
    expect(w.doneCount).toBe(3);
    expect(alsoOffer(PLAN, w)).toEqual(['GA', 'HX']);
  });

  it('suggests the other place from the last session, from what is left', () => {
    const loop = () => 'HA';
    expect(suggestNext(PLAN, weekOf(PLAN, [], THU), [], loop)).toBe('GA');
    const afterGym = [done('GA', MON, 'gym')];
    expect(suggestNext(PLAN, weekOf(PLAN, afterGym, THU), afterGym, loop)).toBe('HA');
    const afterHome = [done('GA', MON, 'gym'), done('HA', '2026-11-17', 'home')];
    expect(suggestNext(PLAN, weekOf(PLAN, afterHome, THU), afterHome, loop)).toBe('GB');
  });

  it('with the week done, the loop decides', () => {
    const all = [done('GA', MON, 'gym'), done('HA', MON, 'home'), done('GB', '2026-11-17', 'gym'), done('HB', '2026-11-18', 'home')];
    const w = weekOf(PLAN, all, THU);
    expect(w.left).toEqual([]);
    expect(weekWords(4, 4)).toBe('All four done');
    expect(suggestNext(PLAN, w, all, (p) => (p === 'gym' ? 'GA' : 'HA'))).toBe('GA');
  });

  it('a plan with one rotation keeps working', () => {
    const w = weekOf(DEFAULT_PLAN, [], THU, 3);
    expect(w.slots.length).toBe(DEFAULT_PLAN.rotation.length || w.slots.length);
    expect(w.slots.every((s) => s.place === 'home')).toBe(true);
  });
});

describe('effort', () => {
  it('small lifts go close to failure; big ones stop a few short; holds say nothing', () => {
    const [haRaise, haPress] = PLAN.sessions[0].exercises;
    expect(effortText(effortOf(haRaise, PLAN))).toBe('to 0–1 left');
    expect(effortText(effortOf(haPress, PLAN))).toBe('stop 2–3 short');
    expect(effortOf(PLAN.sessions[1].exercises[1], PLAN)).toBeUndefined();
    expect(effortText(effortOf(ex('x', '1', { effort: [1, 2] }), PLAN))).toBe('to 1–2 left');
    expect(effortText(effortOf(haRaise, PLAN, { rir: 3 }))).toBe('stop 3 short');
  });

  it('old single-rotation plans get no derived effort', () => {
    expect(effortOf(ex('x', '1', { isolation: true }), DEFAULT_PLAN)).toBeUndefined();
  });

  it('pairs stay pairs', () => {
    expect(groupExercises(PLAN.sessions[2].exercises).map((g) => g.map((e) => e.id))).toEqual([['ga-press'], ['ga-lat', 'ga-fly']]);
  });

  it('validates effort and the easy start', () => {
    const bad = { ...PLAN, easyStart: { days: 0, sets: 2, rir: 3 }, sessions: [ses('HA', [ex('a', '1', { effort: [3, 1] })])], rotation: ['HA'], rotations: undefined, extra: [] };
    const errs = validatePlan(bad);
    expect(errs.some((e) => e.includes('effort'))).toBe(true);
    expect(errs.some((e) => e.includes('easyStart'))).toBe(true);
    expect(validatePlan({ ...PLAN, easyStart: false })).toEqual([]);
    expect(validatePlan(PLAN)).toEqual([]);
  });
});

describe('the first gym week', () => {
  it('runs for a week from the first gym session; home days never', () => {
    expect(easyStartOn(PLAN, [], THU, 'gym')).toMatchObject({ sets: 2, rir: 3, daysLeft: 7 });
    expect(easyStartOn(PLAN, [], THU, 'home')).toBeUndefined();
    const first = [done('GA', MON, 'gym')];
    expect(easyStartOn(PLAN, first, THU, 'gym')?.daysLeft).toBe(4);
    expect(easyStartOn(PLAN, first, '2026-11-23', 'gym')).toBeUndefined();
    expect(easyStartOn({ ...PLAN, easyStart: false }, [], THU, 'gym')).toBeUndefined();
    expect(easyStartOn({ ...PLAN, easyStart: { days: 14, sets: 1, rir: 4 } }, first, '2026-11-23', 'gym')).toMatchObject({ sets: 1, rir: 4 });
    expect(easyStartOn(DEFAULT_PLAN, [], THU, 'gym')).toBeUndefined();
  });

  it('cuts to its sets, never adds', () => {
    expect(easySets(3, { sets: 2 })).toBe(2);
    expect(easySets(1, { sets: 2 })).toBe(1);
    expect(easySets(4)).toBe(4);
  });
});

describe('weights you can change', () => {
  const settings = { equipment: DEFAULT_EQUIPMENT, machineUnits: {} };
  it('a changed weight holds until a set is logged after it', () => {
    const loadNext = { 'ga-press': { kg: 40, at: 1000 } };
    expect(nextWeight('ga-press', { loadKg: 35 }, loadNext, [])).toBe(40);
    expect(nextWeight('ga-press', { loadKg: 35 }, loadNext, [{ exerciseId: 'ga-press', at: 900 }])).toBe(40);
    expect(nextWeight('ga-press', { loadKg: 45 }, loadNext, [{ exerciseId: 'ga-press', at: 2000 }])).toBe(45);
    expect(nextWeight('ga-press', { loadKg: 45 }, loadNext, [{ exerciseId: 'ga-press', at: 2000, skipped: true }])).toBe(40);
    expect(nextWeight('other', { loadKg: 10 }, loadNext, [])).toBe(10);
  });

  it('steps along the stack or the dumbbells you have', () => {
    const stack = PLAN.sessions[2].exercises[0];
    expect(stepWeight(stack, 35, 1, settings)).toBe(37.5);
    expect(stepWeight(stack, 0, -1, settings)).toBe(0);
    const db = ex('d', '1', { load: 'pair' });
    const up = stepWeight(db, 5, 1, settings)!;
    expect(up).toBeGreaterThan(5);
    expect(stepWeight(db, up, -1, settings)).toBeLessThan(up);
    expect(stepWeight(ex('b', '1', { load: 'body' }), null, 1, settings)).toBeNull();
  });

  it('suggests going up only when earned and not already changed', () => {
    const stack = PLAN.sessions[2].exercises[0];
    const earned = { topHit: true, loadKg: 35, advice: { kind: 'next-step' as const, title: '', text: '', tonight: '' } };
    expect(goUpHint(stack, earned, 35, settings)).toBe('Top of the range last time: try 37.5');
    expect(goUpHint(stack, earned, 40, settings)).toBeUndefined();
    expect(goUpHint(stack, { ...earned, topHit: false, advice: undefined }, 35, settings)).toBeUndefined();
    const db = ex('d', '1');
    expect(goUpHint(db, { topHit: true, loadKg: 5, advice: { kind: 'heavier', title: '', text: '', tonight: '', toKg: 7.5 } }, 5, settings)).toBe('Top of the range last time: try 7.5');
  });
});

describe('sets per muscle', () => {
  it('gym names map to muscles', () => {
    expect(musclesOf({ id: 'q', name: 'Lying leg curl' }).primary).toEqual(['hamstrings']);
    expect(musclesOf({ id: 'q', name: 'Single-leg extension' }).primary).toEqual(['quads']);
    expect(musclesOf({ id: 'q', name: 'Made-up rear-delt fly' }).primary).toEqual(['rear-delts']);
    expect(musclesOf({ id: 'q', name: 'Bar pushdown' }).primary).toEqual(['triceps']);
  });

  it('counts hard working sets this week against each row', () => {
    const sets = [
      set('ga-lat', MON), set('ga-lat', MON), set('ga-fly', MON),
      set('ga-press', MON), set('ga-press', MON, { rir: 5 }), set('ga-press', MON, { drop: true }), set('ga-press', MON, { skipped: true }),
      set('gb-ext', '2026-11-10'),
    ];
    const rows = muscleWeek(sets, PLAN, THU);
    const by = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect(by['Side delts'].sets).toBe(2);
    expect(by['Rear delts'].sets).toBe(1);
    expect(by.Chest.sets).toBe(1);
    expect(by.Triceps.sets).toBe(1);
    expect(by.Legs.sets).toBe(0);
    expect(by.Legs.state).toBe('low');
    expect(rows.some((r) => r.name === 'Front delts')).toBe(false);
  });

  it("the plan's own ranges win", () => {
    const rows = muscleWeek([set('ga-lat', MON)], { ...PLAN, weeklyTargets: { 'Side delts': [1, 1] } }, THU);
    expect(rows.find((r) => r.name === 'Side delts')).toMatchObject({ lo: 1, hi: 1, state: 'ok' });
  });
});
