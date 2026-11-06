// Seasons: each one's finish, cups, kit and crest, and its Season Wrapped.
import { tierName } from '../../../football/data/load';
import type { SeasonSummary } from '../../../football/seasonStory';
import { go } from '../../../router';

const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

export function SeasonsView({ list, kitOf, crestOf }: { list: SeasonSummary[]; kitOf?: (s: number) => string; crestOf?: (s: number) => string }) {
  return (
    <>
      <h2 className="fb-t">Seasons</h2>
      {[...list].reverse().map((s) => (
        <section key={s.season} className={`fb-card${s.move === 'up' ? ' gold' : ''}`} aria-label={`Season ${s.season}`}>
          <div className="fb-row"><b>Season {s.season}</b><span className="fb-s">{tierName(s.tier)}</span></div>
          <span className="fb-s">{s.pos ? `Finished ${ord(s.pos)}${s.move === 'up' ? ', promoted' : s.move === 'down' ? ', relegated' : ''}` : 'Still playing'} · {s.record.W} won, {s.record.D} drawn, {s.record.L} lost</span>
          {s.cups.map((c) => <span key={c} className="fb-s">{c}</span>)}
          {(kitOf || crestOf) && <span className="fb-s">{[kitOf?.(s.season), crestOf?.(s.season)].filter(Boolean).join(' · ')}</span>}
          <button type="button" className="fb-btn sm" onClick={() => go('/football/wrapped', { season: String(s.season) })}>Season Wrapped</button>
        </section>
      ))}
    </>
  );
}
