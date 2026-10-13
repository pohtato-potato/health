import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { carryStatus, ensurePlace, endStatus, patchSettings, startStatus } from '../src/db/actions';
import { db, HealthDB, setDatabase } from '../src/db/db';
import { placeOptions } from '../src/domain/places';
import { DEFAULT_MEAL_TIMES, type Place } from '../src/domain/types';

const home = (id: string, name: string): Place => ({ id, name, kind: 'home', meals: { ...DEFAULT_MEAL_TIMES.home }, eased: false, foodsFirst: 'home' });

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`v2x-${++n}`));
  await db.open();
});

describe('home and office are always offered', () => {
  it('offers an office even when only homes are set up', () => {
    const o = placeOptions({ places: [home('flat', 'Home flat'), home('family', 'Family home')] });
    expect(o.home.id).toBe('flat');
    expect(o.office.kind).toBe('office');
    expect(o.office.virtual).toBe(true);
    expect(o.rest.map((p) => p.id)).toEqual(['family']);
  });

  it('uses the real office place when there is one', () => {
    const office: Place = { id: 'city', name: 'City office', kind: 'office', meals: { ...DEFAULT_MEAL_TIMES.office }, eased: true, foodsFirst: 'outside' };
    const o = placeOptions({ places: [home('flat', 'Flat'), office] });
    expect(o.office.id).toBe('city');
    expect(o.office.virtual).toBeFalsy();
  });

  it('picking the offered office creates it once', async () => {
    await patchSettings({ places: [home('flat', 'Home flat')] });
    const id = await ensurePlace('office');
    const again = await ensurePlace('office');
    const s = await db.settings.get('app');
    expect(id).toBe(again);
    expect(s!.places!.filter((p) => p.kind === 'office')).toHaveLength(1);
    expect(s!.places!.find((p) => p.id === id)).toMatchObject({ name: 'Office', eased: true });
  });
});

describe('status in one tap', () => {
  it('starts today, carries on day to day, and ends cleanly', async () => {
    await startStatus('2026-10-14', 'sick');
    expect((await db.days.get('2026-10-14'))?.status).toBe('sick');
    await carryStatus('2026-10-16');
    expect((await db.days.get('2026-10-15'))?.status).toBe('sick');
    expect((await db.days.get('2026-10-16'))?.status).toBe('sick');
    await endStatus('2026-10-16');
    expect((await db.days.get('2026-10-16'))?.status).toBeUndefined();
    expect((await db.days.get('2026-10-15'))?.status).toBe('sick');
    await carryStatus('2026-10-18');
    expect((await db.days.get('2026-10-17'))?.status).toBeUndefined();
    expect((await db.settings.get('app'))?.activeStatus).toBeUndefined();
  });
});

describe('place marks (round 5)', () => {
  it('tells a second home from the first, and keeps each kind its colour', async () => {
    const { markFor, PLACE_INKS } = await import('../src/ui/PlaceIcon');
    expect(markFor({ id: 'flat', kind: 'home' }, 'flat')).toBe('home');
    expect(markFor({ id: 'family', kind: 'home' }, 'flat')).toBe('home2');
    expect(markFor({ id: 'city', kind: 'office' }, 'flat')).toBe('office');
    expect(PLACE_INKS.home2).toBe('var(--lavender)');
    expect(PLACE_INKS.friends).toBe('var(--rose)');
    expect(PLACE_INKS.trip).toBe('var(--blue)');
  });
});
