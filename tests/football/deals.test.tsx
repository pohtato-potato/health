import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { contractDay, intake, keptOn, newContract } from '../../src/football/contracts';
import { YOUTH_POOL, type YouthDef } from '../../src/football/data/load';
import { offers, type Offer } from '../../src/football/money';
import { rng } from '../../src/football/rng';
import { loadClub } from '../../src/football/store/club';
import { kickOffDone as kickOff } from './helpers/matchday';
import { foundClub, sellHabit, setOwnSponsor } from '../../src/football/store/save';
import { TIERS } from '../../src/football/types';
import { MoneyView } from '../../src/screens/football/club/Money';
import { DealsView } from '../../src/screens/football/club/Deals';

let n = 0;
const noon = (d: string) => new Date(`${d}T12:00:00`).getTime();
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-deals-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub('2026-11-01', { shirt: 'H1', crest: 'a' });
});

describe('Youth intake', () => {
  it('brings three youngsters with at most one exercise', async () => {
    const ex = (i: number): YouthDef => ({ name: `Ex ${i}`, age: 17, axis: 'Power', potential: 3, what: 'x', kind: 'exercise' });
    const pool = [...Array.from({ length: 8 }, (_, i) => ex(i)), ...YOUTH_POOL.filter((y) => y.kind === 'habit')];
    for (let s = 1; s < 30; s++) {
      const got = intake(pool, rng(s), true);
      expect(got).toHaveLength(3);
      expect(got.filter((y) => y.kind === 'exercise').length).toBeLessThanOrEqual(1);
    }
    const stored = await db.fbSquad.toArray();
    expect(stored).toHaveLength(3);
    expect(stored.filter((y) => y.exercise).length).toBeLessThanOrEqual(1);
  });
});

describe('Contracts', () => {
  it('a month at 5 days in 7 earns a renewal; less is listed', () => {
    let c = newContract('steps', '2026-11-01');
    for (let i = 0; i < 28; i++) c = contractDay(c, `2026-11-${String(i + 1).padStart(2, '0')}`, i % 7 < 5);
    expect(c.state).toBe('due');
    let d = newContract('sleep', '2026-11-01');
    for (let i = 0; i < 28; i++) d = contractDay(d, `2026-11-${String(i + 1).padStart(2, '0')}`, i % 7 < 3);
    expect(d.state).toBe('listed');
  });
  it('food never counts as kept under the range', () => {
    const t = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 };
    const base = { kcal: 1500, protein: 160, foodLogged: true, sessionsToday: [], weekDoneBefore: 0, weekdayMon1: 1, targets: t, checklist: [], weighIns7: 0, waist7: false, history: {} as never };
    expect(keptOn('food', base)).toBe(false);
    expect(keptOn('food', { ...base, kcal: 2100 })).toBe(true);
  });
});

describe('Trading a habit', () => {
  it('removes it from the squad, keeps its history, and leaves Health untouched', async () => {
    await kickOff('2026-11-02');
    const before = await db.fbMatches.count();
    const settings = JSON.stringify(await db.settings.get('app'));
    const s = (await db.fbSave.get('save'))!;
    await db.fbSave.put({ ...s, contracts: s.contracts!.map((c) => (c.habit === 'sleep' ? { ...c, state: 'listed' } : c)) });
    const listed = html(<DealsView c={(await loadClub(noon('2026-11-03')))!} />);
    expect(listed).toContain('Transfer window');
    expect(listed).toContain('Their bid');
    await sellHabit('sleep');
    const c = (await loadClub(noon('2026-11-03')))!;
    expect(c.members.map((m) => m.habit)).not.toContain('sleep');
    expect(c.members).toHaveLength(5);
    expect(c.save.sold).toEqual(['sleep']);
    expect(await db.fbMatches.count()).toBe(before);
    expect(JSON.stringify(await db.settings.get('app'))).toBe(settings);
    await kickOff('2026-11-03');
    const m = (await db.fbMatches.where('date').equals('2026-11-03').first())!;
    expect(m.flags.Rest).toBe('no-data');
  });
});

describe('Money', () => {
  it('each offer shows its risk in words', async () => {
    const c = (await loadClub(noon('2026-11-02')))!;
    const o: Offer[] = [
      { brand: 'Frituur De Kaai', what: 'chip shop', risk: 'stable', slot: 'shirt', perSeason: 0.04, seasons: 3, line: 'Fries by the river.' },
      { brand: 'Fietskoerier Stad', what: 'couriers', risk: 'dodgy', slot: 'shirt', perSeason: 0.07, seasons: 1, line: 'Fast bikes.' },
    ];
    const out = html(<MoneyView c={{ ...c, save: { ...c.save, offers: o } }} />);
    expect(out).toContain('Stable');
    expect(out).toContain('Dodgy');
    expect(out).toContain('1 in 4 a season it folds');
  });
  it('"Add your own sponsor" saves a typed name to the chosen slot', async () => {
    await setOwnSponsor('  Corner Bakery  ', 'sleeve');
    expect((await db.fbSave.get('save'))!.ownSponsor).toEqual({ name: 'Corner Bakery', slot: 'sleeve' });
  });
  it('real brands are offered only from Division Three up', () => {
    const real = (t: number) => Array.from({ length: 60 }, (_, s) => offers('shirt', t as 1, rng(s + 1))).flat().some((o) => o.real);
    for (const t of TIERS) expect(real(t)).toBe(t <= 3);
  });
});
