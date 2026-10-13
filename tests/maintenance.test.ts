import { describe, expect, it } from 'vitest';
import { addDays, dayRange } from '../src/domain/dates';
import { plateau, suggestTargets, weeklyGap } from '../src/domain/maintenance';
import type { Day, FoodEntry, Targets } from '../src/domain/types';

const TODAY = '2026-11-20';
const T: Targets = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 4 };
const food = (date: string, kcal: number): FoodEntry => ({ id: date + kcal, date, meal: 'lunch', at: 0, kind: 'food', name: 'Meal', portion: '', kcal, protein: 0 });

describe('maintenance', () => {
  it('shows the gap between this week and maintenance', () => {
    const g = weeklyGap(2500, [food('2026-11-16', 2000), food('2026-11-17', 2100), food('2026-11-20', 900)], '2026-11-16', TODAY)!;
    expect(g).toMatchObject({ avg: 2050, gap: 450, days: 2 });
  });
});

describe('suggestions', () => {
  const m = { kcal: 2500, days: 28, intake: 2200, change: -1, perWeek: -0.25 };
  it('suggests eating more when losing too fast', () => {
    const s = suggestTargets(T, { ...m, perWeek: -1.1 }, 80, 0)!;
    expect(s.id).toBe('slow-down');
    expect(s.change).toEqual({ kcalMin: 2150, kcalMax: 2450 });
  });

  it('suggests steps, never less food, after a long stall', () => {
    const s = suggestTargets(T, { ...m, perWeek: 0 }, 80, 3)!;
    expect(s.change).toEqual({ steps: 11000 });
    expect(suggestTargets(T, m, 80, 1)).toBeUndefined();
  });
});

describe('plateau', () => {
  it('finds a flat stretch and notices the waist moving', () => {
    const range = dayRange(addDays(TODAY, -40), TODAY);
    const days: Day[] = range.map((date, i) => ({ date, weightKg: i < 10 ? 84 - i * 0.2 : 82 }));
    const p = plateau(days, [], [{ id: 'a', date: addDays(TODAY, -25), at: 0, waistStanding: 36 }, { id: 'b', date: TODAY, at: 0, waistStanding: 35.5 }], TODAY, () => 2300)!;
    expect(p.days).toBeGreaterThanOrEqual(14);
    expect(p.waistChange).toBe(-0.5);
  });
});
