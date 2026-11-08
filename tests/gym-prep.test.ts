// Train gym prep (O21, coach reply 8 Nov): gym load kinds, home and gym rotations, the coach's tags,
// skip reasons, the lighter-week rule, the body log and the coach export.
import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { cutShort, halfSets, halfWhy, lighterCase, sickOn, type LighterInput } from '../src/domain/deload';
import {
  coachTags,
  countsAsKg,
  heavyFirstOffer,
  heavyFirstOrder,
  isGymExercise,
  weekGuide,
  lightWarmup,
  loadText,
  machineUnit,
  protectedLeft,
  safetyFor,
  unitFor,
  GYM_SAFETY,
} from '../src/domain/gym';
import { markFor, newLoad, recordBar } from '../src/domain/marks';
import { nextInLoop, placeOfSession, rotationOf, validatePlan, type ExerciseDef, type PlanDef } from '../src/domain/plan';
import { exerciseStatus, workingLoad } from '../src/domain/progression';
import { medalsFor } from '../src/domain/records';
import { loadBlocks } from '../src/domain/sessionEdges';
import type { BodyEntry, Day, SetEntry, TrainingSession } from '../src/domain/types';
import { workbookSheets } from '../src/export/workbook';
import { exerciseChains } from '../src/football/players/catalogue';
import { profileStarts } from '../src/football/players/identity';
import { nextUp } from '../src/state/derived';
import { EQ } from './fixtures';

const ex = (id: string, o: Partial<ExerciseDef> = {}): ExerciseDef => ({ id, order: '1', name: id, sets: 3, reps: [8, 12], load: 'pair', ...o });

const GYM_PLAN: PlanDef = {
  format: 'health-plan',
  version: 2,
  name: 'Home and gym',
  from: '2026-11-20',
  rotation: ['A', 'B'],
  rotations: { home: ['A', 'B'], gym: ['G1', 'G2'] },
  weeklyTarget: { gym: 2, home: 2 },
  sessions: [
    { id: 'A', name: 'A', focus: '', minutes: 50, short: [], exercises: [ex('ohp', { order: '1' }), ex('curl', { order: '2', startKg: 10 })] },
    { id: 'B', name: 'B', focus: '', minutes: 50, short: [], exercises: [ex('row', { order: '1' })] },
    {
      id: 'G1',
      name: 'G1',
      focus: '',
      minutes: 60,
      short: [],
      exercises: [
        ex('leg-press', { load: 'plates', machine: 'Leg press', sledKg: 40 }),
        ex('lat-pulldown', { order: '2', load: 'stack', machine: 'Lat pulldown', kit: 'cable', family: 'pull-vertical' }),
        ex('barbell-rdl', { order: '3', load: 'barbell', replaces: 'rdl', family: 'hinge', kit: 'barbell' }),
      ],
    },
    { id: 'G2', name: 'G2', focus: '', minutes: 60, short: [], exercises: [ex('assisted-pullup', { load: 'assist', machine: 'Assisted pull-up', unit: 'kg' })] },
  ],
  flags: [],
  gymSafety: [{ title: 'Eyes', text: 'Breathe out on every effort.' }],
};

const done = (id: string, session: string, date: string, extra: Partial<TrainingSession> = {}): TrainingSession =>
  ({ id, date, session, planName: 'x', startedAt: Date.parse(`${date}T18:00:00`), endedAt: Date.parse(`${date}T19:00:00`), status: 'done', short: false, exercises: [], ...extra }) as TrainingSession;

const set = (o: Partial<SetEntry>): SetEntry => ({ id: Math.random().toString(36), sessionId: 's1', date: '2026-11-01', session: 'A', exerciseId: 'x', exercise: 'x', setNo: 1, side: 'both', loadKg: null, at: 0, ...o }) as SetEntry;

