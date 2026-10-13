import { daysBetween, dayKey, type DayKey } from '../domain/dates';
import { resolveAll } from '../domain/forecastStore';
import { whtr } from '../domain/benchmark';
import { db } from './db';
import { getSettings } from './actions';

/** Keeps a forecast when it is made; the same kind made again the same day replaces it. */
export async function saveForecast(f: { kind: string; targetDate: DayKey; low: number; high: number }, today: DayKey = dayKey()) {
  await db.forecasts.put({ id: `${f.kind}:${today}`, kind: f.kind, madeAt: Date.now(), targetDate: f.targetDate, low: f.low, high: f.high });
}

/** Resolves every forecast whose day has come, against the nearest reading within three days. */
export async function resolveForecasts(today: DayKey = dayKey()) {
  const [records, settings, measurements] = await Promise.all([db.forecasts.toArray(), getSettings(), db.measurements.toArray()]);
  const nearest = (date: DayKey) =>
    measurements
      .filter((m) => m.waistStanding !== undefined && Math.abs(daysBetween(m.date, date)) <= 3)
      .sort((a, b) => Math.abs(daysBetween(a.date, date)) - Math.abs(daysBetween(b.date, date)))[0];
  const actual = (kind: string, date: DayKey) => {
    if (kind === 'whtr' && settings.heightCm) {
      const m = nearest(date);
      return m ? whtr(m.waistStanding!, settings.heightCm) : undefined;
    }
    return undefined;
  };
  const next = resolveAll(records, today, actual);
  const changed = next.filter((r, i) => r !== records[i]);
  if (changed.length) await db.forecasts.bulkPut(changed);
}
