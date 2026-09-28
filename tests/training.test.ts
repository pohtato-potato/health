import { describe, expect, it } from 'vitest';
import { isBigJump, loadOptions, nextLoad } from '../src/domain/loads';
import { exerciseMark, markFor } from '../src/domain/marks';
import { buildSession, findExercise, groupExercises, nextSessionId, targetText, validatePlan } from '../src/domain/plan';
import { exerciseStatus, hitTop, triggerMet } from '../src/domain/progression';
import { EQ, PLAN, sets } from './fixtures';

const ex = (id: string) => findExercise(PLAN, id)!;
const state = { variants: {}, band: {} };

describe('loading table', () => {
  it('matches the plan: pairs jump in 5 kg steps until small plates arrive', () => {
    expect(loadOptions(EQ, 'pair')).toEqual([5, 10]);
    expect(loadOptions(EQ, 'single')).toEqual([5, 10, 15, 20]);
  });
  it('adds the in-between loads once the 1.25 kg plates are owned', () => {
    const eq = { ...EQ, plates: EQ.plates.map((p) => ({ ...p, owned: true })) };
    expect(loadOptions(eq, 'pair')).toEqual([2.5, 5, 7.5, 10, 12.5]);
    expect(loadOptions(eq, 'single')).toEqual([2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25]);
  });
  it('knows a smaller step needs plates you have not got', () => {
    expect(nextLoad(EQ, 'pair', 5)).toEqual({ next: 10, smaller: { kg: 7.5, plateKg: 1.25 } });
    expect(nextLoad(EQ, 'single', 10)).toEqual({ next: 15, smaller: { kg: 12.5, plateKg: 1.25 } });
    expect(nextLoad(EQ, 'single', 20).next).toBeUndefined();
  });
  it('counts fixed dumbbells too', () => {
    expect(loadOptions({ ...EQ, fixed: [1, 2.5] }, 'pair')).toEqual([1, 2.5, 5, 10]);
  });
  it('calls a jump big above a quarter', () => {
    expect(isBigJump(10, 15)).toBe(true);
    expect(isBigJump(10, 12.5)).toBe(false);
  });
});

describe('plan structure', () => {
  it('alternates sessions from the last one logged', () => {
    expect(nextSessionId(PLAN)).toBe('A');
    expect(nextSessionId(PLAN, 'A')).toBe('B');
    expect(nextSessionId(PLAN, 'B')).toBe('A');
  });
  it('groups supersets by their shared number', () => {
    const groups = groupExercises(PLAN.sessions[0].exercises).map((g) => g.map((e) => e.id));
    expect(groups).toEqual([['row'], ['hinge'], ['raise', 'band'], ['curl'], ['carry']]);
  });
  it('builds the short session from the first two plus raises', () => {
    expect(buildSession(PLAN, 'A', { short: true }).map((e) => e.id)).toEqual(['row', 'hinge', 'raise']);
  });
  it('drops a swapped exercise when its replacement is already in the session', () => {
    const ids = buildSession(PLAN, 'B', { swaps: [{ from: 'lunge', to: 'squat', reason: 'Joint' }] }).map((e) => e.id);
    expect(ids).toEqual(['press', 'squat', 'pushup']);
  });
  it('substitutes a swap when the replacement is not there', () => {
    const ids = buildSession(PLAN, 'B', { swaps: [{ from: 'lunge', to: 'row', reason: 'x' }] }).map((e) => e.id);
    expect(ids).toEqual(['press', 'row', 'squat', 'pushup']);
  });
  it('writes targets the way the plan does', () => {
    expect(targetText(ex('row'))).toBe('3 × 10–15 each side');
    expect(targetText(ex('carry'))).toBe('2 × 45–60 s');
    expect(targetText(ex('pushup'))).toBe('3 × clean reps');
  });
  it('validates imported plans', () => {
    expect(validatePlan(PLAN)).toEqual([]);
    expect(validatePlan({ format: 'nope' }).length).toBeGreaterThan(0);
  });
});

