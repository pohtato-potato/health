import { partOfDay } from '../domain/dates';
import { positionAt } from '../domain/walk';
import { landmarkFor } from './art/landmarks';
import type { Festive } from './art/festive';
import { Vista } from './art/vista';
import { regionAt } from './regions';
import { approachScale } from './WalkScene';

/** The vista for where the walk is: the region's land lit for the hour, the landmark ahead rising as you near it. */
export function WalkVista({ km, todayKm = 0, festive }: { km: number; todayKm?: number; festive?: Festive }) {
  const pos = positionAt(km);
  const ahead = pos.to ?? pos.from;
  const toNext = pos.to ? Math.max(0, pos.to.km - km) : undefined;
  const lm = landmarkFor(ahead.name);
  // The landmark stands on the horizon once it is within 60 km.
  const near = toNext === undefined || toNext <= 60;
  return <Vista region={regionAt(km)} part={partOfDay(new Date())} todayKm={todayKm} landmark={near ? lm : undefined} landmarkScale={approachScale(toNext)} festive={festive} />;
}
