// O42 finding 33: records on a closed day. Made-up days only.
import { describe, expect, it } from 'vitest';
import { dayRecords } from '../src/domain/dayRecords';
import type { Day, FoodEntry, SetEntry } from '../src/domain/types';

const d = (date: string, over: Partial<Day>) => ({ date, ...over }) as Day;
const meal = (date: string, protein: number) => ({ id: date + protein, date, protein, kcal: 500 }) as FoodEntry;

describe('dayRecords', () => {
  it('a step day past every earlier day is a record, with the old best and its date', () => {
    const r = dayRecords('2026-03-10', [d('2026-03-01', { steps: 12000 }), d('2026-03-05', { steps: 15000 }), d('2026-03-10', { steps: 18000 })], [], []);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'steps', value: '18,000', was: '15,000', wasOn: '2026-03-05' });
    expect(r[0].line).toBe('18,000 steps, past your best of 15,000 on 5 Mar.');
  });
  it('equal to the best, or a first day, is not a record', () => {
    expect(dayRecords('2026-03-10', [d('2026-03-05', { steps: 15000 }), d('2026-03-10', { steps: 15000 })], [], [])).toEqual([]);
    expect(dayRecords('2026-03-10', [d('2026-03-10', { steps: 15000 })], [], [])).toEqual([]);
  });
  it('sleep, protein and a marked set each count; calories never do', () => {
    const days = [d('2026-03-01', { sleep: { asleep: 1380, woke: 400 } }), d('2026-03-02', { sleep: { asleep: 1380, woke: 440 } })];
    const food = [meal('2026-03-01', 120), meal('2026-03-02', 90), meal('2026-03-02', 60)];
    const sets = [{ date: '2026-03-02', mark: '!!', exercise: 'Goblet squat' } as SetEntry];
    expect(dayRecords('2026-03-02', days, food, sets).map((x) => x.kind)).toEqual(['sleep', 'protein', 'training']);
  });
});
