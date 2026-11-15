import { useState, type CSSProperties } from 'react';
import { Action, Sect } from '../../ui/kit/Kit';
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
    <>
      {shown.map((s) => (
        <div key={s.month} className="k-col" style={{ gap: 8 }}>
          <Sect>{name(s.month)}'s shelf</Sect>
          <div className="k-panel k-rows" style={{ '--ink': '#f4aedb' } as CSSProperties}>
            {(more ? s.items : s.items.slice(0, LATEST)).map((x) => (
              <button key={x.id} type="button" className="k-rowl" onClick={() => setReplay(x)}><span>{x.text}</span><b style={{ color: '#f4aedb' }}>Replay</b></button>
            ))}
          </div>
        </div>
      ))}
      {(shelves.length > 1 || shelves[0].items.length > LATEST) && (
        <button type="button" className="k-more" style={{ color: '#f4aedb' }} onClick={() => setMore(!more)}>{more ? 'Just the latest' : 'Earlier shelves'}</button>
      )}
      {replay && (
        <div className="yu-replay" role="dialog" aria-label={replay.text}>
          <span>{fmtDayMonth(replay.date)}</span>
          <p>{replay.text}</p>
          <Action onClick={() => setReplay(undefined)}>Back to Earned</Action>
        </div>
      )}
    </>
  );
}