describe('gym load kinds', () => {
  it('a plan with barbell, stack, plates and assist work, rotations and safety lines imports', () => {
    expect(validatePlan(GYM_PLAN)).toEqual([]);
  });

  it('a bad load kind, unit, rotation or safety list is refused with a reason', () => {
    const bad = { ...GYM_PLAN, sessions: [{ ...GYM_PLAN.sessions[0], exercises: [ex('x', { load: 'kettle' as never, unit: 'stone' as never })] }] };
    const errs = validatePlan(bad);
    expect(errs.join(' ')).toMatch(/unknown load type/);
    expect(errs.join(' ')).toMatch(/unknown unit/);
    expect(validatePlan({ ...GYM_PLAN, rotations: { home: ['A'], gym: ['A'] } }).join(' ')).toMatch(/both the home and the gym/);
    expect(validatePlan({ ...GYM_PLAN, rotations: { home: ['A'], gym: ['G9'] } }).join(' ')).toMatch(/G9/);
    expect(validatePlan({ ...GYM_PLAN, gymSafety: ['eyes'] as never }).join(' ')).toMatch(/gymSafety/);
  });

  it('each kind says what its number means; a stack keeps its own unit per machine', () => {
    const settings = { machineUnits: { 'lat pulldown': 'lb' as const } };
    const [press, pull, rdl] = GYM_PLAN.sessions[2].exercises;
    expect(unitFor(press, {})).toBe('plates');
    expect(unitFor(rdl, {})).toBe('kg');
    expect(unitFor(pull, {})).toBe('kg');
    expect(unitFor(pull, settings)).toBe('lb');
    expect(machineUnit(GYM_PLAN.sessions[3].exercises[0], {})).toBe('kg');
    expect(unitFor(GYM_PLAN.sessions[3].exercises[0], {})).toBe('assist-kg');
    expect(loadText('barbell', 40, 'kg')).toBe('40 kg total');
    expect(loadText('stack', 7, 'lb')).toBe('stack 7 lb');
    expect(loadText('stack', 7, 'stack')).toBe('stack 7');
    expect(loadText('plates', 3, 'plates')).toBe('3 plates added');
    expect(loadText('assist', 25, 'assist-kg')).toBe('assist 25 kg');
    // Only real kilograms join "kg moved".
    expect(countsAsKg({})).toBe(true);
    expect(countsAsKg({ loadUnit: 'kg' })).toBe(true);
    expect(['lb', 'stack', 'plates', 'assist-kg'].some((u) => countsAsKg({ loadUnit: u as never }))).toBe(false);
  });

  it('on an assisted machine, less assist is the record and the working load', () => {
    const prior = [set({ loadKg: 30, reps: 8, sessionId: 'a' }), set({ loadKg: 25, reps: 6, sessionId: 'b' })];
    // 20 kg of assist is harder than anything before: a first time at this load.
    expect(newLoad({ side: 'both', loadKg: 20 }, prior, { lowerIsHarder: true })).toBe(true);
    expect(newLoad({ side: 'both', loadKg: 35 }, prior, { lowerIsHarder: true })).toBe(false);
    // At 25 kg of assist, the bar is the 6 done there (30 kg of assist is easier and doesn't count).
    expect(recordBar({ side: 'both', loadKg: 25 }, prior, 1, { lowerIsHarder: true })).toBe(6);
    expect(markFor({ setNo: 1, side: 'both', loadKg: 25, reps: 7 }, prior, [], 1, { lowerIsHarder: true })).toBe('!!');
    expect(workingLoad([set({ loadKg: 30 }), set({ loadKg: 25 })], true)).toBe(25);
    const medals = medalsFor({ id: 'x', load: 'assist' }, [set({ exerciseId: 'x', sessionId: 'a', loadKg: 30, reps: 8 }), set({ exerciseId: 'x', sessionId: 'b', loadKg: 20, reps: 8 })]);
    expect(medals[0].loadKg).toBe(20);
  });

  it('gym work at the top of the range is told the next step, never a converted number', () => {
    const lp = GYM_PLAN.sessions[2].exercises[1];
    const top = [1, 2, 3].map((n) => set({ exerciseId: lp.id, exercise: lp.name, setNo: n, loadKg: 7, reps: 12, at: n }));
    const st = exerciseStatus(lp, undefined, EQ, top);
    expect(st.loadKg).toBe(7);
    expect(st.advice?.kind).toBe('next-step');
    expect(st.advice?.toKg).toBeUndefined();
    expect(st.advice?.text).toMatch(/one step up the stack/);
    const assist = GYM_PLAN.sessions[3].exercises[0];
    const atTop = [1, 2, 3].map((n) => set({ exerciseId: assist.id, exercise: assist.name, setNo: n, loadKg: 25, reps: 12, at: n }));
    expect(exerciseStatus(assist, undefined, EQ, atTop).advice?.text).toMatch(/less assist/);
  });

  it('every gym exercise carries the safety lines: the plan’s own, else the generic ones; home work none', () => {
    const [press] = GYM_PLAN.sessions[2].exercises;
    expect(isGymExercise(press)).toBe(true);
    expect(isGymExercise(ex('curl'))).toBe(false);
    expect(isGymExercise(ex('cable-curl', { kit: 'cable' }))).toBe(true);
    expect(safetyFor(press, GYM_PLAN)).toEqual(GYM_PLAN.gymSafety);
    expect(safetyFor(press, {})).toEqual(GYM_SAFETY);
    expect(GYM_SAFETY.map((x) => x.title)).toEqual(['Eyes', 'Knees']);
    expect(safetyFor(ex('curl'), GYM_PLAN)).toEqual([]);
  });
});

