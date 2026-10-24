import { describe, expect, it } from 'vitest';
import type { RouteDef } from '../src/walk/catalogue';
import { withLines } from '../src/walk/geo';
import { along, fracAtKm, lineFracAtIndex } from '../src/walk/geometry';

const line: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 30],
]; // drawn length 40

describe('where you are on a route’s line', () => {
  it('walks along the drawn line', () => {
    expect(along(line, 0)).toEqual([0, 0]);
    expect(along(line, 0.25)).toEqual([10, 0]);
    expect(along(line, 0.625)).toEqual([10, 15]);
    expect(along(line, 1)).toEqual([10, 30]);
    expect(along(line, 2)).toEqual([10, 30]);
    expect(along(line, -1)).toEqual([0, 0]);
  });

  it('gives each point’s share of the drawn length', () => {
    expect(lineFracAtIndex(line, 0)).toBe(0);
    expect(lineFracAtIndex(line, 1)).toBeCloseTo(0.25, 5);
    expect(lineFracAtIndex(line, 2)).toBe(1);
  });

  it('puts the dot on a place exactly when you reach it', () => {
    const def = { id: 'g', km: 400, places: [{ name: 'A', km: 0, at: 0 }, { name: 'B', km: 300, at: 1 }, { name: 'C', km: 400, at: 2 }] } as unknown as RouteDef;
    withLines({ g: { region: 'india', line, ends: ['A', 'C'] } }, () => {
      expect(fracAtKm(def, 300)).toBeCloseTo(0.25, 5); // B is at index 1, a quarter of the drawn length
      expect(fracAtKm(def, 150)).toBeCloseTo(0.125, 5);
      expect(fracAtKm(def, 350)).toBeCloseTo(0.625, 5);
      expect(fracAtKm(def, 0)).toBe(0);
      expect(fracAtKm(def, 900)).toBe(1);
    });
  });

  it('spreads km evenly along the line when a route has no places', () => {
    const def = { id: 'g', km: 400, places: [] } as unknown as RouteDef;
    withLines({ g: { region: 'india', line, ends: ['A', 'C'] } }, () => expect(fracAtKm(def, 100)).toBeCloseTo(0.25, 5));
  });
});
