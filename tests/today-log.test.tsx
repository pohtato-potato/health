import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { logMatches } from '../src/sheets/LogSearch';
import { ChecklistChips, MealTiles, UsualChips, mealTotals } from '../src/screens/today/LogBelow';
import type { Food, FoodEntry } from '../src/domain/types';

const food = (id: string, name: string, archived = false) => ({ id, name, archived, kcal: 100 }) as unknown as Food;

describe('logMatches: Log anything, the same on Today and in the sheet', () => {
  const foods = [food('f1', 'Test chai'), food('f2', 'Test dal'), food('f3', 'Old chai', true)];
  it('finds foods by name, never archived ones', () => {
    expect(logMatches('chai', foods).foods.map((f) => f.id)).toEqual(['f1']);
  });
  it('finds actions by their words', () => {
    expect(logMatches('waist', foods).actions.map((a) => a.label)).toEqual(['Waist']);
    expect(logMatches('close', foods).actions.map((a) => a.label)).toContain('Close the day');
  });
  it('finds nothing for an empty query', () => {
    expect(logMatches('  ', foods)).toEqual({ actions: [], foods: [] });
  });
});

describe('UsualChips', () => {
  it('shows each food with its usual portion', () => {
    const html = renderToStaticMarkup(<UsualChips items={[{ id: 'f1', name: 'Test dal', portion: '1 bowl' }, { id: 'f2', name: 'Test roti', portion: '2' }]} onAdd={() => {}} />);
    for (const t of ['Test dal', '1 bowl', 'Test roti', '>2<']) expect(html).toContain(t);
  });
});

describe('MealTiles', () => {
  const noop = () => {};
  it('a logged tile shows kcal on one line and "21 g protein" on its own line', () => {
    const html = renderToStaticMarkup(<MealTiles meals={[{ meal: 'breakfast', kcal: 310, protein: 21, canRepeat: false }]} onOpen={noop} onRepeat={noop} />);
    expect(html).toContain('>310<');
    expect(html).toContain('>kcal<');
    expect(html).toContain('>21 g protein<');
  });
  it('an empty tile shows "Empty" and offers "Same as yesterday" only when it can', () => {
    const can = renderToStaticMarkup(<MealTiles meals={[{ meal: 'lunch', canRepeat: true }]} onOpen={noop} onRepeat={noop} />);
    expect(can).toContain('Empty');
    expect(can).toContain('Same as yesterday');
    const cannot = renderToStaticMarkup(<MealTiles meals={[{ meal: 'lunch', canRepeat: false }]} onOpen={noop} onRepeat={noop} />);
    expect(cannot).toContain('Empty');
    expect(cannot).not.toContain('Same as yesterday');
  });
});

describe('ChecklistChips', () => {
  it('says "taken" when ticked, in words as well as colour', () => {
    const html = renderToStaticMarkup(<ChecklistChips items={[{ key: 'm1:0', name: 'Test tablet', on: true }, { key: 'm2:0', name: 'Test drops', on: false }]} onToggle={() => {}} />);
    expect(html).toContain('Test tablet · taken');
    expect(html).toContain('Test drops');
    expect(html).not.toContain('Test drops · taken');
  });
});

describe('mealTotals', () => {
  it('sums kcal and protein per meal', () => {
    const e = [
      { meal: 'lunch', kcal: 300, protein: 10 },
      { meal: 'lunch', kcal: 200, protein: 15 },
      { meal: 'dinner', kcal: 500, protein: 30 },
    ] as FoodEntry[];
    expect(mealTotals(e)).toEqual({ lunch: { kcal: 500, protein: 25 }, dinner: { kcal: 500, protein: 30 } });
  });
});