describe('home and gym rotations', () => {
  it('each place has its own loop, and one never moves the other', () => {
    expect(rotationOf(GYM_PLAN, 'home')).toEqual(['A', 'B']);
    expect(rotationOf(GYM_PLAN, 'gym')).toEqual(['G1', 'G2']);
    expect(placeOfSession(GYM_PLAN, 'G2')).toBe('gym');
    expect(placeOfSession(GYM_PLAN, 'B')).toBe('home');
    const log = [done('1', 'A', '2026-11-20'), done('2', 'G1', '2026-11-21'), done('3', 'G2', '2026-11-22'), done('4', 'G1', '2026-11-24')];
    expect(nextInLoop(GYM_PLAN, log, undefined, 'home')).toBe('B');
    expect(nextInLoop(GYM_PLAN, log, undefined, 'gym')).toBe('G2');
    // A home session doesn't touch the gym loop.
    expect(nextInLoop(GYM_PLAN, [...log, done('5', 'B', '2026-11-25')], undefined, 'gym')).toBe('G2');
  });

  it('a plan with one rotation works as before', () => {
    const one: PlanDef = { ...GYM_PLAN, rotations: undefined };
    expect(rotationOf(one, 'gym')).toEqual(['A', 'B']);
    expect(nextInLoop(one, [done('1', 'A', '2026-11-20')])).toBe('B');
  });

  it('Train’s next-up follows the picked place, and the last one in that loop', () => {
    const settings = { ...defaultSettings(), plan: GYM_PLAN, equipment: EQ };
    const log = [done('1', 'A', '2026-11-20'), done('2', 'G1', '2026-11-21')];
    expect(nextUp(settings, log, [], [], false, 'gym')).toMatchObject({ sessionId: 'G2', lastDone: { session: 'G1' } });
    expect(nextUp(settings, log, [], [], false, 'home')).toMatchObject({ sessionId: 'B', lastDone: { session: 'A' } });
  });

  it('the weekly target is a guide, with what each place has done', () => {
    const log = [done('1', 'A', '2026-11-23'), done('2', 'G1', '2026-11-24', { place: 'gym' })];
    expect(weekGuide(GYM_PLAN, log, '2026-11-25')).toBe('Guide: 2 gym + 2 home a week · this week 1 gym, 1 home. Every session counts.');
    expect(weekGuide({ ...GYM_PLAN, weeklyTarget: undefined }, log, '2026-11-25')).toBe('So far this week 1 gym, 1 home.');
  });
});

