import { describe, expect, it } from 'vitest';
import { addDays, dayRange, weekStart } from '../src/domain/dates';
import { fmtInt } from '../src/domain/format';
import { eatenAtFor, entryTime, mealTimesFor, portionFor, valuesFor } from '../src/domain/foods';
import { placeFor } from '../src/domain/places';
import { isLateTick, slotStatus, slotTime } from '../src/domain/checklist';
import { dateChipLabel } from '../src/ui/dateLabel';
import { sizeValues, usualsFor } from '../src/domain/usuals';
import { ringsFor, sleepMinutes, targetsOn } from '../src/domain/rings';
import { stepStreak, trainingWeeks, weightTrend } from '../src/domain/streaks';
import { DEFAULT_MEAL_TIMES, type Day, type Food, type FoodEntry, type Place, type Settings, type Targets } from '../src/domain/types';
import { arrivals, kmFromSteps, positionAt } from '../src/domain/walk';
import { bestFits, roomLeft } from '../src/domain/whatsleft';

const T: Targets = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };
const totals = (kcal: number, protein: number, steps: number, freeMeal = false) => ({ kcal, protein, steps, waterMl: 0, freeMeal, entries: 1 });

describe('dates and numbers', () => {
  it('handles weeks from Monday', () => {
    expect(weekStart('2026-09-27')).toBe('2026-09-21');
    expect(weekStart('2026-09-28')).toBe('2026-09-28');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(dayRange('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
  });
  it('groups digits the Indian way', () => {
    expect(fmtInt(109300)).toBe('1,09,300');
    expect(fmtInt(12345)).toBe('12,345');
  });
});

describe('rings', () => {
  it('closes calories only inside the range', () => {
    expect(ringsFor(totals(1300, 102, 11200), T).kcal.state).toBe('under');
    expect(ringsFor(totals(2100, 160, 11200), T).perfect).toBe(true);
    const over = ringsFor(totals(2400, 160, 11200), T);
    expect(over.kcal.state).toBe('over');
    expect(over.closed).toBe(2);
  });
  it('lifts the ceiling on a free-meal day', () => {
    expect(ringsFor(totals(2900, 160, 13000, true), T).kcal.closed).toBe(true);
  });
  it('draws calories towards the floor', () => {
    expect(ringsFor(totals(1300, 102, 11200), T).kcal.progress).toBeCloseTo(0.65, 3);
  });
  it('picks the targets in force on a day', () => {
    const hist = [
      { from: '2026-09-01', targets: T },
      { from: '2026-10-01', targets: { ...T, proteinG: 160 } },
    ];
    expect(targetsOn(hist, '2026-09-30')?.proteinG).toBe(140);
    expect(targetsOn(hist, '2026-10-01')?.proteinG).toBe(160);
  });
  it('measures sleep across midnight', () => {
    expect(sleepMinutes(40, 470)).toBe(430);
    expect(sleepMinutes(23 * 60 + 30, 7 * 60)).toBe(450);
  });
});

describe('streaks', () => {
  const tgt = () => 12000;
  it('earns a shield every 7 days and spends it on a miss', () => {
    const steps = new Map<string, number>();
    const days = dayRange('2026-09-01', '2026-09-10');
    days.forEach((d, i) => steps.set(d, i === 8 ? 5000 : 13000));
    const s = stepStreak(steps, tgt, '2026-09-11');
    expect(s.shieldsUsed).toEqual(['2026-09-09']);
    expect(s.current).toBe(9);
    expect(s.shields).toBe(0);
  });
  it('breaks without a shield', () => {
    const steps = new Map([
      ['2026-09-01', 13000],
      ['2026-09-02', 5000],
      ['2026-09-03', 13000],
    ]);
    expect(stepStreak(steps, tgt, '2026-09-04').current).toBe(1);
  });
  it('waits for yesterday’s steps before calling it missed', () => {
    const steps = new Map([
      ['2026-09-01', 13000],
      ['2026-09-02', 13000],
    ]);
    expect(stepStreak(steps, tgt, '2026-09-04').current).toBe(2);
    expect(stepStreak(steps, tgt, '2026-09-05').current).toBe(0);
  });
  it('banks at most two shields', () => {
    const steps = new Map<string, number>();
    for (const d of dayRange('2026-08-01', '2026-08-31')) steps.set(d, 13000);
    expect(stepStreak(steps, tgt, '2026-09-01').shields).toBe(2);
  });
  it('counts training weeks with no credit past the target', () => {
    const dates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'];
    const w = trainingWeeks(dates, 4, '2026-09-16');
    expect(w.streak).toBe(2);
    expect(w.thisWeek).toBe(0);
  });
  it('smooths weight into a trend', () => {
    const t = weightTrend([
      { date: '2026-09-01', kg: 85 },
      { date: '2026-09-02', kg: 86 },
    ]);
    expect(t[1].trend).toBeCloseTo(85.1, 5);
  });
});

describe('food', () => {
  const chicken: Food = { id: 'c', name: 'Chicken breast', note: 'cooked', unit: 'g', per: 100, kcal: 165, protein: 31, defaultAmount: 125, createdAt: 0 };
  const eggs: Food = { id: 'e', name: 'Eggs, boiled', unit: 'piece', unitName: 'egg', per: 1, kcal: 77.5, protein: 6.5, defaultAmount: 2, createdAt: 0 };
  const whey: Food = { id: 'w', name: 'Whey with milk', unit: 'serving', servingDesc: '1 scoop, 1 glass milk', per: 1, kcal: 270, protein: 39, defaultAmount: 1, createdAt: 0 };
  it('scales portions', () => {
    expect(valuesFor(chicken, 125)).toEqual({ kcal: 206, protein: 38.8 });
    expect(portionFor(chicken, 125)).toBe('125 g, cooked');
    expect(portionFor(eggs, 2)).toBe('2 eggs');
    expect(portionFor(whey, 1)).toBe('1 scoop, 1 glass milk');
  });
  it('suggests fits that land in range and never go over', () => {
    const t = totals(1300, 102, 0);
    const room = roomLeft(t, T);
    expect(room.kcalLo).toBe(700);
    expect(room.kcalHi).toBe(1000);
    const fits = bestFits([chicken, eggs, whey], room, t, T);
    expect(fits.length).toBeGreaterThan(0);
    for (const f of fits) expect(f.kcal).toBeLessThanOrEqual(1000);
    expect(fits[0].closesProtein).toBe(true);
  });
});

describe('walk across India', () => {
  it('turns steps into kilometres', () => {
    expect(kmFromSteps(100000)).toBeCloseTo(74, 5);
  });
  it('places you between stops', () => {
    const p = positionAt(295);
    expect(p.from.name).toBe('Agra');
    expect(p.to?.name).toBe('Gwalior');
  });
  it('dates each arrival', () => {
    const steps = new Map<string, number>();
    dayRange('2026-09-01', '2026-09-30').forEach((d) => steps.set(d, 15000));
    const a = arrivals(steps);
    expect(a.map((x) => x.name)).toEqual(['Delhi', 'Agra']);
  });
});

describe('v2 meal times and eaten-at', () => {
  const at = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo - 1, d, h, mi).getTime();
  const places: Place[] = [
    { id: 'p-home', name: 'Home', kind: 'home', meals: { breakfast: 600, lunch: 900, snacks: 1140, dinner: 1290 }, eased: false, foodsFirst: 'home' },
    { id: 'p-office', name: 'Office', kind: 'office', meals: { breakfast: 480, lunch: 780, snacks: 1020, dinner: 1230 }, eased: true, foodsFirst: 'outside' },
    { id: 'p-trip', name: 'Trip', kind: 'trip', meals: { ...DEFAULT_MEAL_TIMES.office }, eased: true, foodsFirst: 'outside' },
  ];
  const settings = { places } as unknown as Settings;

  it('placeFor follows the day, then any mid-day change, and falls back to the first home', () => {
    expect(placeFor({ date: '2026-10-13', place: 'p-office' } as Day, settings).id).toBe('p-office');
    expect(placeFor({ date: '2026-10-13' } as Day, settings).id).toBe('p-home');
    expect(placeFor(undefined, settings).id).toBe('p-home');
    const day = { date: '2026-10-13', place: 'p-office', placeChanges: [{ at: at(2026, 10, 13, 18, 0), place: 'p-home' }] } as Day;
    expect(placeFor(day, settings, at(2026, 10, 13, 12, 0)).id).toBe('p-office');
    expect(placeFor(day, settings, at(2026, 10, 13, 20, 0)).id).toBe('p-home');
    expect(placeFor(undefined, { places: [] } as unknown as Settings).kind).toBe('home');
  });

  it('eatenAtFor uses the office times on office days', () => {
    expect(eatenAtFor('2026-10-13', 'breakfast', places[1], settings, at(2026, 10, 13, 23, 0))).toBe(at(2026, 10, 13, 8, 0));
  });

  it('eatenAtFor keeps now when logging live', () => {
    const now = at(2026, 10, 13, 14, 40);
    expect(eatenAtFor('2026-10-13', 'lunch', places[0], settings, now)).toBe(now);
  });

  it('eatenAtFor at 23:00 for lunch gives that date at the lunch time', () => {
    expect(eatenAtFor('2026-10-13', 'lunch', places[0], settings, at(2026, 10, 13, 23, 0))).toBe(at(2026, 10, 13, 15, 0));
  });

  it('eatenAtFor for yesterday after midnight stays on yesterday', () => {
    expect(eatenAtFor('2026-10-11', 'dinner', places[0], settings, at(2026, 10, 12, 0, 30))).toBe(at(2026, 10, 11, 21, 30));
  });

  it('trip place uses home meal times', () => {
    expect(mealTimesFor(settings, places[2])).toEqual(places[0].meals);
    expect(mealTimesFor({ places: [] } as unknown as Settings, places[2])).toEqual(DEFAULT_MEAL_TIMES.home);
  });

  it('entryTime prefers eatenAt', () => {
    expect(entryTime({ at: 5, eatenAt: 3 } as FoodEntry)).toBe(3);
    expect(entryTime({ at: 5 } as FoodEntry)).toBe(5);
  });
});

describe('v2 checklist times and missed', () => {
  const places: Place[] = [
    { id: 'p-home', name: 'Home', kind: 'home', meals: { breakfast: 600, lunch: 900, snacks: 1140, dinner: 1290 }, eased: false, foodsFirst: 'home' },
    { id: 'p-office', name: 'Office', kind: 'office', meals: { breakfast: 480, lunch: 780, snacks: 1020, dinner: 1230 }, eased: true, foodsFirst: 'outside' },
  ];
  const settings = { places } as unknown as Settings;
  const at = (d: number, h: number, m: number) => new Date(2026, 9, d, h, m).getTime();

  it("slotTime parses '9 pm', '21:00' and '9:30 am'", () => {
    expect(slotTime('9 pm', settings, undefined)).toBe(1260);
    expect(slotTime('21:00', settings, undefined)).toBe(1260);
    expect(slotTime('9:30 am', settings, undefined)).toBe(570);
    expect(slotTime('12 am', settings, undefined)).toBe(0);
    expect(slotTime('Night', settings, undefined)).toBe(1380);
    expect(slotTime('Daily', settings, undefined)).toBe(720);
  });

  it('slotTime maps Morning to the office breakfast on office days', () => {
    expect(slotTime('Morning', settings, { date: '2026-10-13', place: 'p-office' } as Day)).toBe(480);
    expect(slotTime('Morning', settings, { date: '2026-10-13' } as Day)).toBe(600);
  });

  it('isLateTick: more than 2 h after the slot, or any time on a later date', () => {
    expect(isLateTick('2026-10-13', 1260, at(13, 23, 41))).toBe(true);
    expect(isLateTick('2026-10-13', 1260, at(13, 22, 30))).toBe(false);
    expect(isLateTick('2026-10-13', 1260, at(14, 0, 10))).toBe(true);
  });

  it('slotStatus', () => {
    expect(slotStatus(undefined, 'a:0')).toEqual({ kind: 'not-logged' });
    expect(slotStatus({ date: 'x', ticks: { 'a:0': 5 } } as Day, 'a:0')).toEqual({ kind: 'taken', at: 5 });
    expect(slotStatus({ date: 'x', missed: { 'a:0': true } } as Day, 'a:0')).toEqual({ kind: 'missed' });
  });
});

describe('v2 date chip', () => {
  it('names the chosen day plainly', () => {
    expect(dateChipLabel('2026-10-13', '2026-10-13')).toBe('Today');
    expect(dateChipLabel('2026-10-12', '2026-10-13')).toBe('Yesterday');
    expect(dateChipLabel('2026-10-10', '2026-10-13')).toBe('Sat 10 Oct');
  });
});

describe('v2 usuals and sizes', () => {
  const f = (id: string, extra: Partial<Food> = {}) => ({ id, name: id, unit: 'serving', per: 1, kcal: 300, protein: 12, defaultAmount: 1, createdAt: 0, ...extra }) as Food;
  const foods = [f('poha'), f('upma'), f('omelette'), f('sandwich'), f('old', { archived: true })];
  const e = (foodId: string, date: string, meal: FoodEntry['meal'] = 'breakfast') => ({ id: foodId + date + meal, date, meal, at: 0, kind: 'food', foodId, name: foodId, portion: '1', kcal: 300, protein: 12 }) as FoodEntry;
  const days = new Map<string, Day>([
    ['2026-10-05', { date: '2026-10-05', place: 'office' } as Day],
    ['2026-10-06', { date: '2026-10-06', place: 'office' } as Day],
    ['2026-10-07', { date: '2026-10-07', place: 'home' } as Day],
    ['2026-10-08', { date: '2026-10-08', place: 'home' } as Day],
    ['2026-10-09', { date: '2026-10-09', place: 'home' } as Day],
  ]);

  it('usuals prefer same place and meal', () => {
    const entries = [
      e('sandwich', '2026-10-05'), e('sandwich', '2026-10-06'),
      e('poha', '2026-10-07'), e('poha', '2026-10-08'), e('upma', '2026-10-09'),
      e('omelette', '2026-10-07', 'dinner'), e('omelette', '2026-10-08', 'dinner'), e('omelette', '2026-10-09', 'dinner'),
      e('old', '2026-10-09'),
    ];
    const ids = (place: string) => usualsFor('breakfast', place, 4, entries, foods, days, '2026-10-13').map((x) => x.id);
    expect(ids('home')[0]).toBe('poha');
    expect(ids('home')).toContain('upma');
    expect(ids('home')).not.toContain('old');
    expect(ids('office')[0]).toBe('sandwich');
    expect(ids('home').indexOf('sandwich')).toBeGreaterThan(ids('home').indexOf('upma'));
  });

  it('usuals ignore entries older than 8 weeks', () => {
    expect(usualsFor('breakfast', 'home', 4, [e('poha', '2026-08-01')], foods, days, '2026-10-13')).toEqual([]);
  });

  it('sizes scale kcal and protein', () => {
    const thali = f('thali', { kcal: 600, protein: 20, sizes: { s: 0.7, m: 1, l: 1.4 } });
    expect(sizeValues(thali, 's')).toEqual({ kcal: 420, protein: 14 });
    expect(sizeValues(thali, 'l')).toEqual({ kcal: 840, protein: 28 });
  });
});
