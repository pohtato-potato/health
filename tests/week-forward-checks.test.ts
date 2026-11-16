// The week-forward check's automatic pass (scripts/week-forward/checks.mjs), on made-up days only.
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS module without types
import { ackFlags, collapse, counterFlags, disagreementFlags, events, figures, fixtureFlags, leftovers, pageFlags, recordEvent, runChecks, stateFlags, tonightOpponent, trendWordFlags, unreachedRoutes } from '../scripts/week-forward/checks.mjs';
// @ts-expect-error plain JS module without types
import { routeKey, routerPaths } from '../scripts/week-forward/survey.mjs';
// @ts-expect-error plain JS module without types
import { stepsFor, weekPlan } from '../scripts/week-forward/plan.mjs';

const pg = (key: string, text: string, extra: object = {}) => ({ key, url: key, shot: `${key}.png`, text, ...extra });
const fb = (o: object = {}) => ({ season: 1, day: 3, division: 3, place: 4, budget: 10, staff: ['a'], leave: [], sponsors: [], openings: [], trials: [], squadCount: 5, research: { earned: 20 }, track: { steps: ['x'] }, ...o });
const day = (o: object = {}) => ({ date: '2030-01-02', kind: 'usual', opened: true, pages: [], steps: [], ...o });

describe('leftovers and engine words', () => {
  it('finds code leftovers but leaves plain words alone', () => {
    expect(leftovers(pg('/a', 'Steps today\nundefined steps')).map((l: { what: string }) => l.what)).toContain('“undefined”');
    expect(leftovers(pg('/a', 'Rating NaN'))[0].what).toBe('“NaN”');
    expect(leftovers(pg('/a', 'Coach said: tierCup ready'))[0].what).toBe('a camelCase code name');
    expect(leftovers(pg('/a', 'Headers against you get +.05 reach')).some((l: { engine: boolean }) => l.engine)).toBe(true);
    expect(leftovers(pg('/a', 'A well-known club, on an iPhone, nothing null-ish here: all fine'))).toEqual([]);
  });

  it('turns audits into flags with the day, route and picture', () => {
    const f = pageFlags(day(), pg('/x', 'Some text here for the page', { audit: { sideways: 12, covered: [], ellipsis: ['Long name…'], smallTargets: [{ name: 'Go', w: 30, h: 30 }], smallText: [], empty: false }, errors: [{ kind: 'error', msg: 'boom' }] }));
    expect(f.map((x: { check: string }) => x.check)).toEqual(['page error', 'sideways scroll', 'text cut to an ellipsis', 'target under 44 px']);
    expect(f[0]).toMatchObject({ day: '2030-01-02', route: '/x', shot: '/x.png', severity: 'breaks trust' });
  });
});

describe('a word against its numbers', () => {
  it('flags a falling word over rising figures, over one line or several', () => {
    expect(trendWordFlags(day(), pg('/you', 'Steps\n14,800 a day, was 13,700\nEasing'))).toHaveLength(1);
    expect(trendWordFlags(day(), pg('/you', 'Sleep 7.1 h, was 7.6 h · Rising'))).toHaveLength(1);
    expect(trendWordFlags(day(), pg('/you', 'Steps\n14,800 a day, was 13,700\nRising'))).toHaveLength(0);
    expect(trendWordFlags(day(), pg('/you', 'Steps 10,050, was 10,000 · Easing'))).toHaveLength(0);
  });
  it('reads hours and minutes as one figure', () => {
    expect(trendWordFlags(day(), pg('/you', 'Sleep\n7 h 32\nwas 6 h 23\nEasing'))).toHaveLength(1);
    expect(trendWordFlags(day(), pg('/you', 'Sleep\n6 h 23\nwas 7 h 32\nEasing'))).toHaveLength(0);
  });
  it('flags “built” beside 0 of N', () => {
    expect(trendWordFlags(day(), pg('/c', 'Tea hut · built · 0 of 6 days'))[0].check).toBe('“built” against 0 of N');
  });
});

describe('one number, two places', () => {
  it('reads figures from lines', () => {
    const f = figures('Money · in the bank €12.5m\nMatchday 4 of 22\nDivision Three · 5th\n3W 1D 0L');
    expect(f.budget[0].v).toBe('€12.5m');
    expect(f.matchday[0].v).toBe('4');
    expect(f['league place'][0].v).toBe('5');
    expect(f.record[0].v).toBe('3-1-0');
  });
  it('flags the same figure stated two ways on one day', () => {
    const d = day({ pages: [pg('/club', 'Budget €12.5m'), pg('/money', 'In the bank €9.0m'), pg('/league', 'Matchday 4')] });
    const f = disagreementFlags(d);
    expect(f).toHaveLength(1);
    expect(f[0].check).toBe('budget disagrees between pages');
    expect(disagreementFlags(day({ pages: [pg('/club', 'Budget €12.5m'), pg('/projects', 'Costs €30k · the budget covers it'), pg('/football/club-page', 'Division Three · 1st'), pg('/football/club', 'Division Three · 3rd')] }))).toEqual([]);
  });
  it('checks the record and steps against what is stored', () => {
    const d = day({ pages: [pg('/football/league', 'Brabo 2W 0D 1L'), pg('/today', 'Steps 9,000')], evening: { football: fb({ place: 4 }), table: [{ id: 'bra', p: 3, w: 2, d: 1, l: 0 }], day: { steps: 12345 } } });
    const checks = stateFlags(d).map((x: { check: string }) => x.check);
    expect(checks).toContain('record against the table');
    expect(checks).toContain('steps not shown as logged');
  });
});

