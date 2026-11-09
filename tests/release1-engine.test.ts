import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDay, keptSteps, patchDay, setSteps, setTargets } from '../src/db/actions';
import { HealthDB, db, setDatabase } from '../src/db/db';
import { addDays } from '../src/domain/dates';
import { chipFor, rangeWords, statusWindows } from '../src/domain/statusChip';
import type { Day } from '../src/domain/types';
import { comebackDue, comebackLift, isFullyLogged, isGap } from '../src/football/comeback';
import { levelForRating, matchupShare, movedAxes, oppShape, threatLine, wentAhead } from '../src/football/matchup';
import { sealedNight } from '../src/football/seal';
import { liveNightFor, loadHealth, nightFor } from '../src/football/store/gather';
import { allAxes, type AxisValues } from '../src/football/types';

const full = (date: string): Day => ({ date, steps: 9000, sleep: { asleep: 1380, woke: 420 }, foodDone: true, ticks: { 'a:0': 1 } });

describe('comeback lift', () => {
  const logs = (map: Record<string, Day | undefined>) => (d: string) => ({ day: map[d], foodEntries: map[d]?.foodDone ? 3 : 0 });
  it('a day with nothing in it is a gap; sick days are not', () => {
    expect(isGap({ day: undefined, foodEntries: 0 })).toBe(true);
    expect(isGap({ day: { date: 'x', status: 'sick' }, foodEntries: 0 })).toBe(false);
    expect(isGap({ day: { date: 'x', steps: 10 }, foodEntries: 0 })).toBe(false);
    expect(isFullyLogged({ day: full('x'), foodEntries: 3 })).toBe(true);
  });
  it('lifts the first fully logged day after a gap, once', () => {
    const map: Record<string, Day | undefined> = { '2026-11-01': full('2026-11-01'), '2026-11-02': undefined, '2026-11-03': full('2026-11-03'), '2026-11-04': full('2026-11-04') };
    expect(comebackDue('2026-11-03', logs(map), '2026-11-01')).toBe(true);
    expect(comebackDue('2026-11-04', logs(map), '2026-11-01')).toBe(false);
    expect(comebackDue('2026-11-01', logs(map), '2026-11-01')).toBe(false);
  });
  it('a half-logged day between the gap and today still counts as coming back', () => {
    const map: Record<string, Day | undefined> = { '2026-11-02': undefined, '2026-11-03': { date: '2026-11-03', steps: 4000 }, '2026-11-04': full('2026-11-04') };
    expect(comebackDue('2026-11-04', logs(map))).toBe(true);
  });
  it('sick days are skipped over, never the gap', () => {
    const map: Record<string, Day | undefined> = { '2026-11-01': full('2026-11-01'), '2026-11-02': { date: '2026-11-02', status: 'sick' }, '2026-11-03': full('2026-11-03') };
    expect(comebackDue('2026-11-03', logs(map))).toBe(false);
  });
  it('is +1 on the lowest logged axis, never more', () => {
    const v: AxisValues = { Pace: 14, Power: 16, Fuel: 9, Rest: 12, Routine: 3, Shape: 10 };
    const lift = comebackLift(v, { Routine: 'not-logged' });
    expect(lift).toEqual({ axis: 'Fuel', d: 1, why: 'Comeback lift', kind: 'ability' });
  });
});

