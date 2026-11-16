import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { HealthDB, db, setDatabase } from '../src/db/db';
import { addUsualFood } from '../src/screens/today/useAddUsual';
import type { Food } from '../src/domain/types';

const dal = { id: 'f-test-dal', name: 'Test dal', unit: 'serving', servingDesc: '1 bowl', per: 1, kcal: 300, protein: 12, defaultAmount: 1, createdAt: 0 } as Food;

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`log-usual-${++n}`));
  await db.open();
});

describe('addUsualFood: one tap adds a usual food, on Today and in the + sheet', () => {
  it('adds the food at its usual portion to the meal and day asked', async () => {
    await addUsualFood({ food: dal, amount: 2 }, '2026-10-20', 'lunch', 1_000);
    const [e] = await db.entries.toArray();
    expect(e).toMatchObject({ date: '2026-10-20', meal: 'lunch', kind: 'food', foodId: 'f-test-dal', name: 'Test dal', amount: 2, kcal: 600, protein: 24 });
  });
  it('says what it added and offers Undo, which takes it back out', async () => {
    const t = await addUsualFood({ food: dal, amount: 1 }, '2026-10-20', 'dinner', 1_000);
    expect(t.text).toBe('Added Test dal');
    expect(t.sub).toMatch(/your usual/);
    expect(t.action?.label).toBe('Undo');
    t.action!.run();
    await new Promise((r) => setTimeout(r, 20));
    expect(await db.entries.count()).toBe(0);
  });
});
