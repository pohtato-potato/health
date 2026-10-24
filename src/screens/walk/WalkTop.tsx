import type { Festive } from '../../walk/art/festive';
import { WalkVista } from '../../walk/WalkVista';
import { Milestone } from './Milestone';

/**
 * The top of the Walk tab: the scene edge to edge with today's road drawn brighter, the milestone at the road's
 * edge, and the strip under it saying the next stop and its distance in full. The strip opens the map.
 */
export function WalkTop({ km, todayKm, stone, festive, onStrip }: { km: number; todayKm: number; stone?: { name: string; hindi: string; km: number }; festive?: Festive; onStrip: () => void }) {
  return (
    <div className="walk-top2">
      <div className="walk-top2-scene">
        <WalkVista km={km} todayKm={todayKm} festive={festive} />
        {stone && (
          <span className="walk-stone-at">
            <Milestone stone={stone} />
          </span>
        )}
      </div>
      {stone && (
        <button type="button" className="walk-strip" onClick={onStrip} aria-label={`${stone.name}, ${stone.km} km ahead. Open the map`}>
          <span className="walk-strip-road" aria-hidden="true" />
          <span className="walk-strip-next">
            {stone.name} · {stone.km.toLocaleString('en-IN')} km
          </span>
        </button>
      )}
    </div>
  );
}
