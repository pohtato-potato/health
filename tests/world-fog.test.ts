// The world in fog and the scout job (desk-and-world spec §3–4, Fork 2). Rules only; made-up clubs and days.
import { describe, expect, it } from 'vitest';
import { spendDie, spendSeed } from '../src/football/desk/spend';
import { jobById, JOBS } from '../src/football/desk/jobs';
import { scout } from '../src/football/desk/jobs/scout';
import { emptyDesk, type DeskState, type DeskView, type Die, type Effect } from '../src/football/desk/types';
import {
  BASICS, beforeAfter, CLUB_CLOCK, factsOf, FACT_WEIGHT, FACTS, knownPct, LEAD_PCT, MET_BEFORE, nextFacts, pctOf, revealFor,
  scoutLevelOf, scoutReports, TABLE_PCT, THIN_PCT, WIDE_CLOCK, worldSeen, type Fact, type FogSource,
} from '../src/football/fog/fog';
import { reportOf, stillHidden } from '../src/football/fog/report';
import { readOf } from '../src/football/matchday';
import { readScouted, scoutLevel, isScouted } from '../src/football/store/paused';
import { hashSeed, rng } from '../src/football/rng';

const die = (axis: Die['axis'], value: Die['value']): Die => ({ axis, value, score: value * 3, reason: `${axis} reason` });
const clubs = (o: Record<string, Fact[]> = {}) => [
  { id: 'c1', name: 'Hospital Porters FC', tier: 5, facts: o.c1 ?? [] },
  { id: 'c2', name: 'Delfshaven Boys', tier: 5, facts: o.c2 ?? [] },
  { id: 'c3', name: 'Treadmill Rovers', tier: 4, facts: o.c3 ?? [] },
  { id: 'x1', name: 'Faraway FC', tier: 0, facts: o.x1 ?? [] },
];
const view = (o: Partial<DeskView> = {}, known: Record<string, Fact[]> = {}): DeskView => ({
  date: '2030-03-05', oppKnown: 'none', youth: [], projects: [], columnLines: [], questions: [], answered: [], spentToday: {}, clocks: [],
  world: { ownTier: 5, clubs: clubs(known) }, ...o,
});
const deskWith = (dice: Die[], date = '2030-03-05'): DeskState => ({ ...emptyDesk(), dice: { [date]: dice } });
const spend = (day: string, effects: Effect[], value: Die['value'] = 4) => ({ id: `${day}:Pace`, day, axis: 'Pace' as const, value, job: 'scout' as const, effects });

