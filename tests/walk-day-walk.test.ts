import { describe, expect, it } from 'vitest';
import { STRIDE_M } from '../src/domain/walk';
import { dayWalk } from '../src/walk/dayWalk';

const steps = (km: number) => Math.round((km * 1000) / STRIDE_M);
const road = new Map([
  ['2026-01-01', steps(220)],
  ['2026-01-02', steps(20)], // past Agra at 230
  ['2026-01-04', steps(30)],
]);

describe('the day on the road, for Close the day', () => {
  it('runs from the morning’s total to the evening’s, naming what was passed and what is next', () => {
    const d = dayWalk('2026-01-02', road);
    expect(d.fromKm).toBeCloseTo(220, 0);
    expect(d.toKm).toBeCloseTo(240, 0);
    expect(d.passed).toEqual(['Agra']);
    expect(d.next).toMatchObject({ name: 'Gwalior' });
    expect(d.next!.kmLeft).toBeCloseTo(110, 0);
  });
  it('stands still on a day without steps', () => {
    const d = dayWalk('2026-01-03', road);
    expect(d.toKm).toBe(d.fromKm);
    expect(d.passed).toEqual([]);
  });
  it('puts the walker in proportion between the morning and the next stop', () => {
    const d = dayWalk('2026-01-02', road);
    expect(d.frac).toBeCloseTo(20 / 130, 2);
  });
});
