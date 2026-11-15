// LG-4 step 5 and 6: world 2's League screens on the kit, read from a test save moved into the new world by the dev
// helper. Invented logs only.
import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { clubWorld, setClubWorld } from '../../src/football/data/load';
import { shapeOf } from '../../src/football/pyramid/shape';
import { devWorld2 } from '../../src/football/store/dev';
import { loadLeague, type League } from '../../src/football/store/league';
import { playDue } from '../../src/football/store/play';
import { planRedraw } from '../../src/football/store/redraw';
import { foundClub } from '../../src/football/store/save';
import { OWN } from '../../src/football/store/season';
import { seasonChange } from '../../src/football/seasonChange';
import { Calendar } from '../../src/screens/football/league/Calendar';
import { EveryDivision, FullTable2, LeagueHome2 } from '../../src/screens/football/league/League2';
import { Table } from '../../src/screens/football/league/Table';
import { atlasOf } from '../../src/screens/football/world/Atlas';
import type { FbSeason } from '../../src/football/store/tables';
import type { Tier } from '../../src/football/types';

const noon = (d: string) => new Date(`${d}T12:00:00`).getTime();
const TARGETS = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 };

describe('world 2 screens', { timeout: 300_000 }, () => {
  let l: League;
  beforeAll(async () => {
    setDatabase(new HealthDB('fb-w2-screens'));
    await db.open();
    await setTargets(TARGETS, '2026-01-01');
    await foundClub('2026-11-01', { shirt: 'A1', crest: 'a', captain: 'Pace' });
    await playDue(noon('2026-11-04'));
    await devWorld2(6, noon('2026-11-04'));
    await playDue(noon('2026-11-08'));
    l = (await loadLeague())!;
  });

  it('the dev helper puts the save in the chosen division of world 2', () => {
    expect(l.save.world).toBe(2);
    expect(l.season.tierOf[OWN]).toBe(6);
    expect(Object.keys(l.tables).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const d of shapeOf(l.season).divisions) expect(l.tables[d]).toHaveLength(12);
  });

  it('a preview of the move leaves the old world registry alone', async () => {
    setDatabase(new HealthDB('fb-w2-preview'));
    await db.open();
    await setTargets(TARGETS, '2026-01-01');
    await foundClub('2026-11-01', { shirt: 'A1', crest: 'a' });
    await playDue(noon('2026-11-03'));
    const plan = (await planRedraw('2026-11-03'))!;
    expect(clubWorld()).toBe(1);
    expect(Object.keys(plan.names)).toEqual(expect.arrayContaining(plan.vs));
    setDatabase(new HealthDB('fb-w2-screens'));
    await db.open();
    setClubWorld(2);
  });

  it('League home: your place of 12 in gold, the top four, See all 12, and four doors', () => {
    const out = html(<LeagueHome2 l={l} />);
    expect(out).toMatch(/k-hero[^>]*>\d+(st|nd|rd|th)</);
    expect(out).toContain('Division Six');
    expect(out).toContain('of 12');
    expect(out).toContain('Day ');
    expect(out).toContain('of 28');
    expect(out.match(/<li class="fb-trow/g)).toHaveLength(4);
    expect(out).toContain('See all 12');
    for (const d of ['The atlas', 'The cups', 'Calendar', 'Every division']) expect(out).toContain(d);
  });

  it('the full table: 12 rows, top two up, playoffs to 6th, bottom three down, the level check', () => {
    const out = html(<FullTable2 l={l} />);
    const items = [...out.matchAll(/<li class="(fb-trow|fb-cut)[^"]*"/g)].map((m) => m[1]);
    expect(items.filter((x) => x === 'fb-trow')).toHaveLength(12);
    expect(items.map((x, i) => (x === 'fb-cut' ? i : -1)).filter((i) => i >= 0)).toEqual([2, 7, 11]);
    expect(out).toContain('level check');
    expect(out).not.toContain('Double promotion');
  });

  it('Division Eight swaps with the clubs abroad; the Crown League has no promotion line', () => {
    const t8 = 8 as unknown as Tier;
    const eight = html(<Table tier={t8} rows={l.tables[t8]} world={2} />);
    expect(eight).toContain('Bottom three swap out');
    const crown = html(<Table tier={1} rows={l.tables[1]} world={2} />);
    expect(crown).not.toContain('Top two go up');
    expect(crown).toContain('Bottom three go down');
  });

  it('every division: a pyramid of eight with % seen, the chosen table, hatched unknowns and a scout', () => {
    const out = html(<EveryDivision l={l} tier={3} />);
    expect(out.match(/class="fb-step[ "]/g)).toHaveLength(8);
    expect(out).toContain('Division Six · you');
    expect(out).toMatch(/fb-step on[^"]*"[^>]*aria-label="Division Three/);
    expect(out).toContain('Send a scout to Division Three');
    expect(out).toContain('fg-unk');
  });

  it('the atlas has nine bands: eight divisions and abroad', () => {
    expect(atlasOf(l).layers.map((x) => x.t)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  });

  it('the calendar runs 28 days with 22 league matchdays and the Pair Cup', () => {
    const out = html(<Calendar season={l.save.season} world={2} today={l.save.day} matches={l.matches} />);
    expect(out.match(/<li class="fb-calday/g)).toHaveLength(28);
    expect(out).toContain('22 league matchdays');
    expect(out).toContain('Pair Cup');
    expect(out).not.toContain('Trophy');
  });

  it('season end reads the level check, with shown ratings for divisions 7 and 8', () => {
    const s = { ...l.season, final: { tables: l.tables, up: { 8: [OWN, 'x', 'y'] }, down: {}, level: { id: OWN, from: 8, to: 6, dir: 'up', swap: 'z', rate: 0.6 } } } as unknown as FbSeason;
    const s8 = { ...s, tierOf: { ...s.tierOf, [OWN]: 8 } } as unknown as FbSeason;
    const c = seasonChange(s8, { Pace: 12, Power: 12, Fuel: 12, Rest: 12, Routine: 12, Shape: 12 } as never)!;
    expect(c.level).toBe('up');
    expect(c.to).toBe(6);
    for (const r of c.ratings) { expect(Number.isFinite(r.before)).toBe(true); expect(Number.isFinite(r.after)).toBe(true); }
  });

  it('a new club founds straight into world 2 (owner, 15 Nov), placed, with the legend and its stage', async () => {
    setDatabase(new HealthDB('fb-w2-found'));
    await db.open();
    await setTargets(TARGETS, '2026-01-01');
    await foundClub('2026-11-10', { shirt: 'A1', crest: 'a', world: 2 });
    const save = (await db.fbSave.get('save'))!;
    expect(save.world).toBe(2);
    expect(save.season).toBe(1);
    expect(save.rivals[0]).toMatchObject({ clubId: 'rafc', how: 'legend' });
    const s1 = (await db.fbSeasons.get(1))!;
    expect(s1.world).toBe(2);
    expect(s1.start).toBe('2026-11-10');
    expect(save.redrawn!.division).toBe(s1.tierOf[OWN]);
    expect(save.redrawn!.founding.p).toBe(0);
    await playDue(noon('2026-11-12'));
    const ms = await db.fbMatches.where('season').equals(1).toArray();
    expect(ms.filter((m) => m.comp === 'league')).toHaveLength(2);
    for (const m of ms) expect(s1.tierOf[m.opp]).toBe(save.redrawn!.division);
    setDatabase(new HealthDB('fb-w2-screens'));
    await db.open();
    setClubWorld(2);
  });
});
