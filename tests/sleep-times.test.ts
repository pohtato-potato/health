// Sleep and wake times on a 24-hour clock (owner's bug, 9 Nov): after a sleepless night the morning log only offered a
// wake time between 5 am and 1 pm. Both ends now take any time of day; everything that reads them must still add up.
import { describe, expect, it } from 'vitest';
import { addDays, type DayKey } from '../src/domain/dates';
import { sleepChartSpan, sleepTick, sleepWindows } from '../src/domain/insights';
import { bedOrder, fromBedOrder, sleepMinutes, sleepWheelItems } from '../src/domain/rings';
import { socialJetLag } from '../src/domain/trackRules';
import type { Day, Settings } from '../src/domain/types';
import { restFromSleep, sleepHours } from '../src/football/axes';
import { sleepWeek } from '../src/football/globe/trials';
import { bedtimeKept, usualBedtime } from '../src/football/players/attributes';
import { youthDay } from '../src/football/players/youth';
import { axisInputFor, conditions, type Health } from '../src/football/store/gather';
import type { FbSquadRow } from '../src/football/store/tables';

const t = (h: number, m = 0) => h * 60 + m;
const D0: DayKey = '2026-11-09';
const settings = { targets: [], checklist: [{ id: 'brush', name: 'Brush', slots: ['am'], active: true }] } as unknown as Settings;
const health = (p: Partial<Health> = {}): Health => ({ settings, days: new Map(), sessions: [], kcal: new Map(), measures: [], sets: [], meals: new Map(), walks: [], routes: [], ...p });
const days = (xs: Partial<Day>[]) => new Map(xs.map((d) => [d.date!, d as Day]));

describe('the morning log wheels', () => {
  it('both wheels offer every 5-minute time of the day, once each', () => {
    for (const from of [t(18), 0]) {
      const clock = sleepWheelItems(from).map((m) => m % 1440);
      expect(clock).toHaveLength(288);
      expect(new Set(clock).size).toBe(288);
      expect(clock).toContain(t(14)); // a 2 pm wake after a sleepless night
      expect(clock).toContain(t(7)); // and a 7 am bedtime
      expect(clock).toContain(t(23, 55));
    }
  });
  it('the Asleep wheel runs evening first, past midnight, into the next afternoon', () => {
    const items = sleepWheelItems(t(18));
    expect(items[0]).toBe(t(18));
    expect(items.at(-1)! % 1440).toBe(t(17, 55));
    expect(items.indexOf(t(23))).toBeLessThan(items.indexOf(t(24 + 1)));
  });
});

describe('sleep length across midnight', () => {
  it.each([
    ['ordinary night', t(23), t(7), 480],
    ['bedtime after midnight', t(1, 30), t(9), 450],
    ['sleepless night: asleep at 7 am, awake at 2 pm', t(7), t(14), 420],
    ['late wake in the afternoon', t(0, 30), t(15, 30), 900],
    ['afternoon to evening', t(14), t(22), 480],
    ['evening to just before midnight', t(18), t(23, 55), 355],
  ])('%s', (_name, asleep, woke, minutes) => {
    expect(sleepMinutes(asleep, woke)).toBe(minutes);
    expect(sleepHours({ asleep, woke })).toBeCloseTo(minutes / 60);
  });
  it('the Rest axis scores a 7-hour day sleep the same as a 7-hour night', () => {
    expect(restFromSleep(sleepHours({ asleep: t(7), woke: t(14) }))).toBe(restFromSleep(sleepHours({ asleep: t(23), woke: t(6) })));
  });
});

describe('bedtimes after midnight and in the afternoon', () => {
  it('sorts evening, then after midnight, then afternoon', () => {
    const order = [t(20), t(23, 30), t(1), t(7), t(15)].map(bedOrder);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    for (const m of [0, t(1), t(7), t(15), t(18), t(23, 55)]) expect(fromBedOrder(bedOrder(m))).toBe(m);
  });
  it('a bedtime is kept by the target plus 45 minutes; a 7 am or 3 pm bedtime is not', () => {
    const target = t(1);
    expect(bedtimeKept(t(0, 30), target)).toBe(true);
    expect(bedtimeKept(t(1, 45), target)).toBe(true);
    expect(bedtimeKept(t(22), target)).toBe(true); // earlier that evening also counts
    expect(bedtimeKept(t(1, 50), target)).toBe(false);
    expect(bedtimeKept(t(7), target)).toBe(false);
    expect(bedtimeKept(t(15), target)).toBe(false); // never passes for an early night
  });
  it('the usual bedtime is the median, with an afternoon bedtime counted as latest', () => {
    const nights = [t(0, 30), t(1), t(1), t(1, 15), t(15)].map((asleep, i) => ({ date: addDays(D0, -i), sleep: { asleep, woke: (asleep + t(8)) % 1440 } }));
    expect(usualBedtime(health({ days: days(nights) }), D0)).toBe(t(1));
  });
  it('a 7 am bedtime reads as after midnight for the match conditions', () => {
    const h = health({ days: days([{ date: D0, sleep: { asleep: t(7), woke: t(14) } }]) });
    const c = conditions(h, D0, axisInputFor(h, D0), false);
    expect(c).toContain('bed-after-0');
    expect(c).not.toContain('bed-before-23');
  });
});