describe('the coach’s tags', () => {
  it('reverse-curl is grip and pullover is pull-vertical; a plan’s own tags win', () => {
    expect(coachTags(ex('reverse-curl'))).toMatchObject({ family: 'grip', kit: 'dumbbell' });
    expect(coachTags(ex('pullover'))).toMatchObject({ family: 'pull-vertical' });
    expect(coachTags(ex('wrist-curl')).family).toBe('grip');
    expect(coachTags(ex('rdl', { family: 'squat' })).family).toBe('squat');
    expect(coachTags(ex('new-machine', { load: 'stack' })).kit).toBe('machine');
  });

  it('a gym lift that replaces a home one stays the same player, using layer 2’s chains', () => {
    const planned = new Map(GYM_PLAN.sessions.flatMap((s) => s.exercises).map((e) => [e.id, e]));
    const chains = exerciseChains(planned, new Set([...planned.keys(), 'rdl']));
    expect(chains.get('rdl')).toEqual(['rdl', 'barbell-rdl']);
  });

  it('a variant that steps up is a profile change: the baseline resets, the player stays (layer 1’s detection)', () => {
    const xs = [
      set({ exerciseId: 'split-squat', exercise: 'Split squat', date: '2026-10-10', at: 1 }),
      set({ exerciseId: 'split-squat', exercise: 'Bulgarian split squat', date: '2026-10-20', at: 2 }),
    ];
    expect(profileStarts(xs)).toEqual(['2026-10-20']);
  });

  it('progression counts a harder variant from scratch, so fewer reps there is no decline', () => {
    const pushup = ex('incline-pushup', { load: 'body', reps: [8, 15], variants: [{ name: 'Low incline push-up' }] });
    const base = [1, 2, 3].map((n) => set({ exerciseId: pushup.id, exercise: 'incline-pushup', setNo: n, reps: 15, at: n }));
    const st = exerciseStatus(pushup, { variants: { 'incline-pushup': 1 }, band: {} }, EQ, base);
    expect(st.name).toBe('Low incline push-up');
    expect(st.last).toBeUndefined();
  });
});

