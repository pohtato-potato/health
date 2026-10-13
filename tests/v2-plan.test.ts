import { describe, expect, it } from 'vitest';
import { addExercise, moveExercise, removeExercise, setSuperset, updateExercise } from '../src/domain/planEdit';
import { effectiveExercise, upgradePlan, type ExerciseDef, type PlanDef, type SessionDef } from '../src/domain/plan';
import { DEFAULT_PLAN, DEFAULT_EQUIPMENT } from '../src/domain/defaultPlan';

const ex = (id: string, order: string, extra: Partial<ExerciseDef> = {}): ExerciseDef => ({ id, order, name: id, sets: 3, reps: [10, 15], load: 'pair', ...extra });
const session = (exs: ExerciseDef[]): SessionDef => ({ id: 'A', name: 'A', focus: '', minutes: 60, short: [], exercises: exs });
const orders = (s: SessionDef) => s.exercises.map((e) => `${e.id}:${e.order}`);

describe('plan v2', () => {
  it('upgradePlan maps seconds carries to steps only when measure set; keeps ids', () => {
    const v1: PlanDef = { ...DEFAULT_PLAN, version: 1, sessions: [session([ex('carry', '1', { seconds: [45, 60] }), ex('walk', '2', { seconds: [60, 90], measure: 'steps' }), ex('row', '3')])] };
    const v2 = upgradePlan(v1);
    expect(v2.version).toBe(2);
    expect(v2.sessions[0].exercises.map((e) => [e.id, e.measure])).toEqual([
      ['carry', 'seconds'],
      ['walk', 'steps'],
      ['row', 'reps'],
    ]);
    expect(upgradePlan(v2)).toEqual(v2);
  });

  it('the default plan is v2: no dead bug, a Y-raise instead of the band face pull, carries in steps', () => {
    const all = DEFAULT_PLAN.sessions.flatMap((s) => s.exercises);
    expect(DEFAULT_PLAN.version).toBe(2);
    expect(all.some((e) => e.id === 'dead-bug')).toBe(false);
    expect(all.find((e) => e.id === 'y-raise')?.load).toBe('pair');
    expect(all.find((e) => e.id === 'farmer-carry')?.measure).toBe('steps');
    expect(all.find((e) => e.id === 'farmer-carry')?.tiredHands).toBe(true);
  });

  it('noBand swap', () => {
    const band = ex('pull-apart', '2', { load: 'band', bandLevels: ['Band'], noBand: { name: 'Prone Y-raise', load: 'pair', startKg: 2.5 } });
    expect(effectiveExercise(band, { ...DEFAULT_EQUIPMENT, band: true }).name).toBe('pull-apart');
    const swapped = effectiveExercise(band, { ...DEFAULT_EQUIPMENT, band: false });
    expect(swapped).toMatchObject({ id: 'pull-apart', order: '2', name: 'Prone Y-raise', load: 'pair', startKg: 2.5 });
    expect(effectiveExercise(ex('row', '1'), { ...DEFAULT_EQUIPMENT, band: false }).name).toBe('row');
  });
});

describe('plan editor', () => {
  const base = session([ex('a', '1'), ex('b', '2a'), ex('c', '2b'), ex('d', '3')]);

  it('editor ops keep orders unique and supersets paired', () => {
    expect(orders(removeExercise(base, 'b'))).toEqual(['a:1', 'c:2', 'd:3']);
    expect(orders(moveExercise(base, 'd', -1))).toEqual(['a:1', 'd:2', 'b:3a', 'c:3b']);
    expect(orders(moveExercise(base, 'c', -1))).toEqual(['b:1a', 'c:1b', 'a:2', 'd:3']);
    expect(orders(moveExercise(base, 'a', -1))).toEqual(orders(base));
    expect(orders(addExercise(base, ex('e', '?')))).toEqual(['a:1', 'b:2a', 'c:2b', 'd:3', 'e:4']);
    expect(orders(setSuperset(base, 'a', true))).toEqual(['a:1a', 'b:1b', 'c:2', 'd:3']);
    expect(orders(setSuperset(base, 'c', false))).toEqual(['a:1', 'b:2', 'c:3', 'd:4']);
    expect(updateExercise(base, 'd', { sets: 4 }).exercises[3].sets).toBe(4);
    for (const s of [removeExercise(base, 'a'), moveExercise(base, 'b', 1), setSuperset(base, 'd', true)]) {
      expect(new Set(s.exercises.map((e) => e.order)).size).toBe(s.exercises.length);
    }
  });

  it('removing an exercise drops it from the short list', () => {
    expect(removeExercise({ ...base, short: ['a', 'b'] }, 'b').short).toEqual(['a']);
  });
});
