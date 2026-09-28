import { describe, expect, it } from 'vitest';
import { addDays, dayRange } from '../src/domain/dates';
import { bedtimeFor, drinkNights, e1rm, morningAfter, raceLastWeek, sleepPayoff, sleepWindows, sources, strengthScores, walkingKcal, waistToHeight, weekdayPattern } from '../src/domain/insights';
import type { Day, FoodEntry, SetEntry } from '../src/domain/types';

// 2026-10-07 is a Wednesday.
const TODAY = '2026-10-07';

describe('steps', () => {
  it('averages by weekday and finds the quiet and busy days', () => {
    const steps = new Map<string, number>();
    for (const d of dayRange(addDays(TODAY, -56), addDays(TODAY, -1))) {
      const w = new Date(d + 'T12:00').getDay();
      steps.set(d, w === 0 ? 4000 : w === 6 ? 12000 : 8000);
    }
    const p = weekdayPattern(steps, TODAY);
    expect(p.avg[6]).toBe(4000);
    expect(p.low).toBe(6);
    expect(p.high).toBe(5);
  });

  it('stays quiet without enough weeks', () => {
    const p = weekdayPattern(new Map([[addDays(TODAY, -1), 5000]]), TODAY);
    expect(p.low).toBeUndefined();
  });

  it('races this week against last week', () => {
    const steps = new Map<string, number>();
    for (const d of dayRange('2026-09-28', '2026-10-07')) steps.set(d, d >= '2026-10-05' ? 9000 : 7000);
    const r = raceLastWeek(steps, TODAY);
    expect(r.day).toBe(2);
    expect(r.now).toEqual([9000, 18000, 27000]);
    expect(r.ahead).toBe(27000 - 21000);
  });

  it('leaves an unfinished today out of the race until it pulls ahead', () => {
    const steps = new Map<string, number>([
      ['2026-09-28', 8000],
      ['2026-09-29', 8000],
      ['2026-09-30', 8000],
      ['2026-10-05', 9000],
      ['2026-10-06', 9000],
      ['2026-10-07', 1000],
    ]);
    const r = raceLastWeek(steps, TODAY);
    expect(r.ahead).toBe(2000);
    expect(r.asOfYesterday).toBe(true);
    expect(raceLastWeek(new Map([['2026-10-05', 100], ['2026-09-28', 9000]]), '2026-10-05').ahead).toBeUndefined();
  });

  it('estimates walking energy from weight', () => {
    expect(walkingKcal(10000, 80)).toBe(296);
    expect(walkingKcal(0)).toBe(0);
  });
});

describe('sleep', () => {
  const night = (date: string, asleep: number, woke: number, extra: Partial<Day> = {}): Day => ({ date, sleep: { asleep, woke }, ...extra });

  it('puts evening bedtimes before midnight', () => {
    const [n] = sleepWindows([night(TODAY, 23 * 60 + 30, 7 * 60)], [TODAY]);
    expect(n).toMatchObject({ from: -30, to: 420, minutes: 450 });
  });

  it('works out tonight’s bedtime', () => {
    expect(bedtimeFor(7 * 60, 7 * 60)).toBe(0);
    expect(bedtimeFor(6 * 60 + 30, 8 * 60)).toBe(22 * 60 + 30);
  });

  it('compares days after good and short nights', () => {
    const days: Day[] = [];
    for (let i = 1; i <= 10; i++) {
      const good = i % 2 === 0;
      days.push(night(addDays(TODAY, -i), good ? 23 * 60 : 1 * 60, 7 * 60, { steps: good ? 10000 : 7000 }));
    }
    const p = sleepPayoff(days, 7 * 60, TODAY);
    expect(p?.steps.good).toBe(10000);
    expect(p?.steps.short).toBe(7000);
    expect(sleepPayoff(days.slice(0, 4), 7 * 60, TODAY)).toBeUndefined();
  });
});

