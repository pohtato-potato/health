// LG-4 (ledger O38, league spec §9 and §11): a world-1 save moved into the new world. Invented logs only.
// The founding weeks kept as season 0, Brabo placed and given its stage's unlocks, the resets, the kept things,
// then two days played in world 2; the same save and logs give the same world, and a backup restores and moves alike.
import 'fake-indexeddb/auto';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { patchDay, setTargets } from '../../src/db/actions';
import { exportData, restoreData } from '../../src/db/backup';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { clubById, isRetired, RIVAL_2, setClubWorld } from '../../src/football/data/load';
import { WORLD_CLUBS } from '../../src/football/data/world';
import { ERA_IDS } from '../../src/football/content/types';
import { TECHS } from '../../src/football/content/tree';
import { crestStepFor, slotsOpen } from '../../src/football/kits';
import { eraForStage, FOUNDING_SEASON, giftedBuildings, seasonName, startingBudget } from '../../src/football/pyramid/redraw';
import { POOL, stageOf } from '../../src/football/pyramid/shape';
import { finishWithAssistant, playDue } from '../../src/football/store/play';
import { planRedraw, redrawWorld } from '../../src/football/store/redraw';
import { foundClub } from '../../src/football/store/save';
import { OWN } from '../../src/football/store/season';
import type { FbSave } from '../../src/football/store/tables';

const noon = (d: string) => new Date(`${d}T12:00:00`).getTime();
const FOUNDED = '2026-11-02';
const MOVE = '2026-11-14';

/** Round, invented days: steps, sleep, food and a session every other day. Nobody's real data. */
async function logDays(from: number, to: number) {
  for (let i = from; i < to; i++) {
    const d = addDays(FOUNDED, i);
    await patchDay(d, { steps: 7000 + ((i * 1370) % 5000), sleep: { asleep: 1380 + ((i * 17) % 50), woke: 410 + ((i * 23) % 40) }, foodDone: true });
    await db.entries.put({ id: `e${i}`, date: d, meal: 'lunch', at: noon(d), kind: 'quick', name: 'Meal', portion: '1', kcal: 2100 + ((i * 53) % 200), protein: 120 + ((i * 7) % 30) });
    if (i % 2 === 0) await db.sessions.put({ id: `s${i}`, date: d, session: 'A', planName: 'Plan', startedAt: noon(d), endedAt: noon(d) + 3_600_000, status: 'done', short: false, exercises: [] });
  }
}
const digest = async () => createHash('sha256').update(JSON.stringify([
  await db.fbSave.get('save'), await db.fbSeasons.toArray(), await db.fbClubs.orderBy('id').toArray(), await db.fbMatches.orderBy('id').toArray(), await db.fbBundles.toArray(),
])).digest('hex');

async function freshSave(name: string) {
  setDatabase(new HealthDB(name));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await logDays(-40, 20);
  await foundClub(FOUNDED, { shirt: 'A1', crest: 'a', captain: 'Pace' });
  await playDue(noon(MOVE));
}

