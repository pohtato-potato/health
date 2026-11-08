// Engine 2, layer 2 (Rotation): freshness, form, ageing, every limit-break kind, free agents and buy-back,
// chemistry, morale, tactics and nudges, and the team sheet.
import { describe, expect, it } from 'vitest';
import { addDays, type DayKey } from '../../src/domain/dates';
import type { ExerciseDef, PlanDef } from '../../src/domain/plan';
import type { Day, SetEntry, Settings, TrainingSession } from '../../src/domain/types';
import { ctxFor } from '../../src/football/players/attributes';
import { exerciseChains, playersOn } from '../../src/football/players/catalogue';
import type { FbPlayer, PlayerDef, XiPlace } from '../../src/football/players/types';
import { agedOverall, ageDay, formOf, freshnessOn, matchRating, trailAfter, wellDays } from '../../src/football/rotation/condition';
import { bringHome, canBuyBack, signFreeAgents, agentsAt } from '../../src/football/rotation/freeAgents';
import { breakToday, shiftWeights } from '../../src/football/rotation/limitBreak';
import { applyNudges, assistantTactic, captainsOf, chemistryAfter, defaultPool, moraleAfter, nudgesFor, setPieceOf, toggleStarter } from '../../src/football/rotation/night';
import { BASE_RULES, rulesFrom } from '../../src/football/rotation/rules';
import { freshnessScale, pickTrait, playable, traitAbilities, traitsOf } from '../../src/football/rotation/traits';
import { TRAITS } from '../../src/football/content/traits';
import type { Health } from '../../src/football/store/gather';
import { carryOf, latestSession, membersOf, playersDay, sheetEleven, squadNight, type Roster } from '../../src/football/store/players';
import { AXES, type AxisValues } from '../../src/football/types';
import { playMatch } from '../../src/football/engine';
import type { Opponent } from '../../src/football/opponent';

const D0 = '2026-08-01';
const all = (v: number) => Object.fromEntries(AXES.map((a) => [a, v])) as AxisValues;
const ex = (id: string, extra: Partial<ExerciseDef> = {}): ExerciseDef => ({ id, order: '1', name: id, sets: 3, reps: [8, 12], load: 'pair', ...extra });
const planOf = (xs: ExerciseDef[]): PlanDef => ({ format: 'health-plan', name: 'P', sessions: [{ id: 'A', name: 'A', focus: '', exercises: xs }], rotation: ['A'] } as unknown as PlanDef);
const settings = (extra: Partial<Settings> = {}) => ({
  targets: [{ from: '2026-01-01', kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }],
  checklist: [{ id: 'read', name: 'Read', slots: ['pm'], active: true }],
  ...extra,
}) as unknown as Settings;
function health(p: Partial<Health> = {}): Health {
  return { settings: settings(), days: new Map(), sessions: [], kcal: new Map(), measures: [], sets: [], meals: new Map(), walks: [], routes: [], ...p };
}
let at = 0;
const set = (date: DayKey, exerciseId: string, loadKg: number | null, reps: number, extra: Partial<SetEntry> = {}): SetEntry =>
  ({ id: `s${++at}`, sessionId: `${date}:${exerciseId}`, date, session: 'A', exerciseId, exercise: exerciseId, setNo: 1, side: 'both', loadKg, reps, at: ++at, ...extra }) as SetEntry;
const sess = (date: DayKey, exercises: string[]): TrainingSession => ({ id: `${date}:${exercises[0]}`, date, session: 'A', planName: 'P', startedAt: ++at, status: 'done', short: false, exercises }) as TrainingSession;
/** A weekly session of one exercise for `weeks` weeks from `from`: two sets a session. */
function weekly(id: string, from: DayKey, weeks: number, kg: (w: number) => number | null, reps: (w: number) => number) {
  const sets: SetEntry[] = [], sessions: TrainingSession[] = [];
  for (let w = 0; w < weeks; w++) {
    const d = addDays(from, w * 7);
    sets.push(set(d, id, kg(w), reps(w)), set(d, id, kg(w), reps(w)));
    sessions.push(sess(d, [id]));
  }
  return { sets, sessions };
}
/** Replays every day from D0 to `until` and returns the roster. */
function replay(h: Health, until: DayKey, bedtime?: number): Roster {
  const c = ctxFor(h, bedtime);
  let r: Roster = new Map();
  for (let d = D0; d <= until; d = addDays(d, 1)) r = playersDay(r, h, c, d, new Set());
  return r;
}
const row = (over: Partial<FbPlayer> = {}): FbPlayer => ({
  id: 'ex:rdl', unit: 'Power', kind: 'exercise', ref: 'rdl', name: 'RDL', art: 'rdl', signed: D0, status: 'squad', overall: 70, on: D0,
  best: 70, bestOn: D0, card: { tier: 'gold', step: 1 }, versions: [], moments: [], apps: 0, goals: 0, saves: 0, seasons: [], limitBreaks: [], ...over,
});

