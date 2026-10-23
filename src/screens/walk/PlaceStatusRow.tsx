import { placeFor } from '../../domain/places';
import type { DayKey } from '../../domain/dates';
import type { Day, Settings } from '../../domain/types';
import { PlaceIcon } from '../../ui/PlaceIcon';
import { StatusRow } from '../../ui/StatusRow';

/**
 * Where you are today and any status, picked under the walk's title. Moved here from Today's full-screen walk.
 * `day` is undefined while it loads (nothing shows, so a tap can't act on a wrong selection) and null when none is saved.
 */
export function PlaceStatusRow({ settings, today, day, onPlace }: { settings: Settings; today: DayKey; day: Day | undefined | null; onPlace: (id: string) => void }) {
  if (day === undefined) return null;
  const places = settings.places ?? [];
  const here = placeFor(day ?? undefined, settings, Date.now());
  return (
    <div className="walk-place-status">
      {places.length > 0 && (
        <>
          <h3 className="td-h3">Where now</h3>
          <div className="td-chips">
            {places.map((p) => (
              <button key={p.id} type="button" className={`chip${p.id === here.id ? ' on' : ''}`} aria-pressed={p.id === here.id} onClick={() => p.id !== here.id && onPlace(p.id)}>
                <PlaceIcon place={p} size={16} /> {p.name}
              </button>
            ))}
          </div>
        </>
      )}
      <h3 className="td-h3">Status</h3>
      <StatusRow today={today} current={day?.status} />
    </div>
  );
}