describe('the lighter week', () => {
  const sess = (date: string, extra: Partial<TrainingSession> = {}) => done(date, 'A', date, { exercises: ['a', 'b'], ...extra });
  const base = (o: Partial<LighterInput> = {}): LighterInput => ({ sessions: [], sets: [], days: [], ...o });
  const today = '2026-11-14';

  it('one rule alone is not enough; any two are', () => {
    // Six weeks of steady training, nothing else.
    const weeks = Array.from({ length: 7 }, (_, i) => sess(`2026-10-${String(1 + i * 6).padStart(2, '0')}`));
    weeks.push(sess('2026-11-10'));
    const steady = lighterCase(base({ sessions: weeks, sets: weeks.flatMap((s) => [set({ sessionId: s.id, exerciseId: 'a' }), set({ sessionId: s.id, exerciseId: 'b' })]) }), today);
    expect(steady.rules).toBe(1);
    expect(steady.due).toBe(false);
    expect(steady.evidence[0]).toMatch(/6 weeks/);
    // Plus two sick days this week: due.
    const days: Pick<Day, 'date' | 'status'>[] = [{ date: '2026-11-12', status: 'sick' }, { date: '2026-11-13', status: 'sick' }];
    const sick = lighterCase(base({ sessions: weeks, sets: steady.rules ? weeks.flatMap((s) => [set({ sessionId: s.id, exerciseId: 'a' }), set({ sessionId: s.id, exerciseId: 'b' })]) : [], days }), today);
    expect(sick.due).toBe(true);
    expect(sick.evidence.join(' ')).toMatch(/sick on 2 days/);
  });

  it('cut-short sessions and pain flags make the case together', () => {
    const s1 = sess('2026-11-10');
    const s2 = sess('2026-11-12');
    // Each reached only one of its two exercises.
    const sets = [set({ sessionId: s1.id, exerciseId: 'a', date: s1.date }), set({ sessionId: s2.id, exerciseId: 'a', date: s2.date })];
    expect(cutShort(s1, sets)).toBe(true);
    expect(cutShort(s1, [...sets, set({ sessionId: s1.id, exerciseId: 'b', skipped: true })])).toBe(false);
    const body: Pick<BodyEntry, 'date' | 'kind'>[] = [{ date: '2026-11-05', kind: 'pain' }, { date: '2026-11-11', kind: 'strain' }];
    const c = lighterCase(base({ sessions: [s1, s2], sets, body }), today);
    expect(c.due).toBe(true);
    expect(c.evidence.join(' ')).toMatch(/ended early/);
    expect(c.evidence.join(' ')).toMatch(/Pain came up 2 times/);
    // Soreness alone isn't pain.
    expect(lighterCase(base({ sessions: [s1, s2], sets, body: [{ date: '2026-11-11', kind: 'sore' }] }), today).due).toBe(false);
  });

  it('short sleep over the week counts, from 3 nights logged', () => {
    const night = (date: string) => ({ date, sleep: { asleep: 60, woke: 60 + 5 * 60 } });
    const days = [night('2026-11-11'), night('2026-11-12'), night('2026-11-13'), { date: '2026-11-13', status: 'sick' as const }, { date: '2026-11-14', status: 'sick' as const }];
    const c = lighterCase(base({ days }), today);
    expect(c.evidence.join(' ')).toMatch(/Sleep averaged 5 h/);
    expect(c.due).toBe(true);
  });

  it('a lighter week means half the sets, never fewer than one', () => {
    expect([1, 2, 3, 4, 5].map(halfSets)).toEqual([1, 1, 2, 2, 3]);
  });

  it('the first session after a lighter week, a break or 2+ sick days is at half sets', () => {
    const lw = { from: '2026-11-15', to: '2026-11-19' };
    expect(halfWhy(base({ sessions: [sess('2026-11-17')], lighterWeek: lw }), '2026-11-18')).toBe('lighter-week');
    expect(halfWhy(base({ sessions: [sess('2026-11-14')], lighterWeek: lw }), '2026-11-20')).toBe('back');
    // After one session back, the next is full.
    expect(halfWhy(base({ sessions: [sess('2026-11-14'), sess('2026-11-20')], lighterWeek: lw }), '2026-11-22')).toBeUndefined();
    // 10+ days off is a break; a once-a-week rhythm isn't.
    expect(halfWhy(base({ sessions: [sess('2026-11-01')] }), '2026-11-11')).toBe('back');
    expect(halfWhy(base({ sessions: [sess('2026-11-01')] }), '2026-11-08')).toBeUndefined();
    // A trip of 3+ days is a break too.
    expect(halfWhy(base({ sessions: [sess('2026-11-10')], occasions: [{ kind: 'travel', from: '2026-11-11', to: '2026-11-14' }] }), '2026-11-15')).toBe('back');
    // Two sick days since the last session.
    const days = [{ date: '2026-11-11', status: 'sick' as const }, { date: '2026-11-12', status: 'sick' as const }];
    expect(halfWhy(base({ sessions: [sess('2026-11-10')], days }), '2026-11-13')).toBe('back');
    expect(halfWhy(base({ sessions: [sess('2026-11-10')], days: days.slice(0, 1) }), '2026-11-13')).toBeUndefined();
  });

  it('a sick day is read from the day or a sick occasion', () => {
    expect(sickOn('2026-11-04', [{ date: '2026-11-04', status: 'sick' }])).toBe(true);
    expect(sickOn('2026-11-04', [], [{ kind: 'sick', from: '2026-11-03', to: '2026-11-05' }])).toBe(true);
    expect(sickOn('2026-11-04', [{ date: '2026-11-04', status: 'travelling' }])).toBe(false);
  });
});

describe('start with the heavy block', () => {
  const plan = [ex('ohp', { order: '1' }), ex('lateral', { order: '2' }), ex('row', { order: '3' }), ex('curl', { order: '4' }), ex('plank', { order: '5', load: 'body' })];
  const kg: Record<string, number | null> = { ohp: 5, lateral: 5, row: 10, curl: 10, plank: null };
  const blocks = loadBlocks(plan, (e) => kg[e.id]);

  it('is offered when the plan starts light and a heavier block follows, protecting the light work', () => {
    const offer = heavyFirstOffer(blocks)!;
    expect(offer).toMatchObject({ heavyKg: 10, lightKg: 5, protect: ['ohp', 'lateral'] });
    expect(heavyFirstOrder(blocks, 10)).toEqual(['row', 'curl', 'plank', 'ohp', 'lateral']);
    expect(heavyFirstOffer(loadBlocks(plan, (e) => (e.id === 'plank' ? null : 10)))).toBeUndefined();
  });

  it('asks once about the protected work only while none of it is done (a skip counts as a choice)', () => {
    expect(protectedLeft(['ohp', 'lateral'], [{ exerciseId: 'row' }])).toEqual(['ohp', 'lateral']);
    expect(protectedLeft(['ohp', 'lateral'], [{ exerciseId: 'ohp' }])).toEqual(['lateral']);
  });

  it('the overhead press warms up with the lightest pair', () => {
    expect(lightWarmup(2.5)).toBe('Warm up with the 2.5 kg pair: 8 easy reps. Any pinch ends the exercise.');
  });
});