describe('known % (spec §4)', () => {
  it('the table gives 20%; the eight facts make up the rest, to 100', () => {
    expect(TABLE_PCT + FACTS.reduce((t, f) => t + FACT_WEIGHT[f], 0)).toBe(100);
    expect(pctOf([])).toBe(20);
    expect(pctOf(FACTS)).toBe(100);
    // p3-scout: a club scout from nothing brings kit, rating, style and weak side: 20% to 65%.
    expect(pctOf(nextFacts(new Set(), 4))).toBe(65);
  });

  it('an unknown club is fogged; Brabo and World Cup nations never are', () => {
    const src: FogSource = { met: [], fog: { since: '2030-01-01', old: [] } };
    expect(knownPct(src, 'c1')).toBe(20);
    expect(scoutLevel(src, 'c1')).toBe('none');
    expect(knownPct(src, 'bra')).toBe(100);
    expect(knownPct(src, 'nat:br')).toBe(100);
  });

  it('meeting a club gives the basics: style, not the weak side', () => {
    const src: FogSource = { met: ['c1'], fog: { since: '2030-01-01', old: [] } };
    expect([...factsOf(src, 'c1')].sort()).toEqual([...BASICS].sort());
    expect(scoutLevel(src, 'c1')).toBe('style');
    expect(isScouted(src, 'c1')).toBe(false);
  });

  it('on the current save, clubs met before the fog keep what they had (12.8 a); the rest is fog', () => {
    const src: FogSource = { met: ['c1', 'c2'], fog: { since: '2030-01-01', old: ['c1'] } };
    expect([...factsOf(src, 'c1')].sort()).toEqual([...MET_BEFORE].sort());
    expect(scoutLevel(src, 'c1')).toBe('full');
    expect(knownPct(src, 'c1')).toBe(90);
    expect(scoutLevel(src, 'c2')).toBe('style');
    expect(knownPct(src, 'c3')).toBe(20);
    // A save not yet stamped treats every club met as met before the fog.
    expect(scoutLevel({ met: ['c2'] }, 'c2')).toBe('full');
  });

  it('a scouting lead from the pick of three makes a club scouted', () => {
    expect(scoutLevel({ met: [], scouted: ['c3'], fog: { since: '2030-01-01', old: [] } }, 'c3')).toBe('full');
  });

  it('watching a club as tonight’s opponent adds its style, and its weak side on a 3 or more', () => {
    const w = (level: 'style' | 'full'): FogSource => ({ met: [], fog: { since: '2030-01-01', old: [] }, desk: { ...emptyDesk(), spends: [spend('2030-03-05', [{ kind: 'watch', club: 'c1', level }])] } });
    expect(scoutLevel(w('style'), 'c1')).toBe('style');
    expect(scoutLevel(w('full'), 'c1')).toBe('full');
  });

  it('a scout report counts from the morning after the trip ends', () => {
    const desk = { ...emptyDesk(), spends: [spend('2030-03-05', [{ kind: 'scout', target: 'c1', reveal: { c1: ['kit', 'rating', 'style', 'weak'] }, before: 20, after: 65 }])] };
    const src: FogSource = { met: [], fog: { since: '2030-01-01', old: [] }, desk };
    expect(knownPct(src, 'c1', '2030-03-05')).toBe(20);
    expect(knownPct(src, 'c1', '2030-03-06')).toBe(65);
    expect(scoutLevel(src, 'c1', '2030-03-06')).toBe('full');
    // The desk plans with a report still on its way.
    expect(knownPct(src, 'c1')).toBe(65);
    expect(scoutReports(desk)).toHaveLength(1);
  });

  it('scouted replaces "met before" on the tactics board: a club met now reads style only', () => {
    const src: FogSource = { met: ['c1'], fog: { since: '2030-01-01', old: [] } };
    const read = readOf({ tactic: 'press', width: 'left' }, { id: 'c1', style: 'possession' }, readScouted(scoutLevel(src, 'c1')));
    expect(read.scouted).toBe(true);
    expect(read.weakKnown).toBe(false);
    expect(read.widthRight).toBe(false);
    expect(scoutLevelOf(new Set<Fact>(['weak']))).toBe('none');
  });

  it('how much of the world is seen is the mean known % of its clubs', () => {
    const src: FogSource = { met: ['c1'], fog: { since: '2030-01-01', old: ['c1'] } };
    expect(worldSeen(src, ['c1', 'c2'])).toBe(55);
    expect(worldSeen(src, ['bra'])).toBe(100);
  });
});

describe('what a trip brings back', () => {
  it('a club: the next four facts in order; a thin trip one fewer', () => {
    const cs = [{ id: 'c1', facts: new Set<Fact>(['kit', 'rating', 'style', 'known']) }];
    expect(revealFor('c1', cs)).toEqual({ c1: ['weak', 'hidden', 'manager', 'history'] });
    expect(revealFor('c1', cs, true)).toEqual({ c1: ['weak', 'hidden', 'manager'] });
    expect(beforeAfter(cs, revealFor('c1', cs))).toEqual([60, 100]);
  });

  it('a division or abroad: every club’s crest, rating and style, never its secrets', () => {
    const cs = [{ id: 'c1', facts: new Set<Fact>() }, { id: 'c2', facts: new Set<Fact>(['kit', 'rating', 'style']) }];
    expect(revealFor('div:5', cs)).toEqual({ c1: ['kit', 'rating', 'style'] });
    expect(revealFor('div:5', cs, true)).toEqual({ c1: ['kit', 'rating'] });
    expect(beforeAfter(cs, revealFor('div:5', cs))).toEqual([35, 50]);
  });
});

