import type { Festive } from '../../walk/art/festive';
import { WalkVista } from '../../walk/WalkVista';
import { Milestone } from './Milestone';

/**
 * The top of the Walk tab: the painted scene edge to edge with today's road in sage and the milestone on the
 * road's left shoulder, as the approved board drew it.
 */
export function WalkTop({ km, todayKm, stone, festive }: { km: number; todayKm: number; stone?: { name: string; hindi: string; km: number }; festive?: Festive }) {
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
    </div>
  );
}
