// Engine 2, layer 1: ratings, tiers and steps, identity resets, held loads, sick days, youth, credits, blend, rebuild.
import { describe, expect, it } from 'vitest';
import { addDays, type DayKey } from '../../src/domain/dates';
import type { Day, SetEntry, Settings, TrainingSession } from '../../src/domain/types';
import { axisValues, type AxisInput } from '../../src/football/axes';
import { bedtimeKept, ctxFor, growth, ramp, rate, ratingOf, technique } from '../../src/football/players/attributes';
import { at95After, cardAfter, firstCard, gatedStep, ICON_DAYS, LEGEND_DAYS, LEGEND_HOLD, rankOf, stepName, stepOf, tierOf } from '../../src/football/players/cards';
import { playersOn } from '../../src/football/players/catalogue';
import { creditsFor } from '../../src/football/players/credit';
import { benchOf, blend, elevenOf, squadValues, type SquadMember } from '../../src/football/players/eleven';
import { heldLoads, profileStart, profileStarts } from '../../src/football/players/identity';
import type { FbPlayer, XiPlace } from '../../src/football/players/types';
import { linkedLogged, PROMOTE_GROWTH, PROMOTE_SESSIONS, youthDay } from '../../src/football/players/youth';
import type { Health } from '../../src/football/store/gather';
import { creditMatch, playersDay, rebuildPlayers, squadNight } from '../../src/football/store/players';
import type { FbSave, FbSquadRow, StoredMatch } from '../../src/football/store/tables';
import { AXES, type AxisValues, type MatchEvents } from '../../src/football/types';

const D0 = '2026-10-01';
const all = (v: number) => Object.fromEntries(AXES.map((a) => [a, v])) as AxisValues;
const settings = (extra: Partial<Settings> = {}) => ({
  targets: [{ from: '2026-01-01', kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }],
  checklist: [{ id: 'brush', name: 'Brush', slots: ['am'], active: true }, { id: 'pill', name: 'Pill', slots: ['am'], active: true, med: true }],
  ...extra,
}) as unknown as Settings;
function health(p: Partial<Health> = {}): Health {
  return { settings: settings(), days: new Map(), sessions: [], kcal: new Map(), measures: [], sets: [], meals: new Map(), walks: [], routes: [], ...p };
}
const days = (xs: Partial<Day>[]) => new Map(xs.map((d) => [d.date!, d as Day]));
let at = 0;
const set = (date: DayKey, sessionId: string, exercise: string, loadKg: number | null, reps: number, extra: Partial<SetEntry> = {}): SetEntry =>
  ({ id: `${sessionId}:${++at}`, sessionId, date, session: 'A', exerciseId: 'row', exercise, setNo: 1, side: 'both', loadKg, reps, at: ++at, ...extra }) as SetEntry;
const sess = (id: string, date: DayKey, extra: Partial<TrainingSession> = {}): TrainingSession =>
  ({ id, date, session: 'A', planName: 'P', startedAt: ++at, status: 'done', short: false, exercises: ['row'], ...extra }) as TrainingSession;

describe('calibration numbers', () => {
  it('rate: 50% → 50, 100% → 95', () => {
    expect(rate(0.5)).toBe(50);
    expect(rate(1)).toBe(95);
  });
  it('growth: no change is 50, one step up (×1.25) is 60, Strength steps are 0.40', () => {
    expect(growth(1)).toBe(50);
    expect(growth(1.25)).toBe(60);
    expect(growth(1.4, 0.4)).toBe(60);
  });
  it('rate attributes ramp from 50 over the first 4 weeks', () => {
    expect(ramp(90, 0)).toBe(50);
    expect(ramp(90, 14)).toBe(70);
    expect(ramp(90, 28)).toBe(90);
  });
  it('technique: 75% clean is 50, capped 20–85, tempo adds up to 10', () => {
    expect(technique(0.75, 0)).toBe(50);
    expect(technique(1, 0)).toBe(85);
    expect(technique(0, 0)).toBe(20);
    expect(technique(1, 1)).toBe(95);
  });
  it('a bedtime is kept up to 45 minutes after the target, and earlier always counts', () => {
    expect(bedtimeKept(60, 60)).toBe(true); // 1:00 for a 1:00 target
    expect(bedtimeKept(105, 60)).toBe(true); // 1:45
    expect(bedtimeKept(106, 60)).toBe(false);
    expect(bedtimeKept(23 * 60, 60)).toBe(true); // 23:00, earlier than 1:00
  });
});

