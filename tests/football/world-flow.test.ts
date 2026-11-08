// Engine 2, layer 4 through the real day loop: the international break pauses the season, nations are given for good,
// call-ups are settled on the third day, and a loan opened from a pack arrives, plays on logged days and goes home.
import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { patchDay, setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { addDays } from '../../src/domain/dates';
import { LOANS } from '../../src/football/content/loans';
import { BREAK_DAYS } from '../../src/football/globe/duty';
import { LOAN_DAYS } from '../../src/football/globe/loans';
import { kickOff } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { emptyUser } from '../../src/football/tree/types';

const START = '2026-06-01';
const pace = LOANS.find((l) => l.unit === 'Pace' && l.tier === 'gold')!;

describe('the world, day by day', { timeout: 120_000 }, () => {
  beforeAll(async () => {
    setDatabase(new HealthDB('fb-world-flow'));
    await db.open();
    await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
    for (let i = -7; i < 24; i++) await patchDay(addDays(START, i), { steps: 9000 + i * 50, sleep: { asleep: 22 * 60 + 30, woke: 6 * 60 + 45 } });
    await foundClub(START, { shirt: 'H1', crest: 'a' });
    // A pack opened on day 3 held a Pace loan.
    const s = (await db.fbSave.get('save'))!;
    await db.fbSave.put({ ...s, treeUser: { ...emptyUser(), opened: [{ id: 'pk1', on: addDays(START, 2), items: [{ kind: 'loan', id: pace.id, rarity: 'gold' }] }] } });
    for (let i = 0; i < 20; i++) await kickOff(addDays(START, i));
  });

  it('a loan opened from a pack arrives that day, stays 7 days and plays on days its unit was logged', async () => {
    const g = (await db.fbSave.get('save'))!.globe!;
    const st = g.loans.find((x) => x.loan === pace.id)!;
    expect(st).toMatchObject({ from: addDays(START, 2), until: addDays(START, 2 + LOAN_DAYS - 1) });
    expect(g.met).toContain(pace.id);
    expect(st.apps.length).toBeGreaterThan(0);
    const ms = await db.fbMatches.where('date').between(st.from, st.until, true, true).toArray();
    expect(ms.some((m) => m.xi?.some((x) => x.player === `loan:${pace.id}`))).toBe(true);
    const news = await db.fbNews.toArray();
    expect(news.some((n) => n.text.includes(pace.name) && n.date === st.from)).toBe(true);
    expect(news.some((n) => n.date === addDays(st.until, 1) && n.text.includes(pace.name.split(' ').slice(-1)[0]))).toBe(true);
  });

  it('the first break pauses the season for 3 days before day 14: no matches on those days', async () => {
    const save = (await db.fbSave.get('save'))!;
    const b = save.globe!.breaks.find((x) => x.season === 1 && x.n === 1)!;
    expect(b.days).toHaveLength(BREAK_DAYS);
    expect(b.days[0]).toBe(addDays(START, 13));
    for (const d of b.days) expect(await db.fbMatches.where('date').equals(d).count()).toBe(0);
    // 20 real days played: 17 season days.
    expect(save.day).toBe(18);
  });

  it('every squad player has a nation, and the called-up came back settled', async () => {
    const save = (await db.fbSave.get('save'))!;
    const players = (await db.fbPlayers.toArray()).filter((p) => p.status === 'squad');
    for (const p of players) expect(save.globe!.nations[p.id]).toBeTruthy();
    const rows = save.globe!.duty.filter((d) => d.season === 1 && d.n === 1);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.settled)).toBe(true);
    const steps = rows.find((r) => r.days.length >= 2);
    if (steps) {
      const p = players.find((x) => x.id === steps.player)!;
      expect(p.duty?.length).toBeGreaterThan(0);
    }
  });
});
