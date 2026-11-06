// Season change (spec §5.7, board 10): promotion or relegation with names, the playoff final, and the new division
// with your ratings dropping (or rising), each with room to grow.
import { clubById, tierName } from '../../../football/data/load';
import type { SeasonChange as Change } from '../../../football/seasonChange';
import { OWN } from '../../../football/store/season';
import { Aurora } from '../FootballHome';

const nm = (id: string) => (id === OWN ? 'Brabo United' : clubById(id).name);
const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

export function SeasonChangeView({ c, onDone }: { c: Change; onDone: () => void }) {
  const title = c.move === 'up' ? 'Promoted' : c.move === 'down' ? 'Relegated' : `Another season in ${tierName(c.from)}`;
  const tone = c.move === 'up' ? 'up' : c.move === 'down' ? 'down' : 'stay';
  return (
    <div className="fb-moment" role="dialog" aria-modal="true" aria-label={title}>
      <Aurora a={c.move === 'down' ? '#3a2a6a' : '#6c3fc4'} c={c.move === 'down' ? '#2a3a6a' : '#ff7a1a'}>
        <main className={`fb-page fb-seasonend ${tone}`}>
          <span className="fb-lb">Season {c.season} · {tierName(c.from)} · finished {ord(c.pos)}</span>
          <h2 className="fb-momtitle">{title}</h2>
          {c.playoff && (
            <section className="fb-card gold" aria-label="Playoff final">
              <span className="fb-lb">Playoff final</span>
              <p className="fb-s"><b>{nm(c.playoff.final[0])}</b> v <b>{nm(c.playoff.final[1])}</b></p>
              {c.playoff.winner && <p className="fb-s">{c.playoff.winner === OWN ? 'Won it. Up you go.' : `${nm(c.playoff.winner)} won it.`}</p>}
            </section>
          )}
          {c.up.length > 0 && (
            <section className="fb-card" aria-label="Going up">
              <span className="fb-lb">Going up from {tierName(c.from)}</span>
              <ul className="fb-moments">{c.up.map((id) => <li key={id} className={id === OWN ? 'me' : undefined}>{nm(id)}</li>)}</ul>
            </section>
          )}
          {c.down.length > 0 && (
            <section className="fb-card" aria-label="Going down">
              <span className="fb-lb">Going down from {tierName(c.from)}</span>
              <ul className="fb-moments">{c.down.map((id) => <li key={id} className={id === OWN ? 'me' : undefined}>{nm(id)}</li>)}</ul>
            </section>
          )}
          {c.move !== 'stay' && (
            <section className="fb-card pu" aria-label="Your ratings in the new league">
              <span className="fb-lb">Your ratings in {tierName(c.to)}</span>
              <p className="fb-s">{c.move === 'up' ? 'Same squad, bigger league: every number drops, with room to grow again.' : 'A smaller league: every number rises. Use it to come back up.'}</p>
              <ol className="fb-drops">
                {c.ratings.map((r) => (
                  <li key={r.axis}><b>{r.axis}</b><span className="fb-num">{r.before}</span><span aria-hidden="true">→</span><span className="fb-num">{r.after}</span><span className="fb-s">{r.after < r.before ? `down ${r.before - r.after}` : r.after > r.before ? `up ${r.after - r.before}` : 'same'}</span></li>
                ))}
              </ol>
            </section>
          )}
          <button type="button" className="fb-btn pri" onClick={onDone}>{c.move === 'up' ? `On to ${tierName(c.to)}` : 'Carry on'}</button>
        </main>
      </Aurora>
    </div>
  );
}
