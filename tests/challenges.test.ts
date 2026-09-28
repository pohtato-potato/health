import { describe, expect, it } from 'vitest';
import { challengeFor, type DaySummary } from '../src/domain/challenges';
import { dayRange } from '../src/domain/dates';

const day = (date: string, extra: Partial<DaySummary> = {}): DaySummary => ({ date, logged: false, perfect: false, proteinOk: false, sleepOk: false, waterSpread: false, morning: false, checklist: false, steps: 0, ...extra });

describe('monthly challenges', () => {
  it('turns Diwali month into logging the festival', () => {
    const c = challengeFor('2026-11');
    expect(c.id).toBe('diwali-2026');
    expect(c.goal).toBe(5);
    const days = dayRange('2026-11-01', '2026-11-30').map((d) => day(d, { logged: d >= '2026-11-06' && d <= '2026-11-10' }));
    expect(c.progress(days, { lastMonthSteps: 0, month: '2026-11' })).toBe(5);
  });

  it('has a challenge for every month', () => {
    for (let m = 1; m <= 12; m++) expect(challengeFor(`2027-${String(m).padStart(2, '0')}`)).toBeDefined();
  });

  it('measures step-up months against last month', () => {
    const c = challengeFor('2026-12');
    expect(c.id).toBe('steps-up');
    const days = dayRange('2026-12-01', '2026-12-10').map((d) => day(d, { steps: 10000 }));
    expect(c.progress(days, { lastMonthSteps: 200000, month: '2026-12' })).toBe(50);
  });
});
