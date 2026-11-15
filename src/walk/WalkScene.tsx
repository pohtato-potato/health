import { partOfDay, type PartOfDay } from '../domain/dates';
import { positionAt } from '../domain/walk';
import type { Festive } from './art/festive';
import { approachScale } from './art/land';
import { landmarkFor } from './art/landmarks';
import { Layered } from './art/Layered';
import { regionAt } from './regions';
import { isFullMoon, meteorShower, moonPhase, skyNight } from './sky';

/** In development, `?hour=dawn` (or day, dusk, night) on any page shows the scene at that hour, for design checks. */
function devHour(): PartOfDay | undefined {
  if (!import.meta.env.DEV || typeof location === 'undefined') return undefined;
  const h = new URLSearchParams(location.hash.split('?')[1] ?? '').get('hour');
  return h === 'dawn' || h === 'day' || h === 'dusk' || h === 'night' ? h : undefined;
}

/**
 * The scene for where the walk is, in layered dusk: the region's land at this hour, the landmark ahead rising as you
 * near it (or a named place's landmark), tonight's moon and meteors, the theme's sky. The Walk tab, its road pages,
 * Today's banner, an arrival and a postcard all draw it.
 */
export function WalkScene({ km, todayKm = 0, festive, view = 'full', place, part, stone, landmarkScale }: { km: number; todayKm?: number; festive?: Festive; view?: 'full' | 'band'; place?: string; part?: PartOfDay; stone?: boolean; landmarkScale?: number }) {
  const pos = positionAt(km);
  const ahead = pos.to ?? pos.from;
  const toNext = pos.to ? Math.max(0, pos.to.km - km) : undefined;
  const lm = landmarkFor(place ?? ahead.name);
  // The landmark ahead stands on the horizon once it is within 60 km; a named place's always does.
  const near = place !== undefined || toNext === undefined || toNext <= 60;
  const now = new Date();
  const night = skyNight(now);
  const moon = { phase: moonPhase(now), full: isFullMoon(night), shower: !!meteorShower(night) };
  const hour = devHour() ?? part ?? partOfDay(now);
  const region = place && lm ? lm.region : regionAt(km);
  return (
    <Layered
      region={region}
      part={hour}
      todayKm={todayKm}
      landmark={near ? lm : undefined}
      landmarkScale={landmarkScale ?? (place ? 1 : approachScale(toNext))}
      festive={festive}
      moon={moon}
      stone={stone}
      view={view}
      label={lm && near ? `The road at ${hour}, ${lm.label} ahead` : undefined}
    />
  );
}
