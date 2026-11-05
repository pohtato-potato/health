import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { dueItems } from '../src/domain/dueLines';
import type { MonthInput } from '../src/domain/monthReport';
import { almanac, dayOneAgainstToday, mostOf, yearOffered, yearReplay } from '../src/domain/yearPage';
import { addDays } from '../src/domain/dates';
import type { Day, FoodEntry, SetEntry, TrainingSession } from '../src/domain/types';

const TODAY = '2026-11-05';
const settingsAt = (y: number, m: number, d: number) => ({ ...defaultSettings(), createdAt: new Date(y, m - 1, d, 12).getTime() });
const input = (o: Partial<MonthInput> = {}): MonthInput => ({ today: TODAY, settings: settingsAt(2026, 9, 1), days: [], entries: [], sessions: [], sets: [], sightings: [], songs: [], ...o });
const food = (date: string, name: string) => ({ id: date + name, date, name, kind: 'quick', kcal: 100, protein: 10, at: 0 }) as unknown as FoodEntry;
const session = (date: string) => ({ id: date, date, status: 'done', startedAt: 0 }) as TrainingSession;

describe('yearOffered', () => {
  const s = settingsAt(2025, 11, 1);
  it('on the anniversary and the week after', () => {
    expect(yearOffered(s, '2026-11-01')).toBe(true);
    expect(yearOffered(s, '2026-11-07')).toBe(true);
  });
  it('not before, not long after', () => {
    expect(yearOffered(s, '2026-10-31')).toBe(false);
    expect(yearOffered(s, '2026-11-08')).toBe(false);
  });
  it('not in the first year', () => {
    expect(yearOffered(settingsAt(2026, 11, 1), '2026-11-02')).toBe(false);
  });
  it('comes back each year', () => expect(yearOffered(s, '2027-11-03')).toBe(true));
  it('a day that spans the new year still counts', () => {
    expect(yearOffered(settingsAt(2024, 12, 30), '2026-01-02')).toBe(true);
  });
  it('shows up in the due lines', () => {
    const items = dueItems({ today: '2026-11-02', settings: { ...s, backup: { ...s.backup, lastQuick: new Date(2026, 10, 2).getTime() } }, days: [], storySeenWeek: undefined });
    expect(items.map((i) => i.path)).toContain('/year');
  });
});

describe('almanac', () => {
  it('runs by month, oldest first, from the first month to this one', () => {
    const a = almanac(input({ days: [{ date: '2026-09-10', steps: 8000 }, { date: '2026-11-01', steps: 4000 }] }));
    expect(a.map((m) => m.month)).toEqual(['2026-09', '2026-10', '2026-11']);
  });
  it('a month with nothing says not logged, and no zeroes', () => {
    const a = almanac(input({ days: [{ date: '2026-09-10', steps: 8000 }, { date: '2026-11-01', steps: 4000 }] }));
    expect(a[1].lines).toEqual([]);
    expect(a[1].empty).toBe('Not logged.');
    expect(JSON.stringify(a[1])).not.toMatch(/\b0\b/);
  });
  it('a logged month counts what happened', () => {
    const a = almanac(input({ days: [{ date: '2026-09-10', steps: 8000 }, { date: '2026-09-11', sleep: { asleep: 1380, woke: 420 } }], sessions: [session('2026-09-12')] }));
    expect(a[0].lines.join(' ')).toMatch(/3 days logged/);
    expect(a[0].lines.join(' ')).toMatch(/1 session/);
    expect(a[0].lines.join(' ')).toMatch(/Best day: 8,000 steps on 10 Sep/);
  });
  it('is empty with no data', () => expect(almanac(input())).toEqual([]));
});

describe('mostOf', () => {
  it('lists the most logged foods and the most lifted exercises, by count', () => {
    const lists = mostOf(input({
      entries: [food('2026-10-01', 'Eggs'), food('2026-10-02', 'Eggs'), food('2026-10-03', 'Tofu')],
      sets: [{ date: '2026-10-01', exercise: 'Row' }, { date: '2026-10-01', exercise: 'Row', skipped: true }, { date: '2026-10-02', exercise: 'Press' }] as SetEntry[],
    }));
    expect(lists.find((l) => l.title === 'Most eaten')?.rows[0]).toEqual({ name: 'Eggs', value: '2 times' });
    expect(lists.find((l) => l.title === 'Most lifted')?.rows.map((r) => r.value)).toEqual(['1 set', '1 set']);
  });
  it('leaves out a list with nothing in it', () => {
    expect(mostOf(input())).toEqual([]);
  });
  it('counts song plays', () => {
    const lists = mostOf(input({ songs: [{ id: 'a', at: 0, artist: 'X', track: 'Y' }, { id: 'b', at: 1, artist: 'X', track: 'Y' }] as never }));
    expect(lists.find((l) => l.title === 'Most played')?.rows[0].value).toBe('2 plays');
  });
});

describe('dayOneAgainstToday', () => {
  it('sets the first two weeks against the latest two', () => {
    const days: Day[] = [
      ...Array.from({ length: 14 }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, steps: 5000 })),
      ...Array.from({ length: 14 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, steps: 9000 })),
    ];
    const row = dayOneAgainstToday(input({ days })).find((r) => r.label === 'Steps a day')!;
    expect(row.then).toBe('5,000');
    expect(row.now).toBe('9,000');
  });
  it('says not logged rather than zero', () => {
    const rows = dayOneAgainstToday(input({ days: [{ date: '2026-09-01', steps: 5000 }] }));
    const sleep = rows.find((r) => r.label === 'Sleep a night')!;
    expect(sleep.then).toBe('not logged');
    expect(sleep.now).toBe('not logged');
  });
});

describe('yearReplay', () => {
  it('has a frame per logged month and an ending', () => {
    const f = yearReplay(input({ days: [{ date: '2026-09-10', steps: 8000 }, { date: '2026-11-01', steps: 4000 }] }));
    expect(f.map((x) => x.title)).toEqual(['September 2026', 'November 2026', 'That is the year so far.']);
  });
  it('has nothing to play with no data', () => expect(yearReplay(input())).toEqual([]));
});

describe('a journey under four weeks', () => {
  it('still compares what came after the first two weeks, without overlap', () => {
    const days: Day[] = Array.from({ length: 24 }, (_, i) => ({ date: addDays('2026-09-27', i), steps: i < 14 ? 5000 : 9000 }));
    const row = dayOneAgainstToday(input({ days })).find((r) => r.label === 'Steps a day')!;
    expect(row.then).toBe('5,000');
    expect(row.now).toBe('9,000');
  });
});
