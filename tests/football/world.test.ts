// Engine 2, layer 4 (the world): loans from packs (the draw, the 7 days, the bench swap), nations, sleep-style trials,
// international breaks and duty traits, the scout line, the loan drawings, and the Continental era's entry and rules.
import { describe, expect, it } from 'vitest';
import { addDays, type DayKey } from '../../src/domain/dates';
import type { Day, Settings } from '../../src/domain/types';
import { LOANS } from '../../src/football/content/loans';
import { ICON_LOAN_BASE, ICON_LOAN_STEP } from '../../src/football/content/packs';
import { NATION_POOL } from '../../src/football/content/nations';
import { ERAS, TECHS } from '../../src/football/content/tree';
import { YOUTH_POOL } from '../../src/football/data/load';
import { loanSvg, kitOf, poseOf } from '../../src/football/globe/art';
import { BREAK_BEFORE, BREAK_DAYS, breakDue, callUps, CALL_UPS, dutyBonus, dutyReward, loggedOn } from '../../src/football/globe/duty';
import {
  atClub, daysLeft, iconOdds, LOAN_DAYS, LOAN_MENTOR, LOAN_RATING, loanById, loanItem, leavingOn, loansWaiting, mentorFor, pickLoan, startLoans, withLoans,
} from '../../src/football/globe/loans';
import { assignNations, fromName, nationFor } from '../../src/football/globe/nations';
import { scoutLine, strongestUnit, weakestUnit } from '../../src/football/globe/scout';
import { academyFull, sleepWeek, trialDay, trialists, type SleepWeek } from '../../src/football/globe/trials';
import { emptyGlobe, type LoanStay } from '../../src/football/globe/types';
import type { FbPlayer, XiPlace } from '../../src/football/players/types';
import { youthDay } from '../../src/football/players/youth';
import { rng } from '../../src/football/rng';
import { isBreakDay, rulesFrom } from '../../src/football/store/globe';
import type { Health } from '../../src/football/store/gather';
import type { FbSave, FbSquadRow } from '../../src/football/store/tables';
import { openPack } from '../../src/football/tree/packs';
import { activeEffects, erasOpen } from '../../src/football/tree/research';
import { emptyUser, type PackOpened } from '../../src/football/tree/types';
import { pickTrait, traitsOf } from '../../src/football/rotation/traits';
import { cardAfter, LEGEND_DAYS, LEGEND_HOLD } from '../../src/football/players/cards';

const D0 = '2026-10-05'; // a Monday
const settings = { targets: [], checklist: [{ id: 'brush', name: 'Brush', slots: ['am'], active: true }] } as unknown as Settings;
const health = (p: Partial<Health> = {}): Health => ({ settings, days: new Map(), sessions: [], kcal: new Map(), measures: [], sets: [], meals: new Map(), walks: [], routes: [], ...p });
const days = (xs: Partial<Day>[]) => new Map(xs.map((d) => [d.date!, d as Day]));
const player = (over: Partial<FbPlayer> = {}): FbPlayer => ({
  id: 'ex:rdl', unit: 'Power', kind: 'exercise', ref: 'rdl', name: 'RDL', art: 'rdl', signed: D0, status: 'squad', overall: 70, on: D0,
  best: 70, bestOn: D0, card: { tier: 'gold', step: 1 }, versions: [], moments: [], apps: 0, goals: 0, saves: 0, seasons: [], limitBreaks: [], ...over,
});
const opened = (id: string, on: DayKey, loans: string[]): PackOpened => ({ id, on, items: loans.map((l) => ({ kind: 'loan' as const, id: l, rarity: loanById(l)!.tier })) });
const ONE = { days: LOAN_DAYS, slots: 1 };

