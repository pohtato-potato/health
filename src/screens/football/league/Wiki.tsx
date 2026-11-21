// A club's wiki (board 23, k23-wiki): a paper page with a masthead, an info box and short sections; the made-up
// history, then what happened in this save, season by season. Your rival flag sits at the top, only for your rival.
import { Fragment } from 'react';
import { clubById, tierName } from '../../../football/data/load';
import { clubCrest } from '../../../football/art/crest';
import type { ClubPageData } from '../../../football/store/league';
import { go } from '../../../router';
import { clubFog } from '../../../football/store/fog';
import { loreOf } from '../../../football/fog/words';
import { howText } from '../../../football/rivals';
import { Art } from '../world/Fog';

const BOLT = <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
const dayShort = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The page itself, from plain values. `history` absent means still under the fog. */
export function WikiPage({ name, nick, crest, rival, facts, history, league, onBack }: { name: string; nick: string; crest: string; rival?: string; facts: [string, string][]; history?: string; league: string[]; onBack?: () => void }) {
  return (
    <article className="wk23" aria-label={`${name} wiki`}>
      <div className="mast-23"><Art svg={crest} /><span><b>{name}</b><small>{nick ? `${nick} · ` : ''}wiki</small></span></div>
      {rival && <div className="rival">{BOLT}<span>{rival}</span></div>}
      <dl className="ibox">{facts.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
      <h3>Their history</h3>
      {history ? <p>{history}</p> : <div className="fg-fog"><span>Their history</span><b aria-hidden="true">?</b></div>}
      <h3>In your league</h3>
      {league.length ? <ul>{league.map((l) => <li key={l}>{l}</li>)}</ul> : <p>Not yet in a season with you.</p>}
      {onBack && <button type="button" className="wk23-back" onClick={onBack}>Back to the club</button>}
    </article>
  );
}

export function Wiki({ d }: { d: ClubPageData }) {
  const c = clubById(d.id);
  const seasons = [...d.seasons].sort((a, b) => a.id - b.id);
  // The fog (desk spec §4): the history and the style stay hatched until known.
  const k = clubFog(d.league.save, d.id).facts;
  const rival = d.league.save.rivals?.find((r) => r.clubId === d.id);
  const league = seasons.map((s) => {
    const t = s.tierOf[d.id];
    const fin = s.final?.tables[t]?.findIndex((r) => r.id === d.id);
    const moved = s.final?.double?.id === d.id ? ', promoted two divisions' : s.final?.up[t]?.includes(d.id) ? ', promoted' : s.final?.down[t]?.includes(d.id) ? ', relegated' : '';
    const cups = [s.bigcup, ...Object.values(s.tiercups)].filter((b) => b.winner === d.id).map((b) => `, won ${b.name}`).join('');
    return `Season ${s.id}: ${t ? tierName(t) : 'not in the league'}${fin !== undefined && fin >= 0 ? `, finished ${fin + 1}` : ', still playing'}${moved}${cups}`;
  });
  return (
    <WikiPage
      name={c.name}
      nick={c.nickname}
      crest={clubCrest(c, 60)}
      rival={rival ? `Your rival since ${dayShort(rival.since)}. ${howText(rival)}` : undefined}
      facts={[
        ...(c.founded ? [['Founded', String(c.founded)] as [string, string]] : []),
        ['Ground', c.ground || 'Unknown'],
        ['Style', k.has('style') ? c.style : '?'],
        ...(c.city ? [['City', [c.city, c.country].filter(Boolean).join(', ')] as [string, string]] : []),
        ...(c.sponsor ? [['Sponsor', c.sponsor] as [string, string]] : []),
      ]}
      history={k.has('history') ? loreOf(d.id)?.history ?? c.lore : undefined}
      league={league}
      onBack={() => go('/football/club-page', { id: d.id })}
    />
  );
}
