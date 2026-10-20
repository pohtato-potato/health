import { describe, expect, it } from 'vitest';
import { impossibleDensity, isWeighedMeat, lightDishWarning, portionWarning, recentTwin, similarFood, toFoodBasis } from '../src/domain/foodChecks';
import type { Food } from '../src/domain/types';

const food = (name: string, extra: Partial<Food> = {}): Food => ({ id: name, name, unit: 'g', per: 100, kcal: 100, protein: 5, defaultAmount: 100, createdAt: 0, ...extra }) as Food;

describe('food sanity checks', () => {
  it('salad at 330 per 100 g with 400 g default warns at 1320', () => {
    expect(portionWarning(food('Salad', { kcal: 330, defaultAmount: 400 }))).toEqual({ kcal: 1320 });
  });

  it('roti 105 per piece x2 does not warn', () => {
    expect(portionWarning(food('Roti', { unit: 'piece', per: 1, kcal: 105, defaultAmount: 2 }))).toBeNull();
  });

  it('oats 389 per 100 g is possible; 950 per 100 g is not', () => {
    expect(impossibleDensity(food('Oats', { kcal: 389 }))).toBe(false);
    expect(impossibleDensity(food('Oats', { kcal: 950 }))).toBe(true);
    expect(impossibleDensity(food('Ghee', { unit: 'ml', kcal: 900 }))).toBe(false);
    expect(impossibleDensity(food('Thali', { unit: 'serving', per: 1, kcal: 1200 }))).toBe(false);
  });

  const foods = [food('Chicken seekh kebab'), food('Whey with water'), food('Dal makhani'), food('Chicken breast'), food('Paneer tikka', { archived: true })];

  it("similarFood: 'Seekh' vs 'Chicken seekh kebab' → match (a distinctive word inside the other name)", () => {
    expect(similarFood('Seekh', foods)?.name).toBe('Chicken seekh kebab');
  });
  it("similarFood: 'Whey water' vs 'Whey with water' → match", () => {
    expect(similarFood('Whey water', foods)?.name).toBe('Whey with water');
  });
  it("similarFood: 'Dal' vs 'Dal makhani' → null", () => {
    expect(similarFood('Dal', foods)).toBeNull();
  });
  it("similarFood: 'Chiken breast' vs 'Chicken breast' → match", () => {
    expect(similarFood('Chiken breast', foods)?.name).toBe('Chicken breast');
  });
  it('similarFood ignores archived foods', () => {
    expect(similarFood('Paneer tikka', foods)).toBeNull();
  });
});

describe('more food guards (#17–21)', () => {
  const mine = [food('Chicken seekh kebab'), food('Whey with water'), food('Chicken breast'), food('Chicken curry')];
  it("'Asitis whey water' matches 'Whey with water'; 'Chicken tikka' matches nothing on 'chicken' alone", () => {
    expect(similarFood('Asitis whey water', mine)?.name).toBe('Whey with water');
    expect(similarFood('Chicken tikka', mine)).toBeNull();
  });
  it('a salad, sabzi or dal above 250 kcal per 100 g warns', () => {
    expect(lightDishWarning(food('Salad', { kcal: 330 }))).toBe(true);
    expect(lightDishWarning(food('Bhindi sabzi', { kcal: 120 }))).toBe(false);
    expect(lightDishWarning(food('Peanuts', { kcal: 570 }))).toBe(false);
  });
  it('meat in grams asks raw or cooked; 200 g raw is 150 g of a cooked-basis food', () => {
    expect(isWeighedMeat(food('Chicken breast'))).toBe(true);
    expect(isWeighedMeat(food('Chicken seekh kebab', { unit: 'piece' }))).toBe(false);
    expect(toFoodBasis({ weighed: 'cooked' }, 200, 'raw')).toBe(150);
    expect(toFoodBasis({ weighed: 'raw' }, 150, 'cooked')).toBe(200);
    expect(toFoodBasis({}, 200, 'raw')).toBe(200);
  });
  it('the same food inside two minutes is a double tap', () => {
    const e = [{ date: '2026-09-28', at: 1_000_000, foodId: 'kahwa', name: 'Kahwa' }];
    expect(recentTwin(e, { date: '2026-09-28', foodId: 'kahwa', name: 'Kahwa' }, 1_000_000 + 60_000)).toBeDefined();
    expect(recentTwin(e, { date: '2026-09-28', foodId: 'kahwa', name: 'Kahwa' }, 1_000_000 + 180_000)).toBeUndefined();
  });
});
