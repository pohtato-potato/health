import { describe, expect, it } from 'vitest';
import { addDays, dayRange } from '../src/domain/dates';
import { FAT_KCAL, LEAN_KCAL, fatMassEstimate, maintenanceModel, storedEnergyChange, trendWeight } from '../src/domain/maintenance';
import type { Day, FoodEntry } from '../src/domain/types';

const TODAY = '2026-11-20';
const food = (date: string, kcal: number): FoodEntry => ({ id: date + kcal, date, meal: 'lunch', at: 0, kind: 'food', name: 'Meal', portion: '', kcal, protein: 0 });

describe('energy-balance maintenance', () => {
  it('worked example from Hall parameters: 1 kg trend loss over 28 d at F=20 kg', () => {
    const p = 2 / (2 + 20);
    const expected = -(p * LEAN_KCAL + (1 - p) * FAT_KCAL);
    expect(storedEnergyChange(80, 79, 20)).toBeCloseTo(expected, 0);
    expect(storedEnergyChange(80, 79, 20) / 28).toBeCloseTo(-312, 0);
  });

  it('a shrinking waist shifts the split toward fat', () => {
    expect(Math.abs(storedEnergyChange(80, 79, 20, -0.01))).toBeGreaterThan(Math.abs(storedEnergyChange(80, 79, 20)));
  });

  it('fat mass from the waist when there is one, else from BMI and age', () => {
    expect(fatMassEstimate(178, 80, 22, 0.5)).toBeCloseTo(80 * 0.24, 1);
    const bmiBased = fatMassEstimate(178, 80, 22);
    expect(bmiBased).toBeGreaterThan(8);
    expect(bmiBased).toBeLessThan(25);
  });

  it('water-flag days down-weighted', () => {
    const days = dayRange('2026-10-01', '2026-10-20').map((date) => ({ date, weightKg: 80 }) as Day);
    days[15] = { ...days[15], weightKg: 82 };
    const plain = trendWeight(days, new Set());
    const flagged = trendWeight(days, new Set([days[15].date]));
    const at = (s: { date: string; trend: number }[]) => s.find((x) => x.date === days[15].date)!.trend;
    expect(at(flagged) - 80).toBeLessThan((at(plain) - 80) / 2);
  });

  it('gaps are filled by interpolation', () => {
    const days = [{ date: '2026-10-01', weightKg: 80 }, { date: '2026-10-05', weightKg: 79.6 }] as Day[];
    const t = trendWeight(days, new Set());
    expect(t.map((x) => x.date)).toEqual(dayRange('2026-10-01', '2026-10-05'));
  });

  it('holding with <10 logged days or <4 weigh-ins', () => {
    const range = dayRange(addDays(TODAY, -28), addDays(TODAY, -1));
    const days = range.map((date, i) => ({ date, weightKg: 82 - i / 28 }) as Day);
    const entries = range.map((d) => food(d, 2200));
    const full = maintenanceModel({ days, entries, today: TODAY, heightCm: 178, age: 22 });
    expect(full.status).toBe('updating');
    expect(full.kcal).toBeGreaterThan(2400);
    expect(full.kcal).toBeLessThan(2600);
    expect(full.band).toBeGreaterThan(0);
    expect(full.method).toMatch(/9,440/);
    expect(maintenanceModel({ days, entries: entries.slice(0, 9), today: TODAY, heightCm: 178, age: 22 }).status).toBe('holding');
    const fewWeighIns = days.map((d, i) => (i % 10 === 0 ? d : { date: d.date }) as Day);
    expect(maintenanceModel({ days: fewWeighIns, entries, today: TODAY, heightCm: 178, age: 22 }).status).toBe('holding');
  });
});
