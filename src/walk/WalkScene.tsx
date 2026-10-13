import { partOfDay } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { positionAt } from '../domain/walk';
import { Scene } from './art/scene';
import { landmarkFor } from './art/landmarks';
import { regionAt } from './regions';

/** The landmark ahead grows as you near it: small from 60 km out, full size on arrival. */
export function approachScale(kmToNext: number | undefined): number {
  if (kmToNext === undefined) return 1;
  return 0.55 + 0.45 * (1 - Math.min(1, kmToNext / 60));
}

/** The scene for where the walk is: the region's land lit for the hour, the next landmark ahead. */
export function WalkScene({ km, caption = true }: { km: number; ghostKm?: number; caption?: boolean }) {
  const pos = positionAt(km);
  const ahead = pos.to ?? pos.from;
  const toNext = pos.to ? Math.max(0, pos.to.km - km) : undefined;
  const lm = landmarkFor(ahead.name);
  return (
    <Scene
      city={ahead.name}
      region={regionAt(km)}
      part={partOfDay(new Date())}
      people
      landmarkScale={approachScale(toNext)}
      caption={
        caption ? (
          <>
            <span className="band-place">Near {pos.from.name}</span>
            {toNext !== undefined && (
              <span className="band-next t13">
                <span className="num tn">{fmtInt(Math.round(toNext))}</span> km to {lm?.label ?? ahead.name}
              </span>
            )}
          </>
        ) : undefined
      }
    />
  );
}
