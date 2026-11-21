import type { CSSProperties } from 'react';
import { daysBetween, type DayKey } from '../../domain/dates';
import { fmtDayMonth, fmtInt } from '../../domain/format';

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const INKS = ['#ffb27a', '#c2b2ff', '#5fe3a1', '#8fd8ff', '#ffd36b', '#f4aedb'];

/** Months as tiles in their colours (board 23): the days logged in each; an empty month, or one still to come, waits with a dot. */
export function MonthTiles({ tiles }: { tiles: { month: string; days?: number }[] }) {
  return (
    <div className="yr-mo">
      {tiles.map((t, k) => {
        const name = SHORT[Number(t.month.slice(5, 7)) - 1];
        const has = !!t.days;
        return (
          <div key={t.month} className={has ? undefined : 'e'} style={{ '--c': INKS[k % INKS.length], '--d': `${k * 0.05}s` } as CSSProperties} role="img"
            aria-label={`${name}: ${has ? `${t.days} day${t.days === 1 ? '' : 's'} logged` : t.days === undefined ? 'still to come' : 'nothing logged'}`}>
            <b aria-hidden="true">{has ? fmtInt(t.days!) : '·'}</b><span aria-hidden="true">{name}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Day one against today, as day numbers. */
export function DayOne({ first, today }: { first: DayKey; today: DayKey }) {
  return (
    <div className="yr-vs">
      <div style={{ '--c': '#ffb27a' } as CSSProperties}><b>Day 1</b><span>{fmtDayMonth(first)}</span></div>
      <i aria-hidden="true">→</i>
      <div style={{ '--c': '#5fe3a1' } as CSSProperties}><b>Day {fmtInt(daysBetween(first, today) + 1)}</b><span>{fmtDayMonth(today)}</span></div>
    </div>
  );
}

/** The year's big counts, each named. */
export function YearCounts({ counts }: { counts: { n: number; what: string }[] }) {
  return (
    <div className="yr-ct">
      {counts.map((c, k) => <div key={c.what} style={{ '--c': ['#ff9a76', '#8fd8ff', '#ffd36b', '#f4aedb'][k % 4] } as CSSProperties}><b>{fmtInt(c.n)}</b><span>{c.what}</span></div>)}
    </div>
  );
}
