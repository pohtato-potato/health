import { describe, expect, it } from 'vitest';
import card from './fixtures/postcard-v1.json';
import { buildPostcard, checkPostcard, daysToSend, SHELF_DB, SHELF_VERSION } from '../src/shelf/postcard';

const targets = [{ from: '2026-01-01', targets: { kcalMin: 1, kcalMax: 2, proteinG: 1, steps: 10000, waterMl: 1, sleepMin: 480, sessionsPerWeek: 3 } }];
describe('the postcard contract (v1), shared with Logbook', () => {
  it('the contract fixture passes the shared check', () => expect(checkPostcard(card)).toBe(true));
  it('the shelf is opened at the same version as Logbook', () => { expect(SHELF_DB).toBe('shelf'); expect(SHELF_VERSION).toBe(1); });
  it('a built postcard has exactly the contract’s shape', () => {
    const p = buildPostcard('2026-09-28', { date: '2026-09-28', steps: 7420, sleep: { asleep: 23 * 60 + 30, woke: 6 * 60 + 20 } },
      [{ id: 's', date: '2026-09-28', session: 'Upper body', planName: 'Home', startedAt: 0, endedAt: 38 * 60_000, status: 'done', short: false, exercises: [] }],
      [{ id: 'c', date: '2026-09-28', at: 123, photos: {} }], targets, 412.3, 1790670000000);
    expect(checkPostcard(p)).toBe(true); expect(Object.keys(p).sort()).toEqual(Object.keys(card).sort());
    expect(p).toMatchObject({ id: 'health:2026-09-28', steps: 7420, sleepMin: 410, workout: { name: 'Upper body', minutes: 38 }, checkin: { at: 123 }, rings: { workout: 1, steps: 0.742 } });
    expect(p.walk?.place).toBeTruthy(); expect(p.rings.sleep).toBeCloseTo(410 / 480);
  });
  it('a day with nothing logged gives nulls, never NaN', () => {
    const p = buildPostcard('2026-09-28', undefined, [], [], targets, 0, 1);
    expect(checkPostcard(p)).toBe(true); expect(p).toMatchObject({ steps: null, sleepMin: null, workout: null, checkin: null, rings: { workout: 0, sleep: 0, steps: 0 } });
  });
  it('postcards go out the afternoon after, for the last week of finished days', () => {
    expect(daysToSend(new Date('2026-09-29T09:00:00'))).toEqual(['2026-09-27', '2026-09-26', '2026-09-25', '2026-09-24', '2026-09-23', '2026-09-22']);
    expect(daysToSend(new Date('2026-09-29T13:00:00'))[0]).toBe('2026-09-28');
  });
});
