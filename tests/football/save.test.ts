import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { exportData, restoreData } from '../../src/db/backup';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { MATCH_HEADERS, workbookSheets } from '../../src/export/workbook';
import { matchRows } from '../../src/football/store/exportRows';
import { kickOff } from '../../src/football/store/play';
import { foundClub, getSave, resetFootball } from '../../src/football/store/save';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-save-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
});

describe('founding and saving', () => {
  it('creates 108 clubs with Brabo in Division Six at season 1 day 1', async () => {
    await foundClub('2026-11-06', { shirt: 'H1', crest: 'a' });
    expect(await db.fbClubs.count()).toBe(108);
    expect((await db.fbClubs.get('bra'))!.tier).toBe(6);
    const s = (await getSave())!;
    expect([s.season, s.day, s.phase]).toEqual([1, 1, 'season']);
  });
  it('works on a brand-new install with no history: Old Selves are stand-ins, every axis is no data', async () => {
    await foundClub('2026-11-06', { shirt: 'H1', crest: 'a' });
    const olds = (await db.fbClubs.toArray()).filter((c) => c.old);
    expect(olds).toHaveLength(7);
    expect(olds.every((c) => c.old!.standIn)).toBe(true);
    const [m] = await kickOff('2026-11-06');
    expect(Object.values(m.values).every((v) => v === 10)).toBe(true);
    expect(Object.values(m.flags).every((f) => f === 'no-data')).toBe(true);
  });
  it('restoring a backup without football tables leaves no save, without throwing', async () => {
    await foundClub('2026-11-06', { shirt: 'H1', crest: 'a' });
    const b = await exportData();
    const old = { ...b, tables: Object.fromEntries(Object.entries(b.tables).filter(([k]) => !k.startsWith('fb'))) };
    await restoreData(old as never);
    expect(await getSave()).toBeUndefined();
    expect(await kickOff('2026-11-07')).toEqual([]);
  });
  it('a backup round-trip keeps the matches', async () => {
    await foundClub('2026-11-06', { shirt: 'H1', crest: 'a' });
    await kickOff('2026-11-07');
    const b = await exportData();
    await resetFootball();
    expect(await db.fbMatches.count()).toBe(0);
    await restoreData(b);
    expect(await db.fbMatches.count()).toBe(2);
    expect((await getSave())!.lastPlayed).toBe('2026-11-07');
  });
  it('the workbook gets a Matches sheet with 14 columns', async () => {
    await foundClub('2026-11-06', { shirt: 'H1', crest: 'a' });
    const ms = await kickOff('2026-11-06');
    const b = await exportData();
    const sheets = workbookSheets({ settings: b.tables.settings![0] as never, days: [], foods: [], entries: [], sessions: [], sets: [], measurements: [], matches: matchRows(ms) });
    const sheet = sheets.find((s) => s.name === 'Matches')!;
    expect(sheet.rows[0]).toEqual(MATCH_HEADERS);
    expect(MATCH_HEADERS).toHaveLength(14);
    expect(sheet.rows).toHaveLength(2);
  });
});
