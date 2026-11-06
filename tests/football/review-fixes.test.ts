// Regression tests for the final-review findings.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import type { Day, Settings } from '../../src/domain/types';
import { NATIONS, worldCupGroups, worldCupRun } from '../../src/football/events';
import type { Offer } from '../../src/football/money';
import { rng } from '../../src/football/rng';
import { medsTaken, type Health } from '../../src/football/store/gather';
import { acceptOffer, foundClub, setCaptain } from '../../src/football/store/save';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-fixes-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub('2026-11-02', { shirt: 'H1', crest: 'a' });
});
const noon = (d: string) => new Date(`${d}T12:00:00`).getTime();

describe('final-review fixes', () => {
  it('days before the first logged day never count as missed medicine days', () => {
    const settings = { checklist: [{ id: 'm', name: 'Pill', slots: ['Morning'], active: true, med: {} }] } as unknown as Settings;
    const days = new Map<string, Day>([['2026-11-02', { date: '2026-11-02', ticks: { 'm:0': 1 } } as unknown as Day], ['2026-11-03', { date: '2026-11-03' } as Day]]);
    const h = { settings, days } as unknown as Health;
    expect(medsTaken(h, '2026-10-30')).toBe(true);
    expect(medsTaken(h, '2026-11-02')).toBe(true);
    expect(medsTaken(h, '2026-11-03')).toBe(false);
  });

  it('a sponsor signed between seasons starts with the coming season', async () => {
    const s = (await db.fbSave.get('save'))!;
    await db.fbSave.put({ ...s, phase: 'event', season: 1 });
    const o: Offer = { brand: 'Test Brand', what: 'test', risk: 'stable', slot: 'shirt', perSeason: 0.1, seasons: 1, line: 'test' };
    await acceptOffer(o);
    expect((await db.fbSave.get('save'))!.sponsors?.[0].since).toBe(2);
  });

  it('the armband counts weeks, not taps', async () => {
    await setCaptain('Pace', noon('2026-11-02'));
    await setCaptain('Power', noon('2026-11-03'));
    await setCaptain('Fuel', noon('2026-11-04'));
    await setCaptain('Fuel', noon('2026-11-05'));
    expect((await db.fbSave.get('save'))!.captains).toEqual(['Fuel']);
    await setCaptain('Rest', noon('2026-11-10'));
    expect((await db.fbSave.get('save'))!.captains).toEqual(['Fuel', 'Rest']);
  });

  it('the World Cup runs to a winner, and a nation that keeps winning goes all the way', () => {
    const own = NATIONS.find((x) => x.id === 'jpn')!.id;
    const plan = worldCupGroups(NATIONS, rng(7), own);
    const run = worldCupRun(plan, NATIONS, 'wc:4', 7, own, () => 'W');
    expect(run.tables).toHaveLength(16);
    expect(run.rounds.map((r) => r.ties.length)).toEqual([16, 8, 4, 2, 1]);
    expect(run.winner).toBe(own);
    expect(run.rounds.every((r) => r.ties.some((t) => t.includes(own)))).toBe(true);
    // Through day 4 only: the quarter-final ties come next.
    expect(worldCupRun(plan, NATIONS, 'wc:4', 4, own, () => 'W').next).toHaveLength(4);
    // Same seed, same tournament.
    expect(worldCupRun(plan, NATIONS, 'wc:4', 7).winner).toBe(worldCupRun(plan, NATIONS, 'wc:4', 7).winner);
  });
});
