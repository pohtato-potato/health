import { useEffect, type ReactNode } from 'react';
import { changePlace } from '../../db/actions';
import { placeFor } from '../../domain/places';
import type { Day, Settings } from '../../domain/types';
import { PlaceIcon } from '../../ui/PlaceIcon';
import { StatusRow } from '../../ui/StatusRow';

/** The walk, full screen: the scene large, where you are and what's next, and the place and status pickers that used to sit in a chip. */
export function WalkFull({ scene, caption, settings, today, day, onClose }: { scene: ReactNode; caption: [string, string, string]; settings: Settings; today: string; day: Day | undefined; onClose: () => void }) {
  const places = settings.places ?? [];
  const here = placeFor(day, settings, Date.now());
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="td-walkfull" role="dialog" aria-label="The walk, place and status">
      <div className="td-walkfull-scene">{scene}</div>
      <div className="td-walkfull-body">
        <span className="td-walk-line">{caption[0]}</span>
        <h2 className="td-walkfull-title">{caption[1]}</h2>
        <p className="td-walk-next">{caption[2]}</p>
        {places.length > 0 && (
          <>
            <h3 className="td-h3">Where now</h3>
            <div className="td-chips">
              {places.map((p) => (
                <button key={p.id} type="button" className={`chip${p.id === here.id ? ' on' : ''}`} aria-pressed={p.id === here.id} onClick={() => p.id !== here.id && void changePlace(today, p.id)}>
                  <PlaceIcon place={p} size={16} /> {p.name}
                </button>
              ))}
            </div>
          </>
        )}
        <h3 className="td-h3">Status</h3>
        <StatusRow today={today} current={day?.status} />
        <button type="button" className="btn block lg td-walkfull-back" onClick={onClose}>
          Back to Today
        </button>
      </div>
    </div>
  );
}
