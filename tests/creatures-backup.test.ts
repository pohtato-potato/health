import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { exportData, parseBackup, restoreData } from '../src/db/backup';
import { db, TABLES } from '../src/db/db';
import type { Sighting } from '../src/domain/creatures';
import { ensureReveal } from '../src/state/reveal';

const s: Sighting = { id: '2026-11-05:nilgai', date: '2026-11-05', creatureId: 'nilgai', tier: 'everyday', stageAfter: 1, grew: false, why: 'night', at: 5 };

describe('sightings in the data', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
  it('is one of the backed-up tables, and survives a round trip with the new fields', async () => {
    expect(TABLES).toContain('sightings');
    await db.sightings.put(s);
    await db.days.put({ date: '2026-11-05', revealedAt: 9, theme: 'nilgai' });
    const file = JSON.stringify(await exportData());
    await db.sightings.clear();
    await db.days.clear();
    await restoreData(parseBackup(file));
    expect(await db.sightings.get(s.id)).toEqual(s);
    expect(await db.days.get('2026-11-05')).toMatchObject({ revealedAt: 9, theme: 'nilgai' });
  });
  it('an old backup without the table still imports unchanged', async () => {
    const old = await exportData();
    delete old.tables.sightings;
    await db.days.put({ date: '2026-11-01', steps: 100 });
    const withDay = await exportData();
    delete withDay.tables.sightings;
    await restoreData(parseBackup(JSON.stringify(withDay)));
    expect(await db.days.get('2026-11-01')).toMatchObject({ steps: 100 });
    expect(await db.sightings.count()).toBe(0);
  });
});

describe('storing who came', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.settings.put({ id: 'app', setupDone: true, targets: [{ from: '2020-01-01', kcalMin: 1800, kcalMax: 2000, proteinG: 120, steps: 8000, sleepMin: 450 }], prefs: {}, checklist: [], homes: [], planState: { variants: {}, band: {} } } as never);
  });
  it('waits for sleep', async () => {
    await db.days.put({ date: '2026-11-05', morning: { at: 1 } });
    expect(await ensureReveal('2026-11-05')).toEqual([]);
    expect((await db.days.get('2026-11-05'))?.revealedAt).toBeUndefined();
  });
  it('writes once: a second call returns the same visitors and adds none', async () => {
    await db.days.put({ date: '2026-11-05', morning: { at: 1 }, sleep: { asleep: 1380, woke: 420 } });
    const first = await ensureReveal('2026-11-05', 1000);
    expect(first.length).toBe(3);
    const second = await ensureReveal('2026-11-05', 2000);
    expect(second).toEqual(first);
    expect(await db.sightings.count()).toBe(3);
    expect((await db.days.get('2026-11-05'))?.revealedAt).toBe(1000);
  });
});

describe('moments in the data', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
  it('are backed up, and a backup from before them restores with none', async () => {
    expect(TABLES).toContain('moments');
    await db.moments.put({ id: 'm', at: 1, kind: 'title', date: '2026-11-05', payload: { text: 'x' } });
    const data = await exportData();
    const file = JSON.stringify(data);
    await db.moments.clear();
    await restoreData(parseBackup(file));
    expect(await db.moments.count()).toBe(1);
    delete data.tables.moments;
    await restoreData(parseBackup(JSON.stringify(data)));
    expect(await db.moments.count()).toBe(0);
  });
});

describe('corrections in a backup', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((x) => x.clear()));
  });
  const fix = { id: '2026-10-05:1', at: 1, date: '2026-10-05', what: 'Steps', was: '100', now: '9000', note: 'Phone died' };
  it('survive a round trip', async () => {
    await db.corrections.put(fix);
    const file = JSON.stringify(await exportData());
    await db.corrections.clear();
    await restoreData(parseBackup(file));
    expect(await db.corrections.get(fix.id)).toEqual(fix);
  });
  it('an older backup without them restores to none', async () => {
    await db.days.put({ date: '2026-11-01', steps: 100 });
    const old = await exportData();
    delete old.tables.corrections;
    await restoreData(parseBackup(JSON.stringify(old)));
    expect(await db.days.get('2026-11-01')).toMatchObject({ steps: 100 });
    expect(await db.corrections.count()).toBe(0);
  });
});
