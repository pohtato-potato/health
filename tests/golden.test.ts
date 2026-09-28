import { describe, expect, it } from 'vitest';
import { goldenMoments, type GoldenInput } from '../src/domain/golden';
import type { Rings } from '../src/domain/rings';
import type { Targets } from '../src/domain/types';

const T: Targets = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 4 };
const ring = (closed: boolean) => ({ value: 0, progress: closed ? 1 : 0.5, closed });
const perfect: Rings = { kcal: { ...ring(true), state: 'in' }, protein: ring(true), steps: ring(true), closed: 3, perfect: true };
const base: GoldenInput = { date: '2026-10-14', rings: perfect, targets: T, slots: 1, ticked: 1, trained: true, records: [], day: { date: '2026-10-14', steps: 11000, waterMl: 3200, sleep: { asleep: 1380, woke: 420 } } };

describe('golden moments', () => {
  it('celebrates a day where everything landed', () => {
    expect(goldenMoments(base).map((g) => g.key)).toEqual(['golden:everything:2026-10-14']);
    expect(goldenMoments({ ...base, trained: false })).toEqual([]);
    expect(goldenMoments({ ...base, ticked: 0 })).toEqual([]);
  });

  it('spots a palindrome step count', () => {
    const g = goldenMoments({ ...base, trained: false, day: { date: base.date, steps: 12321 } });
    expect(g.map((x) => x.title)).toEqual(['12,321 steps']);
  });

  it('marks a perfect arrival, a festive perfect day and a record on a perfect day', () => {
    const g = goldenMoments({ ...base, date: '2026-11-08', trained: false, city: 'Nagpur', records: ['Goblet squat'] });
    expect(g.map((x) => x.key)).toEqual(['golden:arrival:Nagpur', 'golden:festive:2026-11-08', 'golden:record-perfect:2026-11-08']);
    expect(g[2].title).toBe('A record on goblet squat');
  });
});
