import { useBody, useToday } from '../db/hooks';
import { bodyTileWords, labelFor, kindOf, WHOLE_BODY } from '../domain/bodyLog';
import { addBodyEntry, deleteBodyEntry } from '../db/actions';
import { addDays } from '../domain/dates';
import { fmtDayMonth } from '../domain/format';
import { back } from '../router';
import { BodyChart } from '../ui/BodyChart';
import { Icon } from '../ui/Icon';
import { RegionFrame } from '../ui/live/RegionFrame';

/** The body log page (replaces Readiness): today's chart, then the last fortnight's marks, including Train's in-set notes. */
export function BodyLogPage() {
  const today = useToday();
  const body = useBody();
  if (!body) return <RegionFrame />;
  const words = bodyTileWords(body, today);
  const marked = words.startsWith('All good') ? '' : words;
  const recent = body.filter((e) => e.date < today && e.date >= addDays(today, -14)).sort((a, b) => b.at - a.at);
  return (
    <RegionFrame className="bl-page">
      <button type="button" className="backlink" onClick={() => back('/today')}><Icon name="left" size={20} stroke={1.8} />Today</button>
      <h1 className="h1">How’s the body?</h1>
      <p className="t15 lh">Tap where it hurts, then what kind. Nothing tapped means all good.</p>
      {marked && <p className="t15 lh"><b>Today: {marked}</b></p>}
      <BodyChart date={today} entries={body} />
      <section className="col gap8" aria-label="Whole body">
        <h2 className="h3">The whole body</h2>
        <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
          {WHOLE_BODY.map((w) => {
            const on = body.find((e) => e.date === today && e.part === w.part && e.kind === 'felt');
            return (
              <button key={w.part} type="button" role="switch" aria-checked={!!on} className={`chip sm${on ? ' on' : ''}`} onClick={() => void (on ? deleteBodyEntry(on.id) : addBodyEntry({ part: w.part, kind: 'felt', date: today }))}>
                {w.label}
              </button>
            );
          })}
        </div>
        <p className="t14 q lh">For the coach and your own record. They never touch the match.</p>
      </section>
      {recent.length > 0 && (
        <section className="col gap8">
          <h2 className="h3">The last two weeks</h2>
          <ul className="bl-list">
            {recent.map((e) => (
              <li key={e.id}>
                <span>{fmtDayMonth(e.date)}</span>
                <b style={{ color: kindOf(e.kind).ink }}>{labelFor(e.part)}{e.side && e.side !== 'both' ? ` (${e.side})` : ''}{e.kind === 'felt' ? '' : ` · ${kindOf(e.kind).label}`}</b>
                {e.exercise && <small>During {e.exercise}{e.setNo ? `, set ${e.setNo}` : ''}</small>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </RegionFrame>
  );
}
