import { describe, expect, it } from 'vitest';
import { basisGrams, labelPortion, labelTotals } from '../src/domain/labelMode';

describe('label mode (l-label)', () => {
  it('per 100 g: scales by the grams eaten', () => {
    expect(labelTotals({ basis: 'per100', kcal: 380, protein: 24, eatenG: 45 })).toEqual({ kcal: 171, protein: 10.8 });
  });
  it('per serving: scales by the serving weight', () => {
    expect(labelTotals({ basis: 'serving', kcal: 120, protein: 25, servingG: 32, eatenG: 64 })).toEqual({ kcal: 240, protein: 50 });
  });
  it('a serving with no weight cannot be worked out yet', () => {
    expect(basisGrams({ basis: 'serving' })).toBeUndefined();
    expect(labelTotals({ basis: 'serving', kcal: 120, protein: 25, eatenG: 64 })).toBeUndefined();
  });
  it('nothing eaten, nothing to save', () => {
    expect(labelTotals({ basis: 'per100', kcal: 380, protein: 24, eatenG: 0 })).toBeUndefined();
  });
  it('says how much of the pack it was', () => {
    expect(labelPortion({ basis: 'per100', kcal: 1, protein: 1, packG: 200, eatenG: 200 })).toBe('200 g (the whole pack), from the label');
    expect(labelPortion({ basis: 'per100', kcal: 1, protein: 1, packG: 200, eatenG: 50 })).toBe('50 g of a 200 g pack, from the label');
  });
});
