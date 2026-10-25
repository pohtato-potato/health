import { describe, expect, it } from 'vitest';
import { STRIDE_M } from '../src/domain/walk';
import { pointAtKm } from '../src/walk/mapView';
import { monthTrail, trailBetween } from '../src/walk/trail';

const steps = (km: number) => Math.round((km * 1000) / STRIDE_M);
const road = new Map([
  ['2026-08-30', steps(100)],
  ['2026-09-02', steps(140)],
  ['2026-09-30', steps(115)],
  ['2026-10-01', steps(50)],
]);

describe('the month on the map', () => {
  it('runs from the total before the month to the total at its end', () => {
    const t = monthTrail('2026-09', road)!;
    expect(t.fromKm).toBeCloseTo(100, 0);
    expect(t.toKm).toBeCloseTo(355, 0);
  });
  it('is nothing in a month with no walking', () => {
    expect(monthTrail('2026-07', road)).toBeUndefined();
    expect(monthTrail('2026-11', road)).toBeUndefined();
  });
  it('draws from the first km to the last through the stops between', () => {
    const pts = trailBetween(100, 355);
    expect(pts[0]).toEqual(pointAtKm(100));
    expect(pts.at(-1)).toEqual(pointAtKm(355));
    expect(pts).toContainEqual(pointAtKm(230)); // Agra
    expect(pts).toContainEqual(pointAtKm(350)); // Gwalior
    expect(pts.length).toBe(4);
  });
});
