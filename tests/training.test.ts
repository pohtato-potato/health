import { describe, expect, it } from 'vitest';
import { chipLoads, isBigJump, loadOptions, nextLoad } from '../src/domain/loads';
import type { SetEntry } from '../src/domain/types';
import { exerciseMark, markFor } from '../src/domain/marks';
import { buildSession, findExercise, groupExercises, isPlaceholder, measured, measureOf, nextSessionId, realSets, sidesFor, targetText, topOfRange, validatePlan, valueOfSet } from '../src/domain/plan';
import { adviceTonight, exerciseStatus, ladder, heavierOffer, hitTop, loadSoFar, loadTonight, triggerMet } from '../src/domain/progression';
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
    // v2: heavier is offered, never pre-filled.
    expect(st.loadKg).toBe(10);
    expect(st.advice?.toKg).toBe(15);
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
    expect(st.loadKg).toBeNull();
    expect(st.advice?.toKg).toBe(5);
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

describe('v2 session rules', () => {
  const eqNoSmall = { ...EQ, plates: [EQ.plates[0]] };
  const topSquats = (extra: Partial<SetEntry> = {}) => sets('squat', 'Squat', 's1', '2026-01-02', 10, [15, 15, 15], { tempo: true }).map((x) => ({ ...x, ...extra }));

  it('realSets drops skipped', () => {
    const xs = [...topSquats(), { ...topSquats()[0], id: 'sk', skipped: true }];
    expect(realSets(xs)).toHaveLength(3);
  });

  it('skipped sets excluded from last time', () => {
    const before = sets('squat', 'Squat', 's1', '2026-01-02', 10, [12, 12, 12]);
    const skippedAll = sets('squat', 'Squat', 's2', '2026-01-05', null, [0, 0, 0]).map((x) => ({ ...x, skipped: true, reps: undefined }));
    const st = exerciseStatus(ex('squat'), state, EQ, [...before, ...skippedAll]);
    expect(st.last?.sessionId).toBe('s1');
    expect(st.loadKg).toBe(10);
  });

  it('isPlaceholder', () => {
    expect(isPlaceholder({ reps: 1, loadKg: null })).toBe(true);
    expect(isPlaceholder({ reps: 1, loadKg: 10 })).toBe(false);
    expect(isPlaceholder({ seconds: 45, loadKg: null })).toBe(false);
    expect(isPlaceholder({ steps: 70, loadKg: 10 })).toBe(false);
  });

  it('chipLoads lists the loads the kit can make', () => {
    expect(chipLoads(EQ, 'single')).toEqual([5, 10, 15, 20]);
    const kit = { plates: [{ kg: 2.5, count: 8, owned: true }], fixed: [1, 2.5, 5, 10], band: true, bench: 'Bed' };
    expect(chipLoads(kit, 'pair')).toEqual([1, 2.5, 5, 10]);
    expect(chipLoads({ ...kit, fixed: [...kit.fixed, 7.5] }, 'pair')).toContain(7.5);
  });

  it('heavierOffer requires form gate', () => {
    const st = exerciseStatus(ex('squat'), state, eqNoSmall, topSquats({ form: 5, rir: 2 }));
    expect(heavierOffer(st)).toMatchObject({ from: 10, to: 15 });
    expect(heavierOffer(st)?.case.join(' ')).toContain('15');
    const sloppy = exerciseStatus(ex('squat'), state, eqNoSmall, topSquats({ form: 3, rir: 2 }));
    expect(heavierOffer(sloppy)).toBeUndefined();
    const grinding = exerciseStatus(ex('squat'), state, eqNoSmall, topSquats({ form: 5, rir: 0 }));
    expect(heavierOffer(grinding)).toBeUndefined();
    expect(heavierOffer(exerciseStatus(ex('squat'), state, eqNoSmall, sets('squat', 'Squat', 's1', '2026-01-02', 10, [12, 12, 12])))).toBeUndefined();
  });

  it('declining heavier keeps previous load', () => {
    const st = exerciseStatus(ex('squat'), state, eqNoSmall, topSquats({ form: 5, rir: 2 }));
    expect(loadTonight(st, 'no')).toBe(10);
    expect(loadTonight(st, undefined)).toBe(10);
    expect(loadTonight(st, 'yes')).toBe(15);
  });

  it('first side R then L follows', () => {
    const per = { ...ex('squat'), perSide: true, lead: undefined };
    expect(sidesFor(per, 'R')).toEqual(['R', 'L']);
    expect(sidesFor(per, undefined)).toEqual(['L', 'R']);
    expect(sidesFor({ ...per, lead: 'L' }, 'R')).toEqual(['L', 'R']);
    expect(sidesFor(ex('squat'), 'R')).toEqual(['both']);
  });

  it('carry logs steps', () => {
    const carry = { ...ex('squat'), measure: 'steps' as const, steps: [60, 90] as [number, number], reps: undefined };
    expect(measureOf(carry)).toBe('steps');
    expect(measured(carry, 72)).toEqual({ steps: 72 });
    expect(valueOfSet({ steps: 72 })).toBe(72);
    expect(topOfRange(carry)).toBe(90);
  });

  it('the next set keeps tonight’s load, ignoring a skipped set before it', () => {
    const done = sets('squat', 'Squat', 'now', '2026-01-09', 12.5, [12]);
    const skipped = { ...done[0], id: 'sk', setNo: 2, at: done[0].at + 1, loadKg: null, reps: undefined, skipped: true };
    expect(loadSoFar([...done, skipped], 'squat', 10)).toBe(12.5);
    expect(loadSoFar([skipped], 'squat', 10)).toBe(10);
  });

  it('the advice line follows the heavier answer', () => {
    const eqNoSmall2 = { ...EQ, plates: [EQ.plates[0]] };
    const solid = exerciseStatus(ex('squat'), state, eqNoSmall2, sets('squat', 'Squat', 's1', '2026-01-02', 10, [15, 15, 15], { tempo: true }).map((x) => ({ ...x, form: 5 as const, rir: 2 })));
    expect(adviceTonight(solid, 'yes')).toBe('Tonight: 15 kg, up from 10.');
    expect(adviceTonight(solid, 'no')).toBe('Staying at 10 kg tonight. Heavier is offered again next time.');
    const shaky = exerciseStatus(ex('squat'), state, eqNoSmall2, sets('squat', 'Squat', 's1', '2026-01-02', 10, [15, 15, 15], { tempo: true }).map((x) => ({ ...x, form: 3 as const })));
    expect(adviceTonight(shaky, undefined)).toBe('15 kg is next, once every set is solid (form 4+) with a rep in reserve. Tonight, 10 kg.');
  });

  it('gate blocks heavier on form 3', () => {
    const eqNoSmall3 = { ...EQ, plates: [EQ.plates[0]] };
    const st = exerciseStatus(ex('squat'), state, eqNoSmall3, sets('squat', 'Squat', 's1', '2026-01-02', 10, [15, 15, 15], { tempo: true }).map((x) => ({ ...x, form: 3 as const })));
    expect(st.advice?.kind).toBe('form-first');
    expect(st.advice?.toKg).toBeUndefined();
    expect(st.loadKg).toBe(10);
  });

  it('ladder resets reps at new load', () => {
    const at10 = sets('squat', 'Squat', 's1', '2026-01-02', 10, [15, 15, 15]);
    const at15 = sets('squat', 'Squat', 's2', '2026-01-05', 15, [13, 13, 12]);
    const l10 = ladder(ex('squat'), at10);
    expect(l10.rungs.every((r) => r.done)).toBe(true);
    const l15 = ladder(ex('squat'), [...at10, ...at15]);
    expect(l15.load).toBe(15);
    expect(l15.rungs.filter((r) => r.done).map((r) => r.reps)).toEqual([12]);
    expect(l15.rungs.map((r) => r.reps)).toEqual([12, 13, 14, 15]);
  });
});
