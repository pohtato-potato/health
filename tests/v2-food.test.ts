import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { addEntry, patchSettings, setMissed, setTick, updateEntry } from '../src/db/actions';
import { db, HealthDB, setDatabase } from '../src/db/db';
import type { Place } from '../src/domain/types';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`v2f-${++n}`));
  await db.open();
  const places: Place[] = [
    { id: 'p-home', name: 'Home', kind: 'home', meals: { breakfast: 600, lunch: 900, snacks: 1140, dinner: 1290 }, eased: false, foodsFirst: 'home' },
    { id: 'p-office', name: 'Office', kind: 'office', meals: { breakfast: 480, lunch: 780, snacks: 1020, dinner: 1230 }, eased: true, foodsFirst: 'outside' },
  ];
  await patchSettings({ places });
});

const at = (d: number, h: number, m: number) => new Date(2026, 9, d, h, m).getTime();
const base = { date: '2026-10-13', kind: 'food' as const, name: 'Poha', portion: '1 plate', kcal: 250, protein: 6 };

describe('eaten-at on save', () => {
  it('addEntry fills eatenAt from the day place when the caller does not', async () => {
    await db.days.put({ date: '2026-10-13', place: 'p-office' } as never);
    const e = await addEntry({ ...base, meal: 'breakfast', at: at(13, 23, 0) });
    expect(e.eatenAt).toBe(at(13, 8, 0));
  });

  it('a caller-given eatenAt is kept', async () => {
    const e = await addEntry({ ...base, meal: 'breakfast', at: at(13, 23, 0), eatenAt: 123 });
    expect(e.eatenAt).toBe(123);
  });

  it('changing the meal moves eatenAt to the new meal time', async () => {
    const e = await addEntry({ ...base, meal: 'breakfast', at: at(13, 23, 0) });
    await updateEntry(e.id, { meal: 'dinner' });
    expect((await db.entries.get(e.id))?.eatenAt).toBe(at(13, 21, 30));
  });
});

describe('checklist actions', () => {
  it('setMissed clears the tick and setTick clears missed', async () => {
    await setTick('2026-10-13', 'a:0', true, 777);
    expect((await db.days.get('2026-10-13'))?.ticks?.['a:0']).toBe(777);
    await setMissed('2026-10-13', 'a:0', true);
    let d = await db.days.get('2026-10-13');
    expect(d?.ticks?.['a:0']).toBeUndefined();
    expect(d?.missed?.['a:0']).toBe(true);
    await setTick('2026-10-13', 'a:0', true, 888);
    d = await db.days.get('2026-10-13');
    expect(d?.missed?.['a:0']).toBeUndefined();
    expect(d?.ticks?.['a:0']).toBe(888);
  });
});

describe('log any day', () => {
  it("logging chai for 3 days ago lands at that day's breakfast", async () => {
    await db.days.put({ date: '2026-10-10', place: 'p-office' } as never);
    const e = await addEntry({ date: '2026-10-10', meal: 'breakfast', at: at(13, 22, 15), kind: 'food', name: 'Chai', portion: '1 cup', kcal: 90, protein: 3 });
    expect(e.date).toBe('2026-10-10');
    expect(e.eatenAt).toBe(new Date(2026, 9, 10, 8, 0).getTime());
  });
});
