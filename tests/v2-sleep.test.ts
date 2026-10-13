import { describe, expect, it } from 'vitest';
import { sri, tonightTarget, usualWake } from '../src/domain/sleepRegularity';
import { dayRange } from '../src/domain/dates';
import type { Day } from '../src/domain/types';

const week = dayRange('2026-10-05', '2026-10-11');

describe('sleep regularity', () => {
  it('identical schedule → 100', () => {
    const days = week.map((date) => ({ date, sleep: { asleep: 1410, woke: 420 } }) as Day);
    expect(sri(days)).toBe(100);
  });

  it('alternating 3 h shift lower', () => {
    const days = week.map((date, i) => ({ date, sleep: i % 2 ? { asleep: 90, woke: 600 } : { asleep: 1350, woke: 420 } }) as Day);
    const s = sri(days)!;
    expect(s).toBeLessThan(90);
    expect(s).toBeGreaterThan(50);
  });

  it('missing nights skipped', () => {
    const days = week.filter((_, i) => i !== 3).map((date) => ({ date, sleep: { asleep: 1410, woke: 420 } }) as Day);
    expect(sri(days)).toBe(100);
    expect(sri(days.slice(0, 1))).toBeUndefined();
  });
});

describe("tonight's target", () => {
  it('asleep by need before tomorrow’s wake', () => {
    expect(tonightTarget(465, 420)).toEqual({ asleepBy: 45, text: 'Asleep by 12:45 am keeps 7 h before tomorrow’s 7:45 am.' });
    expect(tonightTarget(420, 450).asleepBy).toBe(1410);
  });

  it('usual wake is the median of recent days at that kind of place', () => {
    const days = [
      { date: '2026-10-05', place: 'o', sleep: { asleep: 0, woke: 420 } },
      { date: '2026-10-06', place: 'o', sleep: { asleep: 0, woke: 440 } },
      { date: '2026-10-07', place: 'o', sleep: { asleep: 0, woke: 430 } },
      { date: '2026-10-10', place: 'h', sleep: { asleep: 0, woke: 600 } },
    ] as Day[];
    expect(usualWake(days, 'o', '2026-10-12')).toBe(430);
    expect(usualWake(days, 'x', '2026-10-12')).toBeUndefined();
  });
});