describe('loans: the draw', () => {
  it('Icon odds: 2% and +0.5% for each pack opened since the last Icon loan, plus the tree', () => {
    expect(iconOdds([])).toBe(ICON_LOAN_BASE);
    const plain = (id: string): PackOpened => ({ id, on: D0, items: Array.from({ length: 5 }, () => ({ kind: 'research' as const, n: 3 })) });
    expect(iconOdds([{ id: 'single', on: D0, items: [{ kind: 'album', id: 'x' }] }])).toBe(ICON_LOAN_BASE);
    expect(iconOdds([plain('a'), plain('b'), plain('c')])).toBe(ICON_LOAN_BASE + 3 * ICON_LOAN_STEP);
    expect(iconOdds([plain('a'), opened('b', D0, ['ronaldinho']), plain('c')])).toBe(ICON_LOAN_BASE + ICON_LOAN_STEP);
    expect(iconOdds([], 1)).toBe(ICON_LOAN_BASE + 1);
  });
  it('a loan not met yet comes first (a met one only now and then); once a tier is all met, met ones come back', () => {
    const golds = LOANS.filter((l) => l.tier === 'gold').map((l) => l.id);
    const r = rng(7);
    const back = Array.from({ length: 400 }, () => pickLoan(r, 'gold', [golds[0]]).id).filter((id) => id === golds[0]).length;
    expect(back).toBeGreaterThan(0);
    expect(back).toBeLessThan(40);
    expect(golds).toContain(pickLoan(rng(3), 'gold', golds).id);
  });
  it('the slot gives Gold or Prism; the Icon check gives an Icon loan, a retired great', () => {
    const tiers = new Set(Array.from({ length: 60 }, (_, i) => loanItem(rng(i + 1), false, []).rarity));
    expect([...tiers].sort()).toEqual(['gold', 'prism']);
    const icon = loanItem(rng(1), true, []);
    expect(icon.rarity).toBe('icon');
    expect(loanById(icon.id!)!.tier).toBe('icon');
  });
  it('a pack with a 100% Icon check ends on an Icon loan; without loans passed it never holds one', () => {
    const items = openPack({ id: 'p1', size: 'normal' }, emptyUser(), undefined, { iconPct: 100, met: [] });
    expect(items[items.length - 1]).toMatchObject({ kind: 'loan', rarity: 'icon' });
    for (let i = 0; i < 30; i++) expect(openPack({ id: `q${i}`, size: 'normal' }, emptyUser()).some((x) => x.kind === 'loan')).toBe(false);
  });
  it('the Icon check runs on its own seed: the album cards of a pack don\'t change with it', () => {
    const a = openPack({ id: 'same', size: 'normal' }, emptyUser(), undefined, { iconPct: 0, met: [] });
    const b = openPack({ id: 'same', size: 'normal' }, emptyUser(), undefined, { iconPct: 100, met: [] });
    expect(a.slice(0, 3)).toEqual(b.slice(0, 3));
  });
});

