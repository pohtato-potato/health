import { addDays, type DayKey } from '../domain/dates';
import type { RouteRun } from '../domain/types';
import { ALL_STATES, arrivals, crossings, kmFromSteps } from '../domain/walk';
import { routeById } from './catalogue';
import { routeKm } from './runs';

export interface WeekWalk {
  km: number;
  /** The running total before Monday and after Sunday. */
  fromKm: number;
  toKm: number;
  /** Cities and state lines first reached this week, in route order. */
  cities: string[];
  states: string[];
  /** Each joined route walked this week, with its km this week; `done` when it was finished this week. */
  routes: { id: string; name: string; km: number; done: boolean }[];
}

const upTo = (steps: Map<DayKey, number>, last: DayKey) => new Map([...steps].filter(([d]) => d <= last));
const total = (steps: Map<DayKey, number>) => [...steps.values()].reduce((n, s) => n + kmFromSteps(s), 0);

/** The week from Monday `from` to Sunday on the road: for the Monday story. */
export function weekWalk(from: DayKey, steps: Map<DayKey, number>, runs: RouteRun[]): WeekWalk {
  const to = addDays(from, 6);
  const before = upTo(steps, addDays(from, -1));
  const after = upTo(steps, to);
  const fromKm = total(before);
  const toKm = total(after);
  const inWeek = (d: DayKey) => d >= from && d <= to;
  const firsts = <T extends { name: string; date: DayKey }>(xs: T[]) => {
    const seen = new Set<string>();
    return xs.filter((x) => !seen.has(x.name) && seen.add(x.name)).filter((x) => inWeek(x.date)).map((x) => x.name);
  };
  const routes = runs.flatMap((run) => {
    const def = routeById(run.id);
    if (!def) return [];
    const was = routeKm(run, def, before);
    const now = routeKm(run, def, after);
    return now > was ? [{ id: def.id, name: def.name, km: now - was, done: was < def.km && now >= def.km }] : [];
  });
  return {
    km: toKm - fromKm,
    fromKm,
    toKm,
    cities: firsts(arrivals(after)),
    states: firsts(crossings(after, ALL_STATES)),
    routes,
  };
}