describe('Send a scout (spec §3)', () => {
  it('is on the desk, after watching tonight’s opponent', () => {
    expect(JOBS.map((j) => j.id).slice(0, 2)).toEqual(['watch', 'scout']);
    expect(jobById('scout')).toBe(scout);
    expect(scout.open(view())).toBe(true);
    expect(scout.open(view({ world: undefined }))).toBe(false);
  });

  it('offers your division, its clubs least known first, the other divisions, abroad, then every other club', () => {
    const t = scout.targets!(view({}, { c2: ['kit'] })).map((x) => x.id);
    expect(t.slice(0, 3)).toEqual(['div:5', 'c1', 'c2']);
    expect(t.indexOf('div:4')).toBe(3);
    expect(t).toContain('abroad');
    expect(t.indexOf('c3')).toBeGreaterThan(t.indexOf('abroad'));
  });

  it('a club is a clock of 2, a division or abroad 4; a die fills 1, or 2 on a 5 or 6', () => {
    const one = scout.spend(die('Pace', 3), view(), 'c1', () => 0.9);
    expect(one.opens).toEqual([{ id: 'scout:c1:1', job: 'scout', target: 'c1', name: 'Scout: Hospital Porters FC', size: CLUB_CLOCK }]);
    expect(one.effects).toEqual([{ kind: 'clock', clock: 'scout:c1:1', n: 1 }]);
    const div = scout.spend(die('Pace', 5), view(), 'div:5', () => 0.9);
    expect(div.opens?.[0].size).toBe(WIDE_CLOCK);
    expect(div.effects).toEqual([{ kind: 'clock', clock: 'scout:div:5:1', n: 2 }]);
  });

  it('the die that fills the clock brings the scout back, with exactly what the preview said', () => {
    const v = view({ clocks: [{ id: 'scout:c1:1', job: 'scout', target: 'c1', name: 'Scout: Hospital Porters FC', size: 2, opened: '2030-03-04', filled: 1 }] });
    const p = scout.preview(die('Rest', 4), v, 'c1');
    expect(p.line).toContain('20% to 65% known');
    expect(p.risk).toBeUndefined();
    const out = scout.spend(die('Rest', 4), v, 'c1', () => 0.5);
    expect(out.opens).toBeUndefined();
    expect(out.effects).toEqual(p.effects);
    expect(out.effects[1]).toEqual({ kind: 'scout', target: 'c1', reveal: { c1: ['kit', 'rating', 'style', 'weak'] }, before: 20, after: 65 });
  });

  it('a club can be sent a scout again until it is known; then it leaves the list', () => {
    const v = view({ clocks: [{ id: 'scout:c1:1', job: 'scout', target: 'c1', name: 'x', size: 2, opened: '2030-03-04', filled: 2 }] }, { c1: ['kit', 'rating', 'style', 'weak'] });
    expect(scout.spend(die('Pace', 3), v, 'c1', () => 0.9).opens?.[0].id).toBe('scout:c1:2');
    const all = view({}, { c1: FACTS, c2: FACTS, c3: FACTS, x1: FACTS });
    expect(scout.targets!(all)).toEqual([]);
    expect(scout.blocked!(all)).toBe('Every club is known');
  });

  it('a 6 shows its chance of a loan target, and that chance is the one drawn (seeded)', () => {
    const p = scout.preview(die('Pace', 6), view(), 'c1');
    expect(p.risk).toEqual({ pct: LEAD_PCT, line: 'a 6 can turn up a loan target at Hospital Porters FC.' });
    const hits = Array.from({ length: 2000 }, (_, i) => scout.spend(die('Pace', 6), view(), 'c1', rng(hashSeed('lead', String(i))))).filter((o) => o.risk?.hit);
    expect(hits.length / 2000).toBeGreaterThan(0.22);
    expect(hits.length / 2000).toBeLessThan(0.28);
    for (const o of hits.slice(0, 5)) expect(o.effects.find((e) => e.kind === 'lead')).toMatchObject({ kind: 'lead', club: 'c1' });
    // The same spend always draws the same.
    const seed = spendSeed('2030-03-05', die('Pace', 6), 'scout', 'c1');
    expect(scout.spend(die('Pace', 6), view(), 'c1', rng(seed))).toEqual(scout.spend(die('Pace', 6), view(), 'c1', rng(seed)));
  });

  it('a 1 or 2 that ends a trip shows its chance of a thin report; a 1 or 2 mid-trip has none', () => {
    expect(scout.preview(die('Pace', 2), view(), 'c1').risk).toBeUndefined();
    const v = view({ clocks: [{ id: 'scout:c1:1', job: 'scout', target: 'c1', name: 'x', size: 2, opened: '2030-03-04', filled: 1 }] });
    expect(scout.preview(die('Pace', 2), v, 'c1').risk).toEqual({ pct: THIN_PCT, line: 'a thin report: one find fewer.' });
    const thin = scout.spend(die('Pace', 2), v, 'c1', () => 0.1);
    expect(thin.risk?.hit).toBe(true);
    expect(thin.effects[1]).toEqual({ kind: 'scout', target: 'c1', reveal: { c1: ['kit', 'rating', 'style'] }, before: 20, after: 50, thin: true });
    const fine = scout.spend(die('Pace', 2), v, 'c1', () => 0.9);
    expect(fine.risk?.hit).toBe(false);
    expect(fine.effects[1]).toMatchObject({ reveal: { c1: ['kit', 'rating', 'style', 'weak'] } });
  });

  it('through the desk: the clock opens with the first die and fills with the next', () => {
    let d = deskWith([die('Pace', 3), die('Rest', 4)]);
    const a = spendDie(d, view(), die('Pace', 3), 'scout', 'c2');
    if ('error' in a) throw new Error(a.error);
    d = a.desk;
    expect(d.clocks.map((c) => c.id)).toEqual(['scout:c2:1']);
    const v2 = view({ clocks: [{ ...d.clocks[0], filled: 1 }] });
    const b = spendDie(d, v2, die('Rest', 4), 'scout', 'c2');
    if ('error' in b) throw new Error(b.error);
    expect(b.spend.effects.map((e) => e.kind)).toEqual(['clock', 'scout']);
    expect(spendDie(d, view(), die('Rest', 4), 'scout', 'nope')).toEqual({ error: 'no-target' });
  });
});

