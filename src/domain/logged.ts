import type { DayKey } from './dates';
import type { Day, FoodEntry } from './types';

export type FoodBasis = 'complete' | 'logged' | 'none';

/**
 * Which days count for food averages. Days marked complete win when there are any;
 * otherwise any day with at least one entry. A day with nothing logged never counts as zero.
 */
export function foodDaysFor(range: DayKey[], days: Map<DayKey, Pick<Day, 'foodDone'>>, entries: Pick<FoodEntry, 'date'>[]): { counted: DayKey[]; basis: FoodBasis } {
  const complete = range.filter((d) => days.get(d)?.foodDone);
  if (complete.length) return { counted: complete, basis: 'complete' };
  const withEntries = new Set(entries.map((e) => e.date));
  const logged = range.filter((d) => withEntries.has(d));
  return logged.length ? { counted: logged, basis: 'logged' } : { counted: [], basis: 'none' };
}

/** The mean, or undefined when there is nothing to average. */
export function avgOver(values: number[]): number | undefined {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
}

export function dayFoodLabel(day: Pick<Day, 'foodDone'> | undefined, entryCount: number): 'not-logged' | 'partial' | 'complete' {
  if (day?.foodDone) return 'complete';
  return entryCount ? 'partial' : 'not-logged';
}

/** "avg of 5 logged days", "avg of 3 complete days", or "not logged". */
export function basisLabel(n: number, basis: FoodBasis): string {
  if (basis === 'none') return 'not logged';
  return `avg of ${n} ${basis} day${n === 1 ? '' : 's'}`;
}
