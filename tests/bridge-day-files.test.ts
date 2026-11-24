import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importBridgeDayFiles } from '../src/db/bridgeDayFiles';
import { db, HealthDB, setDatabase } from '../src/db/db';

let index = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`bridge-day-files-${++index}`));
  await db.open();
});
afterEach(async () => { await db.delete(); });

const day = '2026-11-24';
const ts = (time: string) => `${day}T${time}:00+05:30`;
const file = (spanStage = 'core') => JSON.stringify({
  schema: 1, date: day, readAt: ts('18:00'), status: { steps: 'ok', meals: 'ok', sleep: 'ok' },
  steps: [{ start: ts('10:00'), end: ts('11:00'), source: 'Google Health', count: 500 }],
  meals: [{ id: 'meal', at: ts('12:00'), source: 'Bevel', uuids: ['sample'], nutrients: {} }],
  sleep: [{ uuid: 'span', start: ts('01:00'), end: ts('05:00'), source: 'Google Health', stage: spanStage }],
});

describe('Bridge day-file batch', () => {
  it('stores the three streams and returns only material changes', async () => {
    expect(await importBridgeDayFiles([file()], 100)).toEqual({ stepDays: [day], meals: 1, sleepSpans: 1 });
    expect(await importBridgeDayFiles([file()], 200)).toEqual({ stepDays: [], meals: 0, sleepSpans: 0 });
  });

  it('leaves every cache empty when a later stream is malformed', async () => {
    await expect(importBridgeDayFiles([file('invalid')], 100)).rejects.toThrow(/sleep/i);
    expect(await db.bridgeStepHours.count()).toBe(0);
    expect(await db.bridgeMealReads.count()).toBe(0);
    expect(await db.bridgeSleepSpans.count()).toBe(0);
  });
});