describe('loans: 7 days, one slot, the bench swap', () => {
  const pace = LOANS.find((l) => l.unit === 'Pace' && l.tier === 'gold')!;
  const pace2 = LOANS.find((l) => l.unit === 'Pace' && l.tier === 'prism')!;
  const rest = LOANS.find((l) => l.unit === 'Rest')!;
  it('starts on the day it is opened and stays 7 days, then leaves', () => {
    const [st] = startLoans([], [opened('p', D0, [pace.id])], [], D0, ONE);
    expect(st).toMatchObject({ key: 'p:0', loan: pace.id, unit: 'Pace', from: D0, until: addDays(D0, 6) });
    expect(atClub([st], addDays(D0, 6))).toHaveLength(1);
    expect(atClub([st], addDays(D0, 7))).toHaveLength(0);
    expect(daysLeft(st, D0)).toBe(7);
    expect(daysLeft(st, addDays(D0, 6))).toBe(1);
    expect(leavingOn([st], addDays(D0, 7))).toEqual([st]);
  });
  it('one at a time: the next waits for a free slot, and comes when the first has gone', () => {
    const packs = [opened('p', D0, [pace.id, rest.id])];
    const first = startLoans([], packs, [], D0, ONE);
    expect(first).toHaveLength(1);
    expect(loansWaiting(first, packs).map((q) => q.loan)).toEqual([rest.id]);
    expect(startLoans(first, packs, [], addDays(D0, 3), ONE)).toHaveLength(0);
    expect(startLoans(first, packs, [], addDays(D0, 7), ONE).map((s) => s.loan)).toEqual([rest.id]);
  });
  it('two slots (Squad depth) take two loans, but never two in one unit; Loan manager makes it 10 days', () => {
    const two = startLoans([], [opened('p', D0, [pace.id, pace2.id, rest.id])], [], D0, { days: 10, slots: 2 });
    expect(two.map((s) => s.unit)).toEqual(['Pace', 'Rest']);
    expect(two[0].until).toBe(addDays(D0, 9));
  });
  it('a loan met before is marked as back', () => {
    expect(startLoans([], [opened('p', D0, [pace.id])], [pace.id], D0, ONE)[0].back).toBe(true);
  });
  const xi: XiPlace[] = [
    { player: 'steps', unit: 'Pace', place: 'LW', name: 'Steps', rating: 72 },
    { player: 'walks', unit: 'Pace', place: 'RW', name: 'Walks', rating: 61 },
    { player: 'hours', unit: 'Rest', place: 'GK', name: 'Hours', rating: 80 },
  ];
  const stay = (l: string): LoanStay => ({ key: `k:${l}`, loan: l, unit: loanById(l)!.unit, tier: loanById(l)!.tier, from: D0, until: addDays(D0, 6), apps: [], goals: 0 });
  it('takes the lowest starter\'s place in its unit; that player sits and rests', () => {
    const out = withLoans(xi, [stay(pace.id)], () => true);
    expect(out.xi.map((x) => x.player)).toEqual(['steps', `loan:${pace.id}`, 'hours']);
    expect(out.xi[1]).toMatchObject({ place: 'RW', name: pace.name, rating: LOAN_RATING.gold });
    expect(out.played).toEqual([`k:${pace.id}`]);
    expect(out.rested).toEqual(['walks']);
  });
  it('plays only on a day its unit was logged', () => {
    const out = withLoans(xi, [stay(pace.id)], (u) => u !== 'Pace');
    expect(out.xi).toEqual(xi);
    expect(out.played).toEqual([]);
  });
  it('a short unit\'s best covering two places still starts in the other one', () => {
    const short: XiPlace[] = [{ player: 'steps', unit: 'Pace', place: 'LW', name: 'Steps', rating: 72 }, { player: 'steps', unit: 'Pace', place: 'RW', name: 'Steps', rating: 72 }];
    const out = withLoans(short, [stay(pace.id)], () => true);
    expect(out.xi.map((x) => x.player)).toEqual([`loan:${pace.id}`, 'steps']);
    expect(out.rested).toEqual([]);
  });
  it('mentor: youngsters in the loan\'s unit grow ×1.5 while it is at the club', () => {
    expect(mentorFor([stay(pace.id)], D0, 'Pace')).toBe(LOAN_MENTOR);
    expect(mentorFor([stay(pace.id)], D0, 'Rest')).toBe(1);
    expect(mentorFor([stay(pace.id)], addDays(D0, 7), 'Pace')).toBe(1);
  });
  it('the mentor multiplies a night\'s growth', () => {
    const h = health({ days: days([{ date: D0, sleep: { asleep: 22 * 60 + 30, woke: 7 * 60 } }]) });
    const y: FbSquadRow = { id: 'y', kind: 'youth', name: 'Plank', axis: 'Pace', potential: 4, what: 'x', exercise: false, season: 1, logged: [], status: 'growing', link: { kind: 'habit', id: 'brush' }, sessions: [], growth: 0, grown: [] };
    const plain = youthDay(h, y, D0, 23 * 60, {});
    const mentored = youthDay(h, y, D0, 23 * 60, { mult: LOAN_MENTOR });
    expect(plain.growth).toBeGreaterThan(0);
    expect(mentored.growth).toBeCloseTo(plain.growth! * LOAN_MENTOR);
    expect(mentored.lastGrow).toEqual({ on: D0, n: mentored.growth });
  });
});

describe('loans: the drawings', () => {
  it('every loan has a pose, kit colours and a shirt number; the face is line-art only, never a portrait', () => {
    for (const l of LOANS) {
      const svg = loanSvg(l);
      expect(svg).toContain(`>${l.drawing.number}<`);
      expect(svg).not.toMatch(/<image|<img|href=/);
      expect(svg).toContain(`number ${l.drawing.number}`);
      expect(l.drawing.face).toBe('line-art shading only');
    }
  });
  it('reads pose and kit from the brief', () => {
    expect(poseOf('Diving full stretch to his right')).toBe('dive');
    expect(kitOf('Red and black stripes')).toMatchObject({ pattern: 'stripes' });
    expect(kitOf('Red shirt with white sleeves').pattern).toBe('sleeves');
  });
  it('Icon loans are retired greats; the pool has Gold, Prism and Icon in every unit', () => {
    for (const u of ['Pace', 'Power', 'Fuel', 'Rest', 'Routine', 'Shape'] as const) {
      expect(new Set(LOANS.filter((l) => l.unit === u).map((l) => l.tier))).toEqual(new Set(['gold', 'prism', 'icon']));
    }
  });
});

