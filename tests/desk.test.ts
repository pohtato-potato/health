// The manager's desk, Fork 1 (desk-and-world spec §2–3, §8, §13). Rules only; made-up days.
import { describe, expect, it } from 'vitest';
import type { AxisInput } from '../src/football/axes';
import { dieFromScore, diceFor, formOf, hoursInWords, reasonFor } from '../src/football/desk/dice';
import { clockDone, clockFilled, coursePasses, diceLeft, openClocks, unspentResearch } from '../src/football/desk/rules';
import { spendDie, spendSeed } from '../src/football/desk/spend';
import { JOBS, jobById } from '../src/football/desk/jobs';
import { ACADEMY_GROWTH } from '../src/football/desk/jobs/academy';
import { deskFold, pushProject } from '../src/football/desk/fold';
import { drawCourse, eyeChoices, eyeLevel, grade, importQuestions, lifelineStrikes, parseCsv, PASS_AT, sameAnswer, toNextEye } from '../src/football/desk/course';
import { speakers, voiceLine } from '../src/football/desk/words';
import { emptyDesk, qualityOf, segmentsFor, type DeskState, type DeskView, type Die, type JobDef } from '../src/football/desk/types';
import { readOf } from '../src/football/matchday';
import { readScouted, scoutLevel } from '../src/football/store/paused';
import { emptyEngine } from '../src/football/tree/types';
import { rng } from '../src/football/rng';
import type { AxisValues } from '../src/football/types';
import type { Question } from '../src/football/desk/content';

const TARGETS = { steps: 10000, kcalMin: 1900, kcalMax: 2300, proteinG: 120, sessionsPerWeek: 4, sleepMin: 420 } as unknown as AxisInput['targets'];
const input = (o: Partial<AxisInput> = {}): AxisInput => ({
  kcal: 2000, protein: 130, foodLogged: true, sessionsToday: [], weekDoneBefore: 1, weekdayMon1: 3, daysSinceLast: 1,
  targets: TARGETS, checklist: [{ id: 'c1', name: 'Floss', active: true, slots: [{}, {}, {}] }] as unknown as AxisInput['checklist'],
  weighIns7: 5, waist7: false, history: { Pace: 30, Power: 30, Fuel: 30, Rest: 30, Routine: 30, Shape: 30 },
  day: { date: '2030-03-04', steps: 16400, sleep: { asleep: 120, woke: 390 }, ticks: { 'c1:0': 1, 'c1:1': 1 } } as unknown as AxisInput['day'],
  ...o,
});
const V = (n: number): AxisValues => ({ Pace: n, Power: n, Fuel: n, Rest: n, Routine: n, Shape: n });
const die = (axis: Die['axis'], value: Die['value']): Die => ({ axis, value, score: value * 3, reason: `${axis} reason` });
const view = (o: Partial<DeskView> = {}): DeskView => ({
  date: '2030-03-05', opp: { id: 'club-a', name: 'Hull', style: 'possession' }, oppKnown: 'none',
  youth: [{ id: 'y1', name: 'Jonas', axis: 'Pace', growth: 3, potential: 4 }],
  projects: [{ id: 'kaai-stand', name: 'Kaai Stand', worst: { what: 'training', have: 4, count: 12 } }],
  columnLines: [{ id: 'col-1', text: 'Keep the quay loud.' }],
  questions: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'], answered: [], spentToday: {}, clocks: [], ...o,
});
const deskWith = (dice: Die[], date = '2030-03-05'): DeskState => ({ ...emptyDesk(), dice: { [date]: dice } });

