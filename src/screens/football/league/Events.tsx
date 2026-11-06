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

export function Events({ event, matches }: { event?: { id: EventId; days: number }; matches: StoredMatch[] }) {
  const rows = eventRows(matches);
  if (!event && !rows.length) return null;
  const name = event ? EVENTS[event.id].name : (matches.find((m) => m.round)?.round ?? '').replace(/, day.*$/, '');
  return (
    <section className="fb-card pu fb-events" aria-label={name || 'Event nights'}>
      <div className="fb-row"><span className="fb-lb">{name || 'Event nights'}</span>{event && <span className="fb-s">{rows.length} of {event.days} played</span>}</div>
      {rows.length ? (
        <ol className="fb-evrows">
          {rows.map((r) => (
            <li key={r.id} className="fb-evrow"><b className="fb-evlabel">{r.label}</b><span className="fb-evtext">{r.text}</span><ResultMark r={r.result} /></li>
          ))}
        </ol>
      ) : <p className="fb-s">The first event night is the night after day 42.</p>}
    </section>
  );
}