describe('nations', () => {
  it('a name that carries a nation plays for it', () => {
    expect(nationFor('ex:rdl', 'Romanian deadlift')).toEqual({ code: 'RO', fromName: true });
    expect(nationFor('ex:bss', 'Bulgarian split squat').fromName).toBe(true);
    expect(fromName('Romanian deadlift', 'RO')).toBe(true);
  });
  it('everyone else gets one nation from the pool, the same every time', () => {
    const a = nationFor('steps', 'Steps');
    expect(a.fromName).toBe(false);
    expect(NATION_POOL).toContain(a.code);
    expect(nationFor('steps', 'Steps')).toEqual(a);
  });
  it('a nation once given is kept for good', () => {
    const known = { steps: 'JP' };
    const out = assignNations(known, [{ id: 'steps', name: 'Steps' }, { id: 'hours', name: 'Hours' }]);
    expect(out.steps).toBe('JP');
    expect(out.hours).toBe(nationFor('hours', 'Hours').code);
    expect(assignNations(out, [{ id: 'steps', name: 'Steps' }])).toBe(out);
  });
});

describe('sleep-style trials', () => {
  const night = (date: DayKey, asleep: number, woke: number, rested?: number): Partial<Day> => ({ date, sleep: { asleep, woke, ...(rested ? { rested } : {}) } });
  const week = (f: (d: DayKey) => Partial<Day>) => health({ days: days(Array.from({ length: 7 }, (_, i) => f(addDays(D0, -i)))) });
  it('Sunday trials, and Wednesday too with Weekly trials', () => {
    expect(trialDay('2026-10-11', false)).toBe('sunday');
    expect(trialDay('2026-10-07', false)).toBeUndefined();
    expect(trialDay('2026-10-07', true)).toBe('midweek');
  });
  it('early, regular bedtimes kept read as early; long nights as long; short but rested as short', () => {
    expect(sleepWeek(week((d) => night(d, 22 * 60 + 30, 6 * 60 + 45)), D0, 23 * 60).style).toBe('early');
    expect(sleepWeek(week((d) => night(d, 23 * 60 + 30, 8 * 60)), D0, 21 * 60).style).toBe('long');
    expect(sleepWeek(week((d) => night(d, 60, 7 * 60, 5)), D0, 21 * 60).style).toBe('short');
  });
  it('fewer than three nights logged: a mixed week, no extra luck', () => {
    const h = health({ days: days([night(D0, 22 * 60, 7 * 60)]) });
    expect(sleepWeek(h, D0, 23 * 60)).toMatchObject({ style: 'mixed', nights: 1, quality: 0 });
  });
  const rules = { size: 2, hold: 2, rarity: 0, abroad: false, potential: 0 };
  const sw = (style: SleepWeek['style']): SleepWeek => ({ style, nights: 7, kept: 7, hours: 7.5, quality: 0.8 });
  it('the style draws its kind: early sleep brings Shape and Rest, short sleep brings Pace', () => {
    const early = trialists(YOUTH_POOL, sw('early'), '2026-10-11', 1, new Set(), rules, 'sunday');
    expect(early).toHaveLength(2);
    for (const y of early) expect(['Shape', 'Rest']).toContain(y.axis);
    for (const y of trialists(YOUTH_POOL, sw('short'), '2026-10-11', 1, new Set(), rules, 'sunday')) expect(y.axis).toBe('Pace');
  });
  it('trialists wait two days to be tied, a midweek day brings one, and nobody already at the club comes', () => {
    const came = trialists(YOUTH_POOL, sw('mixed'), '2026-10-11', 1, new Set(), rules, 'sunday');
    expect(came[0]).toMatchObject({ status: 'trial', trialUntil: '2026-10-12', style: 'mixed' });
    expect(trialists(YOUTH_POOL, sw('mixed'), '2026-10-14', 1, new Set(), rules, 'midweek')).toHaveLength(1);
    const taken = new Set(YOUTH_POOL.map((y) => y.name.trim().toLowerCase()));
    expect(trialists(YOUTH_POOL, sw('mixed'), '2026-10-11', 1, taken, rules, 'sunday')).toEqual([]);
  });
  it('Foreign scouts: trialists can come from abroad', () => {
    for (const y of trialists(YOUTH_POOL, sw('long'), '2026-10-11', 1, new Set(), { ...rules, abroad: true }, 'sunday')) expect(NATION_POOL).toContain(y.nation);
  });
  it('the academy holds three tied youngsters', () => {
    const y = (i: number, linked = true): FbSquadRow => ({ id: `y${i}`, kind: 'youth', name: `Y${i}`, axis: 'Pace', potential: 3, what: '', exercise: false, season: 1, logged: [], status: 'growing', ...(linked ? { link: { kind: 'habit' as const, id: `h${i}` } } : {}) });
    expect(academyFull([y(1), y(2)], 3)).toBe(false);
    expect(academyFull([y(1), y(2), y(3)], 3)).toBe(true);
    expect(academyFull([y(1), y(2), y(3, false)], 3)).toBe(false);
  });
});

