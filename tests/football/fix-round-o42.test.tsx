// The week-forward fix round (ledger O42): made-up saves and days only.
import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { registerClubs } from '../../src/football/data/load';
import { seedWorld2 } from '../../src/football/pyramid/world';
import { loadTonight } from '../../src/football/store/hooks';
import { foundClub } from '../../src/football/store/save';
import { newSeason2, OWN } from '../../src/football/store/season';
import type { FbClub } from '../../src/football/store/tables';
import { fixturesFor } from '../../src/football/store/tonight';
import { TonightView } from '../../src/screens/football/Tonight';
import { fixtureDefs, FIXTURE_SEEDS } from './fixtures/pyramidClubs';

const FOUNDED = '2026-12-01';
async function toWorld2(division: number) {
  registerClubs(fixtureDefs());
  const own = (await db.fbClubs.get(OWN))!;
  const clubs = seedWorld2(FIXTURE_SEEDS, { id: OWN, style: own.style, rating: own.rating }, division, []) as FbClub[];
  await db.fbClubs.clear();
  await db.fbClubs.bulkPut(clubs);
  await db.fbSeasons.clear();
  await db.fbSeasons.put(newSeason2(1, FOUNDED, clubs));
  const save = (await db.fbSave.get('save'))!;
  await db.fbSave.put({ ...save, world: 2, rivals: [] });
}

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-o42-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub(FOUNDED, { shirt: 'H1', crest: 'a' });
});

describe('finding 1: a double-header night lists every match', () => {
  it('a world-2 league night with the Big Cup on it gives two fixtures, league first', async () => {
    await toWorld2(5);
    const save = (await db.fbSave.get('save'))!;
    const season = (await db.fbSeasons.get(1))!;
    const fs = fixturesFor({ ...save, day: 3 }, season);
    expect(fs.map((f) => f.comp)).toEqual(['league', 'bigcup']);
    expect(fs[1].round).toBe('The Big Cup, Last 128');
    expect(fs[1].opp).not.toBe('');
  });

  it('a two-round cup night names the second round as drawn on the night', async () => {
    const save = (await db.fbSave.get('save'))!;
    const season = (await db.fbSeasons.get(save.season))!;
    const fs = fixturesFor({ ...save, day: 5 }, season);
    expect(fs[0].comp).toBe('bigcup');
    expect(fs[1]).toMatchObject({ comp: 'bigcup', opp: '', round: 'The Big Cup, Last 64, if you go through' });
  });

  it('Tonight shows both matches, one under the other', async () => {
    await toWorld2(5);
    const t = (await loadTonight(FOUNDED))!;
    const season = (await db.fbSeasons.get(1))!;
    const save = { ...t.save, day: 3 };
    const fixtures = fixturesFor(save, season);
    const out = html(<TonightView t={{ ...t, save, fixture: fixtures[0], fixtures }} />);
    expect(out).toContain('Two matches tonight');
    expect(out).toContain('The Big Cup, Last 128');
    expect(out).toContain('One shape plays both');
  });
});

describe('finding 4: from 6 pm the chance reads "as it stands"', async () => {
  const { lateFor, shownChance, lossInkOf } = await import('../../src/screens/football/Chance');
  const c = { now: { w: 2, d: 8, l: 90 } as never, usual: { w: 32, d: 27, l: 41 } as never, nothingYet: true, fog: ['Pace', 'Fuel', 'Rest', 'Routine'] as never };
  it('before 6 pm with nothing logged, the usual night leads; from 6 pm, the night as it stands', () => {
    const day = '2026-11-18';
    expect(lateFor(day, new Date(`${day}T17:59:00`).getTime())).toBe(false);
    expect(lateFor(day, new Date(`${day}T18:00:00`).getTime())).toBe(true);
    expect(shownChance(c, false).usual).toBe(true);
    expect(shownChance(c, true)).toEqual({ c: c.now, usual: false });
  });
  it('a day already past is always "as it stands"', () => {
    expect(lateFor('2026-11-17', new Date('2026-11-18T09:00:00').getTime())).toBe(true);
  });
  it('with no opponent the loss part is a plain blue', () => {
    expect(lossInkOf(undefined)).toBe('#93c3dc');
  });
  it('the loss part is the opponent’s own first colour, readable on the dark page (owner, O42)', async () => {
    const { rivalInk } = await import('../../src/ui/inks');
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      const f = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
    };
    const ink = rivalInk(['#e32219', '#ffffff']); // a red first colour, close to Brabo's orange
    const n = parseInt(ink.slice(1), 16);
    expect(n >> 16).toBeGreaterThan(((n >> 8) & 255) + 60); // still red, not swapped for blue
    expect((lum(ink) + 0.05) / (lum('#0d0b16') + 0.05)).toBeGreaterThanOrEqual(3);
    expect(rivalInk(['#000000', '#ffffff'])).toBe('#93c3dc'); // all grey: the plain blue
  });
});