describe('freshness (spec §3.2)', () => {
  const R = BASE_RULES;
  it('back-to-back days cost 15%, a day off gives 20% back, 60–100', () => {
    const days = new Set(['2026-08-10', '2026-08-11', '2026-08-12']);
    const t = (d: DayKey) => days.has(d);
    expect(freshnessOn(t, '2026-08-10', R)).toBe(100);
    expect(freshnessOn(t, '2026-08-11', R)).toBe(85);
    expect(freshnessOn(t, '2026-08-12', R)).toBe(70);
    expect(freshnessOn(t, '2026-08-13', R)).toBe(90);
    expect(freshnessOn(t, '2026-08-14', R)).toBe(100);
  });
  it('never drops below the floor; a rule can raise the floor or change the return', () => {
    const t = () => true;
    expect(freshnessOn(t, '2026-08-30', R)).toBe(60);
    expect(freshnessOn(t, '2026-08-30', rulesFrom([{ kind: 'rule', rule: 'freshness-floor', value: 70 }]))).toBe(70);
  });
  it('Engine (a trait) halves the cost', () => {
    const p = { limitBreaks: [{ on: D0, tier: 'gold' as const, why: 'load', trait: 'engine' }] };
    expect(freshnessScale(p)).toBe(0.5);
    const days = new Set(['2026-08-10', '2026-08-11']);
    expect(freshnessOn((d) => days.has(d), '2026-08-11', R, freshnessScale(p))).toBe(93);
  });
  it('an A/B/C/D plan never tires: one session a week per exercise stays 100%', () => {
    const { sets, sessions } = weekly('rdl', D0, 6, () => 20, () => 8);
    const h = health({ settings: settings({ plan: planOf([ex('rdl')]) }), sets, sessions });
    expect(replay(h, addDays(D0, 35)).get('ex:rdl')!.fresh).toBe(100);
  });
  it('match rating = overall × freshness + form', () => {
    expect(matchRating({ overall: 80, fresh: 85, form: 2 })).toBe(70);
    expect(matchRating({ overall: 80 })).toBe(80);
  });
});

describe('form (spec §3.2)', () => {
  it('is the four-week change in the overall, one point per two, −3 to +3', () => {
    let tr: [DayKey, number][] = [];
    for (let i = 0; i <= 28; i++) tr = trailAfter(tr, addDays(D0, i), 60 + Math.floor(i / 7));
    expect(formOf(tr, addDays(D0, 28))).toBe(2);
    let down: [DayKey, number][] = [];
    for (let i = 0; i <= 28; i++) down = trailAfter(down, addDays(D0, i), 80 - i);
    expect(formOf(down, addDays(D0, 28))).toBe(-3);
    expect(formOf([[D0, 70]], D0)).toBe(0);
  });
  it('skips a new signing\'s four-week ramp', () => {
    let tr: [DayKey, number][] = [];
    for (let i = 0; i <= 34; i++) tr = trailAfter(tr, addDays(D0, i), 50 + i);
    expect(formOf(tr, addDays(D0, 34))).toBe(3);
    expect(formOf(tr, addDays(D0, 34), D0)).toBe(3); // days 28–34 still climb 6
    expect(formOf(tr, addDays(D0, 27), D0)).toBe(0); // still in the ramp
    expect(formOf(tr, addDays(D0, 29), D0)).toBe(1);
  });
  it('the trail keeps five weeks and doesn\'t move on a sick day', () => {
    let tr: [DayKey, number][] = [];
    for (let i = 0; i < 60; i++) tr = trailAfter(tr, addDays(D0, i), 70);
    expect(tr.length).toBeLessThanOrEqual(35);
    const h = health({ days: new Map([['2026-08-03', { date: '2026-08-03', status: 'sick', steps: 9000 } as Day], ['2026-08-02', { date: '2026-08-02', steps: 9000 } as Day]]) });
    const r = replay(h, '2026-08-03');
    expect(r.get('pace:steps')!.trail!.map(([d]) => d)).not.toContain('2026-08-03');
  });
});

