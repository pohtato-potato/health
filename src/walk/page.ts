import type { DayKey } from '../domain/dates';
import { fmtInt } from '../domain/format';
import type { Day } from '../domain/types';
import { kmFromSteps, positionAt } from '../domain/walk';
import { HINDI } from './hindi';

/** Within this many km of a place, you're near it. */
export const NEAR_KM = 20;

export type WhereNow = { kind: 'near'; place: string } | { kind: 'between'; from: string; to: string } | { kind: 'end'; place: string };

/** Near the stop behind or ahead (within 20 km), between them otherwise, or at the end of the road. */
export function whereNow(km: number): WhereNow {
  const pos = positionAt(km);
  if (pos.done || !pos.to) return { kind: 'end', place: pos.from.name };
  if (km - pos.from.km <= NEAR_KM) return { kind: 'near', place: pos.from.name };
  if (pos.to.km - km <= NEAR_KM) return { kind: 'near', place: pos.to.name };
  return { kind: 'between', from: pos.from.name, to: pos.to.name };
}

export function whereLine(w: WhereNow): string {
  if (w.kind === 'end') return `${w.place}, the end of the road`;
  return w.kind === 'near' ? `Near ${w.place}` : `Between ${w.from} and ${w.to}`;
}

/** Days a usual day is drawn from, and the fewest that make it worth saying. */
const SAMPLE_DAYS = 28;
const MIN_DAYS = 7;

/**
 * A usual day and a big day, in km: the median and the 90th percentile (nearest rank) of the last 28 days before
 * today with steps. With fewer than 7 such days, 10 km and 15 km.
 */
export function usualAndBig(days: Pick<Day, 'date' | 'steps'>[], today: DayKey): { usualKm: number; bigKm: number; known: boolean } {
  const recent = days
    .filter((d) => d.date < today && d.steps !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, SAMPLE_DAYS)
    .map((d) => d.steps!)
    .sort((a, b) => a - b);
  if (recent.length < MIN_DAYS) return { usualKm: 10, bigKm: 15, known: false };
  const m = Math.floor(recent.length / 2);
  const median = recent.length % 2 ? recent[m] : (recent[m - 1] + recent[m]) / 2;
  const p90 = recent[Math.ceil(0.9 * recent.length) - 1];
  return { usualKm: kmFromSteps(median), bigKm: kmFromSteps(p90), known: true };
}

/** "about 6 weeks": a distance at your usual pace. */
export function timeAtPace(km: number, kmADay: number): string {
  const days = Math.max(1, Math.round(km / Math.max(kmADay, 0.1)));
  if (days < 14) return `about ${days} day${days === 1 ? '' : 's'}`;
  if (days < 75) return `about ${Math.round(days / 7)} weeks`;
  if (days < 540) return `about ${Math.round(days / 30)} months`;
  return `about ${(days / 365).toFixed(1)} years`;
}

/** What a usual day, and a big one, reach tomorrow. */
export function tomorrowLine(km: number, usualKm: number, bigKm: number): string | undefined {
  const pos = positionAt(km);
  if (pos.done || !pos.to) return undefined;
  const next = pos.to;
  if (km + usualKm >= next.km) return `Tomorrow: a usual day reaches ${next.name}.`;
  const usual = `Tomorrow: a usual day takes you to ${fmtInt(Math.ceil(next.km - km - usualKm))} km from ${next.name}.`;
  return km + bigKm >= next.km ? `${usual} A big day reaches it.` : usual;
}

/** The milestone at the road's edge: the next stop, in Hindi on its cap, and the whole km left. */
export function stoneFor(km: number): { name: string; hindi: string; km: number } | undefined {
  const pos = positionAt(km);
  if (pos.done || !pos.to) return undefined;
  return { name: pos.to.name, hindi: HINDI[pos.to.name] ?? pos.to.name, km: Math.ceil(pos.to.km - km) };
}

