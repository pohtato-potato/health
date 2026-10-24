import type { DayKey } from '../domain/dates';
import type { Day, RouteRun } from '../domain/types';
import { kmFromSteps } from '../domain/walk';
import { kindOf, routeById, type RouteDef } from './catalogue';

/** How many can be walked at once, of each kind. */
export const PLACES = { challenge: 2, expedition: 2 };

/** Steps by day, from days with steps saved. */
export function stepsByDay(days: Pick<Day, 'date' | 'steps'>[]): Map<DayKey, number> {
  return new Map(days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
}

const counts = (run: RouteRun, day: DayKey) => run.spans.some((s) => s.from <= day && (s.to === undefined || day < s.to));

/** The days the route was walked, in order: each counted once, however the spans overlap. */
function walkedDays(run: RouteRun, steps: Map<DayKey, number>): DayKey[] {
  return [...steps.keys()].filter((d) => counts(run, d)).sort();
}

/** How far you've walked this route, capped at its length. */
export function routeKm(run: RouteRun, def: Pick<RouteDef, 'km'>, steps: Map<DayKey, number>): number {
  const km = walkedDays(run, steps).reduce((n, d) => n + kmFromSteps(steps.get(d)!), 0);
  return Math.min(km, def.km);
}

/** The first day the running total reached the route's length. */
export function finishedOn(run: RouteRun, def: Pick<RouteDef, 'km'>, steps: Map<DayKey, number>): DayKey | undefined {
  let km = 0;
  for (const d of walkedDays(run, steps)) {
    km += kmFromSteps(steps.get(d)!);
    if (km >= def.km) return d;
  }
  return undefined;
}

/** Where a route stands, in the words shown with it. */
export function runState(run: RouteRun, def: Pick<RouteDef, 'km'>, km: number): 'walking' | 'set down' | 'finished' {
  if (run.doneOn || km >= def.km) return 'finished';
  const last = run.spans[run.spans.length - 1];
  return last && last.to === undefined ? 'walking' : 'set down';
}

/** Free places of each kind: two of each, minus the routes being walked (not set down, not finished). */
export function placesFree(runs: RouteRun[], kmById: Map<string, number>): { challenge: number; expedition: number } {
  const free = { ...PLACES };
  for (const run of runs) {
    const def = routeById(run.id);
    if (!def || runState(run, def, kmById.get(run.id) ?? 0) !== 'walking') continue;
    free[kindOf(def)] -= 1;
  }
  return { challenge: Math.max(0, free.challenge), expedition: Math.max(0, free.expedition) };
}