describe('go heavier', () => {
  it('needs every set on every side at the top of the range', () => {
    expect(hitTop(ex('row'), sets('row', 'Row', 's1', '2026-01-02', 10, [15, 15, 15], { sides: ['L', 'R'] }))).toBe(true);
    expect(hitTop(ex('row'), sets('row', 'Row', 's1', '2026-01-02', 10, [15, 15, 14], { sides: ['L', 'R'] }))).toBe(false);
    expect(hitTop(ex('row'), sets('row', 'Row', 's1', '2026-01-02', 10, [15, 15], { sides: ['L', 'R'] }))).toBe(false);
  });
  it('suggests a slow lowering before a big jump', () => {
    const st = exerciseStatus(ex('squat'), state, EQ, sets('squat', 'Squat', 's1', '2026-01-02', 10, [15, 15, 15]));
    expect(st.advice?.kind).toBe('needs-plates');
    const eqNoSmall = { ...EQ, plates: [EQ.plates[0]] };
    const st2 = exerciseStatus(ex('squat'), state, eqNoSmall, sets('squat', 'Squat', 's1', '2026-01-02', 10, [15, 15, 15]));
    expect(st2.advice?.kind).toBe('tempo-first');
    expect(st2.loadKg).toBe(10);
    expect(st2.tempo).toBe(true);
    expect(st2.advice?.text).toContain('Next is 15 kg on one dumbbell, a big jump');
  });
  it('goes up once the slow lowering has been done at the top', () => {
    const eqNoSmall = { ...EQ, plates: [EQ.plates[0]] };
    const st = exerciseStatus(ex('squat'), state, eqNoSmall, sets('squat', 'Squat', 's1', '2026-01-02', 10, [15, 15, 15], { tempo: true }));
    expect(st.advice?.kind).toBe('heavier');
    expect(st.loadKg).toBe(15);
  });
  it('points at the missing plates for a pair at 5 kg', () => {
    const st = exerciseStatus(ex('curl'), state, EQ, sets('curl', 'Curl', 's1', '2026-01-02', 5, [15, 15, 15]));
    expect(st.advice?.kind).toBe('needs-plates');
    expect(st.advice?.text).toContain('Next is 7.5 kg, which needs the 1.25 kg plates');
    expect(st.loadKg).toBe(5);
  });
  it('switches to a harder variant before adding load', () => {
    const st = exerciseStatus(ex('hinge'), state, EQ, sets('hinge', 'Hinge', 's1', '2026-01-02', 10, [15, 15, 15]));
    expect(st.advice?.kind).toBe('variant');
    expect(st.advice?.toVariant).toBe(1);
    const after = exerciseStatus(ex('hinge'), { variants: { hinge: 1 }, band: {} }, EQ, sets('hinge', 'Hinge', 's1', '2026-01-02', 10, [15, 15, 15]));
    expect(after.name).toBe('Hard hinge');
    expect(after.advice).toBeUndefined();
    expect(after.loadKg).toBe(10);
  });
  it('moves bodyweight work onto dumbbells at the top', () => {
    const st = exerciseStatus(ex('lunge'), state, EQ, sets('lunge', 'Lunge', 's1', '2026-01-02', null, [12, 12], { sides: ['L', 'R'] }));
    expect(st.advice?.kind).toBe('add-load');
    expect(st.loadKg).toBe(5);
  });
  it('doubles the band', () => {
    const st = exerciseStatus(ex('band'), state, EQ, sets('band', 'Band pull', 's1', '2026-01-02', null, [20, 20, 20]));
    expect(st.advice?.kind).toBe('band');
    expect(st.band).toBe('Doubled band');
  });
  it('keeps the last load when the range is not finished', () => {
    const st = exerciseStatus(ex('press'), state, EQ, sets('press', 'Press', 's1', '2026-01-02', 10, [15, 13, 12]));
    expect(st.advice).toBeUndefined();
    expect(st.loadKg).toBe(10);
  });
  it('starts from the plan load with no history', () => {
    expect(exerciseStatus(ex('press'), state, EQ, []).loadKg).toBe(10);
    expect(exerciseStatus(ex('lunge'), state, EQ, []).loadKg).toBeNull();
  });
  it('flags the gym trigger at 20 kg for 3 × 12 on both sides', () => {
    const t = PLAN.triggers![0];
    expect(triggerMet(t, sets('row', 'Row', 's1', '2026-01-02', 20, [12, 12, 12], { sides: ['L', 'R'] }))).toBe(true);
    expect(triggerMet(t, sets('row', 'Row', 's1', '2026-01-02', 20, [12, 12, 11], { sides: ['L', 'R'] }))).toBe(false);
    expect(triggerMet(t, sets('row', 'Row', 's1', '2026-01-02', 15, [15, 15, 15], { sides: ['L', 'R'] }))).toBe(false);
  });
});

describe('marks', () => {
  const prior = sets('press', 'Press', 's1', '2026-01-02', 10, [12, 11, 10]);
  it('gives no marks in the first session', () => {
    expect(markFor({ setNo: 1, side: 'both', loadKg: 10, reps: 12 }, [], [])).toBeUndefined();
  });
  it('marks a record, a beat and a match', () => {
    expect(markFor({ setNo: 1, side: 'both', loadKg: 10, reps: 13 }, prior, prior)).toBe('!!');
    expect(markFor({ setNo: 2, side: 'both', loadKg: 10, reps: 12 }, prior, prior)).toBe('!');
    expect(markFor({ setNo: 3, side: 'both', loadKg: 10, reps: 10 }, prior, prior)).toBe('=');
    expect(markFor({ setNo: 3, side: 'both', loadKg: 10, reps: 9 }, prior, prior)).toBeUndefined();
  });
  it('counts the same reps with a slower lowering as harder', () => {
    expect(markFor({ setNo: 3, side: 'both', loadKg: 10, reps: 10, tempo: true }, prior, prior)).toBe('!');
  });
  it('calls a heavier load than ever a record', () => {
    expect(markFor({ setNo: 1, side: 'both', loadKg: 15, reps: 10 }, prior, prior, 10)).toBe('!!');
  });
  it('rolls set marks up to the exercise', () => {
    expect(exerciseMark([{ mark: '!' }, { mark: '=' }])).toBe('!');
    expect(exerciseMark([{ mark: '=' }, { mark: '=' }])).toBe('=');
    expect(exerciseMark([{ mark: '=' }, { mark: undefined }])).toBeUndefined();
  });
});
