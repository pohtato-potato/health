// Seasons: each one's finish, cups, kit and crest, and its Season Wrapped (look pass L4: filled panels).
import { tierName } from '../../../football/data/load';
import type { SeasonSummary } from '../../../football/seasonStory';
import { go } from '../../../router';
import { Action, Hero, Panel } from '../../../ui/kit/Kit';

const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const INK = { up: '#f2c46d', down: '#93c3dc', stay: '#c2b2ff' } as const;

export function SeasonsView({ list, kitOf, crestOf }: { list: SeasonSummary[]; kitOf?: (s: number) => string; crestOf?: (s: number) => string }) {
  return (
    <div className="lt-story">
      <Hero value={list.length} ink="#c2b2ff" label={list.length === 1 ? 'season so far' : 'seasons so far'} />
      {[...list].reverse().map((s) => (
        <Panel key={s.season} ink={INK[s.move === 'up' ? 'up' : s.move === 'down' ? 'down' : 'stay']} className="lt-season">
          <span className="lt-sh"><b>Season {s.season}</b><span className="k-q">{tierName(s.tier)}</span></span>
          <span>{s.pos ? `Finished ${ord(s.pos)}${s.move === 'up' ? ', promoted' : s.move === 'down' ? ', relegated' : ''}` : 'Still playing'}</span>
          <span className="k-q">{s.record.W} won, {s.record.D} drawn, {s.record.L} lost</span>
          {s.cups.map((c) => <span key={c} className="k-q">{c}</span>)}
          {(kitOf || crestOf) && <span className="k-q">{[kitOf?.(s.season), crestOf?.(s.season)].filter(Boolean).join(' · ')}</span>}
          <Action quiet sm onClick={() => go('/football/wrapped', { season: String(s.season) })}>Season Wrapped</Action>
        </Panel>
      ))}
    </div>
  );
}