describe('finding 2: Skip clears every match of the morning', () => {
  it('the lead match\'s Skip marks both of that night\'s matches seen, and nothing from another night', async () => {
    const { storedGate } = await import('../../src/football/store/matchGate');
    const base = { season: 1, day: 3, events: { xg: [0, 0] }, score: [0, 1], result: 'L', values: {}, flags: {}, xi: [], credits: [], watched: false, braboHome: true } as never as Record<string, unknown>;
    await db.fbMatches.bulkPut([
      { ...base, id: 'a', date: '2026-11-18', comp: 'league', home: OWN, away: 'x', opp: 'x' },
      { ...base, id: 'b', date: '2026-11-18', comp: 'bigcup', home: OWN, away: 'y', opp: 'y' },
      { ...base, id: 'c', date: '2026-11-17', comp: 'league', home: 'z', away: OWN, opp: 'z' },
    ] as never);
    await storedGate.skipNight({ date: '2026-11-18' });
    const seen = Object.fromEntries((await db.fbMatches.toArray()).map((m) => [m.id, m.watched]));
    expect(seen).toEqual({ a: true, b: true, c: false });
  });
});

describe('finding 5: runs and slides', async () => {
  const { currentRun } = await import('../../src/football/runs');
  const v = { Pace: 10, Power: 10, Fuel: 10, Rest: 10, Routine: 10, Shape: 10 };
  const fog = { Pace: 'not-logged', Fuel: 'not-logged', Rest: 'not-logged', Routine: 'not-logged' } as const;
  const m = (date: string, result: 'W' | 'D' | 'L', flags = {}) => ({ date, result, flags, values: v, home: OWN, away: 'x', comp: 'league' });
  it('three losses in a row name the nights played in fog, plainly', () => {
    const r = currentRun([m('2026-11-16', 'W'), m('2026-11-17', 'L'), m('2026-11-18', 'L', fog), m('2026-11-19', 'L', fog)])!;
    expect(r).toMatchObject({ kind: 'L', n: 3, fog: 2, line: 'Three losses in a row.' });
    expect(r.reason).toMatch(/^Two of them were played in fog/);
  });
  it('two in a row, or a draw last, is no run', () => {
    expect(currentRun([m('2026-11-16', 'L'), m('2026-11-17', 'L')])).toBeUndefined();
    expect(currentRun([m('2026-11-16', 'W'), m('2026-11-17', 'W'), m('2026-11-18', 'W'), m('2026-11-19', 'D')])).toBeUndefined();
  });
  it('a good run is said too', () => {
    expect(currentRun([m('a', 'W'), m('b', 'W'), m('c', 'W'), m('d', 'W')])?.line).toBe('Four wins in a row.');
  });
});

describe('Pace: the sum, and a day past 20,000 steps counts in full', async () => {
  const { blend } = await import('../../src/football/players/eleven');
  const { paceInFull } = await import('../../src/football/axes');
  const { paceSum, paceSumWords } = await import('../../src/screens/football/PaceSum');
  const today = { Pace: 20, Power: 10, Fuel: 10, Rest: 10, Routine: 10, Shape: 10 };
  it('the usual blend gives 19 from steps 20 and a squad of 16; in full it gives 20', () => {
    expect(blend(today, { Pace: 16 }).Pace).toBe(19);
    expect(blend(today, { Pace: 16 }, undefined, ['Pace']).Pace).toBe(20);
    expect(blend(today, { Pace: 16, Power: 16 }, undefined, ['Pace']).Power).toBe(Math.round(0.7 * 10 + 0.3 * 16));
  });
  it('only a day past 20,000 steps counts in full', () => {
    expect(paceInFull(20000)).toBe(false);
    expect(paceInFull(20001)).toBe(true);
    expect(paceInFull(undefined)).toBe(false);
  });
  it('the sum reads as the owner traced it: steps, squad, plan, morale', () => {
    const p = paceSum({ today, squad: { Pace: 16 }, nudges: [{ axis: 'Pace', d: -1, why: 'Hold' }, { axis: 'Pace', d: 1, why: 'morale High' }], liveValues: { ...today, Pace: 19 }, flags: {}, paceFull: false })!;
    expect(paceSumWords(p)).toBe('your steps 20 · the squad 16 · Hold −1 · Morale High +1 = 19');
  });
  it('no sum while steps are not logged', () => {
    expect(paceSum({ today, squad: {}, nudges: [], liveValues: today, flags: { Pace: 'not-logged' }, paceFull: false })).toBeUndefined();
  });
});

