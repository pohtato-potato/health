import { describe, expect, it } from 'vitest';
import { dailyFinding, findingCandidates, type FindingInput } from '../src/domain/dailyFinding';
import { addDays } from '../src/domain/dates';
import type { Day, SetEntry } from '../src/domain/types';

const TODAY = '2026-11-05';
const sleep = (min: number) => ({ asleep: 1380, woke: (1380 + min) % 1440 });
/** 30 days where big step days are followed by longer nights. */
const days = (): Day[] => Array.from({ length: 30 }, (_, n) => {
  const date = addDays(TODAY, -1 - n);
  const big = n % 2 === 1; // The night logged on `date` follows the day before it.
  return { date, steps: n % 2 === 0 ? 12000 : 5000, sleep: sleep(big ? 460 : 400) } as Day;
});
const sets = (): SetEntry[] => [
  ...Array.from({ length: 4 }, (_, n) => ({ date: addDays(TODAY, -2 - n), reps: 10, cleanReps: 9 })),
  ...Array.from({ length: 4 }, (_, n) => ({ date: addDays(TODAY, -16 - n), reps: 10, cleanReps: 7 })),
] as SetEntry[];
const input = (over: Partial<FindingInput> = {}): FindingInput => ({ today: TODAY, days: days(), sets: sets(), ...over });

describe('dailyFinding', () => {
  it('holds for a whole day, whatever order the data arrives in', () => {
    const a = dailyFinding(TODAY, input());
    const b = dailyFinding(TODAY, input({ days: days().reverse(), sets: sets().reverse() }));
    expect(a?.id).toBeDefined();
    expect(b?.id).toBe(a?.id);
  });

  it('moves on across a week', () => {
    const ids = new Set(Array.from({ length: 7 }, (_, n) => {
      const date = addDays(TODAY, n);
      return dailyFinding(date, input({ today: date }))?.id;
    }));
    expect(ids.size).toBeGreaterThanOrEqual(2);
  });

  it('no data gives no finding', () => {
    expect(dailyFinding(TODAY, input({ days: [], sets: [] }))).toBeUndefined();
  });

  it('sleep finding reads in minutes and needs its minimum of nights', () => {
    const found = findingCandidates(input()).find((f) => f.id === 'sleep-after-steps');
    expect(found?.text).toBe('You sleep 60 minutes longer after a day over 10,000 steps.');
    const few = findingCandidates(input({ days: days().slice(0, 6) })).map((f) => f.id);
    expect(few).not.toContain('sleep-after-steps');
  });

  it('every finding has working in words', () => {
    const all = findingCandidates(input());
    expect(all.length).toBeGreaterThanOrEqual(3);
    for (const f of all) expect(f.working.length).toBeGreaterThan(10);
  });
});
