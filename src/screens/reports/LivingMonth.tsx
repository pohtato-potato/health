import type { CSSProperties } from 'react';
import { parseDay, type DayKey } from '../../domain/dates';
import { fmtDayMonth } from '../../domain/format';
import type { DayCell } from '../../domain/monthStory';
import { MONTH_NAMES } from '../../domain/period';
import { Icon } from '../../ui/Icon';
import { dayTier } from '../close/DayCard';

const NUM = ['no', 'one', 'two', 'three', 'four'];
/** A day's rings in words: the label the calendar and its key share. */
const said = (c: DayCell): string => (c === 'later' ? 'to come' : !c ? 'not logged' : c.closed >= c.of ? 'every ring' : c.closed ? `${NUM[c.closed]} of ${NUM[c.of]} rings` : 'no rings');

export interface Frame { id: string; text: string; date: DayKey }

/** Reports (board W5): this month as a calendar whose days light up one after another in their tier's colour, records ringed in white, with its story so far and its moments. */
export function LivingMonth({ month, cal, records, frames, onPlay }: { month: string; cal: DayCell[]; records: Set<DayKey>; frames: Frame[]; onPlay: () => void }) {
  const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1];
  const lead = (parseDay(`${month}-01`).getDay() + 6) % 7;
  const done = cal.filter((c) => c !== 'later').length;
  const keys = new Map<string, { n: number; ink?: string }>();
  for (const name of ['Plated', 'Even', 'Clean', 'First light', 'Closed', 'Not logged']) keys.set(name, { n: 0 });
  for (const c of cal) {
    if (c === 'later') continue;
    const t = c ? dayTier(c.closed, c.of) : undefined;
    const k = t?.name ?? 'Not logged';
    keys.set(k, { n: keys.get(k)!.n + 1, ink: t?.ink });
  }
  return (
    <section className="lm">
      <div className="lm-hd">
        <span>
          <h2>{name}</h2>
          <span>{done} day{done === 1 ? '' : 's'} in · its story so far</span>
        </span>
        <button type="button" className="lm-play" aria-label={`Play the story of ${name} so far`} onClick={onPlay}><Icon name="play" size={22} stroke={2.4} color="#140f22" /></button>
      </div>
      <div className="lm-cal">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="lm-wd" aria-hidden="true">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} aria-hidden="true" />)}
        {cal.map((c, n) => {
          const date = `${month}-${String(n + 1).padStart(2, '0')}`;
          const rec = records.has(date);
          const cls = c === 'later' ? ' later' : !c ? ' blank' : rec ? ' rec' : '';
          const ink = c && c !== 'later' ? dayTier(c.closed, c.of).ink : undefined;
          return <i key={date} className={`lm-d${cls}`} style={{ '--c': ink, '--i': n } as CSSProperties} aria-label={`${fmtDayMonth(date)}: ${c && c !== 'later' ? `${dayTier(c.closed, c.of).name}, ` : ''}${said(c)}${rec ? ', a record' : ''}`}>{n + 1}</i>;
        })}
      </div>
      <div className="lm-key">
        {[...keys].filter(([, k]) => k.n).map(([w, k]) => <span key={w}><i style={{ background: k.ink ?? 'rgba(255,255,255,.14)' }} aria-hidden="true" />{w}: {k.n}</span>)}
        {records.size > 0 && <span>White ring: a record</span>}
      </div>
      {frames.length > 0 && (
        <div className="lm-fr">
          {frames.map((f) => <span key={f.id}><b>{fmtDayMonth(f.date)}</b> {f.text}</span>)}
        </div>
      )}
    </section>
  );
}