describe('ageing (spec §3.3)', () => {
  it('six well weeks without a better growth attribute: past his best', () => {
    let s = ageDay({}, 120, D0, new Set(), D0);
    for (let i = 1; i <= 41; i++) s = ageDay(s, 110, addDays(D0, i), new Set(), D0);
    expect(s.pastBest).toBeUndefined();
    s = ageDay(s, 110, addDays(D0, 42), new Set(), D0);
    expect(s.pastBest).toBe(addDays(D0, 42));
    // A new best ends it.
    expect(ageDay(s, 121, addDays(D0, 43), new Set(), D0).pastBest).toBeUndefined();
  });
  it('slips 1 every two well weeks toward the peak minus 8; the card never drops', () => {
    const past = '2026-09-01';
    expect(agedOverall(78, 78, past, addDays(past, 13), new Set())).toBe(78);
    expect(agedOverall(78, 78, past, addDays(past, 14), new Set())).toBe(77);
    expect(agedOverall(78, 78, past, addDays(past, 200), new Set())).toBe(70);
    expect(agedOverall(65, 78, past, addDays(past, 200), new Set())).toBe(65);
  });
  it('the ageing clock pauses on sick days', () => {
    const sick = new Set(Array.from({ length: 10 }, (_, i) => addDays(D0, i + 1)));
    expect(wellDays(D0, addDays(D0, 20), sick)).toBe(10);
    let s = ageDay({}, 100, D0, sick, D0);
    for (let i = 1; i <= 51; i++) s = ageDay(s, 90, addDays(D0, i), sick, D0);
    expect(s.pastBest).toBeUndefined();
    s = ageDay(s, 90, addDays(D0, 52), sick, D0);
    expect(s.pastBest).toBe(addDays(D0, 52)); // 42 well days after D0, with 10 sick days in between
  });
  it('an exercise stuck for months is marked past his best and slips; a Club legend never ages', () => {
    const { sets, sessions } = weekly('rdl', D0, 16, (w) => (w < 2 ? 10 : 15), () => 8);
    const h = health({ settings: settings({ plan: planOf([ex('rdl')]) }), sets, sessions });
    const r = replay(h, addDays(D0, 110));
    const p = r.get('ex:rdl')!;
    expect(p.pastBest).toBeDefined();
    expect(p.overall).toBeLessThan(p.best);
    expect(p.card.tier).toBe(r.get('ex:rdl')!.card.tier);
  });
});