describe('dice by fixed bands (12.1 a)', () => {
  it('maps the 1–20 score into six bands', () => {
    const want: [number, number][] = [[1, 1], [3, 1], [4, 2], [6, 2], [7, 3], [9, 3], [10, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6]];
    for (const [s, d] of want) expect(dieFromScore(s)).toBe(d);
  });

  it('gives one die per logged axis, with the reason for its number', () => {
    const d = diceFor({ values: { ...V(10), Pace: 16, Rest: 4 }, flags: {}, input: input(), history: {} });
    expect(d.map((x) => x.axis)).toEqual(['Pace', 'Power', 'Fuel', 'Rest', 'Routine', 'Shape']);
    expect(d.find((x) => x.axis === 'Pace')).toMatchObject({ value: 5, score: 16, reason: '16,400 steps' });
    expect(d.find((x) => x.axis === 'Rest')).toMatchObject({ value: 2, reason: 'Four and a half hours' });
    expect(d.find((x) => x.axis === 'Routine')!.reason).toBe('Two of three ticked');
    expect(d.find((x) => x.axis === 'Shape')!.reason).toBe('Weighed in five days of seven');
  });

  it('gives no die for an axis with nothing logged, or no data', () => {
    const d = diceFor({ values: V(10), flags: { Fuel: 'not-logged', Rest: 'no-data' }, input: input(), history: {} });
    expect(d.map((x) => x.axis)).toEqual(['Pace', 'Power', 'Routine', 'Shape']);
    const noList = diceFor({ values: V(10), flags: {}, input: input({ checklist: [] }), history: {} });
    expect(noList.some((x) => x.axis === 'Routine')).toBe(false);
  });

  it('a sick, injured or travel day gives every axis its 28-day form', () => {
    for (const status of ['sick', 'injured', 'travelling']) {
      const d = diceFor({ values: V(2), flags: { Pace: 'no-data' }, input: input(), status, history: { Pace: [10, 14, 18], Rest: [6, 8], Fuel: [] } });
      expect(d).toHaveLength(2);
      expect(d[0]).toMatchObject({ axis: 'Pace', score: 14, value: 5, form: true });
      expect(d[1]).toMatchObject({ axis: 'Rest', score: 7, value: 3, form: true });
      expect(d[0].reason).toContain('28-day form');
    }
    // A break is not a form day: it plays as the day.
    expect(diceFor({ values: V(10), flags: {}, input: input(), status: 'break', history: {} })[0].form).toBeUndefined();
  });

  it('form is the median of the days that scored', () => {
    expect(formOf([])).toBeUndefined();
    expect(formOf([5, 1, 9])).toBe(5);
    expect(formOf([4, 8, 10, 12])).toBe(9);
  });

  it('reasons read the day, never the time anything was logged', () => {
    expect(hoursInWords(7)).toBe('Seven hours');
    expect(hoursInWords(7.6)).toBe('Seven and a half hours');
    expect(hoursInWords(1)).toBe('One hour');
    expect(reasonFor('Power', input({ sessionsToday: [{ status: 'done' }] as unknown as AxisInput['sessionsToday'] }))).toBe('A session done');
    expect(reasonFor('Power', input({ daysSinceLast: 5, weekDoneBefore: 0, weekdayMon1: 6 }))).toBe('A rest day, missed');
    expect(reasonFor('Fuel', input({ protein: 80, kcal: 2500 }))).toBe('Protein short, calories over');
  });
});

describe('unspent dice into research (12.2 a)', () => {
  it('1 for every two dice left, at most 2 a day', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(unspentResearch)).toEqual([0, 0, 1, 1, 2, 2, 2]);
  });
});

describe('quality and clocks', () => {
  it('5–6 well, 3–4 does it, 1–2 badly; a clock takes 2 on a 5 or 6, else 1', () => {
    expect([1, 2, 3, 4, 5, 6].map(qualityOf)).toEqual(['badly', 'badly', 'does', 'does', 'well', 'well']);
    expect([1, 2, 3, 4, 5, 6].map(segmentsFor)).toEqual([1, 1, 1, 1, 2, 2]);
  });

  it('fills from the spend log, caps at its size, and never runs backwards or expires', () => {
    const c = { id: 'k1', job: 'scout' as const, target: 'div-5', name: 'Division Five', size: 4, opened: '2030-01-01' };
    let d: DeskState = { ...emptyDesk(), clocks: [c] };
    expect(clockFilled(d, c)).toBe(0);
    const add = (day: string, n: number) => { d = { ...d, spends: [...d.spends, { id: day, day, axis: 'Pace', value: 6, job: 'scout', effects: [{ kind: 'clock', clock: 'k1', n }] }] }; };
    add('2030-01-01', 2);
    expect(clockFilled(d, c)).toBe(2);
    // A year later it is still there, still at 2.
    expect(openClocks(d).map((x) => x.id)).toEqual(['k1']);
    add('2031-01-01', 1); add('2031-01-02', 2);
    expect(clockFilled(d, c)).toBe(4);
    expect(clockDone(d, c)).toBe(true);
    expect(openClocks(d)).toEqual([]);
  });

  // A stand-in long job (Fork 2's scout is a real job now, so the stand-in borrows the unbuilt 'study' id).
  it('a long job opens its clock in the same spend that fills it', () => {
    const study: JobDef = {
      id: 'study', ink: '#fff', open: () => true, card: () => ({ title: '', line: '', chip: '' }),
      preview: () => ({ head: '', line: '', gain: '', others: '', effects: [] }),
      spend: (dd) => ({ opens: [{ id: 'k-div5', job: 'study', target: 'div-5', name: 'Division Five', size: 4 }], effects: [{ kind: 'clock', clock: 'k-div5', n: segmentsFor(dd.value) }] }),
    };
    JOBS.push(study);
    try {
      const d = deskWith([die('Pace', 6)]);
      const r = spendDie(d, view(), die('Pace', 6), 'study');
      if ('error' in r) throw new Error(r.error);
      expect(r.desk.clocks).toEqual([{ id: 'k-div5', job: 'study', target: 'div-5', name: 'Division Five', size: 4, opened: '2030-03-05' }]);
      expect(clockFilled(r.desk, r.desk.clocks[0])).toBe(2);
    } finally { JOBS.pop(); }
  });
});

