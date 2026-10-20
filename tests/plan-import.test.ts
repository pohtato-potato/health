import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSession, nextInLoop, upgradePlan, validatePlan, type ExerciseDef, type PlanDef } from '../src/domain/plan';
import { applyImport, diffPlans, undoImport, undoOnOffer } from '../src/domain/planImport';
import { exerciseStatus } from '../src/domain/progression';
import type { SetEntry, Settings, TrainingSession } from '../src/domain/types';
import { EQ, PLAN, sets } from './fixtures';

const ex = (id: string, name: string, load: ExerciseDef['load'], startKg?: number, extra: Partial<ExerciseDef> = {}): ExerciseDef => ({ id, order: '1', name, sets: 2, reps: [10, 15], load, startKg, ...extra });
const done = (id: string, session: string, startedAt: number): TrainingSession => ({ id, date: '2026-10-01', session, planName: 'x', startedAt, status: 'done', short: false, exercises: [] });

describe('the loop', () => {
  const plan: PlanDef = { ...PLAN, rotation: ['A', 'B'], extra: ['B2'], sessions: [...PLAN.sessions, { id: 'B2', name: 'Gym', focus: '', minutes: 45, short: [], exercises: [ex('cable-row', 'Cable row', 'single', 20)] }] };

  it('an off-rotation session (gym, trip) leaves the next session where it was (#3)', () => {
    expect(nextInLoop(plan, [done('1', 'A', 1)])).toBe('B');
    expect(nextInLoop(plan, [done('1', 'A', 1), done('2', 'trip', 2)])).toBe('B');
    expect(nextInLoop(plan, [done('1', 'A', 1), done('2', 'B2', 2)])).toBe('B');
  });

  it('a start picked at import holds until a rotation session is done after it (#2)', () => {
    const history = [done('1', 'A', 1)];
    expect(nextInLoop(plan, history, { session: 'A', at: 5 })).toBe('A');
    expect(nextInLoop(plan, [...history, done('2', 'B2', 6)], { session: 'A', at: 5 })).toBe('A');
    expect(nextInLoop(plan, [...history, done('3', 'A', 7)], { session: 'A', at: 5 })).toBe('B');
  });

  it('validatePlan checks rotation and extra ids', () => {
    expect(validatePlan(plan)).toEqual([]);
    expect(validatePlan({ ...plan, extra: ['Z'] })).toContain('The extra session "Z" isn\'t a session.');
    expect(validatePlan({ ...plan, rotation: ['A', 'Q'] })).toContain('The rotation names "Q", which isn\'t a session.');
  });
});

describe('load resets (#1, #5)', () => {
  const history = [...sets('press', 'Press', 's1', '2026-10-17', 5, [19, 17]).map((s) => ({ ...s, at: 1000 }))];

  it('history wins without a reset; startKg wins after one, until new sets are logged', () => {
    const press = ex('press', 'Press', 'pair', 10);
    expect(exerciseStatus(press, undefined, EQ, history).loadKg).toBe(5);
    expect(exerciseStatus({ ...press, loadFrom: 2000 }, undefined, EQ, history).loadKg).toBe(10);
    const after = sets('press', 'Press', 's2', '2026-10-21', 7.5, [10, 10]).map((s) => ({ ...s, at: 3000 }));
    expect(exerciseStatus({ ...press, loadFrom: 2000 }, undefined, EQ, [...history, ...after]).loadKg).toBe(7.5);
  });

  it('a renamed exercise with variants keeps its history on the base version', () => {
    const renamed = ex('press', 'Seated press', 'pair', 10, { variants: [{ name: 'Standing press' }] });
    expect(exerciseStatus(renamed, { variants: {}, band: {} }, EQ, history).last?.sets.length).toBe(2);
  });
});