describe('international breaks and duty', () => {
  it('two breaks a season, before days 14 and 30, three days each; none between seasons', () => {
    expect(BREAK_BEFORE).toEqual({ 1: 14, 2: 30 });
    expect(breakDue('season', 1, 14, [])).toEqual({ n: 1, done: 0 });
    expect(breakDue('season', 1, 14, [{ season: 1, n: 1, days: ['a', 'b'] }])).toEqual({ n: 1, done: 2 });
    expect(breakDue('season', 1, 14, [{ season: 1, n: 1, days: ['a', 'b', 'c'] }])).toBeUndefined();
    expect(breakDue('season', 1, 13, [])).toBeUndefined();
    expect(breakDue('season', 1, 30, [{ season: 1, n: 1, days: ['a', 'b', 'c'] }])).toEqual({ n: 2, done: 0 });
    expect(breakDue('event', 1, 14, [])).toBeUndefined();
  });
  it('a break day pauses the season: no league game', () => {
    const save = { globe: { ...emptyGlobe(), breaks: [{ season: 1, n: 1 as const, days: ['2026-10-20'] }] } } as FbSave;
    expect(isBreakDay(save, '2026-10-20')).toBe(true);
    expect(isBreakDay(save, '2026-10-21')).toBe(false);
  });
  it('call-ups: every name that carries a nation, then the three best of the rest, six at most', () => {
    const ps = [
      player({ id: 'rdl', name: 'Romanian deadlift', overall: 50 }), player({ id: 'bss', name: 'Bulgarian split squat', overall: 40 }),
      player({ id: 'a', name: 'Steps', overall: 90 }), player({ id: 'b', name: 'Hours', overall: 80 }), player({ id: 'c', name: 'Protein', overall: 70 }),
      player({ id: 'd', name: 'Water', overall: 60 }), player({ id: 'gone', name: 'Old', overall: 99, status: 'left' }),
    ];
    const nations = assignNations({}, ps);
    const up = callUps(ps, nations);
    expect(up.map((x) => x.player.id)).toEqual(['rdl', 'bss', 'a', 'b', 'c']);
    expect(up[0].nation).toBe('RO');
    expect(up.length).toBeLessThanOrEqual(CALL_UPS);
  });
  it('logged on: each player kind reads its own data', () => {
    const h = health({ days: days([{ date: D0, steps: 9000 }, { date: addDays(D0, 1), steps: 9000, status: 'sick' } as Partial<Day>]) });
    expect(loggedOn(h, { kind: 'steps' }, D0)).toBe(true);
    expect(loggedOn(h, { kind: 'steps' }, addDays(D0, 1))).toBe(false);
    expect(loggedOn(h, { kind: 'exercise', ref: 'rdl' }, D0)).toBe(false);
  });
  const row = (n: number) => ({ season: 1, n: 1 as const, player: 'rdl', name: 'Romanian deadlift', nation: 'RO', days: Array.from({ length: n }, (_, i) => addDays(D0, i)) });
  it('back from duty: logged on 2 of 3 days earns a trait it can play', () => {
    const p = player({ id: 'rdl', name: 'Romanian deadlift' });
    const r = dutyReward(p, row(2), null, addDays(D0, 2));
    expect(r.kind).toBe('trait');
    expect(r.trait).toBe(pickTrait(p, `${addDays(D0, 2)}:duty`, 'duty'));
    const withDuty = { ...p, duty: [{ on: r.on, nation: r.nation, trait: r.trait }] };
    expect(traitsOf(withDuty)).toContain(r.trait);
  });
  it('with no trait left to earn it is +2 to the lowest attribute instead; one day is a quiet trip', () => {
    const p = player({ id: 'rdl', name: 'Romanian deadlift' });
    const full = { ...p, limitBreaks: ['a', 'b', 'c', 'd', 'e', 'f'].map((t) => ({ on: D0, trait: t })) } as unknown as FbPlayer;
    const attrs = [{ id: 'str', value: 60 }, { id: 'tech', value: 52 }, { id: 'vol', value: 70 }] as never;
    const r = dutyReward(full, row(3), attrs, D0);
    expect(r).toMatchObject({ kind: 'attr', attr: 'tech', d: 2 });
    expect(dutyBonus({ duty: [r, { on: D0, nation: 'RO', attr: 'tech', d: 2 }] })).toEqual({ tech: 4 });
    expect(dutyReward(p, row(1), attrs, D0).kind).toBe('quiet');
    expect(BREAK_DAYS).toBe(3);
  });
});

