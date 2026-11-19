import type { CSSProperties } from 'react';
import { parseDay } from '../../domain/dates';
import { DayRings, type DayTier } from './DayCard';

export interface BinderDay { date: string; tier?: DayTier; rings?: number[]; ribbon?: string }

/**
 * The month (board 5 `c5-binder`): small copies of the day's card, one per closed day, in a Monday-first grid. A day
 * not closed is an empty square with its date, never a 0. Tap a card to see it full size; breakouts keep their ribbon.
 */
/** One small card (or an empty square for a day left open), shared by the month and the dealt week. */
export function BinderCell({ d, month, today, onOpen }: { d: BinderDay; month: string; today: string; onOpen: (date: string) => void }) {
  const n = parseDay(d.date).getDate();
  const isToday = d.date === today;
  if (!d.tier) return <span className={`mb-empty${isToday ? ' today' : ''}`}><span className="mb-n">{n}</span></span>;
  return (
    <button type="button" className={`mb-card ${isToday ? 'today' : ''}`} style={{ '--b': d.tier.ink } as CSSProperties} aria-label={`${n} ${month}, ${d.tier.name} day${isToday ? ', today' : ''}`} onClick={() => onOpen(d.date)}>
      {d.ribbon && <i className="mb-rib" style={{ '--r': d.ribbon } as CSSProperties} aria-hidden="true" />}
      <span aria-hidden="true"><DayRings rings={d.rings ?? []} size={30} /></span>
      <span className="mb-n">{n}</span>
    </button>
  );
}

export function MonthBinder({ month, days, total, today, onOpen }: { month: string; days: BinderDay[]; total: number; today: string; onOpen: (date: string) => void }) {
  const closed = days.filter((d) => d.tier).length;
  const pad = days.length ? (parseDay(days[0].date).getDay() + 6) % 7 : 0;
  return (
    <section className="mb" aria-labelledby="mb-h">
      <div className="mb-head">
        <h2 id="mb-h">{month}</h2><span className="mb-count">{closed} of {total} closed</span>
      </div>
      <div className="mb-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <span key={i} className="mb-wd" aria-hidden="true">{w}</span>)}
        {Array.from({ length: pad }, (_, i) => <span key={`p${i}`} className="mb-pad" />)}
        {days.map((d) => <BinderCell key={d.date} d={d} month={month} today={today} onOpen={onOpen} />)}
      </div>
    </section>
  );
}
