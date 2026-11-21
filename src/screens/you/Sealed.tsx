import type { CSSProperties } from 'react';
import type { DayKey } from '../../domain/dates';
import { fmtDayMonth, fmtInt } from '../../domain/format';

const INKS = ['#ff6fa8', '#ffc94d', '#b9a0ff', '#5fe3a1'];

/** Before reveal day: an envelope with a pulsing wax seal in gold light, the days left, and what waits inside. */
export function Sealed({ days, date, inside, locked }: { days: number; date: DayKey; inside: { n: string; what: string }[]; locked: boolean }) {
  return (
    <div className="rv-s">
      <div className="rv-vault">
        <div className="rv-env" aria-hidden="true"><span className="rv-wax" /></div>
        <b className="rv-n">{fmtInt(days)}</b>
        <span className="rv-until">{days === 1 ? 'day' : 'days'} until {fmtDayMonth(date)}</span>
        <p>Nothing here opens early. That’s the point.</p>
      </div>
      {inside.length > 0 && (
        <>
          <h2 className="rv-k">Sealed inside</h2>
          <div className="rv-in">
            {inside.map((x, i) => <div key={x.what} style={{ '--c': INKS[i % INKS.length] } as CSSProperties}><b>{x.n}</b><span>{x.what}</span></div>)}
          </div>
        </>
      )}
      <p className="rv-sub">{locked ? 'Your photos are behind your fingerprint. ' : ''}On the day, everything opens in order.</p>
    </div>
  );
}
