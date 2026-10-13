import { describe, expect, it } from 'vitest';
import { recordShot, strengthForecast } from '../src/domain/strengthForecast';
import type { ExerciseDef } from '../src/domain/plan';
import type { SetEntry } from '../src/domain/types';

let n = 0;
const set = (date: string, loadKg: number, reps: number, extra: Partial<SetEntry> = {}): SetEntry => ({ id: `s${++n}`, sessionId: date, date, session: 'A', exerciseId: 'row', exercise: 'Row', setNo: 1, side: 'both', loadKg, reps, at: n, ...extra });
const row: ExerciseDef = { id: 'row', order: '1', name: 'Row', sets: 3, reps: [10, 15], load: 'single' };

describe('strength forecasts', () => {
  it('no forecast under 3 sessions', () => {
    expect(strengthForecast(row, [set('2026-10-01', 10, 10), set('2026-10-05', 10, 12)], { kg: 15, reps: 12 })).toBeUndefined();
  });

  it('a steady climb gives a date with a range around it', () => {
    const sets = [set('2026-09-01', 10, 10), set('2026-09-08', 10, 12), set('2026-09-15', 10, 14), set('2026-09-22', 12.5, 10), set('2026-09-29', 12.5, 12)];
    const f = strengthForecast(row, sets, { kg: 15, reps: 12 })!;
    expect(f.date! > '2026-09-29').toBe(true);
    expect(f.range![0] <= f.date!).toBe(true);
    expect(f.range![1] >= f.date!).toBe(true);
  });

  it('no date when strength is flat or falling', () => {
    const flat = [set('2026-09-01', 10, 12), set('2026-09-08', 10, 12), set('2026-09-15', 10, 11)];
    expect(strengthForecast(row, flat, { kg: 15, reps: 12 })?.date).toBeUndefined();
  });

  it('record shot when within 2 reps', () => {
    const sets = [set('2026-09-01', 10, 15), set('2026-09-08', 10, 14)];
    expect(recordShot(row, sets)).toBe('2 reps from a row record');
    expect(recordShot(row, [set('2026-09-01', 10, 15), set('2026-09-08', 10, 15)])).toBe('1 rep from a row record');
    expect(recordShot(row, [set('2026-09-01', 10, 15), set('2026-09-08', 10, 10)])).toBeUndefined();
    expect(recordShot(row, [set('2026-09-01', 10, 15)])).toBeUndefined();
  });
});
