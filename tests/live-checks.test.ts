import { describe, expect, it } from 'vitest';
import { checksFor, cycleCheck, okCount, slipCount } from '../src/domain/checks';
import { DEFAULT_PLAN } from '../src/domain/defaultPlan';
import { findExercise } from '../src/domain/plan';

const guide = { setup: '', movement: '', breathing: '', faults: ['Hips drop', 'Neck cranes'], feel: '', stop: '', progress: '' };

describe('form checks', () => {
  it('come from the plan, at most six', () => {
    const checks = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, text: `Check ${i}`, kind: 'do' as const }));
    expect(checksFor({ checks: checks.slice(0, 3) })).toEqual(checks.slice(0, 3));
    expect(checksFor({ checks })).toHaveLength(6);
  });
  it('are empty without plan checks, even when the guide lists faults', () => {
    expect(checksFor({ guide } as never)).toEqual([]);
    expect(checksFor({})).toEqual([]);
  });
  it('cycle: unset, went well, slipped, unset', () => {
    expect(cycleCheck(undefined)).toBe('ok');
    expect(cycleCheck('ok')).toBe('slip');
    expect(cycleCheck('slip')).toBeUndefined();
  });
  it('count slips and passes', () => {
    const s = { checks: { a: 'ok', b: 'slip', c: 'slip' } as const };
    expect(slipCount(s)).toBe(2);
    expect(okCount(s)).toBe(1);
    expect(slipCount({})).toBe(0);
    expect(okCount({})).toBe(0);
  });
});

describe('the built-in plan', () => {
  it('times the farmer carry in seconds', () => {
    const carry = findExercise(DEFAULT_PLAN, 'farmer-carry')!;
    expect(carry.measure).toBe('seconds');
    expect(carry.seconds).toEqual([60, 90]);
    expect(carry.steps).toBeUndefined();
  });
});
