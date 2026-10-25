import type { CSSProperties, ReactNode } from 'react';
import { regionAt } from '../../domain/regions';
import { back, useRoute } from '../../router';
import { Aurora } from '../../ui/live/Aurora';
import { STOPS, STRETCHES } from '../../walk/content';
import { auroraFor } from '../../walk/page';
import { WalkVista } from '../../walk/WalkVista';
import { StopView } from './StopView';
import { StretchView } from './StretchView';

/** The road's own pages: the land of the place at the top, on the aurora tinted by its region. */
function RoadPage({ km, children }: { km: number; children: ReactNode }) {
  return (
    <div className="page lv lv-tab walk2 walk3" style={auroraFor(regionAt(km)) as CSSProperties}>
      <Aurora />
      <div className="walk2-col">
        <div className="walk-top2">
          <div className="walk-top2-scene road">
            <WalkVista km={km} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A stretch's long page, at #/stretch?id=… */
export function StretchPage() {
  const id = useRoute().params.get('id');
  const s = STRETCHES.find((x) => x.id === id);
  if (!s) return <div className="page walk3">That stretch isn't written yet.</div>;
  return (
    <RoadPage km={s.fromKm}>
      <StretchView stretch={s} onBack={() => back('/walk')} />
    </RoadPage>
  );
}

/** A small stop's card of facts, at #/stop?id=… */
export function StopPage() {
  const id = useRoute().params.get('id');
  const s = STOPS.find((x) => x.id === id);
  if (!s) return <div className="page walk3">That stop isn't written yet.</div>;
  return (
    <RoadPage km={s.km}>
      <StopView stop={s} onBack={() => back('/walk')} />
    </RoadPage>
  );
}
