import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { HealthDB, setDatabase, db } from '../src/db/db';
import { setSteps, setTargets } from '../src/db/actions';
import { sendPostcards } from '../src/shelf/send';
import { checkPostcard, openShelf, SHELF_STORE } from '../src/shelf/postcard';

let n = 0;
beforeEach(async () => { setDatabase(new HealthDB(`pc-${++n}`)); await db.open(); });
const all = async () => { const s = await openShelf(); const r = await new Promise<unknown[]>(ok => { const q = s.transaction(SHELF_STORE).objectStore(SHELF_STORE).getAll(); q.onsuccess = () => ok(q.result); }); s.close(); return r; };
describe('sending postcards', () => {
  it('sends finished days that have something, never empty ones, and each passes the contract', async () => {
    await setTargets({ kcalMin: 1, kcalMax: 2, proteinG: 1, steps: 10000, waterMl: 1, sleepMin: 480, sessionsPerWeek: 3 }, '2026-01-01');
    await setSteps('2026-09-27', 5000); await setSteps('2026-09-28', 7420);
    const sent = await sendPostcards(new Date('2026-09-29T13:00:00'));
    expect(sent).toEqual(['2026-09-28', '2026-09-27']);
    const cards = (await all()) as { id: string; walk: { km: number } | null }[];
    expect(cards.filter(c => c.id === 'health:2026-09-28' || c.id === 'health:2026-09-27').length).toBe(2);
    expect(cards.every(checkPostcard)).toBe(true);
    expect(cards.find(c => c.id === 'health:2026-09-28')!.walk!.km).toBeCloseTo((12420 * 0.74) / 1000, 1);
  });
});