describe('finding 19: closing a past day', async () => {
  const { PlayedCard } = await import('../../src/screens/today/FootballCard');
  const { CLUBS } = await import('../../src/football/data/load');
  const x = CLUBS[0].id;
  const m = (watched: boolean) => ({ id: 'm1', date: '2020-01-05', home: OWN, away: x, opp: x, score: [0, 9], round: 'Friendly', watched } as never);
  it('a match already played shows "played" and the parcel, never "tonight"', () => {
    const out = html(<PlayedCard ms={[m(false)]} date="2020-01-05" />);
    expect(out).toContain('in your parcel');
    expect(out).not.toMatch(/tonight/i);
  });
  it('once seen, the result', () => {
    expect(html(<PlayedCard ms={[m(true)]} date="2020-01-05" />)).toContain('0–9');
  });
});

describe('sponsors: one brand each, a quarter on signing (O42 9 and 10, O41 4 and 5)', async () => {
  const { acceptOffer } = await import('../../src/football/store/save');
  const { oneBrandEach, openOffers } = await import('../../src/football/money');
  const { rng } = await import('../../src/football/rng');
  const offer = (brand: string, slot: 'sleeve' | 'partner' | 'shirt', perSeason = 4) => ({ brand, what: 'x', risk: 'stable' as const, slot, perSeason, seasons: 2 as const, line: 'A line.' });
  it('signing pays a quarter on the day and takes the brand out of every other offer', async () => {
    const save = (await db.fbSave.get('save'))!;
    await db.fbSave.put({ ...save, budget: 10, offers: [offer('Pixelpost', 'sleeve'), offer('Pixelpost', 'partner'), offer('Orbis', 'partner')] });
    await acceptOffer(offer('Pixelpost', 'sleeve'));
    const s = (await db.fbSave.get('save'))!;
    expect(s.budget).toBe(11);
    expect(s.offers!.map((o) => o.brand)).toEqual(['Orbis']);
    expect(s.signed).toMatchObject({ brand: 'Pixelpost', advance: 1 });
    expect(s.sponsors!.at(-1)!.advance).toEqual({ season: s.season, amount: 1 });
  });
  it('a signed brand is never offered again, and a brand sits in one slot only', () => {
    expect(oneBrandEach([offer('A', 'sleeve'), offer('A', 'partner'), offer('B', 'partner')], [offer('B', 'shirt')]).map((o) => `${o.brand}:${o.slot}`)).toEqual(['A:sleeve']);
    for (let i = 0; i < 20; i++) {
      const list = openOffers([], 3, true, rng(i));
      expect(new Set(list.map((o) => o.brand)).size).toBe(list.length);
    }
  });
});

describe('finding 35: a trialist ties to his own habit or one already kept', () => {
  const trialist = (): import('../../src/football/store/tables').FbSquadRow => ({
    id: 'y-test-2026-12-02', kind: 'youth', name: 'A. Trialist', axis: 'Pace', potential: 4, what: 'stretch before bed', exercise: false,
    season: 1, logged: [], status: 'trial', trialUntil: '2026-12-09',
  });
  it('lists habits already kept as well as new ones, new first', async () => {
    const { linkOptions } = await import('../../src/football/players/youth');
    const days = new Map([['2026-11-30', { date: '2026-11-30', ticks: { 'old:0': 1 } }]]);
    const h = {
      settings: { checklist: [{ id: 'old', name: 'Old habit', slots: ['Any time'], active: true }, { id: 'new', name: 'New habit', slots: ['Any time'], active: true }], plan: { sessions: [] } },
      days, sets: [],
    } as unknown as import('../../src/football/store/gather').Health;
    const opts = linkOptions(h, trialist(), [], '2026-12-02');
    expect(opts.map((o) => [o.name, o.kept])).toEqual([['New habit', false], ['Old habit', true]]);
  });
  it('tying to his own habit adds it to the checklist and ties him', async () => {
    const { tieToOwnHabit } = await import('../../src/football/store/globeActions');
    await db.fbSquad.put(trialist());
    expect(await tieToOwnHabit('y-test-2026-12-02')).toBe(true);
    const s = await db.settings.get('app');
    const item = s!.checklist.find((c) => c.name === 'Stretch before bed');
    expect(item).toBeTruthy();
    const y = await db.fbSquad.get('y-test-2026-12-02');
    expect(y!.link).toEqual({ kind: 'habit', id: item!.id });
  });
});

