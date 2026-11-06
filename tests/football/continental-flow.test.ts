import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { CONT } from '../../src/football/continental';
import { WORLD_CHAMPS } from '../../src/football/data/continental';
import { crownSwap } from '../../src/football/store/dev';
import { kickOff } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';

const START = '2026-06-01';
let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-cont-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub(START, { shirt: 'H1', crest: 'a' });
});
async function intoCrown() {
  const s = (await db.fbSave.get('save'))!;
  const out = crownSwap((await db.fbSeasons.get(s.season))!, await db.fbClubs.toArray(), 'bay');
  await db.fbSeasons.put(out.season);
  await db.fbClubs.bulkPut(out.clubs);
}
const playTo = async (day: number) => { for (let i = 0; i < day; i++) await kickOff(addDays(START, i)); };

describe('the Continental Cup in a season', () => {
  it('every season draws a 16-club field; Brabo in Division Six are not in it', async () => {
    const s = (await db.fbSeasons.get(1))!;
    expect(s.continental?.field).toHaveLength(16);
    expect(s.continental?.field).not.toContain('bra');
  });

  it('in the field, each phase night is a double-header: the league match, then the continental one', async () => {
    await intoCrown();
    await playTo(CONT.phase[1]);
    const night = (await db.fbMatches.where('date').equals(addDays(START, CONT.phase[0] - 1)).toArray()).sort((a, b) => a.id.localeCompare(b.id));
    expect(night.map((m) => m.comp)).toEqual(['league', 'continental']);
    expect(night[1].id.endsWith(':2')).toBe(true);
    expect(night[1].round).toBe('The Continental Cup, league phase 1 of 8');
    const s = (await db.fbSeasons.get(1))!;
    expect(s.continental!.results).toHaveLength(2);
    expect(s.continental!.results.every((r) => r.length === 8)).toBe(true);
  });

  it('after the phase the knockouts are drawn, and the cup is decided by day 39', { timeout: 60_000 }, async () => {
    await intoCrown();
    await playTo(CONT.final);
    const c = (await db.fbSeasons.get(1))!.continental!;
    expect(c.results.flat()).toHaveLength(64);
    expect(c.ko?.rounds[0].ties).toHaveLength(4);
    expect(c.ko?.winner).toBeTruthy();
    const news = await db.fbNews.toArray();
    expect(news.some((x) => x.id.endsWith(':ct:winner'))).toBe(true);
  });
});

describe('the Club World Cup', () => {
  it('after a continental title, Brabo play four nights against the champions', async () => {
    const s = (await db.fbSave.get('save'))!;
    await db.fbSave.put({ ...s, phase: 'event', event: { id: 'clubworld', days: 4 }, day: 1 });
    for (let i = 0; i < 4; i++) await kickOff(addDays(START, i));
    const ms = await db.fbMatches.toArray();
    expect(ms).toHaveLength(4);
    expect(ms[0].comp).toBe('clubworld');
    expect(WORLD_CHAMPS.some((c) => c.id === ms[0].opp)).toBe(true);
    const b = (await db.fbSeasons.get(1))!.clubworld!;
    expect(b.winner).toBeTruthy();
    expect((await db.fbSave.get('save'))!.phase).toBe('season');
  });
});