describe('spending a die', () => {
  it('takes the die from the tray, once; the job must be open, unblocked and given a target it offers', () => {
    const d = deskWith([die('Pace', 6), die('Rest', 2)]);
    const r = spendDie(d, view(), die('Pace', 6), 'academy', 'y1');
    if ('error' in r) throw new Error(r.error);
    expect(diceLeft(d.dice['2030-03-05'], r.desk.spends).map((x) => x.axis)).toEqual(['Rest']);
    expect(spendDie(r.desk, view(), die('Pace', 6), 'project', 'kaai-stand')).toEqual({ error: 'no-die' });
    expect(spendDie(d, view(), die('Pace', 5), 'academy', 'y1')).toEqual({ error: 'no-die' });
    expect(spendDie(d, view(), die('Pace', 6), 'academy', 'nobody')).toEqual({ error: 'no-target' });
    expect(spendDie(d, view({ spentToday: { academy: 1 } }), die('Pace', 6), 'academy', 'y1')).toEqual({ error: 'blocked' });
    expect(spendDie(d, view({ opp: undefined }), die('Pace', 6), 'watch')).toEqual({ error: 'closed' });
  });

  it('the preview shows exactly the effects the spend makes, for every job and every die', () => {
    for (const job of JOBS.filter((j) => j.id !== 'course')) {
      for (const v of [1, 2, 3, 4, 5, 6] as const) {
        const dd = die('Fuel', v), t = job.targets?.(view())[0]?.id;
        expect(job.spend(dd, view(), t, rng(1)).effects).toEqual(job.preview(dd, view(), t).effects);
      }
    }
  });

  it('the same spend always draws the same', () => {
    expect(spendSeed('2030-03-05', die('Pace', 6), 'course')).toBe(spendSeed('2030-03-05', die('Pace', 6), 'course'));
    const a = spendDie(deskWith([die('Pace', 6)]), view(), die('Pace', 6), 'course');
    const b = spendDie(deskWith([die('Pace', 6)]), view(), die('Pace', 6), 'course');
    expect(a).toEqual(b);
  });
});

