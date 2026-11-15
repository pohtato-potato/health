// Old Selves (spec §5.6, §8.11): each Old Self's page in brief (crest, nickname, that month's radar) and the Old
// Selves Cup, where retired selves play on.
import { kitCrest, kitParts } from '../../../football/art/crest';
import { clubById, tierName } from '../../../football/data/load';
import type { OldSelf } from '../../../football/oldSelves';
import type { FbClub } from '../../../football/store/tables';
import { Radar } from '../Radar';
import { Art } from '../Tonight';
import { Hero, Panel, Sect } from '../../../ui/kit/Kit';

const LAV = '#c2b2ff';

function OldSelfCard({ o, tier }: { o: OldSelf; tier?: number }) {
  const def = o.id.startsWith('retired:') ? undefined : clubById(o.id);
  const [shape, sym] = kitParts(def ?? { id: o.id, name: o.name, crest: '' });
  return (
    <li><Panel ink={LAV} className="lt-old">
      <div className="lt-rhead">
        <Art svg={kitCrest(shape, sym, def?.colours[0] ?? '#c4abff', 44, o.name)} />
        <div className="k-col">
          <b className="lt-rname">{o.name}</b>
          <span className="k-q">{[o.nickname, tier ? tierName(tier as 1) : undefined, `rated ${o.rating}`].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      {o.values && <Radar values={o.values} size={160} bare label={`${o.name}'s month`} />}
      {o.values && <span className="k-q">{Object.entries(o.values).map(([a, v]) => `${a} ${Math.round(v)}`).join(' · ')}</span>}
      {o.standIn && <span className="k-q">A stand-in until you have a finished month to fill this place.</span>}
    </Panel></li>
  );
}

export function OldSelves({ clubs, tierOf, retired = [] }: { clubs: FbClub[]; tierOf: Record<string, number>; retired?: OldSelf[] }) {
  const olds = clubs.filter((c) => c.old).sort((a, b) => (tierOf[a.id] ?? a.tier) - (tierOf[b.id] ?? b.tier) || b.rating - a.rating);
  return (
    <div className="lt-story" aria-label="Old Selves">
      <Hero value={olds.filter((c) => !c.old!.standIn).length} ink={LAV} label="Old Selves from your months" under={`${olds.length} places in the league`} />
      <ol className="lt-olds">{olds.map((c) => <OldSelfCard key={c.id} o={c.old!} tier={tierOf[c.id] ?? c.tier} />)}</ol>
      <Sect>The Old Selves Cup</Sect>
      {retired.length ? <ol className="lt-olds">{retired.map((o) => <OldSelfCard key={o.id} o={o} />)}</ol> : <Panel><span className="k-q">Nobody has retired yet. The first goes at the end of season 1.</span></Panel>}
    </div>
  );
}