describe('the scout line', () => {
  const opp = { id: 'ker', shrinks: { Pace: -3, Power: 0, Fuel: -1, Rest: 2, Routine: 0, Shape: 0 }, presses: { Pace: 0, Power: 0, Fuel: 0, Rest: 0, Routine: 0, Shape: 0 } } as never;
  it('names their strongest unit and the habit that answers it, and the weak spot with the scout', () => {
    expect(strongestUnit(opp)).toBe('Pace');
    expect(weakestUnit(opp)).toBe('Rest');
    const l = scoutLine(opp, 'FC Kermis', D0, true);
    expect(l.unit).toBe('Pace');
    expect(l.line.length).toBeGreaterThan(10);
    expect(l.line).not.toContain('{');
    expect(l.weak?.unit).toBe('Rest');
    expect(scoutLine(opp, 'FC Kermis', D0).weak).toBeUndefined();
  });
});

describe('the Continental era', () => {
  const era = (id: string) => TECHS.filter((t) => t.era === id).map((t) => t.id);
  const upTo = (n: number) => ERAS.slice(0, n).flatMap((e) => era(e.id).slice(0, 6));
  it('opens once six Renowned techs are researched, and not before', () => {
    expect(erasOpen(upTo(5))).toContain('continental');
    expect(erasOpen([...upTo(4), ...era('renowned').slice(0, 5)])).not.toContain('continental');
  });
  const rules = (ids: string[]) => rulesFrom(activeEffects({ researched: ids, leave: [], projectsDone: [], boons: [] }));
  it('its techs reach the world: two loans, 10-day loans, False nine, Two fronts, trialists from abroad', () => {
    const base = rules([]);
    expect(base.loan).toEqual({ days: 7, slots: 1 });
    expect(base.falseNine).toBe(0);
    expect(rules(['c-squaddepth']).loan.slots).toBe(2);
    expect(rules(['c-loanmanager']).loan.days).toBe(10);
    expect(rules(['c-falsenine']).falseNine).toBe(90);
    expect(rules(['c-twofronts']).twoFronts).toBe(true);
    expect(rules(['c-foreignscouts']).trials.abroad).toBe(true);
    expect(rules(['c-loanmanager']).loan.days).toBe(10);
  });
  it('a loan on leave: the loan manager away means 7-day loans again', () => {
    const r = rulesFrom(activeEffects({ researched: ['c-loanmanager'], leave: ['loan-manager'], projectsDone: [], boons: [] }));
    expect(r.loan.days).toBe(7);
  });
});

describe('Legend D build-up only on a true Legend', () => {
  const icon = { card: { tier: 'icon' as const, step: 2 }, best: 94, bestOn: D0, versions: [], moments: [] };
  const legendMoment = (r: ReturnType<typeof cardAfter>) => r.moments.find((m) => m.kind === 'tier' && m.tier === 'legend');
  it('no Legend moment (so no build-up) before 12 weeks of history or 28 days held at 95+', () => {
    const on = addDays(D0, LEGEND_DAYS + 10);
    expect(legendMoment(cardAfter(icon, 99, on, false, { signed: addDays(on, -30), at95Since: addDays(on, -40) }))).toBeUndefined();
    expect(legendMoment(cardAfter(icon, 99, on, false, { signed: D0, at95Since: addDays(on, -(LEGEND_HOLD - 2)) }))).toBeUndefined();
  });
  it('once the gate is met the card moment is a Legend tier-up, which plays bu-legend', () => {
    const on = addDays(D0, LEGEND_DAYS + 10);
    const m = legendMoment(cardAfter(icon, 99, on, false, { signed: D0, at95Since: addDays(on, -(LEGEND_HOLD + 1)) }));
    expect(m).toMatchObject({ kind: 'tier', tier: 'legend', from: { tier: 'icon' } });
  });
});
