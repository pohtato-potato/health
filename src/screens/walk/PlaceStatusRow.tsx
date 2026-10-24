import { useState } from 'react';
import { placeFor } from '../../domain/places';
import type { DayKey } from '../../domain/dates';
import type { Day, Settings } from '../../domain/types';
import { PlaceIcon } from '../../ui/PlaceIcon';
import { STATUSES, StatusRow } from '../../ui/StatusRow';

/**
 * Where you are today and any status, picked under the walk's title. Moved here from Today's full-screen walk.
 * `day` is undefined while it loads (nothing shows, so a tap can't act on a wrong selection) and null when none is saved.
 * It folds into one small button saying the place and status in words, and opens to the chips.
 */
export function PlaceStatusRow({
  settings,
  today,
  day,
  onPlace,
  startOpen = false,
}: {
  settings: Settings;
  today: DayKey;
  day: Day | undefined | null;
  onPlace: (id: string) => void;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  if (day === undefined) return null;
  const places = settings.places ?? [];
  const here = placeFor(day ?? undefined, settings, Date.now());
  const status = STATUSES.find((s) => s.id === day?.status)?.label ?? 'No status';
  const summary = [places.length ? here.name : undefined, status].filter(Boolean).join(' · ');
  return (
    <div className="walk-place-status">
      <button type="button" className="walk-ps-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{summary}</span>
        <span className="walk-ps-change">{open ? 'Done' : 'Change'}</span>
      </button>
      {open && (
        <>
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
        </>
      )}
    </div>
  );
}
