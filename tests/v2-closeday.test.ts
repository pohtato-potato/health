import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { addEntry, changePlace, closeDay, moveEntry, patchSettings, setStatusRange } from '../src/db/actions';
import { db, HealthDB, setDatabase } from '../src/db/db';
import { resolveForecasts, saveForecast } from '../src/db/forecasts';
import { dayNumber } from '../src/domain/forecastStore';

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

  it('just after midnight, before the 4 am rollover, a change is a late move, not a new start', async () => {
    await changePlace('2026-10-13', 'p-office', new Date(2026, 9, 13, 9, 0).getTime());
    const late = new Date(2026, 9, 14, 0, 30).getTime();
    await changePlace('2026-10-13', 'p-home', late);
    const d = await db.days.get('2026-10-13');
    expect(d?.place).toBe('p-office');
    expect(d?.placeChanges).toEqual([{ at: late, place: 'p-home' }]);
  });
});

describe('forecast store', () => {
  it('one forecast per kind per day, resolved later against what happened', async () => {
    await saveForecast({ kind: 'whtr', targetDate: '2026-11-10', low: 0.51, high: 0.52 }, '2026-10-13');
    await saveForecast({ kind: 'whtr', targetDate: '2026-11-10', low: 0.515, high: 0.525 }, '2026-10-13');
    expect(await db.forecasts.count()).toBe(1);
    await db.measurements.put({ id: 'm1', date: '2026-11-09', at: 1, waistStanding: 36.5 });
    await patchSettings({ heightCm: 178 });
    await resolveForecasts('2026-11-12');
    const r = (await db.forecasts.toArray())[0];
    expect(r.outcome).toBeCloseTo(0.5208, 3);
  });

  it('a walk forecast is a hit when the city is reached inside its range', async () => {
    await saveForecast({ kind: 'walk:Agra', targetDate: '2026-10-20', low: dayNumber('2026-10-10'), high: dayNumber('2026-10-20') }, '2026-10-01');
    for (let i = 1; i <= 14; i++) await db.days.put({ date: `2026-10-${String(i).padStart(2, '0')}`, steps: 25000 });
    await resolveForecasts('2026-10-21');
    const r = (await db.forecasts.toArray()).find((x) => x.kind === 'walk:Agra')!;
    expect(r.outcome).toBeGreaterThanOrEqual(r.low);
    expect(r.outcome).toBeLessThanOrEqual(r.high);
  });
});
