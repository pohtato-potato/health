import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { addEntry, changePlace, closeDay, moveEntry, patchSettings, setStatusRange } from '../src/db/actions';
import { db, HealthDB, setDatabase } from '../src/db/db';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`v2c-${++n}`));
  await db.open();
  await patchSettings({ places: [{ id: 'p-home', name: 'Home', kind: 'home', meals: { breakfast: 600, lunch: 900, snacks: 1140, dinner: 1290 }, eased: false, foodsFirst: 'home' }] });
});

describe('close the day', () => {
  it('moveEntry updates eatenAt to the new meal time', async () => {
    const e = await addEntry({ date: '2026-10-12', meal: 'snacks', at: new Date(2026, 9, 12, 23, 50).getTime(), kind: 'food', name: 'Chana', portion: '1 bowl', kcal: 200, protein: 10 });
    await moveEntry(e.id, 'lunch');
    const after = await db.entries.get(e.id);
    expect(after?.meal).toBe('lunch');
    expect(after?.eatenAt).toBe(new Date(2026, 9, 12, 15, 0).getTime());
  });

  it('close the day for yesterday writes to yesterday', async () => {
    await closeDay('2026-10-12', true);
    expect((await db.days.get('2026-10-12'))?.foodDone).toBe(true);
    expect(await db.days.get('2026-10-13')).toBeUndefined();
    await closeDay('2026-10-12', false);
    expect((await db.days.get('2026-10-12'))?.foodDone).toBe(false);
  });
});

describe('status ranges', () => {
  it('setStatusRange writes each day and clears it again', async () => {
    await db.days.put({ date: '2026-10-13', steps: 500 });
    await setStatusRange('2026-10-12', '2026-10-14', 'sick');
    expect((await db.days.toArray()).map((d) => [d.date, d.status])).toEqual([
      ['2026-10-12', 'sick'],
      ['2026-10-13', 'sick'],
      ['2026-10-14', 'sick'],
    ]);
    expect((await db.days.get('2026-10-13'))?.steps).toBe(500);
    await setStatusRange('2026-10-13', '2026-10-14', undefined);
    expect((await db.days.get('2026-10-12'))?.status).toBe('sick');
    expect((await db.days.get('2026-10-13'))?.status).toBeUndefined();
  });
});

describe('changing place from Today', () => {
  it('sets the day place in the morning, and records a mid-day change later', async () => {
    await changePlace('2026-10-13', 'p-office', new Date(2026, 9, 13, 9, 0).getTime());
    expect((await db.days.get('2026-10-13'))?.place).toBe('p-office');
    const t = new Date(2026, 9, 13, 18, 30).getTime();
    await changePlace('2026-10-13', 'p-home', t);
    const d = await db.days.get('2026-10-13');
    expect(d?.place).toBe('p-office');
    expect(d?.placeChanges).toEqual([{ at: t, place: 'p-home' }]);
  });
});
