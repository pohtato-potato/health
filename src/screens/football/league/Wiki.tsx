// A club's wiki: the made-up history, then what happened in this save, season by season.
import { clubById, tierName } from '../../../football/data/load';
import type { ClubPageData } from '../../../football/store/league';
import { go } from '../../../router';
import { clubFog } from '../../../football/store/fog';
import { CLUB_LORE } from '../../../football/fog/words';

export function Wiki({ d }: { d: ClubPageData }) {
  const c = clubById(d.id);
  const seasons = [...d.seasons].sort((a, b) => a.id - b.id);
  // The fog (desk spec §4): the history and the style stay hatched until known.
  const k = clubFog(d.league.save, d.id).facts;
  return (
    <article className="fb-wiki" aria-label={`${c.name} wiki`}>
      <h2 className="fb-t">{c.name}</h2>
      <span className="fb-s">{[c.nickname, c.city, c.country, c.founded ? `founded ${c.founded}` : ''].filter(Boolean).join(' · ')}</span>
      {k.has('history') ? <p className="fb-wikitext">{CLUB_LORE[d.id]?.history ?? c.lore}</p> : <div className="fg-fog"><span>Their history</span><b aria-hidden="true">?</b></div>}
      <dl className="fb-facts">
        <dt>Ground</dt><dd>{c.ground || 'Unknown'}</dd>
        <dt>Style</dt><dd>{k.has('style') ? c.style : '?'}</dd>
        {c.sponsor && <><dt>Sponsor</dt><dd>{c.sponsor}</dd></>}
      </dl>
      <span className="fb-lb">In your league</span>
      <ul className="fb-moments">
        {seasons.map((s) => {
          const t = s.tierOf[d.id];
          const fin = s.final?.tables[t]?.findIndex((r) => r.id === d.id);
          const moved = s.final?.double?.id === d.id ? ', promoted two divisions' : s.final?.up[t]?.includes(d.id) ? ', promoted' : s.final?.down[t]?.includes(d.id) ? ', relegated' : '';
          const cups = [s.bigcup, ...Object.values(s.tiercups)].filter((b) => b.winner === d.id).map((b) => `, won ${b.name}`).join('');
          return <li key={s.id}>Season {s.id}: {t ? tierName(t) : 'not in the league'}{fin !== undefined && fin >= 0 ? `, finished ${fin + 1}` : ', still playing'}{moved}{cups}</li>;
        })}
      </ul>
      <button type="button" className="fb-btn" onClick={() => go('/football/club-page', { id: d.id })}>Back to the club</button>
    </article>
  );
}
