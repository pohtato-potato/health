import { describe, expect, it } from 'vitest';
import { addDays } from '../src/domain/dates';
import type { Food, FoodEntry, Meal } from '../src/domain/types';
import { usualFoods, usualPortion } from '../src/domain/usual';

const today = '2026-10-21';
const food = (id: string, defaultAmount = 100, archived = false): Food => ({ id, name: `Test food ${id}`, unit: 'g', per: 100, defaultAmount, kcal: 100, protein: 10, archived }) as unknown as Food;
let n = 0;
const entry = (foodId: string, meal: Meal, daysAgo: number, amount: number, at?: number): FoodEntry => ({
  id: `e${++n}`, date: addDays(today, -daysAgo), meal, at: at ?? Date.parse(addDays(today, -daysAgo)) + n, kind: 'food', foodId, name: foodId, amount, portion: `${amount} g`, kcal: 100, protein: 10,
});

describe('usualPortion', () => {
  it('is the median amount at that meal over 60 days when logged there 3+ times', () => {
    const f2 = food('f2');
    const e = [entry('f2', 'lunch', 1, 100), entry('f2', 'lunch', 2, 250), entry('f2', 'lunch', 3, 250), entry('f2', 'lunch', 4, 300)];
    expect(usualPortion(e, f2, 'lunch', today)).toBe(250);
  });
  it('ignores entries older than 60 days', () => {
    const f2 = food('f2');
    const e = [entry('f2', 'lunch', 61, 400), entry('f2', 'lunch', 62, 400), entry('f2', 'lunch', 63, 400), entry('f2', 'lunch', 2, 150)];
    expect(usualPortion(e, f2, 'lunch', today)).toBe(150);
  });
  it('falls back to the most recent amount at any meal', () => {
    const f2 = food('f2');
    const e = [entry('f2', 'lunch', 5, 120), entry('f2', 'dinner', 1, 180)];
    expect(usualPortion(e, f2, 'lunch', today)).toBe(180);
  });
  it("falls back to the food's default with no history", () => {
    expect(usualPortion([], food('f2', 100), 'lunch', today)).toBe(100);
  });
});

describe('usualFoods', () => {
  it('ranks by count at the meal, ties to the most recent, and stops at the limit', () => {
    const foods = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => food(id));
    const e = [
      ...[1, 2, 3].map((d) => entry('a', 'lunch', d, 100)),
      ...[1, 2].map((d) => entry('b', 'lunch', d, 100)),
      entry('c', 'lunch', 5, 100),
      entry('d', 'lunch', 1, 100),
      entry('e', 'lunch', 3, 100),
      entry('f', 'lunch', 4, 100),
      entry('g', 'lunch', 9, 100),
      entry('g', 'dinner', 1, 100),
    ];
    expect(usualFoods(e, foods, 'lunch', today).map((u) => u.food.id)).toEqual(['a', 'b', 'd', 'e', 'f', 'c']);
  });
  it('never includes archived foods', () => {
    const foods = [food('a', 100, true), food('b')];
    const e = [entry('a', 'lunch', 1, 100), entry('a', 'lunch', 2, 100), entry('b', 'lunch', 1, 100)];
    expect(usualFoods(e, foods, 'lunch', today).map((u) => u.food.id)).toEqual(['b']);
  });
  it('pairs each food with its usual portion', () => {
    const foods = [food('a')];
    const e = [entry('a', 'lunch', 1, 200), entry('a', 'lunch', 2, 200), entry('a', 'lunch', 3, 300)];
    expect(usualFoods(e, foods, 'lunch', today)).toEqual([{ food: foods[0], amount: 200 }]);
  });
});
