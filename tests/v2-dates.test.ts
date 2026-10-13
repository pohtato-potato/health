import { afterEach, describe, expect, it, vi } from 'vitest';
import { atOn, dayKey, dayOfLogging, nudgeMinutes, partOfDay } from '../src/domain/dates';

afterEach(() => vi.useRealTimers());

describe('v2 time helpers', () => {
  it('nudgeMinutes wraps around midnight', () => {
    expect(nudgeMinutes(5, -15)).toBe(1430);
    expect(nudgeMinutes(1435, 15)).toBe(10);
    expect(nudgeMinutes(600, 15)).toBe(615);
  });

  it('atOn gives local time on that day', () => {
    const t = new Date(atOn('2026-10-11', 1290));
    expect([t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes()]).toEqual([2026, 9, 11, 21, 30]);
  });

  it('the day runs from 4 am to 4 am', () => {
    expect(dayOfLogging(new Date(2026, 9, 12, 3, 59).getTime())).toBe('2026-10-11');
    expect(dayOfLogging(new Date(2026, 9, 12, 4, 0).getTime())).toBe('2026-10-12');
    expect(dayOfLogging(new Date(2026, 9, 12, 0, 30).getTime(), '2026-10-09')).toBe('2026-10-09');
  });

  it('dayKey() with no date means today, by the 4 am rule; an explicit date is never shifted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 12, 1, 15));
    expect(dayKey()).toBe('2026-10-11');
    expect(dayKey(new Date(2026, 9, 12, 1, 15))).toBe('2026-10-12');
  });

  it('partOfDay', () => {
    expect(partOfDay(new Date(2026, 9, 12, 23, 59))).toBe('night');
    expect(partOfDay(new Date(2026, 9, 12, 0, 1))).toBe('night');
    expect(partOfDay(new Date(2026, 9, 12, 6, 0))).toBe('dawn');
    expect(partOfDay(new Date(2026, 9, 12, 12, 0))).toBe('day');
    expect(partOfDay(new Date(2026, 9, 12, 18, 0))).toBe('dusk');
  });
});
