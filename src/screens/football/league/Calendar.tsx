// The season calendar (board 10): 42 days. Circle league, diamond Big Cup, square trophy, hexagon event, gold finals.
// Played days show your result letter; the shape and the word say the rest, so colour is never alone.
import { seasonDays, type DayPlan } from '../../../football/calendar';
import type { StoredMatch } from '../../../football/store/tables';
import type { Result } from '../../../football/types';

export type Shape = 'c' | 'd' | 's' | 'h';
export const shapeOf = (p: Pick<DayPlan, 'kind'>): Shape => (p.kind === 'bigcup' ? 'd' : p.kind === 'tiercup' ? 's' : p.kind === 'event' ? 'h' : 'c');
const WORD: Record<Result, string> = { W: 'won', D: 'drew', L: 'lost' };
const KIND: Record<DayPlan['kind'], string> = { league: 'League', bigcup: 'Big Cup', tiercup: 'Trophy', finals1: 'Finals', finals2: 'Finals', event: 'Event' };

/** The last result Brabo had on each day of the season (a double-header shows its second match). */
export function resultsByDay(matches: StoredMatch[], season: number): Map<number, Result> {
  const out = new Map<number, Result>();
  for (const m of [...matches].filter((x) => x.season === season && x.comp !== 'event').sort((a, b) => a.id.localeCompare(b.id))) out.set(m.day, m.result);
  return out;
}

export function Calendar({ season, today, matches, events = [] }: { season: number; today: number; matches: StoredMatch[]; events?: { day: number; label: string; result?: Result }[] }) {
  const res = resultsByDay(matches, season);
  const counts = { W: 0, D: 0, L: 0 };
  for (const r of res.values()) counts[r]++;
  return (
    <section className="fb-cal" aria-label={`Season ${season} calendar`}>
      <div className="fb-row"><span className="fb-t">Season {season}</span><span className="fb-s">{counts.W} W · {counts.D} D · {counts.L} L</span></div>
      <ol className="fb-calgrid">
        {seasonDays().map((p) => {
          const r = res.get(p.day);
          const fin = p.kind === 'finals1' || p.kind === 'finals2';
          const label = `Day ${p.day}, ${KIND[p.kind]}${p.round ? `: ${p.round}` : ''}${r ? `, ${WORD[r]}` : p.day === today ? ', today' : ''}`;
          return (
            <li key={p.day} className={`fb-calday${p.day === today ? ' now' : ''}${r ? ' played' : ''}`} aria-label={label}>
              <span className={`fb-res ${shapeOf(p)}${r ? ` r-${r}` : ' todo'}${fin ? ' fin' : ''}`} aria-hidden="true"><b>{r ?? p.day}</b></span>
              {r && <i aria-hidden="true">{p.day}</i>}
            </li>
          );
        })}
      </ol>
      {events.length > 0 && (
        <>
          <span className="fb-lb">After the season</span>
          <ol className="fb-calgrid">
            {events.map((e) => (
              <li key={e.day} className={`fb-calday${e.result ? ' played' : ''}`} aria-label={`${e.label}${e.result ? `, ${WORD[e.result]}` : ''}`}>
                <span className={`fb-res h${e.result ? ` r-${e.result}` : ' todo'}`} aria-hidden="true"><b>{e.result ?? e.day}</b></span>
                {e.result && <i aria-hidden="true">E{e.day}</i>}
              </li>
            ))}
          </ol>
        </>
      )}
      <div className="fb-calkey">
        <span><span className="fb-res c r-W"><b>W</b></span>Won</span><span><span className="fb-res c r-D"><b>D</b></span>Drew</span><span><span className="fb-res c r-L"><b>L</b></span>Lost</span>
      </div>
      <div className="fb-calkey">
        <span><i className="fb-sh c" />League</span><span><i className="fb-sh d" />Big Cup</span><span><i className="fb-sh s" />Trophy</span><span><i className="fb-sh h" />Event</span><span><i className="fb-sh c fin" />Finals</span>
      </div>
    </section>
  );
}