describe('tiers and steps (spec §16)', () => {
  it('maps overalls to tiers and steps', () => {
    expect(tierOf(59)).toBe('bronze');
    expect(stepOf(49)).toEqual({ tier: 'bronze', step: 1 });
    expect(stepOf(55)).toEqual({ tier: 'bronze', step: 3 });
    expect(stepOf(60)).toEqual({ tier: 'silver', step: 1 });
    expect(stepOf(66)).toEqual({ tier: 'silver', step: 2 });
    expect(stepOf(77)).toEqual({ tier: 'gold', step: 3 });
    expect(stepOf(80)).toEqual({ tier: 'prism', step: 1 });
    expect(stepOf(93)).toEqual({ tier: 'icon', step: 2 });
    expect(stepOf(95)).toEqual({ tier: 'legend', step: 1 });
    expect(stepName({ tier: 'gold', step: 2 })).toBe('Gold II');
    expect(stepName({ tier: 'legend', step: 1 })).toBe('Legend');
  });
  it('the card evolves in place and keeps its best: only the number drops', () => {
    let c = firstCard(62, D0);
    c = cardAfter(c, 67, addDays(D0, 1));
    expect(c.card).toEqual({ tier: 'silver', step: 3 });
    expect(c.moments.at(-1)).toMatchObject({ kind: 'step', from: { tier: 'silver', step: 1 } });
    c = cardAfter(c, 71, addDays(D0, 2));
    expect(c.moments.at(-1)).toMatchObject({ kind: 'tier', tier: 'gold' });
    const before = c.card;
    c = cardAfter(c, 55, addDays(D0, 3));
    expect(c.card).toEqual(before);
    expect(c.best).toBe(71);
    expect(rankOf(c.card)).toBeGreaterThan(rankOf({ tier: 'silver', step: 3 }));
  });
  it('a quiet step-up (the rebuild) is recorded but not queued as a moment to play', () => {
    const c = cardAfter(firstCard(62, D0), 72, addDays(D0, 1), true);
    expect(c.versions).toHaveLength(2);
    expect(c.moments.every((m) => m.seen)).toBe(true);
  });
});