describe('diff, apply and undo (#4)', () => {
  const old: PlanDef = { ...PLAN, sessions: [{ ...PLAN.sessions[0], exercises: [ex('press', 'Press', 'pair', 5), ex('lunge', 'Lunge', 'body'), ex('gone', 'Gone', 'pair', 5)] }], rotation: ['A'], flags: [] };
  const next: PlanDef = {
    ...PLAN,
    rotation: ['A'],
    sessions: [{ ...PLAN.sessions[0], exercises: [ex('press', 'Seated press', 'pair', 10), ex('lunge', 'Lunge', 'single', 10), ex('fresh', 'Fresh', 'pair', 5)] }],
    flags: [{ id: 'eye', label: 'Eyes', group: 'Eyes', when: 'session' }],
  };
  const hist: SetEntry[] = [...sets('press', 'Press', 's1', '2026-10-17', 5, [12, 12]), ...sets('lunge', 'Lunge', 's1', '2026-10-17', 5, [10, 10])];
  const settings: Pick<Settings, 'plan' | 'planState' | 'rotationStart' | 'equipment' | 'planUndo'> = { plan: old, planState: { variants: { lunge: 1 }, band: {} }, equipment: EQ };

  it('lists kept, renamed, new and removed exercises, new flags and load changes', () => {
    const d = diffPlans(old, next, { ...settings, sets: hist, sessions: [] });
    expect(d.kept).toEqual(['press', 'lunge']);
    expect(d.renamed).toEqual([{ id: 'press', from: 'Press', to: 'Seated press' }]);
    expect(d.added.map((a) => a.id)).toEqual(['fresh']);
    expect(d.removed.map((a) => a.id)).toEqual(['gone']);
    expect(d.newFlags.map((f) => f.id)).toEqual(['eye']);
    expect(d.loads).toEqual([
      { id: 'press', name: 'Seated press', fromKg: 5, toKg: 10, kind: undefined, forced: false },
      { id: 'lunge', name: 'Lunge', fromKg: 5, toKg: 10, kind: { from: 'body', to: 'single' }, forced: true },
    ]);
  });

  it('apply stamps the resets, keeps an undo copy, and undo puts it all back', () => {
    const applied = applyImport(settings, next, { resets: ['press', 'lunge'], start: 'A', at: 5000 });
    expect(applied.plan!.sessions[0].exercises.map((e) => e.loadFrom)).toEqual([5000, 5000, undefined]);
    expect(applied.planState.variants).toEqual({});
    expect(applied.rotationStart).toEqual({ session: 'A', at: 5000 });
    expect(undoOnOffer(applied, 5000 + 6 * 86_400_000)).toBeDefined();
    expect(undoOnOffer(applied, 5000 + 8 * 86_400_000)).toBeUndefined();
    expect(undoImport(applied)).toEqual({ plan: old, planState: settings.planState, rotationStart: undefined, planUndo: undefined });
  });
});

