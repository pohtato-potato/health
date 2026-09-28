import { addDays, daysBetween, type DayKey } from './dates';
import { weightTrend } from './streaks';
import type { Day, FoodEntry, Measurement, Targets } from './types';

/** Roughly what a kilo of body weight is worth in stored energy. */
export const KCAL_PER_KG = 7700;

export interface Maintenance {
  kcal: number;
  /** Days with food logged in the window. */
  days: number;
  intake: number;
  /** Trend change over the window, kg: negative is a loss. */
  change: number;
  perWeek: number;
}

/**
 * Maintenance from your own numbers: what you ate, and what the weight trend
 * did about it. Only full days count (800 kcal or more logged), and it needs
 * two weeks of them, with the trend running across the whole window.
 */
export function estimateMaintenance(days: Day[], entries: FoodEntry[], today: DayKey, windowDays = 28): Maintenance | undefined {
  const from = addDays(today, -windowDays);
  const to = addDays(today, -1);
  const kcal = new Map<DayKey, number>();
  for (const e of entries) if (e.date >= from && e.date <= to) kcal.set(e.date, (kcal.get(e.date) ?? 0) + e.kcal);
  const full = [...kcal.values()].filter((v) => v >= 800);
  if (full.length < 14) return undefined;
  const trend = weightTrend(days.filter((d) => d.weightKg !== undefined && d.date <= to).map((d) => ({ date: d.date, kg: d.weightKg! })));
  const start = [...trend].reverse().find((t) => t.date <= from) ?? trend.find((t) => t.date <= addDays(from, 3));
  const end = [...trend].reverse().find((t) => t.date <= to);
  if (!start || !end) return undefined;
  const span = daysBetween(start.date, end.date);
  if (span < 14) return undefined;
  const intake = full.reduce((a, b) => a + b, 0) / full.length;
  const change = end.trend - start.trend;
  const est = intake - (change * KCAL_PER_KG) / span;
  return { kcal: Math.round(est / 10) * 10, days: full.length, intake: Math.round(intake), change: Math.round(change * 100) / 100, perWeek: Math.round((change / span) * 7 * 100) / 100 };
}

/** This week's average intake against maintenance: positive means under it. */
export function weeklyGap(maintenance: number, entries: FoodEntry[], weekFrom: DayKey, today: DayKey) {
  const kcal = new Map<DayKey, number>();
  for (const e of entries) if (e.date >= weekFrom && e.date < today) kcal.set(e.date, (kcal.get(e.date) ?? 0) + e.kcal);
  const full = [...kcal.values()].filter((v) => v >= 800);
  if (!full.length) return undefined;
  const avg = full.reduce((a, b) => a + b, 0) / full.length;
  const gap = maintenance - avg;
  return { avg: Math.round(avg), gap: Math.round(gap), kgPerWeek: Math.round(((gap * 7) / KCAL_PER_KG) * 100) / 100, days: full.length };
}

export interface Suggestion {
  id: 'slow-down' | 'more-steps';
  title: string;
  text: string;
  change: Partial<Targets>;
}

/**
 * Gentle suggestions, never automatic. Losing too fast means eating a little
 * more; a long stall means walking more first. Food never goes down from here:
 * that stays a decision for you, not the app.
 */
export function suggestTargets(t: Targets, m: Maintenance, weightKg: number, flatWeeks: number): Suggestion | undefined {
  if (m.perWeek < -0.01 * weightKg) {
    return {
      id: 'slow-down',
      title: 'Losing faster than planned',
      text: `The trend is falling about ${Math.abs(m.perWeek).toFixed(1)} kg a week, more than 1% of your weight. That speed can cost muscle and energy. About 150 kcal more a day brings it back into the sweet spot.`,
      change: { kcalMin: t.kcalMin + 150, kcalMax: t.kcalMax + 150 },
    };
  }
  if (flatWeeks >= 3 && t.steps < 14000) {
    return {
      id: 'more-steps',
      title: `Flat for ${flatWeeks} weeks`,
      text: `The trend has barely moved in ${flatWeeks} weeks. Before touching food, try ${(t.steps + 1000).toLocaleString('en-IN')} steps a day for a fortnight: it's the gentlest lever there is.`,
      change: { steps: t.steps + 1000 },
    };
  }
  return undefined;
}

export interface Plateau {
  days: number;
  change: number;
  waistChange?: number;
  overDays: number;
  logged: number;
}

/**
 * A flat stretch: the trend within 0.2 kg for two weeks or more. Says how long,
 * whether the waist moved meanwhile, and how often calories ran over.
 */
export function plateau(days: Day[], entries: FoodEntry[], measurements: Measurement[], today: DayKey, kcalMax: (d: DayKey) => number): Plateau | undefined {
  const trend = weightTrend(days.filter((d) => d.weightKg !== undefined && d.date <= today).map((d) => ({ date: d.date, kg: d.weightKg! })));
  if (trend.length < 10) return undefined;
  const last = trend[trend.length - 1];
  let first = last;
  for (let i = trend.length - 1; i >= 0; i--) {
    if (Math.abs(trend[i].trend - last.trend) > 0.2) break;
    first = trend[i];
  }
  const span = daysBetween(first.date, last.date);
  if (span < 14) return undefined;
  const waists = measurements.filter((m) => m.waistStanding !== undefined);
  const w0 = [...waists].reverse().find((m) => m.date <= first.date) ?? waists.find((m) => m.date >= first.date);
  const w1 = waists[waists.length - 1];
  const kcal = new Map<DayKey, number>();
  for (const e of entries) if (e.date >= first.date && e.date <= last.date) kcal.set(e.date, (kcal.get(e.date) ?? 0) + e.kcal);
  return {
    days: span,
    change: Math.round((last.trend - first.trend) * 10) / 10,
    waistChange: w0 && w1 && w1.date > w0.date ? Math.round((w1.waistStanding! - w0.waistStanding!) * 10) / 10 : undefined,
    overDays: [...kcal.entries()].filter(([d, v]) => v > kcalMax(d)).length,
    logged: kcal.size,
  };
}

/** Whole weeks the trend has stayed within 0.2 kg. */
export function flatWeeks(p: Plateau | undefined): number {
  return p ? Math.floor(p.days / 7) : 0;
}