describe('identity: who is the same player', () => {
  it('a new name on the same id is a profile change: the baseline resets, the player stays', () => {
    const sets = [set('2026-10-01', 's1', 'Split squat', 10, 10), set('2026-10-04', 's2', 'Split squat', 10, 11), set('2026-10-08', 's3', 'Bulgarian split squat', 8, 8)];
    const starts = profileStarts(sets);
    expect(starts).toEqual(['2026-10-08']);
    expect(profileStart(starts, '2026-10-01', '2026-10-06')).toBe('2026-10-01');
    expect(profileStart(starts, '2026-10-01', '2026-10-09')).toBe('2026-10-08');
  });
  it('the plan restarting a lift (resetLoad under a new plan version) is a profile change', () => {
    const sessions = new Map([['s1', sess('s1', '2026-10-01', { planVersion: 'v1' })], ['s2', sess('s2', '2026-10-05', { planVersion: 'v2' })]]);
    const sets = [set('2026-10-01', 's1', 'Overhead extension', 6, 12), set('2026-10-05', 's2', 'Overhead extension', 4, 12)];
    expect(profileStarts(sets, { id: 'row', name: 'x', resetLoad: true } as never, sessions, 'v2')).toEqual(['2026-10-05']);
  });
  it('a one-off load stays out of Strength until it is used in two sessions', () => {
    const sets = [set('2026-10-01', 's1', 'Row', 10, 10), set('2026-10-02', 's2', 'Row', 15, 10), set('2026-10-04', 's3', 'Row', 10, 10)];
    expect([...heldLoads(sets)]).toEqual([10]);
    expect([...heldLoads([...sets, set('2026-10-06', 's4', 'Row', 15, 8)])].sort()).toEqual([10, 15]);
  });
  it('the spike does not lift the rating; the held load does', () => {
    const base = [set('2026-10-01', 's1', 'Row', 10, 10), set('2026-10-03', 's2', 'Row', 10, 10)];
    const spike = [...base, set('2026-10-05', 's3', 'Row', 15, 10)];
    const plan = { sessions: [{ name: 'A', exercises: [{ id: 'row', name: 'Row' }] }] } as never;
    const h = (sets: SetEntry[]) => health({ settings: settings({ plan }), sets, sessions: [...new Set(sets.map((s) => s.sessionId))].map((id) => sess(id, sets.find((s) => s.sessionId === id)!.date)) });
    const strength = (sets: SetEntry[]) => {
      const hh = h(sets);
      const p = playersOn(hh, '2026-10-08').find((x) => x.id === 'ex:row')!;
      return ratingOf(ctxFor(hh), p, '2026-10-08')!.attrs.find((a) => a.id === 'strength')!.value;
    };
    expect(strength(spike)).toBe(strength(base));
    expect(strength([...spike, set('2026-10-07', 's4', 'Row', 15, 10)])).toBeGreaterThan(strength(base));
  });
});

describe('the squad from the logs', () => {
  it('every logged habit signs; medicines never do; nothing signs before its first real day', () => {
    const h = health({ days: days([{ date: D0, steps: 9000, ticks: { 'brush:0': 1, 'pill:0': 1 } }]) });
    const ids = playersOn(h, D0).map((p) => p.id);
    expect(ids).toContain('pace:steps');
    expect(ids).toContain('habit:brush');
    expect(ids).not.toContain('habit:pill');
    expect(ids).not.toContain('pace:big-days');
    expect(playersOn(h, addDays(D0, -1)).map((p) => p.id)).not.toContain('pace:steps');
  });
  it('a sick day is left out of every window', () => {
    const d = (i: number, steps: number, status?: Day['status']) => ({ date: addDays(D0, i), steps, status });
    const h = health({ days: days([d(0, 8000), d(1, 8000), d(2, 1000, 'sick')]) });
    const p = playersOn(h, addDays(D0, 2)).find((x) => x.id === 'pace:steps')!;
    const r = ratingOf(ctxFor(h), p, addDays(D0, 2))!;
    expect(r.attrs.find((a) => a.id === 'consistency')!.note).toContain('of 2 days');
  });
});

describe('sick days (spec §16)', () => {
  const input = (status?: Day['status']): AxisInput => ({
    day: { date: D0, steps: 12000, status } as Day, kcal: 2100, protein: 140, foodLogged: true, sessionsToday: [], weekDoneBefore: 1, weekdayMon1: 3,
    targets: settings().targets[0] as never, checklist: [], weighIns7: 2, waist7: false, history: all(30),
  });
  it('every axis is "no data" on a sick day', () => {
    const v = axisValues(input('sick'));
    expect(AXES.every((a) => v.flags[a] === 'no-data')).toBe(true);
    expect(axisValues(input()).flags.Pace).toBeUndefined();
  });
  it('the rotation squad (the bench) plays at 100% squad value', () => {
    const roster = new Map<string, FbPlayer>();
    const add = (id: string, unit: FbPlayer['unit'], overall: number) => roster.set(id, { id, unit, name: id, overall, status: 'squad' } as FbPlayer);
    add('a', 'Pace', 90); add('b', 'Pace', 80); add('c', 'Pace', 50);
    const night = squadNight(roster, all(2), true);
    expect(night.xi.filter((x) => x.unit === 'Pace').map((x) => x.player)).toEqual(['c', 'c']);
    expect(night.values.Pace).toBe(10); // 50, and 45 (90% cover) on the second place → 47.5 / 5 = 9.5, rounded
    expect(squadNight(roster, all(2), false).values.Pace).toBe(7); // 0.7 × 2 + 0.3 × 17 = 6.5, rounded
  });
});

