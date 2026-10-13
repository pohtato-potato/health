import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { exportData, restoreData, type BackupFile } from '../src/db/backup';
import { HealthDB, setDatabase, db } from '../src/db/db';
import { migrateToV2 } from '../src/db/migrate';
import { prefOn } from '../src/domain/types';
import { DEFAULT_PLAN } from '../src/domain/defaultPlan';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`v2-${++n}`));
  await db.open();
});

/** Shaped like a real 1.x backup, with invented values. */
function v1Backup(): BackupFile {
  const settings = {
    ...defaultSettings(),
    setupDone: true,
    name: 'Tester',
    homes: [
      { id: 'flat', name: 'Flat' },
      { id: 'family', name: 'Family home' },
    ],
  } as Record<string, unknown>;
  delete settings.places;
  return {
    app: 'health',
    kind: 'backup',
    version: 1,
    exportedAt: '2026-10-12T10:00:00.000Z',
    tables: {
      settings: [settings],
      days: [
        { date: '2026-10-01', home: 'flat', steps: 12000 },
        { date: '2026-10-02', home: 'family', steps: 9000 },
        { date: '2026-10-03', steps: 7000 },
      ],
      entries: [{ id: 'e1', date: '2026-10-01', meal: 'lunch', at: 1, kind: 'quick', name: 'Thali', portion: 'Estimate', kcal: 600, protein: 20 }],
      sets: [{ id: 's1', sessionId: 'x', date: '2026-10-01', session: 'A', exerciseId: 'row', exercise: 'Row', setNo: 1, side: 'L', loadKg: 10, reps: 12, at: 2 }],
      occasions: [{ id: 'o1', kind: 'travel', name: 'Trip', from: '2026-10-02', to: '2026-10-03' }],
    },
  };
}

describe('v2 schema and migration', () => {
  it('migrates a v1-shaped backup: home→place, occasions→status, nothing lost', async () => {
    await restoreData(v1Backup());
    const s = await db.settings.get('app');
    expect(s?.places?.map((p) => p.id)).toEqual(['flat', 'family']);
    expect(s?.places?.[0].kind).toBe('home');
    expect(s?.places?.[0].meals.breakfast).toBeGreaterThan(0);
    const days = await db.days.orderBy('date').toArray();
    expect(days.map((d) => d.place)).toEqual(['flat', 'family', undefined]);
    expect(days.map((d) => d.status)).toEqual([undefined, 'travelling', 'travelling']);
    expect(await db.days.count()).toBe(3);
    expect(await db.entries.count()).toBe(1);
    expect(await db.sets.count()).toBe(1);
  });

  it('migration upgrades a v1 plan to v2, keeping its exercises', async () => {
    const plan = { ...DEFAULT_PLAN, version: 1 as const, sessions: DEFAULT_PLAN.sessions.map((x) => ({ ...x, exercises: x.exercises.map(({ measure: _m, ...e }) => e) })) };
    await db.settings.put({ ...defaultSettings(), plan });
    await migrateToV2(db);
    const after = (await db.settings.get('app'))!.plan!;
    expect(after.version).toBe(2);
    expect(after.sessions[0].exercises.map((e) => e.id)).toEqual(plan.sessions[0].exercises.map((e) => e.id));
    expect(after.sessions[0].exercises.every((e) => e.measure)).toBe(true);
  });

  it('migration is idempotent', async () => {
    await restoreData(v1Backup());
    const before = { s: await db.settings.get('app'), d: await db.days.toArray() };
    const report = await migrateToV2(db);
    expect(report.changed).toBe(false);
    expect(await db.settings.get('app')).toEqual(before.s);
    expect(await db.days.toArray()).toEqual(before.d);
  });

  it('a v2 backup round-trips every new field and table', async () => {
    await restoreData(v1Backup());
    await db.days.update('2026-10-01', { place: 'flat', placeChanges: [{ at: 5, place: 'family' }], missed: { 'tablet:1': true }, foodDone: true, energy: 3, stomach: true, soreness: { quads: 2 } });
    await db.entries.update('e1', { eatenAt: 99, proteinUnknown: true });
    await db.sets.update('s1', { skipped: true, form: 4, cleanReps: 10, rir: 1, faults: ['rushed'], challenges: ['pause-bottom'], discomfort: 'knee', firstSide: 'R' });
    await db.usage.add({ at: 1, kind: 'open' });
    await db.markers.put({ id: 'm1', date: '2026-10-01', text: 'Started a supplement' });
    const file = await exportData();
    setDatabase(new HealthDB(`v2-${++n}`));
    await db.open();
    await restoreData(file);
    const d = await db.days.get('2026-10-01');
    expect(d?.placeChanges).toEqual([{ at: 5, place: 'family' }]);
    expect(d?.missed).toEqual({ 'tablet:1': true });
    expect(d?.soreness).toEqual({ quads: 2 });
    expect((await db.entries.get('e1'))?.eatenAt).toBe(99);
    expect((await db.sets.get('s1'))?.form).toBe(4);
    expect(await db.usage.count()).toBe(1);
    expect((await db.markers.get('m1'))?.text).toBe('Started a supplement');
  });

  it('water is off by default in v2 (removed); it can still be switched on', () => {
    expect(prefOn(defaultSettings().prefs, 'water')).toBe(false);
    expect(prefOn({ ...defaultSettings().prefs, water: true }, 'water')).toBe(true);
  });
});