describe('the five jobs', () => {
  it('watch: style and weak side on a 3 or more, style only on a 1 or 2', () => {
    const w = jobById('watch')!;
    expect(w.preview(die('Rest', 3), view()).effects).toEqual([{ kind: 'watch', club: 'club-a', level: 'full' }]);
    expect(w.preview(die('Rest', 2), view()).effects).toEqual([{ kind: 'watch', club: 'club-a', level: 'style' }]);
    expect(w.blocked!(view({ oppKnown: 'full' }))).toBe('Already scouted');
    expect(w.open(view({ opp: undefined }))).toBe(false);
  });

  it('a watched opponent is scouted for the tactics board through the read', () => {
    const save = { met: [], scouted: [], desk: { ...emptyDesk(), spends: [{ id: 's', day: '2030-03-05', axis: 'Rest' as const, value: 2 as const, job: 'watch' as const, effects: [{ kind: 'watch' as const, club: 'club-a', level: 'style' as const }] }] } };
    expect(scoutLevel(save, 'club-a')).toBe('style');
    expect(scoutLevel(save, 'club-b')).toBe('none');
    expect(scoutLevel({ ...save, met: ['club-b'] }, 'club-b')).toBe('full');
    const full = { ...save, desk: { ...save.desk, spends: [...save.desk.spends, { ...save.desk.spends[0], id: 't', effects: [{ kind: 'watch' as const, club: 'club-a', level: 'full' as const }] }] } };
    expect(scoutLevel(full, 'club-a')).toBe('full');
    // Style only: the right tactic counts, the width read can't (their weak side wasn't seen).
    const club = { id: 'club-a', style: 'possession' };
    const plan = { tactic: 'press' as const, width: 'left' as const };
    const styleRead = readOf(plan, club, readScouted('style'));
    expect(styleRead.weakKnown).toBe(false);
    expect(styleRead.mods).toHaveLength(1);
    expect(styleRead.mods[0].why).toContain('Press');
    for (const width of ['left', 'middle', 'right'] as const) expect(readOf({ ...plan, width }, club, 'style').widthRight).toBe(false);
    expect(readOf(plan, club, readScouted('none')).mods).toEqual([]);
    expect(readOf(plan, club, true).weakKnown).toBe(true);
  });

  it('academy: 2 on a 5 or 6, 1 on a 3 or 4, half on a 1 or 2, for the youngster you pick', () => {
    const a = jobById('academy')!;
    expect([1, 3, 5].map((v) => a.preview(die('Pace', v as Die['value']), view(), 'y1').effects)).toEqual([
      [{ kind: 'grow', youth: 'y1', n: ACADEMY_GROWTH.badly }], [{ kind: 'grow', youth: 'y1', n: 1 }], [{ kind: 'grow', youth: 'y1', n: 2 }],
    ]);
    expect(a.open(view({ youth: [] }))).toBe(false);
  });

  it('column: the line runs tomorrow; no points, the die only moves where', () => {
    const c = jobById('column')!;
    for (const v of [1, 6] as const) expect(c.preview(die('Routine', v), view(), 'col-1').effects).toEqual([{ kind: 'column', line: 'col-1', text: 'Keep the quay loud.' }]);
    expect(c.preview(die('Routine', 6), view(), 'col-1').gain).toBe('Back page');
  });

  it('project: a day on the least-finished need, two on a 5 or 6', () => {
    const p = jobById('project')!;
    expect(p.preview(die('Power', 4), view(), 'kaai-stand').effects).toEqual([{ kind: 'project', id: 'kaai-stand', n: 1 }]);
    expect(p.preview(die('Power', 5), view(), 'kaai-stand').effects).toEqual([{ kind: 'project', id: 'kaai-stand', n: 2 }]);
    expect(pushProject({ steps: 29, training: 2 }, [{ what: 'steps', count: 30 }, { what: 'training', count: 12 }], 2)).toEqual({ steps: 29, training: 4 });
    expect(pushProject({ steps: 29, training: 12 }, [{ what: 'steps', count: 30 }, { what: 'training', count: 12 }], 2)).toEqual({ steps: 30, training: 12 });
    expect(pushProject({ steps: 30 }, [{ what: 'steps', count: 30 }], 2)).toEqual({ steps: 30 });
  });

  it('course: five questions drawn seeded, a lifeline only on a 5 or 6', () => {
    const c = jobById('course')!;
    const hi = c.spend(die('Rest', 6), view(), undefined, rng(7)).effects[0];
    const lo = c.spend(die('Rest', 3), view(), undefined, rng(7)).effects[0];
    expect(hi).toMatchObject({ kind: 'course', lifeline: true });
    expect(lo).toMatchObject({ kind: 'course', lifeline: false });
    if (hi.kind !== 'course') throw new Error();
    expect(hi.ids).toHaveLength(5);
    expect(new Set(hi.ids).size).toBe(5);
    expect(c.open(view({ questions: ['q1', 'q2'] }))).toBe(false);
  });
});

