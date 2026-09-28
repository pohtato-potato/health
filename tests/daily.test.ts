import { describe, expect, it } from 'vitest';
import { addDays, dayRange, weekStart } from '../src/domain/dates';
import { fmtInt } from '../src/domain/format';
import { portionFor, valuesFor } from '../src/domain/foods';
import { ringsFor, sleepMinutes, targetsOn } from '../src/domain/rings';
import { stepStreak, trainingWeeks, weightTrend } from '../src/domain/streaks';
import type { Food, Targets } from '../src/domain/types';
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