describe('the coach export', () => {
  const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 12000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };
  const settings = { ...defaultSettings(), setupDone: true, targets: [{ from: '2026-09-01', targets: T }], plan: GYM_PLAN };
  const s1 = done('s1', 'G1', '2026-11-21', { place: 'gym', half: 'back', heavyFirst: false, exercises: ['leg-press', 'lat-pulldown', 'barbell-rdl'] });
  const sets = [
    set({ sessionId: 's1', date: '2026-11-21', session: 'G1', exerciseId: 'leg-press', exercise: 'Leg press', loadKg: 3, loadUnit: 'plates', reps: 12, at: 1 }),
    set({ sessionId: 's1', date: '2026-11-21', session: 'G1', exerciseId: 'lat-pulldown', exercise: 'Lat pulldown', loadKg: 30, loadUnit: 'kg', reps: 10, at: 2 }),
    set({ sessionId: 's1', date: '2026-11-21', session: 'G1', exerciseId: 'lat-pulldown', exercise: 'Lat pulldown', setNo: 2, skipped: true, skipWhy: 'worried', at: 3 }),
  ];
  const body: BodyEntry[] = [
    { id: 'b1', date: '2026-11-21', at: Date.parse('2026-11-21T18:20:00'), part: 'Knee', side: 'L', kind: 'pain', note: 'sharp at depth', exerciseId: 'leg-press', exercise: 'Leg press', setNo: 1, setSide: 'both', sessionId: 's1' },
  ];
  const sheets = workbookSheets({ settings, days: [], foods: [], entries: [], sessions: [s1], sets, measurements: [], body }, new Date('2026-11-22T10:00:00'));
  const sheet = (name: string) => sheets.find((s) => s.name === name)!;
  const col = (name: string, row: unknown[], key: string) => row[sheet(name).rows[0].indexOf(key)];

  it('sets carry the skip reason and what a gym load means', () => {
    const rows = sheet('Sets').rows.slice(1);
    expect(col('Sets', rows[0], 'load_unit')).toBe('plates');
    expect(col('Sets', rows[2], 'skip_reason')).toBe('Worried about injury');
    expect(col('Sets', rows[2], 'skipped')).toBe(true);
  });

  it('sessions carry the place, half sets and an early end; kg moved counts real kilograms only', () => {
    const row = sheet('Sessions').rows[1];
    expect(col('Sessions', row, 'place')).toBe('gym');
    expect(col('Sessions', row, 'half_sets')).toBe('First session back');
    expect(col('Sessions', row, 'ended_early')).toBe(true);
    // 30 kg × 10 on the stack; the 3 plates aren't kilograms.
    expect(col('Sessions', row, 'kg_moved')).toBe(300);
  });

  it('the body log has date, time, part, kind and note, with the exercise and set it came from', () => {
    const rows = sheet('Body log').rows;
    expect(rows[0].slice(0, 6)).toEqual(['date', 'time', 'body_part', 'side', 'kind', 'note']);
    expect(rows[1]).toEqual(['2026-11-21', expect.stringMatching(/18:20|6:20/), 'Knee', 'L', 'pain', 'sharp at depth', 'Leg press', 1, 'both', 'leg-press']);
  });

  it('the plan sheet carries the tags, kit and rotation', () => {
    const rows = sheet('Plan').rows;
    const rdl = rows.find((r) => r[8] === 'barbell-rdl')!;
    expect(col('Plan', rdl, 'family')).toBe('hinge');
    expect(col('Plan', rdl, 'replaces')).toBe('rdl');
    expect(col('Plan', rdl, 'rotation')).toBe('gym');
    expect(col('Plan', rdl, 'load')).toBe('barbell, total kg');
  });
});
