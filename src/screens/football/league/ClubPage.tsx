// A club's page (spec §5.5, board 10; desk spec §4 and w3-club, Fork 2): what the table tells you (name, division,
// place, founded, ground, form) is always open; everything else is fogged, hatched with "?", until met or scouted.
// Known % and its bar on top; the head-to-head, a short news feed and the wiki below.
import { useLiveQuery } from 'dexie-react-hooks';
import { clubCrest } from '../../../football/art/crest';
import { clubById, STYLES, tierName } from '../../../football/data/load';
import { groundFor, groundSvg } from '../../../football/grounds';
import { headToHead, loadClubPage, type ClubPageData } from '../../../football/store/league';
import { OWN } from '../../../football/store/season';
import { position } from '../../../football/table';
import { go } from '../../../router';
import { Art, scoreLine } from '../Tonight';
import { CLUB_CLOCK } from '../../../football/fog/fog';
import { CLUB_LORE } from '../../../football/fog/words';
import { clubFog } from '../../../football/store/fog';
import { deskOf } from '../../../football/store/desk';
import { clockFilled } from '../../../football/desk/rules';
import { weakSide } from '../../../football/matchday';
import { FactRow, Known, Unknown } from '../world/Fog';
import { ResultMark } from './Table';
import { movesOf, opinionKnown, opinionOf, opinionWord, OPINION_INK, type Move } from '../../../football/market/relations';
import { relationSourceOf } from '../../../football/store/market';
import { Wiki } from './Wiki';

const WEAK: Record<string, string> = { left: 'Their left', middle: 'Through the middle', right: 'Their right' };
const nth = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

export function ClubPageView({ d, wiki = false }: { d: ClubPageData; wiki?: boolean }) {
  const { league: l, id } = d;
  const c = clubById(id);
  const tier = l.season.tierOf[id] ?? c.tier;
  const row = l.tables[tier]?.find((r) => r.id === id);
  const pos = row ? position(l.tables[tier], id) : undefined;
  const fog = clubFog(l.save, id);
  const k = fog.facts;
  const rivals = l.save.rivals.map((r) => r.clubId);
  const ground = groundFor(c, tier, rivals);
  const h = headToHead(d.all, id);
  const own = { step: l.save.crest.step, opt: l.save.crest.opt };
  const live = l.clubs.get(id);
  const style = live?.style ?? c.style;
  const lore = CLUB_LORE[id];
  const hidden = c.hidden ?? lore?.hiddenNew;
  const desk = deskOf(l.save);
  const road = desk.clocks.find((x) => x.job === 'scout' && x.target === id && clockFilled(desk, x) < x.size);
  const rel = relationSourceOf(l.save, d.all);
  const moves = movesOf(rel, id);
  if (wiki) return <Wiki d={d} />;
  return (
    <article className="fb-club fg" style={{ '--k': k.has('kit') ? c.colours[0] ?? '#888' : '#d6c4a0' } as React.CSSProperties}>
      <header className="fb-clubhd">
        {k.has('kit') ? <Art svg={clubCrest(c, 64, own)} /> : <Unknown size={56} label="Crest not known yet" />}
        <div className="fb-col">
          <h2 className="fb-t">{c.name}</h2>
          <span className="fb-s">{[tierName(tier), pos ? nth(pos) : undefined, fog.met ? 'met' : 'never met'].filter(Boolean).join(' · ')}</span>
        </div>
      </header>
      <Known pct={fog.pct} />
      <div className="fg-row"><span>Founded</span><b>{[c.founded, c.city].filter(Boolean).join(', ') || 'Not on record'}</b></div>
      {row && (
        <div className="fb-row"><span className="fb-lb">Form</span><span className="fb-form" aria-label={`Form: ${row.form.join(' ') || 'no games yet'}`}>{row.form.length ? row.form.map((r, i) => <ResultMark key={i} r={r} />) : <span className="fb-s">No games yet</span>}</span></div>
      )}
      <section className="fb-card" aria-label="Ground">
        <span className="fb-lb">Ground</span>
        <Art svg={groundSvg(ground)} className="fb-groundart" />
        <span><b>{ground.name}</b><span className="fb-s"> · {ground.kind === 'own' ? 'a ground of their own' : `a ${tierName(tier)} ground`}</span></span>
      </section>
      <FactRow label="Rating" known={k.has('rating')} num>{live?.rating ?? c.rating ?? '?'}</FactRow>
      <FactRow label="How they play" known={k.has('style')}>{STYLES[style]?.say ?? style}</FactRow>
      <FactRow label="Weak side" known={k.has('weak')}>{WEAK[weakSide(id)]}</FactRow>
      <FactRow label="Known ability" known={k.has('known')}>{c.known.length ? c.known.map((a) => `${a.name}${a.data ? ' [data]' : ''}: ${a.text}`).join(' · ') : 'None'}</FactRow>
      <FactRow label="Hidden ability" known={k.has('hidden')}>{hidden ? `${hidden.name}${hidden.data ? ' [data]' : ''}: ${hidden.text}` : 'None found'}</FactRow>
      {!k.has('hidden') && lore?.hiddenTease && k.has('known') && <p className="fg-note">“{lore.hiddenTease}” · Your scout</p>}
      <FactRow label="Their manager" known={k.has('manager')}>{lore ? `${lore.manager.name}: ${lore.manager.line}` : 'Not on file yet'}</FactRow>
      <FactRow label="History" known={k.has('history')}>{lore?.history ?? c.lore}</FactRow>
      <FactRow label="Kit and crest" known={k.has('kit')}><span className="fb-swatches" aria-label="Their colours">{c.colours.slice(0, 3).map((x) => <i key={x} style={{ background: x }} aria-hidden="true" />)}</span></FactRow>
      <Opinion known={opinionKnown(k, moves)} value={opinionOf(rel, id)} moves={moves} />
      {fog.pct < 100 && <p className="fg-note">Playing them lifts some of this. A scout lifts more, sooner.</p>}
      {fog.pct < 100 && (
        <button type="button" className="fb-btn pri" onClick={() => go('/football/desk/job', { id: 'scout', target: id })}>
          {road ? `Scout on the road: ${clockFilled(desk, road)} of ${road.size}` : `Send a scout: a trip of ${CLUB_CLOCK}`}
        </button>
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

/** What a club thinks of Brabo (w-relations): −100 to 100, with what moved it. Fogged until you know their manager
 *  or have dealt with them. It changes deals and talks, never a match. */
function Opinion({ known, value, moves }: { known: boolean; value: number; moves: Move[] }) {
  if (!known) return <FactRow label="Their opinion of you" known={false} />;
  const word = opinionWord(value), ink = OPINION_INK[word];
  const half = Math.abs(value) / 2;
  return (
    <section className="op" aria-label={`Their opinion of you: ${word}, ${value}`}>
      <div className="fg-row" style={{ borderBottom: 0 }}><span>Their opinion of you</span><b style={{ color: ink }}>{word} <span className="num">{value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '0'}</span></b></div>
      <div className="op-bar" aria-hidden="true"><i style={{ left: value < 0 ? `${50 - half}%` : '50%', width: `${half}%`, background: ink, boxShadow: `0 0 10px -2px ${ink}` }} /></div>
      <ul className="op-why">{moves.slice(-3).reverse().map((m, i) => <li key={i}><span>{m.why}</span><b className="num">{m.d > 0 ? `+${m.d}` : `−${-m.d}`}</b></li>)}</ul>
      <p className="fg-note">Friends give better loan terms; rivals deal harder. It never touches a match.</p>
    </section>
  );
}
