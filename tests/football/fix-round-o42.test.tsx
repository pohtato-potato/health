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
  it('the loss part is never Brabo orange', () => {
    expect(lossInkOf(undefined)).toBe('#93c3dc');
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