describe('the 4 am fold', () => {
  const world = () => ({
    eng: emptyEngine(),
    squad: [{ id: 'y1', name: 'Jonas', status: 'growing', growth: 3 }, { id: 'y2', name: 'Old', status: 'promoted', growth: 12 }],
    bundles: new Map([['kaai-stand', { id: 'kaai-stand', progress: { steps: 10, training: 3 } }]]),
    needs: (id: string) => (id === 'kaai-stand' ? [{ what: 'steps', count: 30 }, { what: 'training', count: 12 }] : undefined),
    news: [] as { id: string; date: string; kind: 'club' | 'press'; text: string }[],
  });
  const dice = [die('Pace', 6), die('Power', 4), die('Fuel', 5), die('Rest', 2), die('Routine', 3)];

  it('folds each spend into the world, and the dice left into research', () => {
    let d = deskWith(dice);
    for (const [dd, job, t] of [[dice[0], 'academy', 'y1'], [dice[1], 'project', 'kaai-stand'], [dice[2], 'column', 'col-1']] as const) {
      const r = spendDie(d, view(), dd, job, t);
      if ('error' in r) throw new Error(r.error);
      d = r.desk;
    }
    const w = world();
    deskFold(d, '2030-03-05', dice, w);
    expect(w.squad[0].growth).toBe(5);
    expect(w.bundles.get('kaai-stand')!.progress).toEqual({ steps: 10, training: 4 });
    expect(w.news).toEqual([{ id: '2030-03-06:column:col-1', date: '2030-03-06', kind: 'press', text: "From the manager's column: “Keep the quay loud.”" }]);
    // Two dice left: 1 research.
    expect(w.eng.earned).toBe(1);
    expect(w.eng.gains.at(-1)).toMatchObject({ why: 'desk', n: 1 });
  });

  it('a day with no desk opened still turns its dice into research, capped at 2', () => {
    const w = world();
    deskFold(undefined, '2030-03-05', [...dice, die('Shape', 1)], w);
    expect(w.eng.earned).toBe(2);
  });

  it('only that day’s spends are folded, and a promoted youngster no longer grows', () => {
    const d: DeskState = { ...deskWith(dice), spends: [{ id: 'x', day: '2030-03-04', axis: 'Pace', value: 6, job: 'academy', effects: [{ kind: 'grow', youth: 'y1', n: 2 }] }, { id: 'y', day: '2030-03-05', axis: 'Pace', value: 6, job: 'academy', effects: [{ kind: 'grow', youth: 'y2', n: 2 }] }] };
    const w = world();
    deskFold(d, '2030-03-05', [], w);
    expect(w.squad.map((y) => y.growth)).toEqual([3, 12]);
  });
});

describe('the coaching course and the manager’s eye', () => {
  const qs: Question[] = [
    { id: 'a', source: 'bank', prompt: 'p', options: ['1', '2', '3', '4'], answer: '2', explanation: 'e' },
    { id: 'b', source: 'bank', prompt: 'p', answer: '1,250', explanation: 'e' },
    { id: 'c', source: 'bank', prompt: 'p', answer: 'Brief', explanation: 'e' },
    { id: 'd', source: 'bank', prompt: 'p', options: ['x', 'y'], answer: 'x', explanation: 'e' },
    { id: 'e', source: 'bank', prompt: 'p', options: ['x', 'y'], answer: 'y', explanation: 'e' },
  ];

  it('passes at 3 of 5', () => {
    expect(PASS_AT).toBe(3);
    expect(grade(qs, ['2', ' 1250 ', 'brief', 'y', null])).toEqual({ right: 3, passed: true });
    expect(grade(qs, ['2', '1251', 'brief', 'y', null])).toEqual({ right: 2, passed: false });
  });

  it('typed answers match numbers and words loosely, never an empty answer', () => {
    expect(sameAnswer('1000', '1,000')).toBe(true);
    expect(sameAnswer('0.50', '.5')).toBe(true);
    expect(sameAnswer('  Brief ', 'brief')).toBe(true);
    expect(sameAnswer('', '')).toBe(false);
  });

  it('draws questions never answered first', () => {
    const ids = drawCourse(['a', 'b', 'c', 'd', 'e', 'f', 'g'], ['a', 'b', 'c'], rng(3));
    expect(ids.slice(0, 4).sort()).toEqual(['d', 'e', 'f', 'g']);
    expect(ids).toHaveLength(5);
  });

  it('the lifeline strikes two wrong options, never the answer', () => {
    for (let s = 0; s < 20; s++) {
      const out = lifelineStrikes(qs[0], rng(s));
      expect(out).toHaveLength(2);
      expect(out).not.toContain('2');
    }
    expect(lifelineStrikes(qs[1], rng(1))).toEqual([]);
  });

  it('the eye levels at 1, 3 and 6 passes and adds card choices after cup wins', () => {
    expect([0, 1, 2, 3, 5, 6, 9].map(eyeLevel)).toEqual([0, 1, 1, 2, 2, 3, 3]);
    expect([0, 1, 3, 6].map(eyeChoices)).toEqual([0, 1, 1, 2]);
    expect(toNextEye(0)).toBe(1);
    expect(toNextEye(4)).toBe(2);
    expect(toNextEye(6)).toBeUndefined();
    expect(coursePasses({ ...emptyDesk(), courses: [{ spend: 's', on: 'd', answers: [], right: 3, passed: true }, { spend: 't', on: 'd', answers: [], right: 1, passed: false }] })).toBe(1);
  });
});

