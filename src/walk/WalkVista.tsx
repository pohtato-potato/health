import { dayKey, partOfDay } from '../domain/dates';
import { positionAt } from '../domain/walk';
import { landmarkFor } from './art/landmarks';
import type { Festive } from './art/festive';
import { Vista } from './art/vista';
import { regionAt } from './regions';
import { approachScale } from './WalkScene';
import { isFullMoon, meteorShower, moonPhase } from './sky';

/** The vista for where the walk is: the region's land lit for the hour, the landmark ahead rising as you near it, tonight's moon and meteors. */
export function WalkVista({ km, todayKm = 0, festive }: { km: number; todayKm?: number; festive?: Festive }) {
  const pos = positionAt(km);
  const ahead = pos.to ?? pos.from;
  const toNext = pos.to ? Math.max(0, pos.to.km - km) : undefined;
  const lm = landmarkFor(ahead.name);
  // The landmark stands on the horizon once it is within 60 km.
  const near = toNext === undefined || toNext <= 60;
  const now = new Date();
  const today = dayKey(now);
  const moon = { phase: moonPhase(now), full: isFullMoon(today), shower: !!meteorShower(today) };
  return <Vista region={regionAt(km)} part={partOfDay(now)} todayKm={todayKm} landmark={near ? lm : undefined} landmarkScale={approachScale(toNext)} festive={festive} moon={moon} />;
}
