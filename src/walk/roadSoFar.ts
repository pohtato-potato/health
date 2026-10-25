import type { DayKey } from '../domain/dates';
import { ALL_STATES, CHAPTERS, arrivals, crossings } from '../domain/walk';

export interface RoadEvent {
  date: DayKey;
  km: number;
  name: string;
  chapter: number;
  kind: 'start' | 'city' | 'state' | 'chapter';
}

const RANK: Record<RoadEvent['kind'], number> = { start: 0, city: 1, state: 2, chapter: 3 };

/** Setting off, every city reached, every state or territory first entered and every chapter finished, in date order and route order within a day. */
export function roadSoFar(steps: Map<DayKey, number>): RoadEvent[] {
  const seen = new Set<string>();
  const states = crossings(steps, ALL_STATES)
    .filter((s) => !seen.has(s.name) && seen.add(s.name))
    .filter((s) => s.km > 0)
    .map((s) => ({ date: s.date, km: s.km, name: s.name, chapter: s.chapter, kind: 'state' as const }));
  const cities = arrivals(steps).map((a) => ({ ...a, kind: a.km === 0 ? ('start' as const) : ('city' as const) }));
  const ends = crossings(
    steps,
    CHAPTERS.map((c) => ({ name: c.name, km: c.end, chapter: c.n })),
  ).map((c) => ({ date: c.date, km: c.km, name: c.name, chapter: c.chapter, kind: 'chapter' as const }));
  return [...cities, ...states, ...ends].sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km || RANK[a.kind] - RANK[b.kind]);
}
