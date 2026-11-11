import { describe, expect, it } from 'vitest';
import { isOfficeDay, officeUsual } from '../src/domain/officeUsual';
import type { FoodEntry } from '../src/domain/types';

const places = [{ id: 'home', kind: 'home' as const }, { id: 'work', kind: 'office' as const }];
const day = (place: string) => ({ place });
const e = (date: string, name: string, kcal: number, meal: FoodEntry['meal'] = 'lunch', extra: Partial<FoodEntry> = {}): FoodEntry => ({ id: `${date}${name}`, date, meal, at: 0, kind: 'quick', name, portion: '', kcal, protein: 20, ...extra });

describe('one tap for the office usual (y-office)', () => {
  const days = new Map([['2026-11-03', day('work')], ['2026-11-05', day('work')], ['2026-11-06', day('home')], ['2026-11-10', day('work')]]);
  const salad = (d: string) => [e(d, 'Salad from home', 320), e(d, 'Protein shake', 120)];
  it('knows an office day by its place', () => {
    expect(isOfficeDay(day('work'), places)).toBe(true);
    expect(isOfficeDay(day('home'), places)).toBe(false);
    expect(isOfficeDay(undefined, places)).toBe(false);
  });
  it('offers the lunch that repeats on office days', () => {
    const entries = [...salad('2026-11-03'), ...salad('2026-11-05'), e('2026-11-06', 'Rajma', 500), ...salad('2026-11-10')];
    const u = officeUsual('lunch', days, places, entries, '2026-11-12');
    expect(u.map((x) => x.name).sort()).toEqual(['Protein shake', 'Salad from home']);
    expect(u.reduce((n, x) => n + x.kcal, 0)).toBe(440);
  });
  it('home days do not count, and one office day is not a usual', () => {
    expect(officeUsual('lunch', days, places, [...salad('2026-11-06'), ...salad('2026-11-03')], '2026-11-12')).toEqual([]);
  });
  it('no offer when office lunches differ', () => {
    const entries = [e('2026-11-03', 'Thali', 600), e('2026-11-05', 'Dosa', 400), e('2026-11-10', 'Wrap', 450)];
    expect(officeUsual('lunch', days, places, entries, '2026-11-12')).toEqual([]);
  });
  it('breakfast works the same when it repeats', () => {
    const entries = ['2026-11-03', '2026-11-05'].map((d) => e(d, 'Besan cheela', 300, 'breakfast'));
    expect(officeUsual('breakfast', days, places, entries, '2026-11-12')).toHaveLength(1);
  });
});
