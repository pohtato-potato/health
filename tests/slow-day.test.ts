import { describe, expect, it } from 'vitest';
import { comebacks, moodCard, rankOfLastWeek, todaysLift, type SlowInput } from '../src/domain/slowDay';
import { addDays } from '../src/domain/dates';
import { defaultSettings } from '../src/db/actions';
import type { Day } from '../src/domain/types';

const TODAY = '2026-11-05';
const input = (over: Partial<SlowInput> = {}): SlowInput => ({ days: [], sightings: [], settings: defaultSettings(), ...over });
const run = (from: string, n: number, steps = 9000): Day[] => Array.from({ length: n }, (_, i) => ({ date: addDays(from, i), steps }) as Day);

describe('todaysLift', () => {
  it('no lift with no data', () => {
    expect(todaysLift(TODAY, input())).toBeUndefined();
  });

  it('holds for a day', () => {
    const i = input({ days: run('2026-09-01', 60) });
    expect(todaysLift(TODAY, i)).toEqual(todaysLift(TODAY, input({ days: [...i.days].reverse() })));
  });

  it('skips kinds with nothing to say', () => {
    const lift = todaysLift(TODAY, input({ days: run('2026-11-01', 2) }));
    expect(lift?.kind).toBe('best');
  });
});

describe('rankOfLastWeek', () => {
  it('5 of 6 weeks reads beat 5 of 6, counting only logged weeks', () => {
    // Six Mondays before the last full week (26 Oct), with one unlogged week between.
    const weeks = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-19'];
    const days = [
      ...weeks.map((date, n) => ({ date, steps: n === 0 ? 90000 : 1000 + n }) as Day),
      { date: '2026-10-26', steps: 50000 } as Day,
    ];
    expect(rankOfLastWeek(TODAY, days)).toEqual({ beat: 5, of: 6 });
  });

  it('says nothing under 3 logged weeks, or when it beat none', () => {
    expect(rankOfLastWeek(TODAY, [{ date: '2026-10-26', steps: 5 } as Day])).toBeUndefined();
    const low = ['2026-10-05', '2026-10-12', '2026-10-19'].map((date) => ({ date, steps: 9000 }) as Day);
    expect(rankOfLastWeek(TODAY, [...low, { date: '2026-10-26', steps: 5 } as Day])).toBeUndefined();
  });
});

describe('comebacks', () => {
  it('a gap of 3 or more unlogged days counts; 2 does not', () => {
    const two = [...run('2026-10-01', 2), ...run('2026-10-05', 2)];
    expect(comebacks(two, TODAY).count).toBe(0);
    const three = [...run('2026-10-01', 2), ...run('2026-10-06', 2)];
    expect(comebacks(three, TODAY).count).toBe(1);
  });

  it('2 gaps of 4 and 9 give count 2, longestGap 9', () => {
    const d = [...run('2026-09-01', 3), ...run('2026-09-08', 3), ...run('2026-09-20', 3)];
    const c = comebacks(d, TODAY);
    expect(c.count).toBe(2);
    expect(c.longestGap).toBe(9);
  });

  it('the days since the last log are not a comeback yet', () => {
    expect(comebacks(run('2026-10-01', 3), TODAY).count).toBe(0);
  });

  it('back in days is the mean days from return to a usual step day', () => {
    const d = [
      ...run('2026-09-01', 10, 9000),
      { date: '2026-09-15', steps: 2000 } as Day,
      { date: '2026-09-16', steps: 9000 } as Day,
      ...run('2026-09-17', 5, 9000),
    ];
    expect(comebacks(d, TODAY).backInDays).toBe(1);
  });

  it('absent with no gaps', () => {
    expect(comebacks(run('2026-10-01', 5), TODAY).backInDays).toBeUndefined();
  });
});

describe('moodCard', () => {
  it('tired never owes anything: the line has no number to hit', () => {
    const c = moodCard('tired', TODAY, input({ days: run('2026-10-01', 20) }));
    expect(c.line).toMatch(/Nothing is owed/);
    expect(c.line).not.toMatch(/\d/);
  });

  it('off plan states the record when there is one', () => {
    const d = [...run('2026-09-01', 3), ...run('2026-09-08', 3), ...run('2026-09-20', 3)];
    expect(moodCard('off', TODAY, input({ days: d })).line).toMatch(/come back 2 times.*longest gap was 9 days/i);
  });

  it('off plan with no gaps yet still has a kind card', () => {
    expect(moodCard('off', TODAY, input()).line.length).toBeGreaterThan(10);
  });

  it('bored uses the stat, and without one is never empty', () => {
    expect(moodCard('bored', TODAY, input(), { text: 'A fact' }).line).toBe('A fact');
    expect(moodCard('bored', TODAY, input()).line.length).toBeGreaterThan(10);
  });

  it('every mood has a Gremlin line', () => {
    for (const m of ['tired', 'off', 'bored'] as const) expect(moodCard(m, TODAY, input()).gremlin.length).toBeGreaterThan(5);
  });
});
