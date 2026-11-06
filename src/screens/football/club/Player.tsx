// One squad member, FM-style: the football rating with the real value beside it. No legend.
import type { Member } from '../../../football/store/club';
import { band } from '../Radar';

export function PlayerView({ m, tierName }: { m: Member; tierName: string }) {
  return (
    <>
      <header className="fb-clubhd">
        <span className={`fb-member big ${m.real ? band(m.shown) : 'none'}${m.knock ? ' knock' : ''}`}><span className="fb-ring"><b className="fb-num">{m.real ? m.shown : '–'}</b></span></span>
        <div className="fb-col">
          <h2 className="fb-t">{m.label}</h2>
          <span className="fb-s">{m.axis}{m.captain ? ' · captain' : ''}{m.knock ? ` · ${m.knock}` : ''}</span>
        </div>
      </header>
      <section className="fb-card" aria-label="Rating">
        <div className="fb-row"><span className="fb-lb">In {tierName}</span><b className="fb-num fb-big">{m.real ? m.shown : '–'}<span className="fb-s"> / 20</span></b></div>
        <div className="fb-row"><span className="fb-lb">The real value</span><b className="fb-num">{m.real || 'no matches yet'}</b></div>
        <p className="fb-s">The rating is the real value against this division's average. Go up a division and the same habit rates lower.</p>
      </section>
      <section className="fb-card" aria-label="Form">
        <span className="fb-lb">Form · last {m.form.length} matches</span>
        {m.form.length ? <p className="fb-num fb-formrow">{m.form.join(' · ')}</p> : <p className="fb-s">No matches yet.</p>}
      </section>
      <section className="fb-card" aria-label="Contract">
        <span className="fb-lb">Contract</span>
        <p className="fb-s">{m.contract}, on at least 5 days in 7.</p>
      </section>
      <section className={`fb-card${m.awakened.length ? ' gold' : ''}`} aria-label="Traits and awakenings">
        <span className="fb-lb">Traits</span>
        {m.trait ? <p><b className={m.awakened.length ? 'fb-goldtext' : undefined}>{m.trait}</b> <span className="fb-s">+1 on its own chance type</span></p> : <p className="fb-s">None yet. An axis awakens when its 28-day average first reaches 11, 16 or 18.</p>}
        {m.awakened.length > 0 && <p className="fb-s">Awakened at {m.awakened.join(', ')} · {m.awakened.length} in the career</p>}
      </section>
    </>
  );
}