describe('the eleven and tonight’s value', () => {
  const m = (id: string, unit: SquadMember['unit'], rating: number): SquadMember => ({ id, unit, name: id, rating });
  it('picks the best of each unit in 4-3-3; a short unit’s best covers at 90%', () => {
    const xi = elevenOf([m('p1', 'Pace', 70), m('p2', 'Pace', 60), m('p3', 'Pace', 80), m('w', 'Power', 65)]);
    expect(xi.filter((x) => x.unit === 'Pace').map((x) => x.player)).toEqual(['p3', 'p1']);
    expect(xi.filter((x) => x.unit === 'Power')).toHaveLength(1);
    const short = elevenOf([m('r', 'Rest', 80)]);
    expect(short.map((x) => x.rating)).toEqual([80, 72]);
  });
  it('the bench is everyone not starting', () => {
    const mem = [m('p1', 'Pace', 70), m('p2', 'Pace', 60), m('p3', 'Pace', 80)];
    expect(benchOf(mem, elevenOf(mem)).map((x) => x.player)).toEqual(['p2', 'p2']);
  });
  it('blends 70% today and 30% squad; a unit with no players plays on today', () => {
    const sq = squadValues([{ player: 'x', unit: 'Pace', place: 'Left wing', name: 'x', rating: 100 }]);
    expect(sq.Pace).toBe(20);
    const v = blend(all(10), sq);
    expect(v.Pace).toBe(13);
    expect(v.Rest).toBe(10);
  });
});

describe('named goals and saves', () => {
  const xi: XiPlace[] = [
    { player: 'k', unit: 'Rest', place: 'Keeper', name: 'Bedtime', rating: 70 },
    { player: 's', unit: 'Pace', place: 'Left wing', name: 'Steps', rating: 70 },
    { player: 'r', unit: 'Routine', place: 'Midfield', name: 'Brush', rating: 70 },
  ];
  const ev = { seed: 7, chances: [
    { side: 'atk', type: 'Counter-attack', ok: true, minute: 12 },
    { side: 'def', type: 'Cross into the box', ok: true, minute: 30 },
    { side: 'def', type: 'Corner', ok: true, minute: 40 },
    { side: 'def', type: 'Corner', ok: false, minute: 50 },
  ] } as unknown as MatchEvents;
  it('a Pace goal goes to a Pace starter; crosses to the keeper; corners to Routine', () => {
    const c = creditsFor(ev, xi, 'Rivals FC');
    expect(c.map((x) => [x.kind, x.player])).toEqual([['goal', 's'], ['save', 'k'], ['save', 'r']]);
    expect(c.every((x) => !x.line.includes('{'))).toBe(true);
    expect(creditsFor(ev, xi, 'Rivals FC')).toEqual(c);
  });
  it('apps, goals, saves and seasons are counted', () => {
    const roster = new Map(xi.map((x) => [x.player, { id: x.player, apps: 0, goals: 0, saves: 0, seasons: [] } as unknown as FbPlayer]));
    const out = creditMatch(roster, { xi, credits: creditsFor(ev, xi, 'Rivals FC'), season: 2 });
    expect(out.get('s')).toMatchObject({ apps: 1, goals: 1, seasons: [2] });
    expect(out.get('k')).toMatchObject({ saves: 1 });
  });
});

