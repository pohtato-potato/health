import { partOfDay } from '../domain/dates';
import { positionAt } from '../domain/walk';
import { Band } from '../ui/Band';
import { regionAt } from './regions';

/** The scene at the top of the Walk tab: the region's land, lit for the hour. */
export function WalkScene({ km }: { km: number; ghostKm?: number }) {
  const pos = positionAt(km);
  return <Band region={regionAt(km)} part={partOfDay(new Date())} place={pos.from.name} nextKm={pos.to ? Math.max(0, Math.round(pos.to.km - km)) : undefined} nextName={pos.to?.name} />;
}
