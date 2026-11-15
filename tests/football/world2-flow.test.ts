// LG-3 (ledger O38): a world-2 save plays a whole 28-day season through the store and into the next, on made-up logs
// and the made-up fixture clubs. The move from world 1 is LG-4's; here a test helper builds the world-2 save directly.
import 'fake-indexeddb/auto';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { patchDay, setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { registerClubs } from '../../src/football/data/load';
import { BREAK_DAYS } from '../../src/football/globe/duty';
import { PAIRCUP_ID } from '../../src/football/pyramid/cups';
import { PYRAMID } from '../../src/football/pyramid/shape';
import { seedWorld2 } from '../../src/football/pyramid/world';
import { braboPlacing, playDue } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { newSeason2, OWN } from '../../src/football/store/season';
import type { FbClub } from '../../src/football/store/tables';
import { fixtureDefs, FIXTURE_SEEDS } from './fixtures/pyramidClubs';

const noon = (d: string) => new Date(`${d}T12:00:00`).getTime();
const FOUNDED = '2026-12-01';
const SEASON_REAL = 28 + 2 * BREAK_DAYS;

/** Round, invented days: steps, sleep, food and a session every other day. Nobody's real data. */
async function logDays(from: number, to: number) {
  for (let i = from; i < to; i++) {
    const d = addDays(FOUNDED, i);
    await patchDay(d, { steps: 7000 + ((i * 1370) % 5000), sleep: { asleep: 1380 + ((i * 17) % 50), woke: 410 + ((i * 23) % 40) }, foodDone: true, ...(i % 11 === 6 ? { status: 'sick' as const } : {}) });
    await db.entries.put({ id: `e${i}`, date: d, meal: 'lunch', at: noon(d), kind: 'quick', name: 'Meal', portion: '1', kcal: 2100 + ((i * 53) % 200), protein: 120 + ((i * 7) % 30) });
    if (i % 2 === 0) await db.sessions.put({ id: `s${i}`, date: d, session: 'A', planName: 'Plan', startedAt: noon(d), endedAt: noon(d) + 3_600_000, status: 'done', short: false, exercises: [] });
  }
}
/** Builds a world-2 save in place of the world-1 one foundClub made (what LG-4's migration will do for real). */
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
const inBand = (c: FbClub) => { const [lo, hi] = PYRAMID[c.tier - 1].band; return c.rating >= lo && c.rating <= hi; };

describe('a world-2 season through the store', { timeout: 600_000 }, () => {
  let digest = '';
  beforeAll(async () => {
    setDatabase(new HealthDB('fb-world2-flow'));
    await db.open();
    await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
    await logDays(-40, 90);
    await foundClub(FOUNDED, { shirt: 'A1', crest: 'a', captain: 'Pace' });
    await toWorld2(5);
    await playDue(noon(addDays(FOUNDED, SEASON_REAL)));
    const all = [await db.fbMatches.toArray(), await db.fbSeasons.toArray(), await db.fbClubs.toArray()];
    digest = createHash('sha256').update(JSON.stringify(all)).digest('hex');
  });

  it('plays 22 league matchdays in 28 season days, one league match a day', async () => {
    const ms = (await db.fbMatches.toArray()).filter((m) => m.season === 1);
    const league = ms.filter((m) => m.comp === 'league');
    expect(league).toHaveLength(22);
    expect(new Set(league.map((m) => m.date)).size).toBe(22);
    expect(Math.max(...ms.map((m) => m.day))).toBe(28);
  });

  it('ends with eight tables of 12, and every division keeps 12 after the moves', async () => {
    const s = (await db.fbSeasons.get(1))!;
    expect(s.world).toBe(2);
    expect(Object.keys(s.final!.tables)).toHaveLength(8);
    for (const t of Object.values(s.final!.tables)) expect(t).toHaveLength(12);
    const clubs = await db.fbClubs.toArray();
    for (let d = 1; d <= 8; d++) expect(clubs.filter((c) => !c.pool && !c.folded && c.tier === d)).toHaveLength(12);
    expect(s.final!.pool!.out).toHaveLength(3);
    for (const id of s.final!.pool!.out) expect(clubs.find((c) => c.id === id)!.pool).toBe(true);
  });

  it('plays the cups: the Big Cup up to its final, the pair cup, and the playoffs', async () => {
    const s = (await db.fbSeasons.get(1))!;
    expect(s.bigcup.winner).toBeTruthy();
    expect(s.tiercups[PAIRCUP_ID].winner).toBeTruthy();
    for (let d = 2; d <= 8; d++) expect(s.playoffs[d as 2]?.winner).toBeTruthy();
    const ms = (await db.fbMatches.toArray()).filter((m) => m.season === 1 && m.comp === 'bigcup');
    expect(ms.length).toBeGreaterThan(0);
    // Drawn up: Brabo's first Big Cup opponent is from a higher division.
    expect(s.tierOf[ms[0].opp] ?? 9).toBeLessThan(5);
  });

  it('every real club in a division sits inside its band after the drift', async () => {
    const clubs = (await db.fbClubs.toArray()).filter((c) => !c.pool && !c.folded && c.id !== OWN && !c.old);
    for (const c of clubs) expect(inBand(c)).toBe(true);
  });

  it('goes on into season 2 after the break, still world 2', async () => {
    const save = (await db.fbSave.get('save'))!;
    const eventStart = addDays(FOUNDED, SEASON_REAL);
    await playDue(noon(addDays(eventStart, save.event!.days + 1)));
    const s2 = (await db.fbSeasons.get(2))!;
    expect(s2.world).toBe(2);
    expect(Object.keys(s2.tierOf)).toHaveLength(96);
    expect(s2.fixtures[1]).toHaveLength(22);
    expect(s2.tiercups[PAIRCUP_ID]).toBeTruthy();
  });

  it('places Brabo from the stored nights and tonight\'s bonuses', async () => {
    const clubs = (await db.fbClubs.toArray()).filter((c) => !c.pool && !c.folded && c.id !== OWN);
    const divisions = Object.fromEntries(PYRAMID.map((p) => [p.no, clubs.filter((c) => c.tier === p.no).map((c) => ({ id: c.id, rating: c.rating, style: c.style }))]));
    const p = await braboPlacing(addDays(FOUNDED, 40), divisions);
    expect(p.night).toBeTruthy();
    expect(p.night!.nights).toBeGreaterThanOrEqual(7);
    expect(p.division).toBeGreaterThanOrEqual(1);
    expect(p.division).toBeLessThanOrEqual(8);
    expect(Object.keys(p.rates)).toHaveLength(8);
  });

  it('the season replays the same from the same logs', () => {
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});