describe('limit breaks (spec §5, calibration §8, §12)', () => {
  const R = BASE_RULES;
  const brk = (h: Health, d: PlayerDef, p: FbPlayer, date: DayKey, bedtime?: number) => breakToday(ctxFor(h, bedtime), d, p, date, R);
  const exDef = (refs?: string[], switches?: PlayerDef['switches']): PlayerDef => ({ id: 'ex:rdl', unit: 'Power', kind: 'exercise', ref: 'rdl', name: 'RDL', art: 'rdl', signed: D0, active: true, ...(refs ? { refs, switches } : {}) });

  it('Power: a new rep scheme held four weeks (20 reps → 10)', () => {
    const { sets, sessions } = weekly('rdl', D0, 9, () => 10, (w) => (w < 3 ? 20 : 10));
    const h = health({ settings: settings({ plan: planOf([ex('rdl')]) }), sets, sessions });
    expect(brk(h, exDef(), row(), addDays(D0, 7 * 5))).toBeNull(); // three weeks of 10s
    const b = brk(h, exDef(), row(), addDays(D0, 7 * 6))!; // four
    expect(b.why).toBe('rep-scheme');
    expect(b.shift).toEqual(['strength', 'endurance', 0.1]);
  });
  it('Power: reps worked up inside one band (8 → 12) is progression, not a new scheme', () => {
    const { sets, sessions } = weekly('rdl', D0, 9, () => 10, (w) => Math.min(12, 8 + w));
    const h = health({ settings: settings({ plan: planOf([ex('rdl')]) }), sets, sessions });
    expect(brk(h, exDef(), row(), addDays(D0, 7 * 8))).toBeNull();
    const up = weekly('rdl', D0, 9, () => 10, (w) => (w < 3 ? 10 : 15));
    const b = brk(health({ settings: settings({ plan: planOf([ex('rdl')]) }), sets: up.sets, sessions: up.sessions }), exDef(), row(), addDays(D0, 7 * 6))!;
    expect(b.why).toBe('rep-scheme');
    expect(b.shift).toEqual(['endurance', 'strength', 0.1]);
  });
  it('Power: load up 25% held across 3 sessions over 3 weeks; a one-off spike never fires', () => {
    const { sets, sessions } = weekly('rdl', D0, 6, (w) => (w < 2 ? 10 : 12.5), () => 8);
    const h = health({ settings: settings({ plan: planOf([ex('rdl')]) }), sets, sessions });
    expect(brk(h, exDef(), row(), addDays(D0, 21))).toBeNull(); // two sessions at 12.5
    expect(brk(h, exDef(), row(), addDays(D0, 28))?.why).toBe('load');
    const spike = weekly('rdl', D0, 6, (w) => (w === 3 ? 20 : 10), () => 8);
    expect(brk(health({ sets: spike.sets, sessions: spike.sessions }), exDef(), row(), addDays(D0, 35))).toBeNull();
  });
  it('Pace: a new steps band held four weeks', () => {
    const days = new Map<DayKey, Day>();
    for (let i = 0; i < 70; i++) { const d = addDays(D0, i); days.set(d, { date: d, steps: i < 28 ? 10500 : 12400 } as Day); }
    const h = health({ days });
    const d: PlayerDef = { id: 'pace:steps', unit: 'Pace', kind: 'steps', name: 'Steps', art: 'steps', signed: D0, active: true };
    const p = row({ id: 'pace:steps', unit: 'Pace', kind: 'steps' });
    expect(brk(h, d, p, addDays(D0, 50))).toBeNull();
    expect(brk(h, d, p, addDays(D0, 60))?.why).toBe('band');
  });
  it('Pace: a walk 25% longer than the longest before', () => {
    const h = health({ walks: [{ date: D0, km: 6 }, { date: addDays(D0, 10), km: 6.5 }, { date: addDays(D0, 20), km: 7.6 }] });
    const d: PlayerDef = { id: 'pace:long-walk', unit: 'Pace', kind: 'long-walk', name: 'Long walk', art: 'longwalk', signed: D0, active: true };
    const p = row({ id: 'pace:long-walk', unit: 'Pace', kind: 'long-walk' });
    expect(brk(h, d, p, addDays(D0, 10))).toBeNull();
    expect(brk(h, d, p, addDays(D0, 20))?.why).toBe('distance');
  });
  it('Rest: bedtime kept 6 nights in 7 for four weeks; a sick night counts neither way', () => {
    const days = new Map<DayKey, Day>();
    for (let i = 0; i < 40; i++) { const d = addDays(D0, i); days.set(d, { date: d, sleep: { asleep: i % 7 === 3 ? 180 : 30, woke: 480 }, ...(i === 30 ? { status: 'sick' } : {}) } as Day); }
    const h = health({ days });
    const d: PlayerDef = { id: 'rest:bedtime', unit: 'Rest', kind: 'bedtime', name: 'Bedtime', art: 'clock', signed: D0, active: true };
    const p = row({ id: 'rest:bedtime', unit: 'Rest', kind: 'bedtime' });
    expect(brk(h, d, p, addDays(D0, 35), 60)?.why).toBe('bedtime');
    const late = new Map([...days].map(([k, v]) => [k, { ...v, sleep: { asleep: 180, woke: 600 } } as Day]));
    expect(brk(health({ days: late }), d, p, addDays(D0, 35), 60)).toBeNull();
  });
  it('Fuel: protein on 25 of 30 days; calories inside the range on 25 of 30 (never under it)', () => {
    const kcal = new Map<DayKey, { kcal: number; protein: number; n: number }>();
    for (let i = 0; i < 40; i++) kcal.set(addDays(D0, i), { kcal: i % 6 === 0 ? 1500 : 2100, protein: i % 6 === 0 ? 100 : 150, n: 3 });
    const h = health({ kcal } as Partial<Health>);
    const prot: PlayerDef = { id: 'fuel:protein', unit: 'Fuel', kind: 'protein', name: 'Protein', art: 'protein', signed: D0, active: true };
    const cal: PlayerDef = { ...prot, id: 'fuel:calories', kind: 'calories', name: 'Calories' };
    expect(brk(h, prot, row({ unit: 'Fuel', kind: 'protein' }), addDays(D0, 35))?.why).toBe('protein');
    expect(brk(h, cal, row({ unit: 'Fuel', kind: 'calories' }), addDays(D0, 35))?.why).toBe('calories');
    // Under the range every day: never a Fuel limit break.
    const under = new Map([...kcal].map(([k]) => [k, { kcal: 1400, protein: 150, n: 3 }]));
    expect(brk(health({ kcal: under } as Partial<Health>), cal, row({ unit: 'Fuel', kind: 'calories' }), addDays(D0, 35))).toBeNull();
  });
  it('Fuel: a staff rule can lower the days needed', () => {
    expect(rulesFrom([{ kind: 'rule', rule: 'fuel-break-days', value: 22 }]).fuelBreakDays).toBe(22);
  });
  it('Routine: a habit kept on 60 days', () => {
    const days = new Map<DayKey, Day>();
    for (let i = 0; i < 61; i++) { const d = addDays(D0, i); days.set(d, { date: d, ticks: { 'read:0': 1 } } as unknown as Day); }
    const h = health({ days });
    const d: PlayerDef = { id: 'habit:read', unit: 'Routine', kind: 'habit', ref: 'read', name: 'Read', art: 'book', signed: D0, active: true };
    const p = row({ id: 'habit:read', unit: 'Routine', kind: 'habit' });
    expect(brk(h, d, p, addDays(D0, 58))).toBeNull();
    expect(brk(h, d, p, addDays(D0, 59))?.why).toBe('habit');
  });
  it('Shape: waist down an inch since the last limit break', () => {
    const h = health({ measures: [{ date: D0, waist: 36 }, { date: addDays(D0, 14), waist: 35.5 }, { date: addDays(D0, 28), waist: 34.9 }] } as Partial<Health>);
    const d: PlayerDef = { id: 'shape:waist', unit: 'Shape', kind: 'waist', name: 'Waist', art: 'tape', signed: D0, active: true };
    const p = row({ id: 'shape:waist', unit: 'Shape', kind: 'waist' });
    expect(brk(h, d, p, addDays(D0, 14))).toBeNull();
    expect(brk(h, d, p, addDays(D0, 28))?.why).toBe('waist');
  });
  it('once per tier; never on a sick day', () => {
    const { sets, sessions } = weekly('rdl', D0, 6, (w) => (w < 2 ? 10 : 12.5), () => 8);
    const h = health({ settings: settings({ plan: planOf([ex('rdl')]) }), sets, sessions });
    expect(brk(h, exDef(), row({ limitBreaks: [{ on: D0, tier: 'gold', why: 'load' }] }), addDays(D0, 28))).toBeNull();
    const sickDay = addDays(D0, 28);
    const hs = { ...h, days: new Map([[sickDay, { date: sickDay, status: 'sick' } as Day]]) };
    expect(brk(hs, exDef(), row(), sickDay)).toBeNull();
  });
  it('a kit switch is the same player, and always a limit break; the gym trait comes with it', () => {
    const plan = planOf([ex('rdl'), ex('rdl-bar', { kit: 'barbell', replaces: 'rdl', family: 'hinge' })]);
    const home = weekly('rdl', D0, 6, (w) => 10 + w * 2.5, () => 8);
    const gymDay = addDays(D0, 42);
    const gym = [set(gymDay, 'rdl-bar', 40, 8), set(gymDay, 'rdl-bar', 40, 8)];
    const h = health({ settings: settings({ plan }), sets: [...home.sets, ...gym], sessions: [...home.sessions, sess(gymDay, ['rdl-bar'])] });
    const defs = playersOn(h, gymDay).filter((p) => p.unit === 'Power');
    expect(defs.map((p) => p.id)).toEqual(['ex:rdl']);
    expect(defs[0].switches).toEqual([{ on: gymDay, id: 'rdl-bar', why: 'kit' }]);
    const r = replay(h, gymDay);
    const p = r.get('ex:rdl')!;
    const lb = p.limitBreaks[p.limitBreaks.length - 1];
    expect(lb.why).toBe('kit');
    expect(lb.trait).toBe('gym-hardened');
    expect(lb.to).toBe(lb.from! + 3);
    expect(p.overall).toBe(lb.to);
    expect(p.base).toBe(gymDay);
  });
  it('the coach\'s next step (progressionOf) is the same player and a profile limit break', () => {
    const chains = exerciseChains(new Map([['split', ex('split')], ['bss', ex('bss', { progressionOf: 'split' })]]), new Set(['split', 'bss']));
    expect(chains.get('split')).toEqual(['split', 'bss']);
    const plan = planOf([ex('bss', { progressionOf: 'split' })]);
    const old = weekly('split', D0, 4, () => 10, () => 10);
    const d = addDays(D0, 28);
    const h = health({ settings: settings({ plan }), sets: [...old.sets, set(d, 'bss', 10, 8)], sessions: [...old.sessions, sess(d, ['bss'])] });
    const p = replay(h, d).get('ex:split')!;
    expect(p.status).toBe('squad');
    expect(p.limitBreaks.at(-1)!.why).toBe('profile');
  });
  it('a limit break keeps the overall plus 3, resets the baseline, shifts weights and gives a trait', () => {
    const { sets, sessions } = weekly('rdl', D0, 9, () => 10, (w) => (w < 3 ? 20 : 10));
    const h = health({ settings: settings({ plan: planOf([ex('rdl')]) }), sets, sessions });
    const r = replay(h, addDays(D0, 49));
    const p = r.get('ex:rdl')!;
    const lb = p.limitBreaks.find((l) => l.why === 'rep-scheme')!;
    expect(lb).toBeDefined();
    expect(lb.to).toBe(lb.from! + 3);
    expect(p.base).toBe(lb.on);
    expect(p.weights!.strength).toBeCloseTo(0.45);
    expect(p.weights!.endurance).toBeCloseTo(0.15);
    expect(lb.trait).toBeDefined();
    expect(TRAITS.find((t) => t.id === lb.trait)!.from).toContain('limit-break');
    expect(lb.seen).toBeUndefined(); // waits for its moment
    expect(carryOf(p)).toBe(lb.carry);
  });
  it('weights never drop below 0.05', () => {
    expect(shiftWeights({ volume: 0.5, peak: 0.15 }, ['volume', 'peak', 0.1]).weights).toEqual({ volume: 0.6, peak: 0.05 });
    expect(shiftWeights({ volume: 0.6, peak: 0.05 }, ['volume', 'peak', 0.1]).moved).toBeUndefined();
  });
});

