import { lateHeavy, proteinSpread, weekBudget } from '../src/domain/budgets';
import { parseOffProduct } from '../src/sources/barcode';
import { avgOver, dayFoodLabel, foodDaysFor } from '../src/domain/logged';
import { weekStats } from '../src/domain/weekly';
import { trainingStreakLine } from '../src/domain/streaks';
import type { Settings } from '../src/domain/types';
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

describe('not logged is not zero', () => {
  const week = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
  const entry = (date: string, kcal: number) => ({ id: date + kcal, date, meal: 'lunch', at: 1, kind: 'food', name: 'x', portion: '1', kcal, protein: 10 }) as FoodEntry;

  it('averages skip unlogged days', () => {
    const entries = week.slice(0, 5).map((d) => entry(d, 2000));
    const r = foodDaysFor(week, new Map(), entries);
    expect(r).toEqual({ counted: week.slice(0, 5), basis: 'logged' });
    expect(avgOver(r.counted.map(() => 2000))).toBe(2000);
  });

  it('complete days win when any exist', () => {
    const entries = week.slice(0, 5).map((d) => entry(d, 2000));
    const days = new Map([[week[1], { date: week[1], foodDone: true } as Day], [week[3], { date: week[3], foodDone: true } as Day]]);
    expect(foodDaysFor(week, days, entries)).toEqual({ counted: [week[1], week[3]], basis: 'complete' });
  });

  it('a week with nothing logged has basis none and avg undefined', () => {
    expect(foodDaysFor(week, new Map(), [])).toEqual({ counted: [], basis: 'none' });
    expect(avgOver([])).toBeUndefined();
  });

  it('dayFoodLabel', () => {
    expect(dayFoodLabel(undefined, 0)).toBe('not-logged');
    expect(dayFoodLabel({ date: 'x' } as Day, 3)).toBe('partial');
    expect(dayFoodLabel({ date: 'x', foodDone: true } as Day, 3)).toBe('complete');
  });

  it('weekStats kcalAvg uses foodDaysFor', () => {
    const settings = { targets: [], checklist: [], prefs: {} } as unknown as Settings;
    const entries = [entry(week[0], 1000), entry(week[1], 3000), entry(week[2], 2600)];
    const days = [{ date: week[1], foodDone: true }, { date: week[2], foodDone: true }] as Day[];
    const w = weekStats(settings, week[0], days, entries, [], []);
    expect(w.kcalAvg).toBe(2800);
    expect(w.foodBasis).toBe('complete');
    expect(w.foodDays).toBe(2);
  });

  it('trainingStreakLine', () => {
    expect(trainingStreakLine({ thisWeek: 0, streak: 0, best: 1 }, 4)).toBe('This week 0 of 4 · best run 1 week');
    expect(trainingStreakLine({ thisWeek: 2, streak: 3, best: 5 }, 4)).toBe('This week 2 of 4 · 3 weeks running · best run 5 weeks');
    expect(trainingStreakLine({ thisWeek: 1, streak: 0, best: 0 }, 4)).toBe('This week 1 of 4');
  });
});

describe('weekly budgets, protein spread, barcode', () => {
  const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 0, sleepMin: 420, sessionsPerWeek: 4 };
  const e = (date: string, kcal: number, protein: number, meal: FoodEntry['meal'] = 'lunch', eatenAt?: number) => ({ id: `${date}${kcal}${meal}`, date, meal, at: 0, eatenAt, kind: 'food', name: 'x', portion: '1', kcal, protein }) as FoodEntry;

  it('budget left carries across days', () => {
    const b = weekBudget(T, new Map(), [e('2026-10-12', 2800, 120)], '2026-10-12', '2026-10-13');
    expect(b.kcal).toEqual({ used: 2800, budget: 16100, left: 13300, perDayLeft: 2217 });
    expect(b.protein.left).toBe(980 - 120);
  });

  it('days with nothing logged use no budget', () => {
    const b = weekBudget(T, new Map(), [], '2026-10-12', '2026-10-14');
    expect(b.kcal.used).toBe(0);
    expect(b.kcal.left).toBe(16100);
  });

  it('protein spread by meal', () => {
    expect(proteinSpread([e('d', 100, 30, 'breakfast'), e('d', 100, 20, 'dinner'), e('d', 50, 5, 'dinner')])).toEqual({ breakfast: 30, lunch: 0, snacks: 0, dinner: 25 });
  });

  it('lateHeavy true when >50 % after 21:00', () => {
    const at = (h: number) => new Date(2026, 9, 12, h, 0).getTime();
    expect(lateHeavy([e('d', 100, 30, 'lunch', at(13)), e('d', 100, 40, 'dinner', at(22))])).toBe(true);
    expect(lateHeavy([e('d', 100, 40, 'lunch', at(13)), e('d', 100, 30, 'dinner', at(22))])).toBe(false);
    expect(lateHeavy([])).toBe(false);
  });

  it('barcode parser maps OFF nutriments per 100 g', () => {
    const food = parseOffProduct({ status: 1, code: '8901', product: { product_name: 'Peanut butter', brands: 'Acme', nutriments: { 'energy-kcal_100g': 588, proteins_100g: 25.1 } } });
    expect(food).toMatchObject({ name: 'Peanut butter (Acme)', unit: 'g', per: 100, kcal: 588, protein: 25.1 });
    const drink = parseOffProduct({ status: 1, code: '8902', product: { product_name: 'Milk', nutrition_data_per: '100ml', nutriments: { 'energy-kcal_100ml': 62, proteins_100ml: 3.2 } } });
    expect(drink).toMatchObject({ unit: 'ml', kcal: 62, protein: 3.2 });
    expect(parseOffProduct({ status: 0 })).toBeNull();
    expect(parseOffProduct({ status: 1, product: { product_name: 'No numbers' } })).toBeNull();
  });
});
