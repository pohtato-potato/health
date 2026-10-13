import type { DayKey } from './dates';
import type { ForecastRecord } from './types';

/**
 * Fills in the outcome of every forecast whose day has come, once. A forecast already
 * resolved keeps its outcome, so it is never counted twice.
 */
export function resolveAll(records: ForecastRecord[], today: DayKey, actual: (kind: string, date: DayKey) => number | undefined): ForecastRecord[] {
  return records.map((r) => {
    if (r.outcome !== undefined || r.targetDate > today) return r;
    const v = actual(r.kind, r.targetDate);
    return v === undefined ? r : { ...r, outcome: v };
  });
}

/** How often resolved forecasts of this kind landed inside their range. */
export function trackRecord(records: ForecastRecord[], kind: string): { hits: number; total: number } {
  const done = records.filter((r) => r.kind === kind && r.outcome !== undefined);
  return { hits: done.filter((r) => r.outcome! >= r.low && r.outcome! <= r.high).length, total: done.length };
}

/** "8 of 10 similar forecasts came true", or nothing until there is a history. */
export function recordLine(t: { hits: number; total: number }): string | undefined {
  return t.total ? `${t.hits} of ${t.total} similar forecast${t.total === 1 ? '' : 's'} came true` : undefined;
}
