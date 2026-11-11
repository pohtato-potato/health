import { describe, expect, it } from 'vitest';
import { autoTrophies } from '../src/domain/trophies';
import { surprise, type BrowseInput } from '../src/domain/browse';
import { defaultSettings } from '../src/db/actions';
import type { Day } from '../src/domain/types';

const TODAY = '2026-11-05';
const input = (over: Partial<BrowseInput> = {}): BrowseInput => ({
  today: TODAY, settings: defaultSettings(), days: [], entries: [], sessions: [], sets: [], measurements: [], ...over,
});

describe('autoTrophies', () => {
  const days = [{ date: '2026-10-02', steps: 16204 }, { date: '2026-09-02', steps: 500 }] as Day[];

  it('gives up to 3, biggest step day first, and none without data', () => {
    const t = autoTrophies(input({ days }));
    expect(t.length).toBeLessThanOrEqual(3);
    expect(t[0]).toMatchObject({ value: '16,204', label: 'Most steps in a day' });
    expect(autoTrophies(input())).toEqual([]);
  });

  it('every label is 2 words or more, so tiles wrap alike', () => {
    for (const t of autoTrophies(input({ days }))) expect(t.label.split(' ').length).toBeGreaterThanOrEqual(2);
  });

  it('best month names the month with the most steps', () => {
    expect(autoTrophies(input({ days })).find((t) => t.id === 'month')?.value).toBe('Oct');
  });
});

describe('surprise', () => {
  const i = input({ days: Array.from({ length: 40 }, (_, n) => ({ date: `2026-09-${String((n % 28) + 1).padStart(2, '0')}`, steps: 9000 + n })) as Day[] });

  it('is stable for one seed', () => {
    expect(surprise('a', i)).toEqual(surprise('a', i));
  });

  it('returns nothing with no data', () => {
    expect(surprise('a', input())).toBeUndefined();
  });
});

