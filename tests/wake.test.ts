import { describe, expect, it } from 'vitest';
import { usualWake } from '../src/domain/wake';
import type { Day } from '../src/domain/types';

const night = (date: string, woke: number) => ({ date, sleep: { asleep: woke - 7 * 3_600_000, woke } }) as unknown as Day;

describe('usualWake', () => {
  it('is the median wake time of the last 8 days with at least 3 nights', () => {
    const days = [night('2026-10-19', 300), night('2026-10-20', 100), night('2026-10-21', 200), night('2026-10-10', 999)];
    expect(usualWake(days, '2026-10-21')).toBe(200);
  });
  it('is undefined with fewer than 3 nights in the last 8 days', () => {
    expect(usualWake([night('2026-10-20', 100), night('2026-10-21', 200)], '2026-10-21')).toBeUndefined();
  });
});
