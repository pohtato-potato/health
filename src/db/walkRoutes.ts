import type { DayKey } from '../domain/dates';
import type { RouteRun } from '../domain/types';
import { kindOf, routeById } from '../walk/catalogue';
import { placesFree, routeKm, runState, stepsByDay } from '../walk/runs';
import { db } from './db';

/** Every run with its km so far, to know which are walking. */
async function standing(): Promise<{ runs: RouteRun[]; kmById: Map<string, number> }> {
  const [runs, days] = await Promise.all([db.routes.toArray(), db.days.toArray()]);
  const steps = stepsByDay(days);
  const kmById = new Map(runs.map((r) => [r.id, routeById(r.id) ? routeKm(r, routeById(r.id)!, steps) : 0]));
  return { runs, kmById };
}

const isOpen = (run: RouteRun) => run.spans.length > 0 && run.spans[run.spans.length - 1].to === undefined;

/** Start a span from today if a place of the route's kind is free. */
async function walkFrom(id: string, today: DayKey, run: RouteRun | undefined, story?: 'story' | 'places'): Promise<boolean> {
  const def = routeById(id)!;
  const { runs, kmById } = await standing();
  if (placesFree(runs, kmById)[kindOf(def)] < 1) return false;
  await db.routes.put(run ? { ...run, spans: [...run.spans, { from: today }] } : { id, spans: [{ from: today }], ...(story ? { story } : {}) });
  return true;
}

/** Join a route, or carry on with one you'd set down. A finished route stays finished. */
export async function joinRoute(id: string, today: DayKey, story?: 'story' | 'places'): Promise<'joined' | 'resumed' | 'no place' | 'finished'> {
  const def = routeById(id);
  if (!def) return 'no place';
  const run = await db.routes.get(id);
  if (run) {
    const { kmById } = await standing();
    if (runState(run, def, kmById.get(id) ?? 0) === 'finished') return 'finished';
    if (isOpen(run)) return 'resumed';
    return (await walkFrom(id, today, run)) ? 'resumed' : 'no place';
  }
  return (await walkFrom(id, today, undefined, story)) ? 'joined' : 'no place';
}

/** Set a route down: today's steps and the days after don't count until it's picked up. Progress is kept. */
export async function setRouteDown(id: string, today: DayKey): Promise<void> {
  const run = await db.routes.get(id);
  if (!run || !isOpen(run)) return;
  const spans = run.spans.map((s, i) => (i === run.spans.length - 1 ? { ...s, to: today } : s));
  await db.routes.put({ ...run, spans });
}

/** Pick a set-down route up again, from today, if a place is free. */
export async function pickRouteUp(id: string, today: DayKey): Promise<'picked up' | 'no place'> {
  const run = await db.routes.get(id);
  if (!run || !routeById(id)) return 'no place';
  if (isOpen(run)) return 'picked up';
  return (await walkFrom(id, today, run)) ? 'picked up' : 'no place';
}

/** Mark a route finished, on the day its finish moment was shown. */
export async function markRouteDone(id: string, day: DayKey): Promise<void> {
  const run = await db.routes.get(id);
  if (run && !run.doneOn) await db.routes.put({ ...run, doneOn: day });
}

export async function setRouteTarget(id: string, day: DayKey | undefined): Promise<void> {
  const run = await db.routes.get(id);
  if (!run) return;
  const { target: _, ...rest } = run;
  await db.routes.put(day ? { ...rest, target: day } : rest);
}

/** "Pause the story here" at a km, or resume with undefined. */
export async function pauseStory(id: string, km: number | undefined): Promise<void> {
  const run = await db.routes.get(id);
  if (!run) return;
  const { storyPauseKm: _, ...rest } = run;
  await db.routes.put(km === undefined ? rest : { ...rest, storyPauseKm: km });
}
