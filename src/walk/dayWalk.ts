import type { DayKey } from '../domain/dates';
import { ALL_STOPS, kmFromSteps } from '../domain/walk';

export interface DayWalk {
  fromKm: number;
  toKm: number;
  /** Cities passed during the day, in order. */
  passed: string[];
  next?: { name: string; km: number; kmLeft: number };
  /** Where the walker ends, from the morning (0) to the next stop (1). */
  frac: number;
}

/** A day on the main walk, for Close the day: where it started and ended, what it passed, and the next stop. */
export function dayWalk(date: DayKey, steps: Map<DayKey, number>): DayWalk {
  const fromKm = [...steps].filter(([d]) => d < date).reduce((n, [, s]) => n + kmFromSteps(s), 0);
  const toKm = fromKm + kmFromSteps(steps.get(date) ?? 0);
  const passed = ALL_STOPS.filter((s) => s.km > fromKm && s.km <= toKm).map((s) => s.name);
  const nextStop = ALL_STOPS.find((s) => s.km > toKm);
  const next = nextStop && { name: nextStop.name, km: nextStop.km, kmLeft: nextStop.km - toKm };
  const span = (next?.km ?? toKm) - fromKm;
  return { fromKm, toKm, passed, next, frac: span > 0 ? (toKm - fromKm) / span : 1 };
}
