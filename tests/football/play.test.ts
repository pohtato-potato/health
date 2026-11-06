import 'fake-indexeddb/auto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDay, patchDay, setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays, atOn } from '../../src/domain/dates';
import { CATCH_UP_CAP, kickOff, playDue } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 };
let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-play-${++n}`));
  await db.open();
  await setTargets(T, '2026-01-01');
  for (let i = 0; i < 20; i++) await patchDay(addDays('2026-10-01', i), { steps: 9000 + i * 100, sleep: { asleep: 1380, woke: 420 } });
  await foundClub('2026-10-10', { shirt: 'H1', crest: 'a' });
});
const noon = (d: string) => atOn(d, 12 * 60);

describe('kick-off and the 4 am rule', () => {
  it('closing a day stores one match; closing again adds nothing', async () => {
    await closeDay('2026-10-10', true);
    expect(await db.fbMatches.count()).toBe(1);
    await closeDay('2026-10-10', false);
    await closeDay('2026-10-10', true);
    expect(await db.fbMatches.count()).toBe(1);
  });
  it('plays missed days once each at 4 am, and running it again adds nothing', async () => {
    const played = await playDue(noon('2026-10-13'));
    expect(played.map((m) => m.date)).toEqual(['2026-10-10', '2026-10-11', '2026-10-12']);
    expect(played.every((m) => m.auto)).toBe(true);
    expect(await playDue(noon('2026-10-13'))).toHaveLength(0);
    expect(await db.fbMatches.count()).toBe(3);
  });
  it('a clock that goes backwards plays nothing', async () => {
    await kickOff('2026-10-12');
    expect(await kickOff('2026-10-11')).toHaveLength(0);
    expect(await playDue(noon('2026-10-11'))).toHaveLength(0);
  });
  it('caps catch-up at 42 days', async () => {
    const played = await playDue(noon(addDays('2026-10-10', 80)));
    expect(new Set(played.map((m) => m.date)).size).toBe(CATCH_UP_CAP);
  });
  it('a later edit never changes a played match', async () => {
    await kickOff('2026-10-12');
    const before = await db.fbMatches.toArray();
    await patchDay('2026-10-12', { steps: 30000 });
    await playDue(noon('2026-10-13'));
    const after = await db.fbMatches.where('date').equals('2026-10-12').toArray();
    expect(after).toEqual(before.filter((m) => m.date === '2026-10-12'));
  });
  it('a sick day plays the Rotation XI', async () => {
    await patchDay('2026-10-10', { status: 'sick' });
    const [m] = await kickOff('2026-10-10');
    expect(m.rotation).toBe(true);
  });
  it('every league club plays each matchday', async () => {
    await kickOff('2026-10-10');
    const s = (await db.fbSeasons.get(1))!;
    const day1 = Object.values(s.results).reduce((a, r) => a + r.length, 0);
    expect(day1).toBe(54);
  });
  it('a whole season and an event roll into season 2 with every tier at 18', async () => {
    const save0 = (await db.fbSave.get('save'))!;
    let d = save0.founded;
    for (let i = 0; i < 60; i++) { await kickOff(d); d = addDays(d, 1); }
    const save = (await db.fbSave.get('save'))!;
    expect(save.season).toBe(2);
    const s1 = (await db.fbSeasons.get(1))!;
    expect(s1.final).toBeTruthy();
    const clubs = await db.fbClubs.toArray();
    for (const t of [1, 2, 3, 4, 5, 6]) expect(clubs.filter((c) => c.tier === t)).toHaveLength(18);
    const s2 = (await db.fbSeasons.get(2))!;
    const s1dates = (await db.fbMatches.where('season').equals(1).toArray()).map((m) => m.date).sort();
    expect(s2.start).toBe(addDays(s1dates[s1dates.length - 1], 1));
    expect(s1dates.length).toBeGreaterThanOrEqual(43);
  }, 60000);
  it('football modules other than the store never touch the database', () => {
    const dir = join(__dirname, '../../src/football');
    for (const f of readdirSync(dir)) if (f.endsWith('.ts')) expect(readFileSync(join(dir, f), 'utf8')).not.toMatch(/from '\.\.\/db\/db'|from '\.\.\/\.\.\/db\/db'/);
  });
});
