import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, HealthDB, setDatabase } from '../src/db/db';
import { importBridgeSleepFiles, readBridgeSleepNight } from '../src/db/bridgeSleep';

let index = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`bridge-sleep-${++index}`));
  await db.open();
});
afterEach(async () => { await db.delete(); });

const iso = (part: string) => `2026-11-${part}:00+05:30`;
const span = (uuid: string, start: string, end: string, stage: string, source = 'Google Health') =>
  ({ uuid, start: iso(start), end: iso(end), stage, source });
const file = (sleep: unknown[], date = '2026-11-24', status = 'ok', readAt = iso('24T18:00')) =>
  JSON.stringify({ schema: 1, date, readAt, status: { sleep: status }, sleep });

describe('Bridge sleep', () => {
  it('uses the wake day and unions measured sleep without counting in-bed time, gaps or naps', async () => {
    const spans = [
      span('bed', '23T22:00', '24T07:30', 'inBed'),
      span('start', '23T23:00', '24T02:00', 'core'),
      span('overlap', '24T01:00', '24T03:00', 'asleep'),
      span('awake', '24T03:00', '24T03:30', 'awake'),
      span('end', '24T04:00', '24T07:00', 'rem'),
      span('nap', '24T13:00', '24T14:00', 'core'),
      span('other', '23T23:00', '24T05:00', 'core', 'Other'),
    ];
    await importBridgeSleepFiles([file(spans), file(spans.slice(0, 2), '2026-11-23')], 1);
    expect(await readBridgeSleepNight('2026-11-23')).toBeUndefined();
    expect(await readBridgeSleepNight('2026-11-24')).toEqual({
      main: {
        asleepAt: iso('23T23:00'), wokeAt: iso('24T07:00'), asleepMinutes: 420,
        source: 'Google Health', importedAt: 1,
      },
      otherSessions: [{ asleepAt: iso('24T13:00'), wokeAt: iso('24T14:00'), asleepMinutes: 60, source: 'Google Health', importedAt: 1 }],
    });
  });

  it('preserves prior usable spans on failed reads and leaves manual sleep alone', async () => {
    const manual = { date: '2026-11-24', sleep: { asleep: 1380, woke: 390, rested: 3 } };
    await db.days.put(manual);
    const records = [span('a', '23T22:30', '24T06:00', 'core')];
    expect(await importBridgeSleepFiles([file(records)], 1)).toBe(1);
    expect(await importBridgeSleepFiles([file(records)], 2)).toBe(0);
    await importBridgeSleepFiles([file([], manual.date, 'error', iso('24T20:00'))], 3);
    expect(await db.bridgeSleepReads.get(manual.date)).toMatchObject({ status: 'error' });
    expect(await readBridgeSleepNight(manual.date)).toMatchObject({ main: { asleepMinutes: 450, importedAt: 1 } });
    expect(await db.days.get(manual.date)).toEqual(manual);
  });

  it('keeps in-bed-only reads as source evidence without inferring sleep', async () => {
    await importBridgeSleepFiles([file([span('a', '23T22:00', '24T06:00', 'inBed')])]);
    expect(await readBridgeSleepNight('2026-11-24')).toBeUndefined();
    expect(await db.bridgeSleepSpans.count()).toBe(1);
  });

  it('rejects malformed stages and competing same-read spans without committing a partial batch', async () => {
    const good = file([span('a', '23T22:30', '24T06:00', 'core')]);
    await expect(importBridgeSleepFiles([good, file([span('b', '24T01:00', '24T03:00', 'unknown')])])).rejects.toThrow(/sleep/i);
    await expect(importBridgeSleepFiles([good, file([span('a', '23T22:30', '24T05:00', 'core')])])).rejects.toThrow(/conflict/i);
    expect(await db.bridgeSleepSpans.count()).toBe(0);
    expect(await db.bridgeSleepReads.count()).toBe(0);
  });
});
