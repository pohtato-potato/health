import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { HealthDB, setDatabase, db } from '../src/db/db';
import { setSteps, setTargets } from '../src/db/actions';
import { sendPostcards } from '../src/shelf/send';
import { cardsFor, parseCard, type Card, type HealthDay } from '../src/shelf/shelf';

let n = 0;
beforeEach(async () => { setDatabase(new HealthDB(`pc-${++n}`)); await db.open(); });
const all = async () => (await cardsFor('logbook', 'health.day')) as Card<'health.day', HealthDay>[];
describe('sending day cards', () => {
  it('sends finished days that have something, never empty ones, and each passes the contract', async () => {
    await setTargets({ kcalMin: 1, kcalMax: 2, proteinG: 1, steps: 10000, waterMl: 1, sleepMin: 480, sessionsPerWeek: 3 }, '2026-01-01');
    await setSteps('2026-09-27', 5000); await setSteps('2026-09-28', 7420);
    const sent = await sendPostcards(new Date('2026-09-29T13:00:00'));
    expect(sent).toEqual(['2026-09-28', '2026-09-27']);
    const cards = await all();
    expect(cards.filter(c => c.id === 'health.day:2026-09-28' || c.id === 'health.day:2026-09-27').length).toBe(2);
    expect(cards.every(c => parseCard(c) !== null)).toBe(true);
    expect(cards.find(c => c.id === 'health.day:2026-09-28')!.data.walk!.km).toBeCloseTo((12420 * 0.74) / 1000, 1);
  });
});