describe('traits (spec §9.3)', () => {
  it('only traits the engine can play are given; at most three', () => {
    const late = TRAITS.find((t) => t.id === 'late-runner')!;
    expect(playable(late)).toBe(false);
    expect(playable(TRAITS.find((t) => t.id === 'second-gear')!)).toBe(true);
    const three = { id: 'ex:rdl', unit: 'Power' as const, limitBreaks: ['thunder', 'big-game', 'dead-ball'].map((t) => ({ on: D0, tier: 'gold' as const, why: 'load', trait: t })) };
    expect(traitsOf(three)).toHaveLength(3);
    expect(pickTrait(three, D0)).toBeUndefined();
  });
  it('a starter\'s traits play in the match; a benched player\'s don\'t', () => {
    const p = row({ limitBreaks: [{ on: D0, tier: 'gold', why: 'load', trait: 'dead-ball' }] });
    const roster: Roster = new Map([[p.id, p]]);
    const xi: XiPlace[] = [{ player: p.id, unit: 'Power', place: 'Striker', name: 'RDL', rating: 70 }];
    const ab = traitAbilities(xi, roster);
    expect(ab).toHaveLength(1);
    expect(ab[0]).toMatchObject({ axis: 'Power', d: 2, when: 'set-piece' });
    expect(traitAbilities([], roster)).toHaveLength(0);
  });
  it('the engine plays a set-piece trait only on set pieces', () => {
    const opp = { id: 'x', rating: 50, reach: 0.65, abilities: [], shrinks: {}, presses: {} } as unknown as Opponent;
    const m = (abilities: Parameters<typeof playMatch>[0]['abilities']) => playMatch({ seed: 7, values: all(12), opp, home: true, stack: 0, abilities, bench: [], pre: [], conds: [] });
    const ev = m([{ id: 't', name: 'Dead ball', axis: 'Power', d: 2, when: 'set-piece', side: 'atk' }]);
    for (const c of ev.chances) {
      const used = c.mods.some((x) => x.why === 'Dead ball');
      expect(used).toBe(c.side === 'atk' && c.type === 'Set piece');
    }
  });
});

