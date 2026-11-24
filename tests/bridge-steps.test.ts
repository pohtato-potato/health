import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exportData, restoreData } from '../src/db/backup';
import { db, HealthDB, setDatabase } from '../src/db/db';
import { importBridgeStepFiles, readBridgeStepDay } from '../src/db/bridgeSteps';

let index = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`bridge-steps-${++index}`));
  await db.open();
});
afterEach(async () => {
  await db.delete();
});

const importedAt = Date.parse('2026-11-25T10:00:00+05:30');
const firstRead = '2026-11-25T09:00:00+05:30';
const secondRead = '2026-11-25T09:50:00+05:30';

function hour(start: string, end: string, count: number, source = 'Fitbit') {
  return { start: `2026-11-${start}:00+05:30`, end: `2026-11-${end}:00+05:30`, count, source };
}

function file(date: string, steps: ReturnType<typeof hour>[] = [], readAt = firstRead, status = 'ok') {
  return JSON.stringify({ schema: 1, date, tz: '+05:30', readAt, status: { steps: status }, steps });
}

const beforeMidnight = hour('24T23:00', '25T00:00', 8640);
const overnight = hour('25T02:00', '25T03:00', 510);
const afterFour = hour('25T04:00', '25T05:00', 1220);

describe('Bridge step intake', () => {
  it('assigns the pre-04:00 steps to yesterday and counts overlap only once', async () => {
    await importBridgeStepFiles([
      file('2026-11-24', [beforeMidnight, overnight]),
      file('2026-11-25', [beforeMidnight, overnight, afterFour]),
    ], importedAt);

    expect(await readBridgeStepDay('2026-11-24')).toEqual({
      count: 9150, latestBucketEnd: overnight.end, observedThrough: Date.parse(overnight.end), source: 'Apple Health', importedAt,
    });
    expect(await readBridgeStepDay('2026-11-25')).toMatchObject({ count: 1220, latestBucketEnd: afterFour.end });
    expect(await readBridgeStepDay('2026-11-23')).toBeUndefined();
    expect(await db.days.count()).toBe(0);
  });

  it('keeps manual steps and the day seal separate, and changes a corrected hour once', async () => {
    const manual = { date: '2026-11-24', steps: 9000, foodDone: true };
    await db.days.put(manual);
    const initial = file('2026-11-24', [beforeMidnight]);
    expect(await importBridgeStepFiles([initial], importedAt)).toEqual(['2026-11-24']);
    expect(await importBridgeStepFiles([initial], importedAt + 1)).toEqual([]);
    const correction = file('2026-11-24', [{ ...beforeMidnight, count: 8200 }], secondRead);
    const races = await Promise.all([
      importBridgeStepFiles([correction], importedAt + 2),
      importBridgeStepFiles([correction], importedAt + 2),
    ]);
    expect(races.flat()).toEqual(['2026-11-24']);
    expect(await importBridgeStepFiles([initial], importedAt + 3)).toEqual([]);
    expect(await readBridgeStepDay(manual.date)).toMatchObject({ count: 8200, importedAt: importedAt + 2 });
    expect(await db.days.get(manual.date)).toEqual(manual);
  });

  it('keeps prior usable readings when a retry reports none or error', async () => {
    await importBridgeStepFiles([file('2026-11-24', [beforeMidnight])], importedAt);
    await importBridgeStepFiles([
      file('2026-11-24', [], secondRead, 'error'),
      file('2026-11-25', [], secondRead, 'none'),
    ], importedAt + 1);
    expect(await readBridgeStepDay('2026-11-24')).toMatchObject({ count: 8640, importedAt });
    expect(await db.bridgeStepReads.get('2026-11-24')).toMatchObject({ status: 'error' });
    expect(await db.bridgeStepReads.get('2026-11-25')).toMatchObject({ status: 'none' });
    expect(await readBridgeStepDay('2026-11-25')).toBeUndefined();
  });

  it('rejects invalid hours or ambiguous conflicting revisions without writing any of the batch', async () => {
    const valid = file('2026-11-24', [beforeMidnight]);
    await expect(importBridgeStepFiles([valid, file('2026-11-25', [hour('25T03:30', '25T04:30', 400)])], importedAt))
      .rejects.toThrow(/hour/i);
    await expect(importBridgeStepFiles([valid, file('2026-11-24', [{ ...beforeMidnight, count: 1 }])], importedAt))
      .rejects.toThrow(/conflict/i);
    expect(await readBridgeStepDay('2026-11-24')).toBeUndefined();
    expect(await db.bridgeStepReads.count()).toBe(0);
  });

  it('rejects partially overlapping hours from different local offsets', async () => {
    await importBridgeStepFiles([file('2026-11-25', [afterFour])], importedAt);
    const shifted = {
      start: '2026-11-25T04:00:00+05:45', end: '2026-11-25T05:00:00+05:45',
      count: 400, source: 'Fitbit',
    };
    await expect(importBridgeStepFiles([file('2026-11-25', [shifted], secondRead)], importedAt + 1))
      .rejects.toThrow(/overlap/i);
    expect(await readBridgeStepDay('2026-11-25')).toMatchObject({ count: 1220 });
  });

  it('prefers the bucket’s own calendar-day file when overlapping copies share a read time', async () => {
    await importBridgeStepFiles([
      file('2026-11-25', [overnight]),
      file('2026-11-24', [{ ...overnight, count: 29 }]),
    ], importedAt);
    expect(await readBridgeStepDay('2026-11-24')).toMatchObject({ count: 510 });
  });

  it('round-trips imported readings through the existing backup and accepts an older backup', async () => {
    await db.days.put({ date: '2026-11-24', steps: 7000 });
    await importBridgeStepFiles([file('2026-11-24', [beforeMidnight])], importedAt);
    const backup = await exportData();
    await db.bridgeStepHours.clear();
    await restoreData(backup);
    expect(await readBridgeStepDay('2026-11-24')).toMatchObject({ count: 8640 });
    delete backup.tables.bridgeStepHours;
    delete backup.tables.bridgeStepReads;
    await restoreData(backup);
    expect(await readBridgeStepDay('2026-11-24')).toBeUndefined();
    expect(await db.days.get('2026-11-24')).toMatchObject({ steps: 7000 });
  });
});