describe('youngsters (spec §9.2 steps 2–4)', () => {
  const y = (link?: FbSquadRow['link']): FbSquadRow => ({ id: 's1:y0:2026-10-01', kind: 'youth', name: 'Greens', axis: 'Fuel', potential: 3, what: '', exercise: false, season: 1, logged: [], status: 'growing', link, sessions: [], growth: 0, grown: [] }) as FbSquadRow;
  it('a youngster with no link never counts, even on a great day', () => {
    const h = health({ days: days([{ date: D0, steps: 20000, ticks: { 'brush:0': 1 }, sleep: { asleep: 30 } as never }]) });
    expect(youthDay(h, y(), D0, 60)).toEqual(y());
    expect(linkedLogged(h, undefined, D0)).toBe(false);
  });
  it('the linked habit is a session; a kept bedtime grows it, doubled after a rest day; a sick day moves nothing', () => {
    const h = health({ days: days([
      { date: D0, ticks: { 'brush:0': 1 }, sleep: { asleep: 30 } as never },
      { date: addDays(D0, 1), sleep: { asleep: 200 } as never },
      { date: addDays(D0, 2), ticks: { 'brush:0': 1 }, status: 'sick', sleep: { asleep: 30 } as never },
    ]) });
    let r = youthDay(h, y({ kind: 'habit', id: 'brush' }), D0, 60);
    expect(r.sessions).toEqual([D0]);
    expect(r.growth).toBe(2); // a rest day before (no session yesterday) doubles it
    r = youthDay(h, r, addDays(D0, 1), 60);
    expect(r.growth).toBe(2); // 3:20 is not kept
    expect(youthDay(h, r, addDays(D0, 2), 60)).toEqual(r);
  });
  it('twelve sessions and twelve growth join the squad', () => {
    const list = Array.from({ length: PROMOTE_SESSIONS }, (_, i) => ({ date: addDays(D0, i), ticks: { 'brush:0': 1 }, sleep: { asleep: 0 } as never }));
    const h = health({ days: days(list) });
    let r = y({ kind: 'habit', id: 'brush' });
    for (const d of list) r = youthDay(h, r, d.date, 60);
    expect(r.growth).toBeGreaterThanOrEqual(PROMOTE_GROWTH);
    expect(r.status).toBe('promoted');
  });
});

describe('the top tiers need time held (owner, 9 Nov)', () => {
  const day = (n: number) => addDays(D0, n - 1); // day n of the player's history
  it('Icon needs 8 weeks of history and 90+; until then the card is Prism III with the true number', () => {
    expect(gatedStep(92, day(ICON_DAYS - 1), { signed: D0 })).toEqual({ tier: 'prism', step: 3 });
    expect(gatedStep(92, day(ICON_DAYS), { signed: D0 })).toEqual({ tier: 'icon', step: 1 });
    expect(gatedStep(85, day(200), { signed: D0 })).toEqual({ tier: 'prism', step: 2 });
  });
  it('Legend needs 12 weeks of history and 95+ held 28 days in a row; until then Icon II (or Prism III before 8 weeks)', () => {
    const held = (n: number) => day(LEGEND_DAYS - n + 1);
    expect(gatedStep(97, day(LEGEND_DAYS - 1), { signed: D0, at95Since: day(1) })).toEqual({ tier: 'icon', step: 2 });
    expect(gatedStep(97, day(LEGEND_DAYS), { signed: D0, at95Since: held(LEGEND_HOLD - 1) })).toEqual({ tier: 'icon', step: 2 });
    expect(gatedStep(97, day(LEGEND_DAYS), { signed: D0, at95Since: held(LEGEND_HOLD) })).toEqual({ tier: 'legend', step: 1 });
    expect(gatedStep(97, day(30), { signed: D0, at95Since: day(1) })).toEqual({ tier: 'prism', step: 3 });
  });
  it('the run at 95+ starts on the first day at 95 and breaks below it', () => {
    expect(at95After(undefined, 95, day(5))).toBe(day(5));
    expect(at95After(day(5), 98, day(9))).toBe(day(5));
    expect(at95After(day(5), 94, day(10))).toBeUndefined();
  });
  it('a brand-new player at 95 starts no higher than Prism III; the gated card still moves up later', () => {
    expect(firstCard(96, D0).card).toEqual({ tier: 'prism', step: 3 });
    const c = cardAfter(firstCard(96, D0), 96, day(LEGEND_DAYS), false, { signed: D0, at95Since: D0 });
    expect(c.card.tier).toBe('legend');
    expect(c.best).toBe(96);
  });
  it('the rebuild cannot hand out Legend early: a daily habit from history reaches it at about 12 weeks', () => {
    const ticked = (n: number) => health({ days: days(Array.from({ length: n }, (_, i) => ({ date: addDays(D0, i), ticks: { 'brush:0': 1 } }))) });
    const card = (n: number) => rebuildPlayers(ticked(n), { awakenings: {} } as unknown as FbSave, [], [], addDays(D0, n - 1), () => '').players.find((p) => p.id === 'habit:brush')!;
    const early = card(LEGEND_DAYS - 1);
    expect(early.overall).toBeGreaterThanOrEqual(95);
    expect(early.card.tier).toBe('icon');
    expect(card(ICON_DAYS - 1).card).toEqual({ tier: 'prism', step: 3 });
    expect(card(LEGEND_DAYS).card.tier).toBe('legend');
  });
});

