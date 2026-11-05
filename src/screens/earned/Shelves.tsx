import { useState } from 'react';
import type { Dated, Shelf } from '../../domain/earned';
import { fmtDayMonth } from '../../domain/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const name = (m: string) => MONTHS[Number(m.slice(5)) - 1];
const LATEST = 4;

export function Shelves({ shelves }: { shelves: Shelf[] }) {
  const [replay, setReplay] = useState<Dated | undefined>();
  const [more, setMore] = useState(false);
  if (!shelves.length) return null;
  const shown = more ? shelves : shelves.slice(0, 1);
  return (
    <section className="yu-sec">
      {shown.map((s) => (
        <div key={s.month} className="yu-sec">
          <h2>{name(s.month)}'s shelf</h2>
          <div className="yu-rows">
            {(more ? s.items : s.items.slice(0, LATEST)).map((x) => (
              <div key={x.id} className="yu-shelf-row"><span>{x.text}</span><button type="button" onClick={() => setReplay(x)}>Replay</button></div>
            ))}
          </div>
        </div>
      ))}
      {(shelves.length > 1 || shelves[0].items.length > LATEST) && (
        <button type="button" className="yu-link" onClick={() => setMore(!more)}>{more ? 'Just the latest' : 'Earlier shelves'}</button>
      )}
      {replay && (
        <div className="yu-replay" role="dialog" aria-label={replay.text}>
          <span>{fmtDayMonth(replay.date)}</span>
          <p>{replay.text}</p>
          <button type="button" onClick={() => setReplay(undefined)}>Back to Earned</button>
        </div>
      )}
    </section>
  );
}
