import type { CSSProperties } from 'react';
import { parseDay, type DayKey } from '../../domain/dates';
import { fmtDayMonth, fmtDayShort } from '../../domain/format';
import { Icon } from '../../ui/Icon';

export type DoseTone = 'none' | 'on-time' | 'late' | 'missed';
const WORD: Record<DoseTone, string> = { 'on-time': 'on time', late: 'late', missed: 'missed', none: 'nothing due' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const count = (n: number, one: string, many: string) => (n === 0 ? `no ${many}` : n === 1 ? `one ${one}` : `${n} ${many}`);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The month so far: doses on time against doses due, with the late and missed ones in words. Pills drift behind it. */
export function MedHero({ taken, planned, late, missed }: { taken: number; planned: number; late: number; missed: number }) {
  return (
    <div className="md-hero">
      {[0, 1, 2, 3].map((i) => <i key={i} className="md-pill" style={{ '--i': i } as CSSProperties} aria-hidden="true" />)}
      <span className="md-nm">Medicines</span>
      {planned ? (
        <>
          <b className="md-v">{taken} of {planned}</b>
          <span className="md-say">Doses on time this month. {late + missed ? `${cap(count(late, 'late', 'late'))} and ${count(missed, 'missed', 'missed')}.` : 'None late or missed.'}</span>
        </>
      ) : <b className="md-v sm">Nothing due this month</b>}
    </div>
  );
}

/** The last seven days, one row per medicine: a mark per day that says on time, late or missed by its shape and its label, not colour alone. */
export function DoseGrid({ days, rows }: { days: DayKey[]; rows: { name: string; tones: DoseTone[] }[] }) {
  return (
    <div className="md-grid">
      <div className="md-rw md-hd" aria-hidden="true"><span />{days.map((d) => <span key={d}>{'SMTWTFS'[parseDay(d).getDay()]}</span>)}</div>
      {rows.map((r, j) => (
        <div key={r.name + j} className="md-rw" role="group" aria-label={r.name}>
          <span className="md-rn">{r.name}</span>
          {r.tones.map((t, i) => (
            <i key={days[i]} className={`md-d ${t}`} style={{ '--d': `${(j * 7 + i) * 0.04}s` } as CSSProperties} role="img" aria-label={`${fmtDayShort(days[i])}: ${WORD[t]}`}>
              {t === 'on-time' && <Icon name="check" size={14} stroke={3} />}
              {t === 'late' && <Icon name="clock" size={14} stroke={2.6} />}
              {t === 'missed' && <Icon name="close" size={14} stroke={3} />}
            </i>
          ))}
        </div>
      ))}
      <div className="md-key">
        <span><i className="md-d on-time"><Icon name="check" size={14} stroke={3} /></i>On time</span>
        <span><i className="md-d late"><Icon name="clock" size={14} stroke={2.6} /></i>Late</span>
        <span><i className="md-d missed"><Icon name="close" size={14} stroke={3} /></i>Missed</span>
      </div>
    </div>
  );
}

/** How many are left, with a bar for the days they cover (a month fills it) that turns rose inside a week. */
export function StockBar({ left, daysLeft, refill, today }: { left: number; daysLeft: number; refill: DayKey; today: DayKey }) {
  const low = daysLeft <= 7;
  return (
    <div className={`md-stk${low ? ' md-low' : ''}`}>
      <span>{left} left · refill by {refill === today ? 'today' : fmtDayMonth(refill)}</span>
      <span className="md-br" aria-hidden="true"><i style={{ width: `${Math.max(4, Math.min(100, (daysLeft / 30) * 100))}%` }} /></span>
    </div>
  );
}

/** An appointment as a calendar leaf: the month and day, then what and when. */
export function ApptLeaf({ date, title, when }: { date: DayKey; title: string; when: string }) {
  const d = parseDay(date);
  return (
    <div className="md-apt">
      <span className="md-dte" aria-hidden="true"><span>{MONTHS[d.getMonth()]}</span><b>{d.getDate()}</b></span>
      <span className="md-at"><b>{title}</b><span>{when}</span></span>
    </div>
  );
}
