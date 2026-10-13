import { addDays, dayRange, daysBetween, type DayKey } from './dates';
import { foodDaysFor } from './logged';
import { weightTrend } from './streaks';
import type { Day, FoodEntry, Measurement, Targets } from './types';

/**
 * What a kilo of trend weight is worth when projecting a weekly gap forward: Hall's tissue
 * densities at a typical Forbes split (about 9 % lean at 20 kg of fat).
 */
export const KCAL_PER_KG = Math.round((2 / 22) * 1820 + (20 / 22) * 9440);

export interface Maintenance {
  kcal: number;
  /** Days with food logged in the window. */
  days: number;
  intake: number;
  /** Trend change over the window, kg: negative is a loss. */
  change: number;
  perWeek: number;
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
export function suggestTargets(t: Targets, m: Pick<Maintenance, 'perWeek'>, weightKg: number, flatWeeks: number): Suggestion | undefined {
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

/* ------------------------------------------------------------------ */
/* v2: energy balance (Hall et al. 2011 tissue densities, Forbes split) */
/* ------------------------------------------------------------------ */

/** Energy stored in a kilo of fat tissue and of lean tissue (Hall et al., Lancet 2011). */
export const FAT_KCAL = 9440;
export const LEAN_KCAL = 1820;
/** Forbes' constant: the lean share of a weight change is C / (C + fat mass). */
export const FORBES_C = 2.0;
/** The trend moves a tenth of the way to each new weight; a likely water swing counts 0.3 as much. */
export const TREND_ALPHA = 0.1;
export const WATER_WEIGHT = 0.3;

/** The weight trend, day by day: an EWMA over weigh-ins, gaps filled by straight lines between them. */
export function trendWeight(days: Pick<Day, 'date' | 'weightKg'>[], waterDays: Set<DayKey>): { date: DayKey; trend: number }[] {
  const weighed = days.filter((d) => d.weightKg !== undefined).sort((a, b) => a.date.localeCompare(b.date));
  if (!weighed.length) return [];
  const out: { date: DayKey; trend: number }[] = [];
  let trend = weighed[0].weightKg!;
  for (let i = 0; i < weighed.length; i++) {
    const a = weighed[i];
    const b = weighed[i + 1];
    const span = b ? daysBetween(a.date, b.date) : 1;
    for (let k = 0; k < span; k++) {
      const date = addDays(a.date, k);
      const w = b ? a.weightKg! + ((b.weightKg! - a.weightKg!) * k) / span : a.weightKg!;
      const alpha = TREND_ALPHA * (waterDays.has(date) ? WATER_WEIGHT : 1);
      trend = i === 0 && k === 0 ? w : trend + alpha * (w - trend);
      out.push({ date, trend: Math.round(trend * 1000) / 1000 });
    }
  }
  return out;
}

/**
 * Fat mass in kg. With a waist: Relative Fat Mass (64 − 20 ÷ waist-to-height, men).
 * Without: Deurenberg's BMI and age formula (men).
 */
export function fatMassEstimate(heightCm: number, weightKg: number, age: number, whtr?: number): number {
  const pct = whtr ? 64 - 20 / whtr : 1.2 * (weightKg / (heightCm / 100) ** 2) + 0.23 * age - 16.2;
  return Math.max(3, (weightKg * Math.min(60, Math.max(5, pct))) / 100);
}

/**
 * Energy stored or lost as the trend moved from start to end, in kcal: lean share by Forbes
 * (C / (C + fat mass)), shifted toward fat when the waist-to-height ratio is shrinking.
 */
export function storedEnergyChange(trendStart: number, trendEnd: number, fatMass: number, whtrTrend = 0): number {
  const p = Math.min(0.6, Math.max(0.02, FORBES_C / (FORBES_C + fatMass) + 5 * whtrTrend));
  return (trendEnd - trendStart) * (p * LEAN_KCAL + (1 - p) * FAT_KCAL);
}

export interface MaintenanceModel {
  /** kcal a day, rounded to 10; undefined while holding with no estimate yet. */
  kcal?: number;
  /** ± kcal: wider with fewer logged days and weigh-ins. */
  band: number;
  status: 'updating' | 'holding';
  /** The working, in words, for the "how this is worked out" page. */
  method: string;
  logged: number;
  weighIns: number;
  intake?: number;
  perWeek?: number;
}

/** Holding (not updating) below these, in a 28-day window. */
export const MIN_LOGGED_DAYS = 10;
export const MIN_WEIGH_INS = 4;

/** Days a weigh-in is likely a water swing: the morning after a night out or a free meal. */
export function waterFlagDays(days: Pick<Day, 'date' | 'nightOut'>[], entries: Pick<FoodEntry, 'date' | 'kind'>[]): Set<DayKey> {
  const out = new Set<DayKey>();
  for (const d of days) if (d.nightOut) out.add(addDays(d.date, 1));
  for (const e of entries) if (e.kind === 'free') out.add(addDays(e.date, 1));
  return out;
}

/** Maintenance = average intake − stored-energy change per day, over the last 28 days. */
export function maintenanceModel(input: {
  days: Day[];
  entries: FoodEntry[];
  today: DayKey;
  heightCm?: number;
  age?: number;
  waistIn?: number;
  whtrTrend?: number;
  previous?: number;
  windowDays?: number;
}): MaintenanceModel {
  const window = input.windowDays ?? 28;
  const from = addDays(input.today, -window);
  const to = addDays(input.today, -1);
  const range = dayRange(from, to);
  const byDate = new Map(input.days.map((d) => [d.date, d]));
  const inWindow = input.entries.filter((e) => e.date >= from && e.date <= to);
  const food = foodDaysFor(range, byDate, inWindow);
  const weighIns = input.days.filter((d) => d.date >= from && d.date <= to && d.weightKg !== undefined).length;
  const holding = (why: string): MaintenanceModel => ({ kcal: input.previous, band: 0, status: 'holding', method: why, logged: food.counted.length, weighIns });
  if (food.counted.length < MIN_LOGGED_DAYS) return holding(`Holding: ${food.counted.length} of ${MIN_LOGGED_DAYS} logged days in the last ${window}.`);
  if (weighIns < MIN_WEIGH_INS) return holding(`Holding: ${weighIns} of ${MIN_WEIGH_INS} weigh-ins in the last ${window} days.`);

  const trend = trendWeight(input.days.filter((d) => d.date <= to), waterFlagDays(input.days, input.entries));
  const start = trend.find((t) => t.date >= from);
  const end = [...trend].reverse().find((t) => t.date <= to);
  if (!start || !end || daysBetween(start.date, end.date) < 14) return holding('Holding: the weight trend needs two weeks inside the window.');
  const span = daysBetween(start.date, end.date);
  const sums = new Map<DayKey, number>();
  for (const e of inWindow) if (food.counted.includes(e.date)) sums.set(e.date, (sums.get(e.date) ?? 0) + e.kcal);
  const intake = [...sums.values()].reduce((a, b) => a + b, 0) / food.counted.length;
  const weight = end.trend;
  const whtr = input.waistIn && input.heightCm ? (input.waistIn * 2.54) / input.heightCm : undefined;
  const fat = fatMassEstimate(input.heightCm ?? 175, weight, input.age ?? 30, whtr);
  const stored = storedEnergyChange(start.trend, end.trend, fat, input.whtrTrend);
  const kcal = Math.round((intake - stored / span) / 10) * 10;
  const p = Math.min(0.6, Math.max(0.02, FORBES_C / (FORBES_C + fat) + 5 * (input.whtrTrend ?? 0)));
  const band = Math.round(Math.min(400, Math.max(60, 120 * Math.sqrt(14 / food.counted.length) + 40 * Math.sqrt(8 / weighIns))) / 10) * 10;
  const method =
    `Intake averaged ${Math.round(intake).toLocaleString('en-IN')} kcal over ${food.counted.length} ${food.basis} days. ` +
    `The weight trend went from ${start.trend.toFixed(1)} to ${end.trend.toFixed(1)} kg in ${span} days. ` +
    `Stored energy is counted at 9,440 kcal per kg of fat and 1,820 per kg of lean (Hall et al., 2011), ` +
    `with ${Math.round(p * 100)}% of the change as lean (Forbes, at about ${fat.toFixed(0)} kg of fat). ` +
    `That is ${Math.round(stored / span)} kcal a day ${stored < 0 ? 'drawn from' : 'put into'} storage.`;
  return { kcal, band, status: 'updating', method, logged: food.counted.length, weighIns, intake: Math.round(intake), perWeek: Math.round(((end.trend - start.trend) / span) * 7 * 100) / 100 };
}
