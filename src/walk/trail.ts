import type { DayKey } from '../domain/dates';
import { ALL_STOPS, kmFromSteps } from '../domain/walk';
import { pointAtKm } from './mapView';

type Pt = [number, number];

const totalWhere = (steps: Map<DayKey, number>, keep: (d: DayKey) => boolean) => [...steps].filter(([d]) => keep(d)).reduce((n, [, s]) => n + kmFromSteps(s), 0);

/** The month's stretch of the main walk, as running totals; undefined when nothing was walked that month. */
export function monthTrail(month: string, steps: Map<DayKey, number>): { fromKm: number; toKm: number } | undefined {
  const fromKm = totalWhere(steps, (d) => d < `${month}-01`);
  const toKm = totalWhere(steps, (d) => d.slice(0, 7) <= month);
  return toKm > fromKm ? { fromKm, toKm } : undefined;
}

/** The trail between two km on the India map: where you were, every stop passed in between, where you got to. */
export function trailBetween(fromKm: number, toKm: number): Pt[] {
  const between = ALL_STOPS.filter((s) => s.km > fromKm && s.km < toKm).map((s) => pointAtKm(s.km));
  return [pointAtKm(fromKm), ...between, pointAtKm(toKm)];
}
