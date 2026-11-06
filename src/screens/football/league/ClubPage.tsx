// A club's page (spec §5.5, board 10): crest, colours, ground, style and known abilities; the quirk once you've met
// them, with [data] when it reads your data; the head-to-head; a short news feed; and the wiki.
import { useLiveQuery } from 'dexie-react-hooks';
import { clubCrest } from '../../../football/art/crest';
import { clubById, STYLES, tierName } from '../../../football/data/load';
import { groundFor, groundSvg } from '../../../football/grounds';
import { headToHead, loadClubPage, type ClubPageData } from '../../../football/store/league';
import { OWN } from '../../../football/store/season';
import { position } from '../../../football/table';
import { go } from '../../../router';
import { Art, scoreLine } from '../Tonight';
import { ResultMark } from './Table';
import { Wiki } from './Wiki';

export function ClubPageView({ d, wiki = false }: { d: ClubPageData; wiki?: boolean }) {
  const { league: l, id } = d;
  const c = clubById(id);
  const tier = l.season.tierOf[id] ?? c.tier;
  const row = l.tables[tier]?.find((r) => r.id === id);
  const pos = row ? position(l.tables[tier], id) : undefined;
  const met = l.save.met.includes(id);
  const rivals = l.save.rivals.map((r) => r.clubId);
  const ground = groundFor(c, tier, rivals);
  const h = headToHead(d.all, id);
  const own = { step: l.save.crest.step, opt: l.save.crest.opt };
  if (wiki) return <Wiki d={d} />;
  return (
    <article className="fb-club" style={{ '--k': c.colours[0] ?? '#888' } as React.CSSProperties}>
      <header className="fb-clubhd">
        <Art svg={clubCrest(c, 64, own)} />
        <div className="fb-col">
          <h2 className="fb-t">{c.name}</h2>
          <span className="fb-s">{[c.nickname, c.city, tierName(tier), pos ? `${pos}${pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'}` : undefined].filter(Boolean).join(' · ')}</span>
        </div>
      </header>
      <div className="fb-swatches" aria-hidden="true">{c.colours.slice(0, 3).map((k) => <i key={k} style={{ background: k }} aria-hidden="true" />)}</div>
      {row && (
        <div className="fb-row"><span className="fb-lb">Form</span><span className="fb-form" aria-label={`Form: ${row.form.join(' ') || 'no games yet'}`}>{row.form.length ? row.form.map((r, i) => <ResultMark key={i} r={r} />) : <span className="fb-s">No games yet</span>}</span></div>
      )}
      <section className="fb-card" aria-label="Ground">
        <span className="fb-lb">Ground</span>
        <Art svg={groundSvg(ground)} className="fb-groundart" />
        <span><b>{ground.name}</b><span className="fb-s"> · {ground.kind === 'own' ? 'a ground of their own' : `a ${tierName(tier)} ground`}</span></span>
      </section>
      <section className="fb-card" aria-label="Style">
        <span className="fb-lb">How they play</span>
        <p className="fb-s"><b>{c.style}</b>{STYLES[c.style]?.say ? `: ${STYLES[c.style].say}` : ''}</p>
        {c.known.map((a) => <p key={a.name} className="fb-s"><b>{a.name}</b>{a.data ? ' [data]' : ''}: {a.text}</p>)}
      </section>
      {c.hidden && (
        <section className={`fb-card ${met ? 'pu' : ''} fb-quirk`} aria-label="Quirk">
          <span className="fb-lb">Quirk</span>
          {met ? <p className="fb-s"><b>{c.hidden.name}</b>{c.hidden.data ? ' [data]' : ''}: {c.hidden.text}</p> : <p className="fb-s"><b>Hidden until you meet them.</b></p>}
        </section>
      )}
      <section className="fb-card" aria-label="Head to head">
        <span className="fb-lb">Head to head</span>
        <div className="fb-h2h"><div><b>{h.w}</b><span>Won</span></div><div><b>{h.d}</b><span>Drawn</span></div><div><b>{h.l}</b><span>Lost</span></div></div>
        {h.meetings.slice(-3).reverse().map((m) => (
          <button key={m.id} type="button" className="fb-meet" onClick={() => go('/football/match', { id: m.id })}><ResultMark r={m.result} /><span>{scoreLine(m)}</span></button>
        ))}
      </section>
      {d.news.length > 0 && (
        <section className="fb-card" aria-label="News">
          <span className="fb-lb">News</span>
          <ul className="fb-moments">{d.news.slice(0, 4).map((n) => <li key={n.id}>{n.text}</li>)}</ul>
        </section>
      )}
      <button type="button" className="fb-btn" onClick={() => go('/football/club-page', { id, wiki: '1' })}>Read the {c.name} wiki</button>
    </article>
  );
}

export function ClubPage({ id, wiki }: { id: string; wiki?: boolean }) {
  const d = useLiveQuery(() => loadClubPage(id), [id]);
  if (d === undefined) return null;
  if (d === null) return <p className="fb-s">The league starts once you found the club.</p>;
  if (id === OWN) return <button type="button" className="fb-btn" onClick={() => go('/football/club')}>Brabo United is your club: open the Club tab</button>;
  return <ClubPageView d={d} wiki={wiki} />;
}
