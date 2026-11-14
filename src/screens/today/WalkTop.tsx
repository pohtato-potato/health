import type { ReactNode } from 'react';

/**
 * The walk at the top of Today (board five): the Walk tab's scene as a short banner running edge to edge, with the
 * date and place under it. The drawing set the date on the scene, where the lit road ran behind it; here they are
 * kept apart, the scene above and the words below. The walk's own line follows, quiet. On an arrival day the city's
 * stamp sits on the scene. Tap to open the Walk tab.
 */
export function WalkTop({ caption, scene, stamp, status, onOpen }: { caption: [string, string, string]; scene: ReactNode; stamp?: ReactNode; status?: ReactNode; onOpen: () => void }) {
  const [line, title, next] = caption;
  const [date, ...rest] = line.split(' · ');
  return (
    <div className="td-walkwrap" data-section="walk">
      <button type="button" className="td-walk" onClick={onOpen} aria-label={`${[line, title, next].filter(Boolean).map((t) => t.replace(/\.$/, '')).join('. ')}. Open the Walk tab`}>
        <span className="td-walk-scene">{scene}</span>
        {stamp && <span className="td-walk-stamp">{stamp}</span>}
        <span className="td-walk-cap" aria-hidden="true">
          <span className="td-walk-line">
            <b>{date}</b>
            {[...rest, title].filter(Boolean).map((t) => <span key={t} className="k-q"> · {t}</span>)}
          </span>
          {next && <span className="td-walk-next k-q">{next}</span>}
        </span>
      </button>
      {status}
    </div>
  );
}
