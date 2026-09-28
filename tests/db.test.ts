import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { addEntry, addWater, getSettings, patchSettings, saveMorningLog, setSteps, setTargets } from '../src/db/actions';
import { exportData, parseBackup, restoreData } from '../src/db/backup';
import { HealthDB, setDatabase, db } from '../src/db/db';
import { pendingSwaps, morningQuestions } from '../src/state/derived';
import { PLAN } from './fixtures';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`test-${++n}`));
  await db.open();
});

describe('database', () => {
  it('starts with defaults and saves settings', async () => {
    expect((await getSettings()).setupDone).toBe(false);
    await patchSettings({ name: 'Test', setupDone: true });
    expect((await getSettings()).name).toBe('Test');
  });

  it('keeps target history', async () => {
    const t = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };
    await setTargets(t, '2026-09-01');
    await setTargets({ ...t, proteinG: 160 }, '2026-10-01');
    expect((await getSettings()).targets.map((r) => r.targets.proteinG)).toEqual([140, 160]);
  });

  it('adds water and never goes below zero', async () => {
    await addWater('2026-09-27', 250);
    await addWater('2026-09-27', -500);
    expect((await db.days.get('2026-09-27'))?.waterMl).toBe(0);
  });

  it('confirms yesterday’s steps and times the morning log', async () => {
    await setSteps('2026-09-27', 11000);
    const r1 = await saveMorningLog('2026-09-28', { weightKg: 80.2, yesterdaySteps: 12500, seconds: 14.2 }, '2026-09-27');
    expect(r1.newBest).toBe(false);
    const y = await db.days.get('2026-09-27');
    expect(y?.steps).toBe(12500);
    expect(y?.stepsFinal).toBe(true);
    expect((await getSettings()).morningBest).toBe(14.2);
    const r2 = await saveMorningLog('2026-09-29', { seconds: 11.8 }, '2026-09-28');
    expect(r2.newBest).toBe(true);
  });

  it('round-trips a backup', async () => {
    await patchSettings({ name: 'Test', setupDone: true, plan: PLAN });
    await addEntry({ date: '2026-09-27', meal: 'lunch', at: 1, kind: 'food', name: 'Roti, dal', portion: '1 serving', kcal: 390, protein: 14 });
    const file = await exportData();
    const text = JSON.stringify(file);
    setDatabase(new HealthDB(`test-${++n}`));
    await restoreData(parseBackup(text));
    expect((await getSettings()).name).toBe('Test');
    expect(await db.entries.count()).toBe(1);
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('{"hello": 1}')).toThrow();
    expect(() => parseBackup('not json')).toThrow();
  });
});

describe('joint flags', () => {
  const base = { planName: 'Test', short: false, exercises: [], status: 'done' as const };
  it('swaps the exercise in the next session of that kind only', () => {
    const flagged = { ...base, id: 'a', date: '2026-09-27', session: 'B', startedAt: 1000, endedAt: 2000, flags: ['joint'] };
    expect(pendingSwaps(PLAN, [flagged], []).map((s) => s.from)).toEqual(['lunge']);
    const nextB = { ...base, id: 'b', date: '2026-09-29', session: 'B', startedAt: 5000, endedAt: 6000 };
    expect(pendingSwaps(PLAN, [flagged, nextB], [])).toEqual([]);
  });
  it('counts a morning answer as a flag', () => {
    const days = [{ date: '2026-09-28', answers: { 'joint-am': true }, morning: { at: 3000 } }];
    expect(pendingSwaps(PLAN, [], days).length).toBe(1);
  });
  it('asks the morning question only after that exercise', () => {
    const s = { ...base, id: 'x', date: '2026-09-27', session: 'B', startedAt: 1 };
    const sets = [{ id: '1', sessionId: 'x', date: '2026-09-27', session: 'B', exerciseId: 'lunge', exercise: 'Lunge', setNo: 1, side: 'L' as const, loadKg: null, reps: 8, at: 1 }];
    expect(morningQuestions(PLAN, [s], sets, '2026-09-28').map((f) => f.id)).toEqual(['joint-am']);
    expect(morningQuestions(PLAN, [s], [], '2026-09-28')).toEqual([]);
  });
});
