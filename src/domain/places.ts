import { maintenanceKcal, targetsAt } from './occasions';
import { DEFAULT_MEAL_TIMES, type Day, type Place, type Settings, type Status, type Targets } from './types';
import { addDays, type DayKey } from './dates';

/** Used when no places are set up yet. */
const FALLBACK_HOME: Place = { id: 'home', name: 'Home', kind: 'home', meals: DEFAULT_MEAL_TIMES.home, eased: false, foodsFirst: 'home' };

/** The first home place, which every unset day falls back to. */
export function homePlace(settings: Pick<Settings, 'places'>): Place {
  const places = settings.places ?? [];
  return places.find((p) => p.kind === 'home') ?? places[0] ?? FALLBACK_HOME;
}

/**
 * Where a day happens. With a time, a mid-day change made before that time wins;
 * without one, the place the day started at.
 */
export function placeFor(day: Pick<Day, 'place' | 'placeChanges'> | undefined, settings: Pick<Settings, 'places'>, at?: number): Place {
  const places = settings.places ?? [];
  let id = day?.place;
  if (at !== undefined && day?.placeChanges?.length) {
    for (const c of [...day.placeChanges].sort((a, b) => a.at - b.at)) if (c.at <= at) id = c.place;
  }
  return places.find((p) => p.id === id) ?? homePlace(settings);
}

/** Office, trip, a status, or the day after a night out: the step goal eases. */
export function isEased(day: Pick<Day, 'status' | 'eased'> | undefined, place: Pick<Place, 'eased'>): boolean {
  return place.eased || !!day?.status || !!day?.eased;
}

export function statusOn(day: Pick<Day, 'status'> | undefined): Status | undefined {
  return day?.status;
}

/** Every day with a status on: streaks pause through them. */
export function pausedDays(days: Pick<Day, 'date' | 'status'>[]): Set<DayKey> {
  return new Set(days.filter((d) => d.status).map((d) => d.date));
}

/** Runs of consecutive days with the same status. */
export function statusRuns(days: Pick<Day, 'date' | 'status'>[]): { from: DayKey; to: DayKey; status: Status }[] {
  const out: { from: DayKey; to: DayKey; status: Status }[] = [];
  for (const d of [...days].filter((x) => x.status).sort((a, b) => a.date.localeCompare(b.date))) {
    const last = out[out.length - 1];
    if (last && last.status === d.status && addDays(last.to, 1) === d.date) last.to = d.date;
    else out.push({ from: d.date, to: d.date, status: d.status! });
  }
  return out;
}

/** The day's targets: maintenance calories while a status is on. */
export function targetsFor(day: Pick<Day, 'date' | 'status'>, settings: Pick<Settings, 'targets' | 'occasions' | 'maintenance'>): Targets | undefined {
  const t = targetsAt(settings, day.date);
  if (!t || !day.status) return t;
  return { ...t, kcalMax: Math.max(t.kcalMax, maintenanceKcal(settings, t)) };
}