describe('youngsters grow on kept bedtimes', () => {
  const y = (): FbSquadRow => ({ id: 'y', kind: 'youth', name: 'Plank', axis: 'Pace', potential: 4, what: 'x', exercise: false, season: 1, logged: [], status: 'growing', link: { kind: 'habit', id: 'brush' }, sessions: [], growth: 0, grown: [] });
  it('grows after a 12:50 am bedtime with a 1:00 target', () => {
    const h = health({ days: days([{ date: D0, sleep: { asleep: t(0, 50), woke: t(9) } }]) });
    expect(youthDay(h, y(), D0, t(1)).growth).toBeGreaterThan(0);
  });
  it('does not grow after a sleepless night (asleep at 7 am, awake at 2 pm)', () => {
    const h = health({ days: days([{ date: D0, sleep: { asleep: t(7), woke: t(14) } }]) });
    expect(youthDay(h, y(), D0, t(1)).growth).toBe(0);
  });
});

describe('sleep-style trials', () => {
  it('one sleepless night breaks an otherwise early, regular week', () => {
    const steady = Array.from({ length: 7 }, (_, i) => ({ date: addDays(D0, -i), sleep: { asleep: t(0, 30), woke: t(8) } }));
    expect(sleepWeek(health({ days: days(steady) }), D0, t(1)).style).toBe('early');
    const broken = steady.map((d, i) => (i === 0 ? { ...d, sleep: { asleep: t(7), woke: t(14) } } : d));
    const w = sleepWeek(health({ days: days(broken) }), D0, t(1));
    expect(w.kept).toBe(6);
    expect(w.style).not.toBe('early');
    expect(w.hours).toBeCloseTo((6 * 7.5 + 7) / 7, 1);
  });
});

describe('the Sleep track', () => {
  it('draws an afternoon sleep after the morning, never before the evening', () => {
    const ds = [
      { date: D0, sleep: { asleep: t(7), woke: t(14) } },
      { date: addDays(D0, -1), sleep: { asleep: t(23), woke: t(7) } },
    ] as Day[];
    const [late, normal] = sleepWindows(ds, [D0, addDays(D0, -1)]);
    expect(normal).toMatchObject({ from: -60, to: 420, minutes: 480 });
    expect(late).toMatchObject({ from: 420, to: 840, minutes: 420 });
    const span = sleepChartSpan([late, normal]);
    expect(span.end).toBeGreaterThanOrEqual(840);
    expect(span.ticks[0]).toBe(-180);
  });
  it('keeps 9 pm to 11 am for ordinary nights, and stretches with fewer ticks for an evening wake', () => {
    expect(sleepChartSpan([{ date: D0, from: -60, to: 420, minutes: 480 }])).toEqual({ start: -180, end: 660, ticks: [-180, 0, 180, 360, 540] });
    const long = sleepChartSpan([{ date: D0, from: 840, to: 1320, minutes: 480 }]);
    expect(long.end).toBeGreaterThanOrEqual(1320);
    expect(long.ticks.length).toBeLessThanOrEqual(5);
    expect(sleepTick(-180)).toBe('9 pm');
    expect(sleepTick(0)).toBe('12 am');
    expect(sleepTick(720)).toBe('12 pm');
    expect(sleepTick(900, true)).toBe('3p');
  });
  it('social jet lag still compares the middle of the night with afternoon wakes in the mix', () => {
    const mon = '2026-11-09', sat = '2026-11-07';
    const lag = socialJetLag([{ date: mon, sleep: { asleep: t(23), woke: t(7) } }, { date: sat, sleep: { asleep: t(1), woke: t(9) } }]);
    expect(Math.abs(lag ?? 0)).toBe(120);
  });
});