describe('fixtures and matches', () => {
  it('reads tonight’s opponent', () => {
    expect(tonightOpponent('TONIGHT’S SHAPE\nagainst\nNorth\nTown\nPace14')).toBe('North Town');
    expect(tonightOpponent('No match tonight')).toBeUndefined();
  });
  it('flags a fixture with no match, and a match never shown', () => {
    const shown = day({ pages: [pg('/today', 'against\nNorth Town\nPace 14')] });
    const none = { morning: { matches: [], football: fb({ paused: null }) } };
    expect(fixtureFlags(shown, none)[0].check).toBe('fixture shown, no match played');
    const hidden = day({ pages: [pg('/today', 'Nothing tonight')] });
    const played = { morning: { matches: [{ date: '2030-01-02', opp: 'nt', comp: 'league' }], football: fb() } };
    expect(fixtureFlags(hidden, played)[0].check).toBe('match played, not shown');
    expect(fixtureFlags(shown, played)).toEqual([]);
  });
});

describe('counters and acknowledgements', () => {
  it('flags counters that stayed still after a match and a logged day', () => {
    const prev = day({ date: '2030-01-01', evening: { football: fb(), matches: [] } });
    const next = day({ morning: { football: fb(), matches: [{ date: '2030-01-01', opp: 'nt' }] } });
    expect(counterFlags(next, prev).map((x: { check: string }) => x.check)).toEqual(['season day did not move', 'research did not move after a match', 'season track did not move']);
  });
  it('finds events between two states and flags the unspoken ones', () => {
    const a = { football: fb() }, b = { football: fb({ budget: 14, staff: ['a', 'b'], sponsors: [{ name: 'Acme Tea' }] }) };
    const evs = events(a, b);
    expect(evs.map((e: { what: string }) => e.what)).toEqual(['money 10 → 14', 'staff joined: b', 'sponsor signed: Acme Tea']);
    const quiet = ackFlags(day({ pages: [pg('/football', 'Tonight')] }), evs);
    expect(quiet).toHaveLength(3);
    const said = ackFlags(day({ pages: [pg('/football', 'Acme Tea signed: €4m paid into the budget. Staff: b joined')] }), evs);
    expect(said).toHaveLength(0);
  });
  it('treats a day over the best as a record', () => {
    expect(recordEvent(20000, 23007)?.what).toContain('step record');
    expect(recordEvent(20000, 15000)).toBeUndefined();
  });
});

describe('routes and the plan', () => {
  it('keys routes by page, not by record', () => {
    expect(routeKey('/food?d=2030-01-01&meal=lunch&sheet=addfood')).toBe('/food?sheet=addfood');
    expect(routeKey('/football/club?view=money')).toBe('/football/club?view=money');
  });
  it('reads the router and reports pages with no door', () => {
    const src = "const SHEETS = {\n  log: () => <A />,\n  'food-new': () => <B />,\n};\nconst PAGES = {\n  '/today': { el: () => <Today />, tab: 'today' },\n  '/old': { el: () => <Moved to=\"/today\" /> },\n  '/lost': { el: () => <Lost /> },\n};\nexport function App() {}";
    const r = routerPaths(src);
    expect(r.sheets).toEqual(['log', 'food-new']);
    expect(unreachedRoutes(r, ['/today', '/x?sheet=log'])).toEqual({ pages: ['/lost'], sheets: ['food-new'] });
  });
  it('plans seven different days and steps from the save’s own goal and best', () => {
    const w = weekPlan('2030-01-01');
    expect(new Set(w.map((d: { kind: string }) => d.kind)).size).toBe(7);
    expect(stepsFor('record', 10000, 20000)).toBeGreaterThan(20000);
    expect(stepsFor('rest', 10000, 20000)).toBeUndefined();
  });
  it('runs the whole pass and collapses repeats across days', () => {
    const p = (date: string) => day({ date, pages: [pg('/a', 'undefined here')] });
    const r = runChecks({ days: [p('2030-01-01'), p('2030-01-02')], router: { pages: [], sheets: [] } });
    expect(r.flags).toHaveLength(1);
    expect(r.flags[0].days).toEqual(['2030-01-01', '2030-01-02']);
    expect(collapse([])).toEqual([]);
  });
});
