// Ledger O40, finding B and G: a club placed in world 2 arrives with money for its division, sponsors to sign and the
// move day's trials; its first season's money loop never sticks; and a save placed before this fix (€0, no trials) is
// repaired once, and only once. Invented logs only.
import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { patchDay, setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { BREAK_DAYS } from '../../src/football/globe/duty';
import { engineOf } from '../../src/football/store/tree';
import { startingBudget } from '../../src/football/pyramid/redraw';
import { playDue, repairPlaced } from '../../src/football/store/play';
import { redrawWorld } from '../../src/football/store/redraw';
import { foundClub } from '../../src/football/store/save';
import type { FbSave } from '../../src/football/store/tables';

const noon = (d: string) => new Date(`${d}T12:00:00`).getTime();
const FOUNDED = '2026-11-02';
const MOVE = '2026-11-15'; // a Sunday: trials day
const SEASON_REAL = 28 + 2 * BREAK_DAYS;

async function logDays(from: number, to: number) {
  for (let i = from; i < to; i++) {
    const d = addDays(FOUNDED, i);
    await patchDay(d, { steps: 7000 + ((i * 1370) % 5000), sleep: { asleep: 1380 + ((i * 17) % 50), woke: 410 + ((i * 23) % 40) }, foodDone: true });
    await db.entries.put({ id: `e${i}`, date: d, meal: 'lunch', at: noon(d), kind: 'quick', name: 'Meal', portion: '1', kcal: 2100 + ((i * 53) % 200), protein: 120 + ((i * 7) % 30) });
    if (i % 2 === 0) await db.sessions.put({ id: `s${i}`, date: d, session: 'A', planName: 'Plan', startedAt: noon(d), endedAt: noon(d) + 3_600_000, status: 'done', short: false, exercises: [] });
  }
}
async function moved(name: string) {
  setDatabase(new HealthDB(name));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await logDays(-40, 13 + SEASON_REAL + 10);
  await foundClub(FOUNDED, { shirt: 'A1', crest: 'a', captain: 'Pace' });
  await playDue(noon(addDays(MOVE, -1)));
  await redrawWorld(noon(MOVE));
}

describe('money and trials on arrival in world 2', { timeout: 600_000 }, () => {
  let arrived: FbSave;
  beforeAll(async () => {
    await moved('fb-w2-money');
    arrived = (await db.fbSave.get('save'))!;
  });

  it('arrives with one careful season’s income for its division, offers to sign and the news of it', async () => {
    const r = arrived.redrawn!;
    expect(r.budget).toBe(startingBudget(r.division));
    expect(arrived.budget).toBeGreaterThanOrEqual(r.budget!);
    expect((arrived.offers ?? []).length).toBeGreaterThan(0);
    expect((await db.fbNews.get(`${MOVE}:arrival-money`))?.text).toMatch(/^Money on arrival/);
  });

  it('runs the move day’s trials, once', async () => {
    expect(arrived.redrawn!.trials).toBe(true);
    expect(arrived.globe?.trials?.some((t) => t.on === MOVE)).toBe(true);
    expect(await repairPlaced()).toBe(false);
  });

  it('plays a whole first season: income lands, wages are paid, the bank never goes below nothing', async () => {
    for (let i = 1; i <= SEASON_REAL + 6; i++) await playDue(noon(addDays(MOVE, i)));
    const s = (await db.fbSave.get('save'))!;
    expect(s.season).toBeGreaterThan(arrived.season);
    expect(s.budget).toBeGreaterThanOrEqual(0);
    expect(s.income?.season).toBe(arrived.season);
    expect(s.income!.lines.some((l) => l.amount > 0)).toBe(true);
    const wages = engineOf(s).wages;
    expect(wages?.season).toBe(arrived.season);
    // The arrival money covers the first season's wages: nobody goes on leave in season one.
    expect(engineOf(s).leave).toEqual([]);
  });
});

describe('a save placed before the fix is repaired once', { timeout: 600_000 }, () => {
  it('adds the starting budget and offers, runs the missed trials, and never twice', async () => {
    await moved('fb-w2-repair');
    const s = (await db.fbSave.get('save'))!;
    // As the owner's save was: €0 in the bank, no offers, no trials on the move day.
    const placed: FbSave = { ...s, budget: 0, offers: [], globe: { ...s.globe!, trials: (s.globe?.trials ?? []).filter((t) => t.on !== MOVE) }, redrawn: { ...s.redrawn!, budget: undefined, trials: undefined } };
    await db.fbSave.put(placed);
    await db.fbSquad.filter((y) => y.status === 'trial').delete();
    await db.fbNews.delete(`${MOVE}:arrival-money`);

    expect(await repairPlaced()).toBe(true);
    const once = (await db.fbSave.get('save'))!;
    expect(once.budget).toBe(startingBudget(s.redrawn!.division));
    expect((once.offers ?? []).length).toBeGreaterThan(0);
    expect(once.globe?.trials?.some((t) => t.on === MOVE)).toBe(true);
    const trialists = await db.fbSquad.filter((y) => y.status === 'trial').count();
    expect(trialists).toBeGreaterThan(0);

    expect(await repairPlaced()).toBe(false);
    await playDue(noon(addDays(MOVE, 1)));
    const twice = (await db.fbSave.get('save'))!;
    expect(twice.redrawn).toEqual(once.redrawn);
    expect(await db.fbNews.where('id').startsWith(`${MOVE}:arrival-money`).count()).toBe(1);
  });
});
