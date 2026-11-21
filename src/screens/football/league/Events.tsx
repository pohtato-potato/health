// Event nights after the season (spec §9.3): each day as a row of label, what happened, and the result mark.
import { EVENTS, type EventId } from '../../../football/events';
import type { StoredMatch } from '../../../football/store/tables';
import { scoreLine } from '../Tonight';
import { ResultMark } from './Table';

export function eventRows(matches: StoredMatch[]): { label: string; text: string; result: StoredMatch['result']; id: string }[] {
  return matches
    .filter((m) => m.comp === 'event' || /, day \d+ of \d+$/.test(m.round ?? ''))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((m) => ({ id: m.id, label: (m.round ?? '').replace(/^.*, (day \d+ of \d+)$/, (_, d: string) => d.replace(/^d/, 'D')), text: scoreLine(m), result: m.result }));
}

/** Event nights (board 23, m23-events): a glowing timeline, one night per day of the event in order. Played nights
 *  carry what happened and the result; the next one is marked; the rest wait. After the event, its played nights. */
export function Events({ event, matches }: { event?: { id: EventId; days: number }; matches: StoredMatch[] }) {
  const rows = eventRows(matches);
  if (!event && !rows.length) return null;
  const name = event ? EVENTS[event.id].name : (matches.find((m) => m.round)?.round ?? '').replace(/, day.*$/, '');
  const days = event ? event.days : rows.length;
  return (
    <section className="ev23" aria-label={name || 'Event nights'}>
      <div className="fb-row"><span className="ev23-h">{name || 'Event nights'}</span>{event && <span className="fb-s">{Math.min(rows.length, days)} of {days} played</span>}</div>
      <ol className="ev23-tl">
        {Array.from({ length: days }, (_, k) => {
          const r = rows[k];
          const st = r ? 'done' : k === rows.length ? 'next' : 'wait';
          return (
            <li key={k} className={`ev23-n ${st}`} style={{ '--d': `${k * 0.12}s` } as React.CSSProperties}>
              <span><b>{r?.label || `Day ${k + 1} of ${days}`}</b><small>{r ? r.text : st === 'next' ? (k === 0 ? 'The night after the season’s last day' : 'Next') : 'To come'}</small></span>
              {r && <ResultMark r={r.result} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
