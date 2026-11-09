// Freshness, form and ageing (spec §3.2, §3.3). Pure: each takes the days it needs and returns a number.
// Sick days are no data: they count as days off for freshness, and pause the form line and the ageing clock.
import { addDays, type DayKey } from '../../domain/dates';
import type { FbPlayer, PlayerKind } from '../players/types';
import type { RotationRules } from './rules';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Days looked back for freshness: it has always settled by then. */
const FRESH_LOOKBACK = 21;
/**
 * Freshness after `date`'s training, 60–100 (%). Each day trained right after another trained day costs 15%; each day
 * off (a rest day or a sick day) gives 20% back. A trait like Engine halves the cost.
 */
export function freshnessOn(trained: (d: DayKey) => boolean, date: DayKey, rules: RotationRules, costScale = 1): number {
  let f = 100;
  for (let d = addDays(date, -FRESH_LOOKBACK); d <= date; d = addDays(d, 1)) {
    if (!trained(d)) f += rules.freshnessReturn;
    else if (trained(addDays(d, -1))) f -= rules.freshnessCost * costScale;
    f = clamp(f, rules.freshnessFloor, 100);
  }
  return Math.round(f);
}

/** How many days the form line keeps (a little over four weeks). */
export const TRAIL_DAYS = 35;
/** Adds the day's overall to the trail (never on a sick day) and drops days older than the line shows. */
export function trailAfter(trail: [DayKey, number][] = [], date: DayKey, overall: number): [DayKey, number][] {
  const keep = trail.filter(([d]) => d < date && d > addDays(date, -TRAIL_DAYS));
  return [...keep, [date, overall]];
}
/** A new signing's first four weeks are its ramp; form only reads the line after it. */
export const FORM_RAMP = 28;
/** Form, −3 to +3: the change in the overall over four weeks, one point of form for every two of overall. */
export function formOf(trail: [DayKey, number][] = [], date: DayKey, signed?: DayKey): number {
  const from = signed ? addDays(signed, FORM_RAMP) : undefined;
  const past = trail.filter(([d]) => d <= date && (!from || d >= from));
  if (past.length < 2) return 0;
  const then = [...past].reverse().find(([d]) => d <= addDays(date, -28)) ?? past[0];
  const now = past[past.length - 1];
  return clamp(Math.round((now[1] - then[1]) / 2), -3, 3);
}

/** The match rating (spec §3.2): overall × freshness + form. */
export const matchRating = (p: Pick<FbPlayer, 'overall' | 'fresh' | 'form'>) => Math.max(1, Math.round((p.overall * (p.fresh ?? 100)) / 100 + (p.form ?? 0)));

/** Players that age (spec §3.3): exercises and walks. */
export const AGES: PlayerKind[] = ['exercise', 'long-walk', 'route-walker'];
/** Six weeks without a better growth attribute and a player is past his best. */
export const AGE_AFTER = 42;
/** Then the overall slips 1 every 2 weeks, toward its peak minus 8. */
export const AGE_EVERY = 14;
export const AGE_FLOOR = 8;

/** Days in (from, to] that were not sick days: the ageing clock pauses when you're ill. */
export function wellDays(from: DayKey, to: DayKey, sick: Set<DayKey>): number {
  let n = 0;
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) if (!sick.has(d)) n++;
  return n;
}

export interface AgeState { peakGrowth?: number; grewOn?: DayKey; pastBest?: DayKey }
/**
 * One day of ageing. `growthNow` is the sum of the player's growth attributes today (undefined: no data today). A new
 * best resets the clock and ends "past his best"; six well weeks without one start it.
 */
export function ageDay(s: AgeState, growthNow: number | undefined, date: DayKey, sick: Set<DayKey>, since: DayKey): AgeState {
  if (sick.has(date)) return s;
  if (growthNow != null && (s.peakGrowth == null || growthNow > s.peakGrowth)) return { peakGrowth: growthNow, grewOn: date };
  const from = s.grewOn ?? since;
  if (!s.pastBest && wellDays(from, date, sick) >= AGE_AFTER) return { ...s, grewOn: from, pastBest: date };
  return { ...s, grewOn: from };
}
/** The overall once ageing has had its say: 1 every 2 well weeks past his best, never below the peak minus 8. */
export function agedOverall(overall: number, best: number, pastBest: DayKey | undefined, date: DayKey, sick: Set<DayKey>): number {
  if (!pastBest) return overall;
  const drop = Math.floor(wellDays(pastBest, date, sick) / AGE_EVERY);
  return Math.min(overall, Math.max(overall - drop, best - AGE_FLOOR));
}