describe('free agents and buy-back (spec §6)', () => {
  const clubs = [{ id: 'ker', name: 'FC Kermis', rating: 50 }, { id: 'hul', name: 'Hull', rating: 40 }, { id: 'zur', name: 'Zurenborg', rating: 60 }];
  it('a departed player signs for the weakest club without one of ours in that unit', () => {
    const r: Roster = new Map([['ex:a', row({ id: 'ex:a', name: 'Goblet squat', status: 'left', leftOn: D0 })], ['ex:b', row({ id: 'ex:b', name: 'Floor press', status: 'left', leftOn: D0 })]]);
    const out = signFreeAgents(r, D0, clubs);
    expect(out.roster.get('ex:a')!.freeAgent!.club).toBe('hul');
    expect(out.roster.get('ex:b')!.freeAgent!.club).toBe('ker');
    expect(out.news[0].text).toContain('Goblet squat signs for Hull');
    expect(agentsAt(out.roster.values(), 'hul')).toEqual({ Power: 'Goblet squat' });
  });
  it('the rival holding one of ours gets +1 on that unit (as −1 to ours, inside the cap)', () => {
    const n = nudgesFor({ agents: { Power: 'Goblet squat' }, rules: BASE_RULES });
    expect(n).toEqual([{ axis: 'Power', d: -1, why: 'Goblet squat plays for them' }]);
  });
  it('a free agent stays as it left; re-added, it waits for the clause; paid, it comes home with its history', () => {
    const plan = planOf([ex('rdl')]);
    const { sets, sessions } = weekly('rdl', D0, 4, () => 10, () => 8);
    const h = health({ settings: settings({ plan }), sets, sessions });
    let r = replay(h, addDays(D0, 21));
    const before = r.get('ex:rdl')!;
    // Taken out of the plan: it leaves and signs elsewhere.
    const gone = { ...h, settings: settings({ plan: planOf([ex('other')]) }) };
    const c = ctxFor(gone);
    r = playersDay(r, gone, c, addDays(D0, 22), new Set());
    expect(r.get('ex:rdl')!.status).toBe('left');
    r = signFreeAgents(r, addDays(D0, 22), clubs).roster;
    r = playersDay(r, gone, c, addDays(D0, 23), new Set());
    const fa = r.get('ex:rdl')!;
    expect(fa.overall).toBe(r.get('ex:rdl')!.overall);
    expect(canBuyBack(fa, 10, 6).ok).toBe(false);
    // Re-added to the plan: still away until the clause is paid.
    r = playersDay(r, h, ctxFor(h), addDays(D0, 24), new Set());
    const waiting = r.get('ex:rdl')!;
    expect(waiting.status).toBe('left');
    expect(waiting.freeAgent!.readded).toBe(true);
    expect(canBuyBack(waiting, 0, 6).ok).toBe(false);
    const can = canBuyBack(waiting, 10, 6);
    expect(can.ok).toBe(true);
    expect(can.fee).toBeGreaterThan(0);
    const home = bringHome(waiting, addDays(D0, 24));
    expect(home.status).toBe('squad');
    expect(home.freeAgent).toBeUndefined();
    expect(home.card).toEqual(before.card);
    expect(home.versions).toEqual(before.versions);
  });
  it('the clause rises with the card', () => {
    expect(canBuyBack(row({ status: 'left', card: { tier: 'prism', step: 1 }, freeAgent: { club: 'x', on: D0, readded: true } }), 100, 6).fee)
      .toBeGreaterThan(canBuyBack(row({ status: 'left', card: { tier: 'bronze', step: 1 }, freeAgent: { club: 'x', on: D0, readded: true } }), 100, 6).fee);
  });
});