describe('O41 1: no match tonight on the day between worlds', () => {
  it('a night already used with no match draws nothing as tonight and names tomorrow’s match', async () => {
    await toWorld2(5);
    const save = (await db.fbSave.get('save'))!;
    // The move records the day between worlds as played (redrawSave sets lastPlayed to the move's day).
    await db.fbSave.put({ ...save, lastPlayed: FOUNDED, day: 1, phase: 'season' });
    const t = (await loadTonight(FOUNDED))!;
    expect(t.fixture).toBeUndefined();
    expect(t.fixtures).toEqual([]);
    expect(t.next?.comp).toBe('league');
    const out = html(<TonightView t={t} />);
    expect(out).toContain('No match tonight');
    expect(out).toContain('kicks off tomorrow');
    expect(out).toContain('Tomorrow · ');
    expect(out).not.toContain('Change the plan');
  });
  it('the next day, with the night not yet played, the match is tonight’s again', async () => {
    await toWorld2(5);
    const save = (await db.fbSave.get('save'))!;
    await db.fbSave.put({ ...save, lastPlayed: FOUNDED, day: 1, phase: 'season' });
    const t = (await loadTonight('2026-12-02'))!;
    expect(t.fixture?.comp).toBe('league');
    expect(t.next).toBeUndefined();
  });
});

describe('O41 3: every club has an original crest', async () => {
  const { CLUBS, worldDef } = await import('../../src/football/data/load');
  const { WORLD_CLUBS } = await import('../../src/football/data/world');
  const { originalParts, realCrest, clubCrest } = await import('../../src/football/art/crest');
  const real = [...WORLD_CLUBS.map(worldDef), ...CLUBS.filter((c) => c.kind === 'real' && !WORLD_CLUBS.some((w) => w.id === c.id))];
  it('each real club draws a crest with no letters, and no two share shape, field, symbol and colours', () => {
    expect(real.length).toBeGreaterThanOrEqual(96);
    const seen = new Set<string>();
    for (const c of real) {
      expect(clubCrest(c, 40)).not.toContain('<text');
      const p = originalParts(c);
      const key = `${p.shape}:${p.field}:${p.sym}:${c.colours[0]}:${c.colours[1]}`;
      expect(seen.has(key), c.name).toBe(false);
      seen.add(key);
    }
  });
  it('two crests on one page keep their own clip', () => {
    const id = (s: string) => s.match(/clipPath id="([^"]+)"/)?.[1];
    const c = real.find((x) => originalParts(x).field !== 'plain')!;
    expect(id(realCrest(c, 40))).not.toBe(id(realCrest(c, 40)));
  });
});

describe('O41 11: arrivals are never silent', async () => {
  const { ARRIVAL_NEWS, parcelTiles } = await import('../../src/football/parcel');
  it('trialists, a finished building, staff, loans, eras and the doctor count as arrivals; a match report does not', () => {
    for (const id of ['2026-12-01:trials', '2026-12-01:built:kaai-stand', '2026-12-01:tech:p-physio', '2026-12-01:loan-in:x', '2026-12-01:era:e2', '2026-12-01:doctor'])
      expect(ARRIVAL_NEWS.test(id), id).toBe(true);
    expect(ARRIVAL_NEWS.test('m-1:papers')).toBe(false);
  });
  it('the parcel opens with them straight after last night', () => {
    expect(parcelTiles({ result: true, club: true, pack: true })).toEqual(['result', 'club', 'pack']);
  });
});

describe('Football moments sit above the tab bar', () => {
  it('every full-screen moment goes through MomentLayer, which draws on the page body', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : /\.tsx$/.test(e.name) ? [join(d, e.name)] : []));
    const raw = walk('src').filter((f) => !f.endsWith(join('moments', 'Layer.tsx')) && readFileSync(f, 'utf8').includes('className="fb-moment"'));
    expect(raw).toEqual([]);
    expect(readFileSync('src/screens/football/moments/Layer.tsx', 'utf8')).toMatch(/createPortal\([^]*document\.body\)/);
  });
});