describe('the save rebuilt from history', () => {
  const h = health({ days: days(Array.from({ length: 10 }, (_, i) => ({ date: addDays(D0, i), steps: 6000 + i * 1000, ticks: { 'brush:0': 1 } }))) });
  const save = { awakenings: { Pace: [11] }, awakeLog: [{ axis: 'Pace', band: 11, date: addDays(D0, 8) }] } as unknown as FbSave;
  const match = { id: 'm1', date: addDays(D0, 9), season: 1, values: all(12), rotation: false, opp: 'x', events: { seed: 3, chances: [{ side: 'atk', type: 'Counter-attack', ok: true, minute: 20 }] } } as unknown as StoredMatch;
  const squad = [
    { id: 's1:y0:2026-10-01', name: 'Brush', status: 'growing', logged: [], potential: 3 },
    { id: 's1:y1:2026-10-01', name: 'Greens', status: 'promoted', logged: [], potential: 4 },
  ] as unknown as FbSquadRow[];
  const r = rebuildPlayers(h, save, squad, [match], addDays(D0, 9), () => 'Rivals FC');
  it('replays the logs into players with best-ever cards, quietly', () => {
    const steps = r.players.find((p) => p.id === 'pace:steps')!;
    expect(steps.signed).toBe(D0);
    expect(steps.versions.length).toBeGreaterThanOrEqual(1);
    expect(steps.moments.every((m) => m.seen)).toBe(true);
  });
  it('credits the stored matches with an eleven and named scorers', () => {
    expect(r.matches[0].xi?.length).toBeGreaterThan(0);
    expect(r.matches[0].credits?.[0]).toMatchObject({ kind: 'goal', unit: 'Pace' });
    expect(r.players.find((p) => p.id === 'pace:steps')!.goals + r.players.filter((p) => p.unit === 'Pace').reduce((t, p) => t + p.goals, 0)).toBeGreaterThan(0);
  });
  it('an Awakening becomes its best player’s first limit break', () => {
    const lb = r.players.flatMap((p) => p.limitBreaks);
    expect(lb).toEqual([expect.objectContaining({ why: 'awakening', trait: 'burst' })]);
    expect(r.players.find((p) => p.limitBreaks.length)!.unit).toBe('Pace');
  });
  it('youngsters stay only when tied to a real habit; the rest leave with a kind line', () => {
    expect(r.squad.find((x) => x.name === 'Brush')).toMatchObject({ status: 'growing', link: { kind: 'habit', id: 'brush' } });
    expect(r.squad.find((x) => x.name === 'Greens')!.status).toBe('left');
    expect(r.news).toHaveLength(1);
    expect(r.news[0].text).toContain('Greens');
  });
  it('an academy habit sits out of the eleven while its youngster grows', () => {
    const roster = playersDay(new Map(), h, ctxFor(h), addDays(D0, 9), new Set(['habit:brush']));
    expect(roster.get('habit:brush')!.status).toBe('academy');
    expect(roster.get('pace:steps')!.status).toBe('squad');
  });
});