describe('chemistry and morale (spec §9.1)', () => {
  const xi = (ids: string[], unit: 'Pace' | 'Power' = 'Pace'): XiPlace[] => ids.map((id) => ({ player: id, unit, place: 'Wing', name: id, rating: 70 }));
  it('rises by 1 after a week of match days with the same starters, up to 5', () => {
    let c = chemistryAfter({}, xi(['a', 'b']), BASE_RULES);
    for (let i = 0; i < 6; i++) c = chemistryAfter(c, xi(['b', 'a']), BASE_RULES);
    expect(c.Pace!.level).toBe(1);
    let full = { Pace: { level: 5, days: 6, xi: ['a', 'b'] } };
    full = chemistryAfter(full, xi(['a', 'b']), BASE_RULES) as typeof full;
    expect(full.Pace.level).toBe(5);
  });
  it('two changes drop it 1; one change only restarts the week', () => {
    const c0 = { Pace: { level: 3, days: 5, xi: ['a', 'b'] } };
    expect(chemistryAfter(c0, xi(['c', 'd']), BASE_RULES).Pace).toEqual({ level: 2, days: 1, xi: ['c', 'd'] });
    expect(chemistryAfter(c0, xi(['a', 'c']), BASE_RULES).Pace).toEqual({ level: 3, days: 1, xi: ['a', 'c'] });
  });
  it('a one-place unit drops on its single change', () => {
    const c0 = { Power: { level: 2, days: 3, xi: ['a'] } };
    expect(chemistryAfter(c0, xi(['b'], 'Power'), BASE_RULES).Power!.level).toBe(1);
  });
  it('morale: a win lifts a level, a loss drops one, never below Settled', () => {
    expect(moraleAfter(0, 'W')).toBe(1);
    expect(moraleAfter(2, 'W')).toBe(2);
    expect(moraleAfter(2, 'L')).toBe(1);
    expect(moraleAfter(0, 'L')).toBe(0);
    expect(moraleAfter(1, 'D')).toBe(1);
  });
});

describe('tactics and nudges (spec §8)', () => {
  it('Press, Hold and Counter move three axes; chemistry 4+ and High morale add 1; the total is capped at ±3', () => {
    const n = nudgesFor({ tactic: 'press', chemistry: { Pace: 4, Fuel: 3 }, morale: 2, captain: 'Pace', agents: {}, rules: BASE_RULES });
    expect(n.filter((x) => x.axis === 'Pace').reduce((t, x) => t + x.d, 0)).toBe(3);
    expect(n.find((x) => x.axis === 'Rest')!.d).toBe(-1);
    const { values, total } = applyNudges(all(12), [...n, { axis: 'Pace', d: 2, why: 'more' }]);
    expect(total.Pace).toBe(3);
    expect(values.Pace).toBe(15);
    expect(values.Rest).toBe(11);
    expect(applyNudges(all(20), n).values.Pace).toBe(20);
  });
  it('morale Up counts only with the Captain\'s band rule', () => {
    expect(nudgesFor({ morale: 1, captain: 'Fuel', rules: BASE_RULES })).toEqual([]);
    expect(nudgesFor({ morale: 1, captain: 'Fuel', rules: { ...BASE_RULES, moraleCaptainUp: true } })).toHaveLength(1);
  });
  it('the assistant leans on what you did best today', () => {
    expect(assistantTactic({ ...all(10), Shape: 16, Routine: 15 })).toBe('hold');
    expect(assistantTactic({ ...all(10), Pace: 16, Fuel: 15 })).toBe('press');
    expect(assistantTactic({ ...all(10), Pace: 16, Rest: 16 })).toBe('counter');
    expect(assistantTactic(all(10))).toBe('hold');
  });
  it('4-3-3 tilts nothing; a formation with an extra place in a unit tilts it', () => {
    expect(nudgesFor({ formation: '4-3-3', rules: BASE_RULES })).toEqual([]);
    const n = nudgesFor({ formation: '4-4-2', rules: BASE_RULES });
    expect(n).toContainEqual({ axis: 'Power', d: 1, why: 'an extra place' });
    expect(n).toContainEqual({ axis: 'Fuel', d: -1, why: 'one place fewer' });
  });
});

