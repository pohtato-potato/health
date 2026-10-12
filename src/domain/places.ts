import { DEFAULT_MEAL_TIMES, type Day, type Place, type Settings } from './types';

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
