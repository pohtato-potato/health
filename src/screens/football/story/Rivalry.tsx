// One rivalry: the record, every meeting, and the moments between you.
import { clubCrest } from '../../../football/art/crest';
import { clubById } from '../../../football/data/load';
import { howText, twistOf, type Rival } from '../../../football/rivals';
import { headToHead } from '../../../football/store/league';
import type { StoredMatch } from '../../../football/store/tables';
import { ResultMark } from '../league/Table';
import { scoreLine } from '../Tonight';
import { Art } from '../Tonight';

export function RivalryView({ r, matches }: { r: Rival; matches: StoredMatch[] }) {
  const c = clubById(r.clubId);
  const h = headToHead(matches, r.clubId);
  const tw = twistOf(r);
  const moments = h.meetings.flatMap((m) => m.events.moments.map((x) => ({ date: m.date, text: x })));
  return (
    <>
      <header className="fb-clubhd">
        <Art svg={clubCrest(c, 64)} />
        <div className="fb-col"><h2 className="fb-t">{c.name}</h2><span className="fb-s">{howText(r)}{r.since ? ` Since ${r.since}.` : ''}</span></div>
      </header>
      <section className="fb-card hot" aria-label="The record">
        <span className="fb-lb">The record</span>
        <div className="fb-h2h"><b className="fb-num fb-big">{h.w}</b><span className="fb-s">won</span><b className="fb-num fb-big">{h.d}</b><span className="fb-s">drawn</span><b className="fb-num fb-big">{h.l}</b><span className="fb-s">lost</span></div>
        <span className="fb-s"><b>{tw.name}</b> · {tw.text}</span>
      </section>
      <section className="fb-card" aria-label="Meetings">
        <span className="fb-lb">Meetings</span>
        {h.meetings.length === 0 && <p className="fb-s">You haven’t met yet.</p>}
        {[...h.meetings].reverse().map((m) => (
          <div key={m.id} className="fb-row fb-meet">
            <ResultMark r={m.result} />
            <span className="fb-col" style={{ flex: 1 }}><span>{scoreLine(m)}</span><span className="fb-s">{m.date} · {m.round ?? m.comp}</span></span>
          </div>
        ))}
      </section>
      {moments.length > 0 && (
        <section className="fb-card pu" aria-label="Moments">
          <span className="fb-lb">Moments</span>
          {moments.slice(-6).reverse().map((x, i) => <span key={i} className="fb-s">{x.date} · {x.text}</span>)}
        </section>
      )}
    </>
  );
}