describe('the team sheet (spec §16)', () => {
  const m = (id: string, unit: 'Pace' | 'Power', rating: number, refs?: string[]) => ({ id, unit, name: id, rating, ...(refs ? { refs } : {}) });
  const members = [m('ex:rdl', 'Power', 80, ['rdl']), m('ex:row', 'Power', 70, ['row']), m('ex:curl', 'Power', 60, ['curl']), m('pace:steps', 'Pace', 75), m('pace:big', 'Pace', 65), m('pace:long', 'Pace', 55)];
  it('untouched, the best match ratings start; Power from the latest session', () => {
    const xi = sheetEleven(members, undefined, ['row', 'curl']);
    expect(xi.filter((x) => x.unit === 'Power').map((x) => x.player)).toEqual(['ex:row']);
    expect(xi.filter((x) => x.unit === 'Pace').map((x) => x.player)).toEqual(['pace:steps', 'pace:big']);
    expect(defaultPool(members, undefined)).toHaveLength(members.length);
  });
  it('your pick wins, from a list sorted by rating', () => {
    const xi = sheetEleven(members, { picks: { Power: ['ex:curl'], Pace: ['pace:long', 'pace:steps'] } }, ['row']);
    expect(xi.filter((x) => x.unit === 'Power').map((x) => x.player)).toEqual(['ex:curl']);
    expect(xi.filter((x) => x.unit === 'Pace').map((x) => x.player)).toEqual(['pace:long', 'pace:steps']);
  });
  it('a tap swaps a bench player in for the lowest starter, or a starter out for the best of the bench', () => {
    const pace = members.filter((x) => x.unit === 'Pace');
    expect(toggleStarter(pace, ['pace:steps', 'pace:big'], 'pace:long', 2)).toEqual(['pace:steps', 'pace:long']);
    expect(toggleStarter(pace, ['pace:steps', 'pace:big'], 'pace:steps', 2)).toEqual(['pace:long', 'pace:big']);
  });
  it('captains: your pick, else the starter with most appearances; set pieces: your pick, else Power\'s best', () => {
    const xi = sheetEleven(members, undefined);
    const apps = (id: string) => (id === 'pace:big' ? 40 : 3);
    expect(captainsOf(xi, undefined, apps, () => true).Pace).toBe('pace:big');
    expect(captainsOf(xi, { captains: { Pace: 'pace:steps' } }, apps, () => true).Pace).toBe('pace:steps');
    expect(setPieceOf(xi, undefined, () => true)).toBe('ex:rdl');
    expect(setPieceOf(xi, { setPiece: 'ex:row' }, () => true)).toBe('ex:row');
    expect(setPieceOf(xi, { setPiece: 'ex:gone' }, (id) => id !== 'ex:gone')).toBe('ex:rdl');
  });
  it('freshness and form feed the eleven through the match rating', () => {
    const tired = row({ id: 'ex:a', overall: 80, fresh: 70, form: 0 });
    const fresh = row({ id: 'ex:b', overall: 70, fresh: 100, form: 1 });
    const r: Roster = new Map([[tired.id, tired], [fresh.id, fresh]]);
    expect(membersOf(r).find((x) => x.id === 'ex:a')!.rating).toBe(56);
    expect(squadNight(r, all(12), false).xi.find((x) => x.unit === 'Power')!.player).toBe('ex:b');
  });
  it('a sick night plays the bench with no chemistry; tactics still count', () => {
    const r: Roster = new Map([['ex:a', row({ id: 'ex:a' })], ['ex:b', row({ id: 'ex:b', overall: 60 })]]);
    const n = squadNight(r, all(12), true, { night: { tactic: 'hold', chemistry: { Power: 5 } } });
    expect(n.xi.find((x) => x.unit === 'Power')!.player).toBe('ex:b');
    expect(n.nudges.some((x) => x.why === 'chemistry')).toBe(false);
    expect(n.nudges.some((x) => x.why === 'Hold')).toBe(true);
  });
  it('the latest session is the last finished one on or before the day', () => {
    const h = health({ sessions: [sess('2026-08-01', ['a']), sess('2026-08-03', ['b', 'c'])], sets: [set('2026-08-03', 'b', 10, 8)] });
    expect(latestSession(h, '2026-08-02')).toEqual(['a']);
    expect(latestSession(h, '2026-08-05')).toEqual(['b']);
  });
});
