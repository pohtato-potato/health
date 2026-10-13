import { describe, expect, it } from 'vitest';
import { impossibleDensity, portionWarning, similarFood } from '../src/domain/foodChecks';
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

  it("similarFood: 'Seekh' vs 'Chicken seekh kebab' → null (one word)", () => {
    expect(similarFood('Seekh', foods)).toBeNull();
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