describe('the world redrawn', { timeout: 600_000 }, () => {
  let before: FbSave;
  let beforeMatches = 0;
  let after: FbSave;
  let moved = '';
  beforeAll(async () => {
    await freshSave('fb-redraw-a');
    before = (await db.fbSave.get('save'))!;
    // Something to keep and something to reset: an earned rival against a retired club, scouting, a cup run.
    before = { ...before, scouted: ['ars'], rivals: [...before.rivals, { clubId: 'zur', how: 'derby', since: '2026-11-05' }, { clubId: 'ars', how: 'cup', since: '2026-11-06' }], met: [...before.met, 'ars', 'zur'] };
    await db.fbSave.put(before);
    await db.cupRuns.put({ id: 'current', kind: 'run' } as never);
    // A match still waiting to be watched belongs to the founding weeks too; the move finishes it.
    beforeMatches = (await db.fbMatches.count()) + ((await db.fbSave.get('save'))!.paused ? 1 : 0);
    await redrawWorld(noon(MOVE));
    after = (await db.fbSave.get('save'))!;
    moved = await digest();
  });

  it('is never done on load: a world-1 save stays world 1 until the owner starts it', async () => {
    setDatabase(new HealthDB('fb-redraw-load'));
    await db.open();
    await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
    await logDays(-5, 3);
    await foundClub(FOUNDED, { shirt: 'A1', crest: 'a', captain: 'Pace' });
    await playDue(noon(addDays(FOUNDED, 3)));
    expect((await db.fbSave.get('save'))!.world).toBeUndefined();
    setDatabase(new HealthDB('fb-redraw-a'));
    await db.open();
  });

  it('keeps the founding weeks as season 0, with every match readable', async () => {
    const s0 = (await db.fbSeasons.get(FOUNDING_SEASON))!;
    expect(seasonName(0)).toBe('The founding weeks');
    expect(s0.world).toBeUndefined();
    expect(s0.final!.tables[6]).toHaveLength(18);
    expect(s0.final!.up).toEqual({});
    const ms = await db.fbMatches.where('season').equals(0).toArray();
    expect(beforeMatches).toBeGreaterThan(5);
    expect(ms.length).toBe(beforeMatches);
    setClubWorld(2);
    for (const m of ms) expect(clubById(m.opp).name).toBeTruthy();
    expect(after.redrawn!.founding.p).toBe(ms.filter((m) => m.comp !== 'friendly').length);
  });

  it('places Brabo, seeds the real world and starts Season 1 the next morning in world 2', async () => {
    expect(after.world).toBe(2);
    expect(after.season).toBe(1);
    expect(after.day).toBe(1);
    expect(after.lastPlayed).toBe(MOVE);
    const s1 = (await db.fbSeasons.get(1))!;
    expect(s1.world).toBe(2);
    expect(s1.start).toBe(addDays(MOVE, 1));
    const own = (await db.fbClubs.get(OWN))!;
    expect(own.tier).toBe(after.redrawn!.division);
    const clubs = await db.fbClubs.toArray();
    for (let d = 1; d <= 8; d++) expect(clubs.filter((c) => c.tier === d && !c.pool && !c.folded)).toHaveLength(12);
    expect(clubs.some((c) => c.id === 'kbs')).toBe(false);
    for (const c of clubs.filter((x) => !x.folded && x.id !== OWN && !/^os\d$/.test(x.id))) expect(WORLD_CLUBS.some((w) => w.id === c.id)).toBe(true);
    expect(clubs.filter((c) => c.pool).every((c) => c.tier === POOL)).toBe(true);
    expect(after.redrawn!.vs).toHaveLength(11);
  });

  it('gives the unlocks of the stage: earlier eras complete, the crest step, the buildings', async () => {
    const stage = stageOf(after.redrawn!.division);
    const era = eraForStage(stage);
    const researched = new Set(after.treeUser!.researched.map((r) => r.id));
    for (const t of TECHS) if (ERA_IDS.indexOf(t.era) < ERA_IDS.indexOf(era)) expect(researched.has(t.id)).toBe(true);
    expect(after.treeUser!.researched.filter((r) => r.on === MOVE).every((r) => r.cost === 0)).toBe(true);
    if (crestStepFor(stage) > before.crest.step) expect(after.crestPending).toBe(crestStepFor(stage));
    const done = (await db.fbBundles.toArray()).filter((b) => b.done && b.done < MOVE).map((b) => b.id);
    for (const id of giftedBuildings(stage, [])) expect(done).toContain(id);
    expect(slotsOpen(stage).length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the players, money, contracts, kits, crest and settings', async () => {
    // Money on arrival (ledger O40): the old bank plus one careful season's income for the division placed in.
    expect(after.redrawn?.budget).toBe(startingBudget(after.redrawn!.division));
    expect(after.budget).toBeCloseTo(before.budget + after.redrawn!.budget!, 3);
    expect(after.contracts).toEqual(before.contracts);
    expect(after.crest).toEqual(before.crest);
    expect(after.shirt).toBe(before.shirt);
    expect(after.slots).toEqual(before.slots);
    expect(after.captain).toBe(before.captain);
    expect(await db.fbPlayers.count()).toBeGreaterThan(0);
  });

  it('resets fog, scouting, rivals against retired clubs and any cup run; Royal Antwerp is the legend', async () => {
    expect(after.scouted).toEqual([]);
    expect(after.fog).toEqual({ since: MOVE, old: [] });
    expect(after.met).toContain('ars');
    expect(after.met.some(isRetired)).toBe(false);
    expect(after.rivals[0]).toMatchObject({ clubId: RIVAL_2, how: 'legend' });
    expect(after.rivals.some((r) => r.clubId === 'zur' || r.clubId === 'ant')).toBe(false);
    expect(after.rivals.some((r) => r.clubId === 'ars' && r.how === 'cup')).toBe(true);
    expect(await db.cupRuns.get('current')).toBeUndefined();
  });

  it('enters a month with seven real nights as an Old Self', async () => {
    const olds = (await db.fbClubs.toArray()).filter((c) => c.old && !c.folded);
    expect(olds.map((o) => o.old!.name)).toContain('AFC October 2026');
    expect(olds.every((o) => o.old!.standIn === false)).toBe(true);
  });

  it('plays two days of Season 1 in the new world', async () => {
    await playDue(noon(addDays(MOVE, 3)));
    // The second night's match waits to be watched (a continental night Brabo has no part in); Skip stores it.
    await finishWithAssistant();
    const ms = await db.fbMatches.where('season').equals(1).toArray();
    expect(ms.filter((m) => m.comp === 'league')).toHaveLength(2);
    const s1 = (await db.fbSeasons.get(1))!;
    for (const m of ms) expect(s1.tierOf[m.opp]).toBe(after.redrawn!.division);
  });

  it('the same save and logs give the same world, every time', async () => {
    await freshSave('fb-redraw-b');
    const b = (await db.fbSave.get('save'))!;
    await db.fbSave.put({ ...b, scouted: ['ars'], rivals: [...b.rivals, { clubId: 'zur', how: 'derby', since: '2026-11-05' }, { clubId: 'ars', how: 'cup', since: '2026-11-06' }], met: [...b.met, 'ars', 'zur'] });
    await db.cupRuns.put({ id: 'current', kind: 'run' } as never);
    await redrawWorld(noon(MOVE));
    expect(await digest()).toBe(moved);
  });

  it('a backup made before the change restores as world 1 and moves the same way', async () => {
    await freshSave('fb-redraw-c');
    const b = (await db.fbSave.get('save'))!;
    await db.fbSave.put({ ...b, scouted: ['ars'], rivals: [...b.rivals, { clubId: 'zur', how: 'derby', since: '2026-11-05' }, { clubId: 'ars', how: 'cup', since: '2026-11-06' }], met: [...b.met, 'ars', 'zur'] });
    const file = JSON.parse(JSON.stringify(await exportData()));
    setDatabase(new HealthDB('fb-redraw-d'));
    await db.open();
    await restoreData(file);
    expect((await db.fbSave.get('save'))!.world).toBeUndefined();
    expect(await planRedraw(MOVE)).toBeTruthy();
    await db.cupRuns.put({ id: 'current', kind: 'run' } as never);
    await redrawWorld(noon(MOVE));
    expect(await digest()).toBe(moved);
  });

  it('a world-2 save is never moved twice', async () => {
    setDatabase(new HealthDB('fb-redraw-a'));
    await db.open();
    expect(await planRedraw(MOVE)).toBeUndefined();
    expect(await redrawWorld(noon(MOVE))).toBeUndefined();
  });
});