describe('the owner’s question file (private import)', () => {
  it('reads JSON with options, a letter answer, a typed answer, year and section', () => {
    const r = importQuestions(JSON.stringify([
      { question: 'Two plus two?', options: ['3', '4', '5'], answer: 'B', explanation: 'Count.', year: 2021, section: 'QA' },
      { question: 'Type the square of 12', answer: '144', explanation: '12 × 12.' },
    ]), 'mine.json');
    expect(r.errors).toEqual([]);
    expect(r.questions[0]).toMatchObject({ prompt: 'Two plus two?', options: ['3', '4', '5'], answer: '4', year: '2021', section: 'QA', source: 'mine' });
    expect(r.questions[0].id).toMatch(/^mine-/);
    expect(r.questions[1].options).toBeUndefined();
  });

  it('reads CSV with quoted commas, option columns, a numbered answer, and reports bad rows', () => {
    const csv = 'Question,Option A,Option B,Option C,Answer,Explanation,Year,Section\n'
      + '"Pick, quickly",cat,dog,"eel, raw",3,"Because, yes",2019,VARC\n'
      + 'No answer row,a,b,,,why,,\n'
      + 'Bad letter,a,b,,F,why,,\n'
      + 'TITA one,,,,42,"Line one\nline two",,\n';
    const r = importQuestions(csv, 'mine.csv');
    expect(r.questions).toHaveLength(2);
    expect(r.questions[0]).toMatchObject({ prompt: 'Pick, quickly', options: ['cat', 'dog', 'eel, raw'], answer: 'eel, raw', explanation: 'Because, yes', year: '2019', section: 'VARC' });
    expect(r.questions[1]).toMatchObject({ prompt: 'TITA one', answer: '42', explanation: 'Line one\nline two' });
    expect(r.errors).toEqual(["Question 2: the answer doesn't match an option.", "Question 3: the answer doesn't match an option."]);
  });

  it('takes options as one "a|b|c" cell, skips repeats, and refuses broken files', () => {
    const r = importQuestions('question,options,answer,explanation\nQ,a|b|c,c,why\nQ,a|b|c,c,why\n');
    expect(r.questions).toHaveLength(1);
    expect(r.errors).toEqual(['Question 2: a repeat, skipped.']);
    expect(importQuestions('{not json', 'x.json').errors).toEqual(['The file is not valid JSON.']);
    expect(importQuestions('question,answer\n').errors[0]).toContain('header row');
    expect(parseCsv('a,"b ""c"""\r\n1,2')).toEqual([['a', 'b "c"'], ['1', '2']]);
  });
});

describe('the axes speak', () => {
  it('the held die and the die furthest from it speak, with yesterday’s numbers in their lines', () => {
    const tray = [die('Pace', 6), die('Power', 4), die('Rest', 2)];
    expect(speakers(tray[0], tray)).toEqual(['Rest', 'Pace']);
    expect(speakers(tray[0], [tray[0]])).toEqual(['Pace']);
    const line = voiceLine('watch', { ...die('Rest', 2), reason: 'Four and a half hours' })!;
    expect(line).toContain('Four and a half hours');
    expect(voiceLine('column', { ...die('Pace', 6), reason: '16,400 steps' })).toContain('16,400 steps');
    expect(voiceLine('column', die('Pace', 6), 0, {})).toBeUndefined();
  });
});
