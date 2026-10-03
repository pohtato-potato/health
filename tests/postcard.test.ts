import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import card from './fixtures/shelf/health.day-v2.json';
import { buildDayCard, daysToSend } from '../src/shelf/postcard';
import { parseCard, SHELF_DB, SHELF_VERSION } from '../src/shelf/shelf';

const targets = [{ from: '2026-01-01', targets: { kcalMin: 1, kcalMax: 2, proteinG: 1, steps: 10000, waterMl: 1, sleepMin: 480, sessionsPerWeek: 3 } }];
describe('Health’s day on the shelf (health.day v2), pinned by the suite’s contract', () => {
  it('the contract fixture passes the shared check', () => expect(parseCard(card)).not.toBeNull());
  it('the shelf is opened at version 2', () => { expect(SHELF_DB).toBe('shelf'); expect(SHELF_VERSION).toBe(2); });
  it('a built day card has exactly the contract’s shape', () => {
    const c = buildDayCard('2026-09-28', { date: '2026-09-28', steps: 7420, sleep: { asleep: 23 * 60 + 30, woke: 6 * 60 + 20 } },
      [{ id: 's', date: '2026-09-28', session: 'Upper body', planName: 'Home', startedAt: 0, endedAt: 38 * 60_000, status: 'done', short: false, exercises: [] }],
      [{ id: 'c', date: '2026-09-28', at: 123, photos: {} }], targets, 412.3, 1790670000000);
    expect(parseCard(c)).not.toBeNull();
    expect(Object.keys(c).sort()).toEqual(Object.keys(card).sort()); expect(Object.keys(c.data).sort()).toEqual(Object.keys(card.data).sort());
    expect(c).toMatchObject({ id: 'health.day:2026-09-28', format: 'health.day', version: 2, from: 'health', to: 'logbook', about: { day: '2026-09-28' } });
    expect(c.data).toMatchObject({ steps: 7420, sleepMin: 410, workout: { name: 'Upper body', minutes: 38 }, checkin: { at: 123 }, rings: { workout: 1, steps: 0.742 } });
    expect(c.data.walk?.place).toBeTruthy(); expect(c.data.rings.sleep).toBeCloseTo(410 / 480);
  });
  it('a day with nothing logged gives nulls, never NaN', () => {
    const c = buildDayCard('2026-09-28', undefined, [], [], targets, 0, 1);
    expect(parseCard(c)).not.toBeNull(); expect(c.data).toMatchObject({ steps: null, sleepMin: null, workout: null, checkin: null, rings: { workout: 0, sleep: 0, steps: 0 } });
  });
  it('day cards go out the afternoon after, for the last week of finished days', () => {
    expect(daysToSend(new Date('2026-09-29T09:00:00'))).toEqual(['2026-09-27', '2026-09-26', '2026-09-25', '2026-09-24', '2026-09-23', '2026-09-22']);
    expect(daysToSend(new Date('2026-09-29T13:00:00'))[0]).toBe('2026-09-28');
  });
  it.skipIf(!existsSync('../Suite/shelf'))('Health’s copies of the contract and its fixture are byte-identical to the suite’s', () => {
    expect(readFileSync('src/shelf/shelf.ts', 'utf8')).toBe(readFileSync('../Suite/shelf/shelf.ts', 'utf8'));
    expect(readFileSync('tests/fixtures/shelf/health.day-v2.json', 'utf8')).toBe(readFileSync('../Suite/shelf/fixtures/health.day-v2.json', 'utf8'));
  });
});