describe('food', () => {
  const entry = (name: string, protein: number, date = TODAY, kind: FoodEntry['kind'] = 'food'): FoodEntry => ({ id: name + date + protein, date, meal: 'lunch', at: 0, kind, name, portion: '', kcal: protein * 10, protein });

  it('ranks where the protein came from', () => {
    const s = sources([entry('Paneer', 30), entry('Dal', 20), entry('Paneer', 10), entry('Old', 99, '2026-01-01')], addDays(TODAY, -6), TODAY, 'protein');
    expect(s.total).toBe(60);
    expect(s.rows[0]).toMatchObject({ name: 'Paneer', value: 40 });
    expect(s.rows[1].share).toBeCloseTo(1 / 3);
  });

  it('groups drinks into nights and compares the morning after', () => {
    const e: FoodEntry[] = [
      { ...entry('Beer', 0, '2026-10-01', 'drink'), drink: { type: 'Beer', count: 2 } },
      { ...entry('Wine', 0, '2026-10-01', 'drink'), drink: { type: 'Wine', count: 1 } },
      { ...entry('Beer', 0, '2026-10-04', 'drink'), drink: { type: 'Beer', count: 1 } },
    ];
    const nights = drinkNights(e);
    expect(nights).toHaveLength(2);
    expect(nights[0]).toMatchObject({ count: 3, types: { Beer: 2, Wine: 1 } });
    const days: Day[] = dayRange('2026-09-28', '2026-10-06').map((date) => ({ date, steps: date === '2026-10-02' || date === '2026-10-05' ? 5000 : 9000 }));
    const m = morningAfter(nights, days, TODAY);
    expect(m.steps).toEqual({ after: 5000, other: 9000 });
  });
});

describe('strength', () => {
  const set = (sessionId: string, date: string, loadKg: number | null, reps: number, at: number): SetEntry => ({ id: `${sessionId}-${at}`, sessionId, date, session: 'A', exerciseId: 'press', exercise: 'Press', setNo: 1, side: 'both', loadKg, reps, at });

  it('scores the best set of each session', () => {
    expect(e1rm(10, 10)).toBeCloseTo(13.33, 2);
    const s = strengthScores([set('a', '2026-09-01', 10, 8, 1), set('a', '2026-09-01', 10, 10, 2), set('b', '2026-10-06', 12, 10, 3)], TODAY);
    expect(s[0].kind).toBe('kg');
    expect(s[0].series).toHaveLength(2);
    expect(s[0].now).toBeCloseTo(16);
    expect(s[0].before).toBeCloseTo(13.33, 2);
  });

  it('uses reps for bodyweight work', () => {
    const s = strengthScores([set('a', '2026-10-01', null, 12, 1), set('a', '2026-10-01', null, 15, 2)], TODAY);
    expect(s[0]).toMatchObject({ kind: 'reps', now: 15 });
  });
});

it('works out waist-to-height', () => {
  expect(waistToHeight(35, 178)).toBeCloseTo(0.499, 3);
});

describe('session quirks', () => {
  it('finds the longest rest, the fastest superset and the tempo work', async () => {
    const { sessionQuirks } = await import('../src/domain/sessionQuirks');
    const plan = {
      format: 'health-plan' as const,
      version: 1 as const,
      name: 'P',
      from: '2026-01-01',
      rotation: ['A'],
      flags: [],
      sessions: [
        {
          id: 'A',
          name: 'A',
          focus: '',
          minutes: 40,
          short: [],
          exercises: [
            { id: 'sq', order: '1', name: 'Squat', sets: 2, load: 'pair' as const },
            { id: 'pu', order: '2a', name: 'Push-up', sets: 2, load: 'body' as const },
            { id: 'rw', order: '2b', name: 'Row', sets: 2, load: 'pair' as const },
          ],
        },
      ],
    };
    const mk = (exerciseId: string, exercise: string, at: number, reps: number, tempo = false): SetEntry => ({ id: `${exerciseId}${at}`, sessionId: 's', date: TODAY, session: 'A', exerciseId, exercise, setNo: 1, side: 'both', loadKg: null, reps, at: at * 1000, tempo });
    const q = sessionQuirks([mk('sq', 'Squat', 0, 10, true), mk('sq', 'Squat', 120, 10, true), mk('pu', 'Push-up', 300, 15), mk('rw', 'Row', 340, 12), mk('pu', 'Push-up', 450, 14), mk('rw', 'Row', 480, 12)], plan);
    expect(q.longestRest?.ms).toBe(180_000);
    expect(q.longestRest?.before.exercise).toBe('Push-up');
    expect(q.fastestSuperset).toEqual({ ms: 30_000, names: ['Push-up', 'Row'] });
    expect(q.tempo).toEqual({ sets: 2, reps: 20 });
    expect(q.mostReps?.reps).toBe(15);
  });
});
