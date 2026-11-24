import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exportData, restoreData } from '../src/db/backup';
import { db, HealthDB, setDatabase } from '../src/db/db';
import { importBridgeMealFiles, readBridgeMeals, setBridgeMealDetails } from '../src/db/bridgeMeals';

let index = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`bridge-meals-${++index}`));
  await db.open();
});
afterEach(async () => { await db.delete(); });

const date = '2026-11-24';
const loggedAt = `${date}T00:30:00+05:30`;
const meal = (id: string, kcal = 300) => ({
  id, uuids: [`sample-${id}`], at: loggedAt, source: 'Bevel', kcal, nutrients: { protein_g: 20, water_ml: 250 },
});
const file = (meals: unknown[], readAt = '2026-11-25T10:00:00+05:30', status = 'ok', day = date) =>
  JSON.stringify({ schema: 1, date: day, readAt, status: { meals: status }, meals });

describe('Bridge meal intake', () => {
  it('keeps separate Bevel IDs logged at the same time and ignores overlap', async () => {
    const meals = [meal('a'), meal('b')];
    expect(await importBridgeMealFiles([file(meals), file(meals, undefined, 'ok', '2026-11-23')])).toBe(2);
    expect(await importBridgeMealFiles([file([...meals].reverse())])).toBe(0);
    expect(await readBridgeMeals(date)).toEqual([
      expect.objectContaining({ providerId: 'a', loggedAt, nutrients: { protein_g: 20, water_ml: 250 } }),
      expect.objectContaining({ providerId: 'b', loggedAt }),
    ]);
    expect(await readBridgeMeals('2026-11-23')).toEqual([]);
  });

  it('retains local name, meal bucket and eaten time across a nutrient edit', async () => {
    await importBridgeMealFiles([file([meal('a')])], 1);
    const [original] = await readBridgeMeals(date);
    const details = { name: 'Sample recipe', meal: 'dinner', eatenAt: Date.parse('2026-11-24T21:00:00+05:30') } as const;
    await setBridgeMealDetails(original.id, details);
    const update = { ...meal('a', 420), uuids: ['edited'], nutrients: { protein_g: 25 } };
    const revision = file([update], '2026-11-25T11:00:00+05:30');
    expect(await importBridgeMealFiles([revision], 2)).toBe(1);
    expect(await importBridgeMealFiles([file([meal('a')])], 3)).toBe(0);
    expect(await readBridgeMeals(date)).toEqual([expect.objectContaining({
      id: original.id, kcal: 420, nutrients: { protein_g: 25 }, details, importedAt: 2,
    })]);
    expect(await db.entries.count()).toBe(0);
  });

  it('keeps omitted logs and skips updates when a read finds nothing or fails', async () => {
    await importBridgeMealFiles([file([meal('a'), meal('b')])], 1);
    await importBridgeMealFiles([file([meal('a')], '2026-11-25T11:00:00+05:30')], 2);
    await importBridgeMealFiles([file([], '2026-11-25T12:00:00+05:30', 'error')], 3);
    await importBridgeMealFiles([file([], '2026-11-25T13:00:00+05:30', 'none')], 4);
    expect(await db.bridgeMealReads.get(date)).toMatchObject({ status: 'none' });
    expect((await readBridgeMeals(date)).map((row) => row.importedAt)).toEqual([1, 1]);
  });

  it('rejects competing revisions and invalid nutrient values as an atomic batch', async () => {
    await expect(importBridgeMealFiles([file([meal('a')]), file([meal('a', 10)])])).rejects.toThrow(/conflict/i);
    await expect(importBridgeMealFiles([file([meal('a'), { ...meal('b'), nutrients: { protein_g: -1 } }])])).rejects.toThrow(/nutrient/i);
    expect(await readBridgeMeals(date)).toEqual([]);
    expect(await db.bridgeMealReads.count()).toBe(0);
  });

  it('preserves unspecified nutrition values and backs up local details', async () => {
    const water = { id: 'drink', source: 'Bevel', at: loggedAt, uuids: ['sample-drink'], nutrients: { water_ml: 300 } };
    await importBridgeMealFiles([file([water])], 1);
    const [row] = await readBridgeMeals(date);
    expect(row.kcal).toBeUndefined();
    expect(row.details).toBeUndefined();
    await setBridgeMealDetails(row.id, { name: 'Sample drink' });
    const backup = await exportData();
    await db.bridgeMeals.clear();
    await restoreData(backup);
    expect(await readBridgeMeals(date)).toEqual([expect.objectContaining({ details: { name: 'Sample drink' } })]);
  });
});