describe('matchup on Today', () => {
  const opp = { rating: 56, shrinks: { Pace: -3, Power: -1, Fuel: -1 }, presses: { Rest: -1, Routine: -1, Shape: -1 } };
  it('reads the parity table backwards', () => {
    expect(Math.round(levelForRating(56))).toBe(12);
  });
  it('their shape is strongest where they bite hardest', () => {
    const s = oppShape(opp);
    expect(s.Pace).toBeGreaterThan(s.Power);
    expect(threatLine('FC Kermis', s)?.text).toBe('FC Kermis are strong on Pace. A big walking day matters most tonight.');
  });
  it('once logging, the threat is where they lead you most', () => {
    const s = oppShape(opp);
    const mine = { ...allAxes(18), Rest: 5 };
    expect(threatLine('FC Kermis', s, mine, { Rest: true })?.axis).toBe('Rest');
    expect(threatLine('FC Kermis', s, allAxes(20), { Rest: true })).toBeUndefined();
  });
  it('the bar is 50 at an even match and moves with the shape', () => {
    const even = allAxes(Math.round(levelForRating(56)));
    expect(Math.abs(matchupShare(even, opp) - 50)).toBeLessThan(8);
    expect(matchupShare(allAxes(18), opp)).toBeGreaterThan(matchupShare(allAxes(8), opp));
  });
  it('moment C fires only when a log takes an axis ahead, not level, not a band', () => {
    const o = allAxes(12);
    expect(wentAhead({ ...allAxes(10), Pace: 12 }, { ...allAxes(10), Pace: 13 }, o)).toEqual(['Pace']);
    expect(wentAhead({ ...allAxes(10), Pace: 10 }, { ...allAxes(10), Pace: 12 }, o)).toEqual([]);
    expect(wentAhead({ ...allAxes(10), Pace: 13 }, { ...allAxes(10), Pace: 16 }, o)).toEqual([]);
    expect(movedAxes(allAxes(10), { ...allAxes(10), Fuel: 11, Rest: 9 })).toEqual(['Fuel', 'Rest']);
  });
});

describe('the seal', () => {
  it('plays the sealed shape; only a higher Pace gets through', () => {
    const live = { values: { ...allAxes(10), Pace: 16, Fuel: 18 }, flags: {} };
    const seal = { at: 1, values: { ...allAxes(10), Pace: 12, Fuel: 9 }, flags: {} };
    expect(sealedNight(live, seal).values).toMatchObject({ Pace: 16, Fuel: 9 });
    expect(sealedNight({ ...live, values: { ...live.values, Pace: 8 } }, seal).values.Pace).toBe(12);
  });
});

describe('status chip', () => {
  const days = [{ date: '2026-11-12', status: 'travelling' as const }, { date: '2026-11-13', status: 'travelling' as const }, { date: '2026-11-14', status: 'travelling' as const }];
  it('groups runs and words the dates', () => {
    expect(statusWindows(days, '2026-11-09')).toEqual([{ status: 'travelling', from: '2026-11-12', to: '2026-11-14' }]);
    expect(rangeWords('2026-11-30', '2026-12-02')).toBe('30 Nov – 2 Dec');
    expect(chipFor(days, '2026-11-09').text).toBe('Travelling 12–14 Nov');
    expect(chipFor(days, '2026-11-13').text).toBe('Travelling until 14 Nov');
    expect(chipFor([], '2026-11-09').now).toBe(false);
  });
});

let n = 0;
describe('steps and sealing in the database', () => {
  beforeEach(async () => {
    setDatabase(new HealthDB(`r1-${++n}`));
    await db.open();
    await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  });
  it('keeps the highest step count unless correcting', async () => {
    expect(keptSteps(9000, 8000)).toBe(9000);
    expect(keptSteps(9000, 8000, true)).toBe(8000);
    await setSteps('2026-11-09', 9000);
    await setSteps('2026-11-09', 4000);
    expect((await db.days.get('2026-11-09'))?.steps).toBe(9000);
    await setSteps('2026-11-09', 4000, false, false, true);
    expect((await db.days.get('2026-11-09'))?.steps).toBe(4000);
  });
  it('closing seals tonight’s shape; food not done marks the day partial; opening lifts the seal', async () => {
    for (let i = 0; i < 10; i++) await patchDay(addDays('2026-11-01', i), { steps: 9000, sleep: { asleep: 1380, woke: 420 } });
    await closeDay('2026-11-10', false, Date.now(), true);
    let d = await db.days.get('2026-11-10');
    expect(d?.partial).toBe(true);
    expect(d?.seal?.values.Pace).toBeGreaterThan(0);
    await patchDay('2026-11-10', { steps: 2000 });
    const h = await loadHealth();
    expect(nightFor(h, '2026-11-10').values.Pace).toBe(d!.seal!.values.Pace);
    expect(liveNightFor(h, '2026-11-10').values.Pace).toBeLessThan(d!.seal!.values.Pace!);
    await closeDay('2026-11-10', false);
    d = await db.days.get('2026-11-10');
    expect(d?.seal).toBeUndefined();
    expect(d?.partial).toBeUndefined();
  });
});