describe('a scout comes back (p3-scout)', () => {
  it('says what was found, known % before and after, what is still hidden, in the scout’s voice', () => {
    const e = { kind: 'scout' as const, target: 'c1', reveal: { c1: ['kit', 'rating', 'style', 'weak'] as Fact[] }, before: 20, after: 65 };
    const r = reportOf(e, '2030-03-05', { name: () => 'Hospital Porters FC', known: () => new Set<Fact>(['kit', 'rating', 'style', 'weak']), player: () => 'A player' });
    expect(r).toMatchObject({ club: 'c1', before: 20, after: 65, found: ['kit', 'rating', 'style', 'weak'], hidden: ['known', 'hidden', 'manager', 'history'] });
    expect(r.line.length).toBeGreaterThan(0);
    expect(r.line).not.toMatch(/\{\w+\}/);
    expect(stillHidden(r, '2030-03-05')).toMatch(/known ability and hidden ability/);
  });

  it('a division report counts the clubs that gave something up', () => {
    const e = { kind: 'scout' as const, target: 'div:5', reveal: { c1: ['kit'] as Fact[], c2: [] as Fact[] }, before: 30, after: 35 };
    const r = reportOf(e, '2030-03-05', { name: () => 'Division Five', known: () => new Set<Fact>(), player: () => '' });
    expect(r.clubs).toBe(1);
    expect(r.line).toContain('Division Five');
  });
});
