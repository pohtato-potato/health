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

describe('day edits can be undone', () => {
  it('records a steps change in the edit history and puts it back on undo', async () => {
    const { setSteps } = await import('../src/db/actions');
    const { undoEdit } = await import('../src/db/edits');
    await setSteps('2026-10-14', 9000);
    await setSteps('2026-10-14', 11920);
    const last = (await db.edits.toArray()).filter((e) => e.table === 'days').pop()!;
    expect((last.after as { steps: number }).steps).toBe(11920);
    await undoEdit(last.id!);
    expect((await db.days.get('2026-10-14'))?.steps).toBe(9000);
  });
});

describe('lift status lines (s25)', () => {
  it('says past range when the top is hit with nowhere heavier to go', async () => {
    const { liftLine } = await import('../src/domain/trackStats');
    expect(liftLine({ advice: { kind: 'maxed' } }, { done: 15, of: 15 })).toBe('past range · try a challenge');
    expect(liftLine({ advice: { kind: 'needs-plates' } }, { done: 15, of: 15 })).toBe('past range · try a challenge');
    expect(liftLine({ advice: { kind: 'heavier' } }, { done: 15, of: 15 })).toBe('ready to go heavier');
    expect(liftLine({}, { done: 12, of: 15 })).toBe('ladder 12 / 15');
    expect(liftLine({}, { done: 0, of: 0 })).toBe('building');
  });
});

describe('t-shirt test against last month (s22)', () => {
  it('compares the latest rated check-in with the one before', async () => {
    const { tshirtVsLast } = await import('../src/domain/insights');
    const c = (date: string, shoulders: number, arms: number, stomach: number) => ({ id: date, date, photos: {}, tshirt: { shoulders, arms, stomach } });
    const r = tshirtVsLast([c('2026-08-01', 2, 3, 1), c('2026-09-01', 2, 3, 2), c('2026-10-01', 3, 3, 2)] as never);
    expect(r).toEqual({ latest: { shoulders: 3, arms: 3, stomach: 2 }, change: { shoulders: 1, arms: 0, stomach: 0 }, since: '2026-09-01' });
    expect(tshirtVsLast([c('2026-10-01', 3, 3, 2)] as never)?.change).toBeUndefined();
  });
});