// The acceptance checklist, run against the real Plan v1 when it sits in tests/fixtures (git-ignored).
const PLAN_FILE = new URL('./fixtures/health-plan-2026-10-20.json', import.meta.url);
describe.runIf(existsSync(PLAN_FILE))('Plan v1 import (acceptance)', () => {
  const v1 = upgradePlan(JSON.parse(readFileSync(PLAN_FILE, 'utf8')) as PlanDef);
  // The A/B plan in use until 19 Oct, as the export's Plan and Sets sheets show it.
  const oldExs: [string, string, ExerciseDef['load'], number?][] = [
    ['row', 'One-arm dumbbell row', 'single', 10], ['rdl', 'Romanian deadlift', 'pair', 10], ['curl', 'Curl', 'pair', 5], ['wrist-curl', 'Wrist curl', 'pair', 5],
    ['hammer-curl', 'Hammer curl', 'pair', 5], ['rear-delt', 'Rear delt fly', 'pair', 5], ['farmer-carry', 'Farmer carry', 'pair', 10], ['lateral-raise', 'Lateral raise', 'pair', 5],
    ['face-pull', 'Band face pull', 'band'], ['floor-press', 'Floor press', 'pair', 10], ['pullover', 'Pullover', 'single', 10], ['incline-pushup', 'Incline push-up', 'body'],
    ['skull-crusher', 'Skull crusher', 'pair', 5], ['reverse-curl', 'Reverse-grip curl', 'pair', 5], ['split-squat', 'Split squat', 'body'], ['ohp', 'Seated overhead press', 'pair', 5],
    ['lean-lateral', 'Lean-away lateral raise', 'single', 5], ['goblet-squat', 'Goblet squat', 'single', 10], ['calf-raise', 'Single-leg calf raise', 'single', 5], ['side-plank', 'Side plank', 'body'],
  ];
  const old: PlanDef = { ...PLAN, name: 'Home A/B', rotation: ['A', 'B'], flags: [{ id: 'wrist-pain', label: 'Wrist', group: 'Wrist', when: 'session' }], sessions: [
    { id: 'A', name: 'Session A', focus: '', minutes: 60, short: [], exercises: oldExs.slice(0, 10).map(([id, name, load, kg]) => ex(id, name, load, kg)) },
    { id: 'B', name: 'Session B', focus: '', minutes: 60, short: [], exercises: oldExs.slice(10).map(([id, name, load, kg]) => ex(id, name, load, kg)) },
  ] };
  const last: [string, string, number | null][] = [
    ['ohp', 'Seated overhead press', 5], ['hammer-curl', 'Hammer curl', 10], ['rear-delt', 'Rear delt fly', 10], ['split-squat', 'Split squat', 5], ['row', 'One-arm dumbbell row', 10], ['curl', 'Curl', 10],
  ];
  const hist = last.flatMap(([id, name, kg]) => sets(id, name, 's-old', '2026-10-18', kg, [12, 12]).map((s) => ({ ...s, at: 1000 })));
  const sessions = [done('a1', 'A', 500), done('b1', 'B', 600), done('a2', 'A', 1000)];
  const settings = { plan: old, planState: { variants: {}, band: {} }, equipment: EQ };

  it('validates', () => expect(validatePlan(v1)).toEqual([]));

  it('lists kept, renamed and new ids', () => {
    const d = diffPlans(old, v1, { ...settings, sets: hist, sessions });
    for (const id of ['row', 'rdl', 'lateral-raise', 'curl', 'hammer-curl', 'rear-delt', 'wrist-curl', 'farmer-carry', 'floor-press', 'split-squat', 'goblet-squat', 'ohp', 'lean-lateral', 'pullover', 'incline-pushup', 'skull-crusher', 'reverse-curl', 'calf-raise', 'face-pull', 'side-plank']) expect(d.kept).toContain(id);
    expect(d.renamed.map((r) => r.id).sort()).toEqual(['curl', 'goblet-squat', 'rear-delt']);
    expect(d.added.map((a) => a.id).sort()).toEqual(['close-grip-press', 'concentration-curl', 'dead-bug', 'floor-fly', 'overhead-ext', 'plank', 'seal-row', 'seated-lateral', 'single-leg-bridge']);
    expect(d.newFlags.map((f) => f.group)).toEqual(expect.arrayContaining(['Eyes', 'Back', 'Knee']));
    expect(d.loads.map((l) => l.id).sort()).toEqual(['hammer-curl', 'ohp', 'rear-delt', 'split-squat']);
    expect(d.next).toBe('B');
  });

  it("after import the first session's loads match the plan, and A can be picked", () => {
    const d = diffPlans(old, v1, { ...settings, sets: hist, sessions });
    const applied = applyImport(settings, v1, { resets: d.loads.map((l) => l.id), start: 'A', at: 2000 });
    const p = applied.plan!;
    const load = (id: string) => exerciseStatus(p.sessions.flatMap((s) => s.exercises).find((e) => e.id === id)!, applied.planState, EQ, hist).loadKg;
    expect([load('ohp'), load('hammer-curl'), load('rear-delt'), load('split-squat')]).toEqual([10, 5, 5, 10]);
    expect(load('row')).toBe(10);
    expect(nextInLoop(p, sessions, applied.rotationStart)).toBe('A');
    expect(nextInLoop(p, [...sessions, done('g', 'trip', 3000)], applied.rotationStart)).toBe('A');
    expect(undoImport(applied)?.plan).toBe(old);
  });

  it('the Knee flag swaps split squat for goblet squat in A; the Back flag swaps RDL for the bridge in C', () => {
    const knee = v1.flags.find((f) => f.group === 'Knee')!.swap!;
    expect(buildSession(v1, 'A', { swaps: [{ ...knee, reason: 'knee' }] }).map((e) => e.id)).toContain('goblet-squat');
    expect(buildSession(v1, 'A', { swaps: [{ ...knee, reason: 'knee' }] }).map((e) => e.id)).not.toContain('split-squat');
    const back = v1.flags.find((f) => f.group === 'Back')!.swap!;
    const c = buildSession(v1, 'C', { swaps: [{ ...back, reason: 'back' }] }).map((e) => e.id);
    expect(c[0]).toBe('single-leg-bridge');
    expect(c).not.toContain('rdl');
  });
});
