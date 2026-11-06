import { describe, expect, it } from 'vitest';
import { hashSeed, rng } from '../../src/football/rng';
import { coverage, edgeDistance, hexagon, inside, polygon, radii } from '../../src/football/radar';
import type { AxisValues } from '../../src/football/types';

const all = (n: number): AxisValues => ({ Pace: n, Power: n, Fuel: n, Rest: n, Routine: n, Shape: n });

describe('seeded rng', () => {
  it('repeats for one seed', () => {
    const a = rng(hashSeed('2026-11-06', 'bra', 'hul'));
    const b = rng(hashSeed('2026-11-06', 'bra', 'hul'));
    const xs = [a(), a(), a(), a(), a()];
    expect([b(), b(), b(), b(), b()]).toEqual(xs);
    for (const x of xs) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });
  it('depends on club order', () => {
    expect(hashSeed('2026-11-06', 'bra', 'hul')).not.toBe(hashSeed('2026-11-06', 'hul', 'bra'));
  });
});

describe('radar geometry', () => {
  it('lit axes reach the rim, unlit ones are scaled', () => {
    const rs = radii(all(20), 'atk');
    expect(rs.slice(0, 3)).toEqual([1, 1, 1]);
    expect(rs.slice(3).map((r) => +r.toFixed(2))).toEqual([0.7, 0.7, 0.7]);
    expect(radii(all(20), 'def').slice(0, 3).map((r) => +r.toFixed(2))).toEqual([0.75, 0.75, 0.75]);
    expect(radii(all(0), 'atk')[0]).toBeCloseTo(0.03);
  });
  it('coverage of whole and half shapes', () => {
    expect(coverage(hexagon(1), polygon(Array(6).fill(1)))).toBeCloseTo(1, 2);
    expect(Math.abs(coverage(hexagon(1), polygon(Array(6).fill(0.5))) - 0.25)).toBeLessThan(0.02);
    expect(coverage(hexagon(0.5), polygon(Array(6).fill(1)))).toBeCloseTo(1, 2);
  });
  it('inside and edge distance', () => {
    expect(inside([0, 0], polygon(Array(6).fill(0.5)))).toBe(true);
    expect(inside([0, -0.9], polygon(Array(6).fill(0.5)))).toBe(false);
    expect(edgeDistance([0, -0.5], polygon(Array(6).fill(0.5)))).toBeCloseTo(0, 6);
  });
});
