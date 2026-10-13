import { addDays, daysBetween, type DayKey } from './dates';
import { fmtInt } from './format';
import type { MaintenanceModel } from './maintenance';
import type { Measurement, Targets } from './types';

/** Waist-to-height ratio, waist in inches. */
export function whtr(waistIn: number, heightCm: number): number {
  return Math.round(((waistIn * 2.54) / heightCm) * 10000) / 10000;
}

/** The athletic benchmark: below 0.5 first, then 0.45. */
export const WHTR_GOALS = [0.5, 0.45];

/** Where the waist-to-height ratio stands, the next goal, and when the trend reaches it. */
export function benchmarkProgress(measurements: Measurement[], heightCm: number, today: DayKey): { current: number; goal: number; projected?: DayKey; slope?: number } | undefined {
  const pts = measurements
    .filter((m) => m.waistStanding !== undefined && m.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ date: m.date, r: whtr(m.waistStanding!, heightCm) }));
  if (!pts.length) return undefined;
  const current = pts[pts.length - 1].r;
  const goal = WHTR_GOALS.find((g) => current >= g) ?? WHTR_GOALS[WHTR_GOALS.length - 1];
  if (pts.length < 3 || current < goal) return { current, goal };
  const t0 = pts[0].date;
  const xs = pts.map((p) => daysBetween(t0, p.date));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = pts.reduce((a, p) => a + p.r, 0) / pts.length;
  const vx = xs.reduce((n, x) => n + (x - mx) ** 2, 0);
  const slope = vx ? xs.reduce((n, x, i) => n + (x - mx) * (pts[i].r - my), 0) / vx : 0;
  if (slope >= 0) return { current, goal, slope };
  return { current, goal, slope, projected: addDays(pts[pts.length - 1].date, Math.ceil((goal - current) / slope)) };
}

/** Maintenance has to move this much before the weekly check-in speaks up. */
export const CHECK_IN_MOVE = 100;

/**
 * The weekly maintenance check-in: an offer, never a change. It proposes moving the calorie
 * range with maintenance only when that means more food; a lower maintenance is reported only.
 */
export function weeklyCheckIn(m: Pick<MaintenanceModel, 'kcal' | 'band' | 'status'>, targets: Targets, lastSeen: number | undefined): { text: string; proposal?: Partial<Targets> } | undefined {
  if (m.status !== 'updating' || m.kcal === undefined || lastSeen === undefined) return undefined;
  const move = m.kcal - lastSeen;
  if (Math.abs(move) < CHECK_IN_MOVE) return undefined;
  const text = `Maintenance moved to ${fmtInt(m.kcal)} (±${m.band}). Keep your targets, or adjust?`;
  return move > 0 ? { text, proposal: { kcalMin: targets.kcalMin + move, kcalMax: targets.kcalMax + move } } : { text };
}

/**
 * Waist ÷ height on a future date if the current trend holds, with a range that widens
 * the further out it is (a third of the expected change, plus a floor for tape error).
 */
export function benchmarkOn(b: { current: number; slope?: number }, today: DayKey, date: DayKey): { value: number; range: [number, number] } | undefined {
  if (b.slope === undefined) return undefined;
  const days = Math.max(0, daysBetween(today, date));
  const value = b.current + b.slope * days;
  const spread = 0.005 + Math.abs(b.slope * days) / 3;
  return { value, range: [value - spread, value + spread] };
}
