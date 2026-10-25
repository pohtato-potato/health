import { addDays, daysBetween, type DayKey } from '../domain/dates';
import { ALL_STATES, ALL_STOPS, CITIES, arrivals, crossings } from '../domain/walk';
import { CITY_FACTS } from './content/cities';
import { CITY_POINTS, INDIA_AREA_KM2, REGIONS } from './geo';

/** Everything an arrival shows, for any city on the walk. */
export interface ArrivalInfo {
  name: string;
  /** km from the start in Delhi. */
  km: number;
  date: DayKey;
  chapter: number;
  /** The day of the walk you arrived on. */
  dayN: number;
  /** Every step from the start to the end of that day. */
  steps: number;
  state: string;
  ut: boolean;
  /** The city's stamp number, in the order cities were first reached. */
  n: number;
  heightM: number;
  at: [number, number];
  /** The cities reached so far, on the map, in order. */
  trail: [number, number][];
  next?: { name: string; km: number };
  /** States and territories walked into by then, in order. */
  reached: string[];
}

/** A city's state or territory. The walk re-enters some states, so this comes from the city, not the km. */
function stateOf(city: string): { name: string; ut: boolean } {
  const name = CITY_FACTS[city]?.state ?? 'Delhi';
  return { name, ut: !!ALL_STATES.find((s) => s.name === name)?.ut };
}

/** Arrivals take over the screen only on Today or the Walk tab, and never over an open sheet (Steps, say). */
export function canPlayArrivalAt(hash: string): boolean {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  return (path === '' || path === '/today' || path === '/walk') && !new URLSearchParams(query).has('sheet');
}

const firstOf = <T extends { name: string }>(xs: T[]) => {
  const seen = new Set<string>();
  return xs.filter((x) => !seen.has(x.name) && seen.add(x.name));
};

/**
 * An arrival at a city: its first, or the one in a given chapter (some cities are met again later in the walk).
 * Undefined if it hasn't been reached, or isn't on the walk.
 */
export function arrivalFor(name: string, stepsByDay: Map<DayKey, number>, startDay: DayKey, chapter?: number): ArrivalInfo | undefined {
  const all = arrivals(stepsByDay);
  const a = all.find((x) => x.name === name && (chapter === undefined || x.chapter === chapter));
  if (!a) return undefined;
  const firsts = firstOf(all);
  const upTo = all.filter((x) => x.km <= a.km);
  const stopIndex = ALL_STOPS.findIndex((s) => s.km === a.km);
  const next = ALL_STOPS[stopIndex + 1];
  const st = stateOf(name);
  return {
    name,
    km: a.km,
    date: a.date,
    chapter: a.chapter,
    dayN: daysBetween(startDay, a.date) + 1,
    steps: [...stepsByDay].filter(([d]) => d <= a.date).reduce((n, [, s]) => n + s, 0),
    state: st.name,
    ut: st.ut,
    n: firsts.findIndex((x) => x.name === name) + 1,
    heightM: CITY_FACTS[name]?.heightM ?? 0,
    at: CITY_POINTS[name] ?? [0, 0],
    trail: upTo.map((x) => CITY_POINTS[x.name]).filter((p): p is [number, number] => !!p),
    next: next && { name: next.name, km: next.km - a.km },
    reached: firstOf(ALL_STATES.filter((s) => s.km <= a.km)).map((s) => s.name),
  };
}

/** The seen key for an arrival, as the app has always written it: chapter 1 by name, later chapters with theirs. */
export const arrivalKey = (name: string, chapter: number) => (chapter === 1 ? `city:${name}` : `city:${chapter}:${name}`);

/**
 * The arrival to play now: of the cities reached on a day saved today or yesterday and not yet seen, the farthest.
 * The others are stamped quietly (their keys are returned to be marked seen). The start never plays.
 */
export function arrivalToPlay(stepsByDay: Map<DayKey, number>, today: DayKey, seen: Set<string>): { city?: { name: string; chapter: number; key: string }; quiet: string[] } {
  const yesterday = addDays(today, -1);
  const fresh = arrivals(stepsByDay)
    .filter((a) => a.km > 0 && a.date >= yesterday)
    .map((a) => ({ name: a.name, chapter: a.chapter, key: arrivalKey(a.name, a.chapter) }))
    .filter((a) => !seen.has(a.key));
  const play = fresh.at(-1);
  return { city: play, quiet: fresh.slice(0, -1).map((a) => a.key) };
}

/** The latest new state line crossed on a day saved today or yesterday. */
export function stateLineToPlay(stepsByDay: Map<DayKey, number>, today: DayKey, seen: Set<string>): { state?: string; key?: string } {
  const yesterday = addDays(today, -1);
  const line = firstOf(crossings(stepsByDay, ALL_STATES))
    .filter((s) => s.km > 0 && s.date >= yesterday && !seen.has(`state:${s.name}`))
    .at(-1);
  return line ? { state: line.name, key: `state:${line.name}` } : {};
}

export interface PassportPage {
  state: string;
  ut: boolean;
  date: DayKey;
  cities: { name: string; date: DayKey; n: number }[];
}

/** A page per state or territory reached, in order, with the cities first reached there. */
export function passportPages(stepsByDay: Map<DayKey, number>): PassportPage[] {
  const cities = firstOf(arrivals(stepsByDay)).map((c, i) => ({ ...c, n: i + 1, state: stateOf(c.name).name }));
  return firstOf(crossings(stepsByDay, ALL_STATES)).map((s) => ({
    state: s.name,
    ut: !!s.ut,
    date: s.date,
    cities: cities.filter((c) => c.state === s.name).map((c) => ({ name: c.name, date: c.date, n: c.n })),
  }));
}

export function passportCounts(pages: PassportPage[]): { states: number; uts: number } {
  return { states: pages.filter((p) => !p.ut).length, uts: pages.filter((p) => p.ut).length };
}

/** The share of India's area you've walked into. */
export function areaShare(pages: PassportPage[]): number {
  const area = new Map((REGIONS.india.states ?? []).map((s) => [s.name, s.areaKm2]));
  return pages.reduce((n, p) => n + (area.get(p.state) ?? 0), 0) / INDIA_AREA_KM2;
}

/** How many cities there are to stamp in all. */
export const CITY_COUNT = CITIES.length;
