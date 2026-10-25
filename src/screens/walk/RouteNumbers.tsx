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

/** The tiles for a number counting up to `to`: as many as the final number has, so nothing shifts while it counts. */
export function odometerTiles(n: number, to: number): string[] {
  const final = fmt(to).split('');
  const digits = String(Math.max(0, Math.round(n))).split('');
  const out = [...final];
  for (let i = out.length - 1, d = digits.length - 1; i >= 0; i--) {
    if (out[i] === ',') continue;
    out[i] = d >= 0 ? digits[d--] : ' ';
  }
  return out;
}

/** The km walked as odometer tiles, as the board drew it, counting up as the page opens. */
export function Odometer({ km, of, about, children }: { km: number; of: number; about?: boolean; children?: React.ReactNode }) {
  const to = Math.round(km);
  const n = useCount(to);
  return (
    <p className="walk-odo">
      <span className="sr">{fmt(km)} km walked</span>
      {odometerTiles(n, to).map((ch, i) => (
        <span key={i} className={ch === ',' ? 'walk-odo-sep' : 'walk-odo-digit'} aria-hidden="true">
          {ch}
        </span>
      ))}
      {children ? <small>{children}</small> : <span className="sr">of {about ? 'about ' : ''}{fmt(of)} km</span>}
    </p>
  );
}

/** Then and you on one line: the day they reached a place, and the day you did. */
export function ThenLine({ who, place, theirDay, yourDay, totalDays, source }: { who: string; place: string; theirDay: number; yourDay?: number; totalDays: number; source?: string }) {
  const max = Math.max(totalDays, yourDay ?? 0, theirDay, 1);
  const at = (d: number) => `${Math.round((d / max) * 1000) / 10}%`;
  // On a 360 px phone the line is about 230 px long; labels nearer than about 60 px would print over each other.
  const stack = yourDay !== undefined && (Math.abs(yourDay - theirDay) / max) * 230 < 60;
  return (
    <section className="walk-then2" aria-label={`Then and you: ${who} reached ${place} on day ${theirDay}${yourDay ? `, you on day ${yourDay}` : ''}`}>
      <span className="walk-kind">Then and you · reaching {place}</span>
      <div className={`walk-then-line${stack ? ' tall' : ''}`} aria-hidden="true">
        <i className="track" />
        <span className="mark them" style={{ left: at(theirDay) }}>
          <i />
          <b>Day {theirDay}</b>
          <small>Then</small>
        </span>
        {yourDay !== undefined && (
          <span className={`mark you${stack ? ' stack' : ''}`} style={{ left: at(yourDay) }}>
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
