import { useEffect, useState } from 'react';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

/** Counts up to a number once, on first showing, easing out. */
function useCount(to: number, ms = 1600): number {
  const [n, setN] = useState(() => (typeof window === 'undefined' ? to : 0));
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return n;
}

/** The km walked as odometer tiles, as the board drew it, counting up as the page opens. */
export function Odometer({ km, of, about, children }: { km: number; of: number; about?: boolean; children?: React.ReactNode }) {
  const n = useCount(Math.round(km));
  return (
    <p className="walk-odo" aria-label={`${fmt(km)} of ${about ? 'about ' : ''}${fmt(of)} km`}>
      {fmt(n)
        .split('')
        .map((ch, i) => (
          <span key={i} className={ch === ',' ? 'walk-odo-sep' : 'walk-odo-digit'} aria-hidden="true">
            {ch}
          </span>
        ))}
      {children && <small aria-hidden="true">{children}</small>}
    </p>
  );
}

/** Then and you on one line: the day they reached a place, and the day you did. */
export function ThenLine({ who, place, theirDay, yourDay, totalDays, source }: { who: string; place: string; theirDay: number; yourDay?: number; totalDays: number; source?: string }) {
  const max = Math.max(totalDays, yourDay ?? 0, theirDay, 1);
  const at = (d: number) => `${Math.round((d / max) * 1000) / 10}%`;
  return (
    <section className="walk-then2" aria-label={`Then and you: ${who} reached ${place} on day ${theirDay}${yourDay ? `, you on day ${yourDay}` : ''}`}>
      <span className="walk-kind">Then and you · reaching {place}</span>
      <div className="walk-then-line" aria-hidden="true">
        <i className="track" />
        <span className="mark them" style={{ left: at(theirDay) }}>
          <i />
          <b>Day {theirDay}</b>
          <small>Then</small>
        </span>
        {yourDay !== undefined && (
          <span className="mark you" style={{ left: at(yourDay) }}>
            <i />
            <b>Day {yourDay}</b>
            <small>You</small>
          </span>
        )}
      </div>
      <p className="walk-sub">
        {who} took {totalDays} days in all.{source ? ` ${source}` : ''}
      </p>
    </section>
  );
}
