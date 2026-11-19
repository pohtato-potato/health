import { useState, type CSSProperties } from 'react';
import { parseDay } from '../../domain/dates';
import { BinderCell, type BinderDay } from './MonthBinder';
import { DayRings, type DayStat } from './DayCard';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "16–22 Nov", or "28 Sep – 4 Oct" across two months. */
export function weekRange(first: string, last: string): string {
  const a = parseDay(first);
  const b = parseDay(last);
  const m = (d: Date) => MONTHS[d.getMonth()].slice(0, 3);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${m(b)}` : `${a.getDate()} ${m(a)} – ${b.getDate()} ${m(b)}`;
}

/**
 * The week's card (board 6 `c6-week`), shown when Sunday closes: the seven days' rings in a row, the week's totals and
 * how many days closed, on a stack of cards (the depth is decoration). Seven of seven earns the Perfect week ribbon.
 * A tap deals the seven days out under it.
 */
export function WeekCard({ days, week, stats, today, onOpen }: { days: BinderDay[]; week: number; stats: DayStat[]; today: string; onOpen: (date: string) => void }) {
  const [dealt, setDealt] = useState(false);
  const closed = days.filter((d) => d.tier).length;
  const perfect = days.length === 7 && closed === 7;
  const range = days.length ? weekRange(days[0].date, days[days.length - 1].date) : '';
  return (
    <section className="cw" aria-labelledby="cw-h">
      <h2 id="cw-h" className="cw-h2">Your week</h2>
      <div className="cw-stack">
        <i className="cw-depth d2" aria-hidden="true" />
        <i className="cw-depth d1" aria-hidden="true" />
        <article className="dc cw-card" style={{ '--b': perfect ? 'var(--dc-plated)' : 'var(--dc-even)' } as CSSProperties} aria-label={`The week, ${range}`}>
          <span className="dc-shine" aria-hidden="true" />
          <div className="dc-head">
            <b className="dc-tier">The week</b><span className="dc-date">{range}</span>
          </div>
          {perfect && <div className="dc-rib" style={{ '--r': 'var(--dc-plated)' } as CSSProperties}>Perfect week</div>}
          <div className="cw-rings" aria-hidden="true">
            {days.map((d) => <span key={d.date} className={d.tier ? 'on' : ''}><DayRings rings={d.tier ? d.rings ?? [] : [0, 0, 0, 0]} size={30} /></span>)}
          </div>
          <h3 className="dc-title">Week {week}</h3>
          <div className="dc-stats">
            {stats.map((s) => (
              <div key={s.name} className="dc-stat"><span>{s.name}</span><b className="tn" style={{ color: s.ink }}>{s.value}</b></div>
            ))}
            <div className="dc-stat"><span>Closed</span><b className="tn">{closed} of {days.length}</b></div>
          </div>
        </article>
      </div>
      {!dealt ? (
        <button type="button" className="k-act quiet cw-deal" onClick={() => setDealt(true)}>Deal the seven days</button>
      ) : (
        <div className="mb-grid cw-dealt">
          {days.map((d) => <BinderCell key={d.date} d={d} month={MONTHS[parseDay(d.date).getMonth()]} today={today} onOpen={onOpen} />)}
        </div>
      )}
    </section>
  );
}
