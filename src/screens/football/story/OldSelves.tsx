// Old Selves (spec §5.6, §8.11): each Old Self's page in brief (crest, nickname, that month's radar) and the Old
// Selves Cup, where retired selves play on.
import { kitCrest, kitParts } from '../../../football/art/crest';
import { clubById, tierName } from '../../../football/data/load';
import type { OldSelf } from '../../../football/oldSelves';
import type { FbClub } from '../../../football/store/tables';
import { Radar } from '../Radar';
import { Art } from '../Tonight';

function OldSelfCard({ o, tier }: { o: OldSelf; tier?: number }) {
  const def = o.id.startsWith('retired:') ? undefined : clubById(o.id);
  const [shape, sym] = kitParts(def ?? { id: o.id, name: o.name, crest: '' });
  return (
    <li className="fb-oldself">
      <div className="fb-row">
        <Art svg={kitCrest(shape, sym, def?.colours[0] ?? '#c4abff', 44, o.name)} />
        <div className="fb-col" style={{ flex: 1 }}>
          <b>{o.name}</b>
          <span className="fb-s">{[o.nickname, tier ? tierName(tier as 1) : undefined, `rated ${o.rating}`].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      {o.values && <Radar values={o.values} size={160} bare label={`${o.name}'s month`} />}
      {o.values && <p className="fb-s">{Object.entries(o.values).map(([a, v]) => `${a} ${Math.round(v)}`).join(' · ')}</p>}
      {o.standIn && <p className="fb-s">A stand-in until you have a finished month to fill this place.</p>}
    </li>
  );
}

export function OldSelves({ clubs, tierOf, retired = [] }: { clubs: FbClub[]; tierOf: Record<string, number>; retired?: OldSelf[] }) {
  const olds = clubs.filter((c) => c.old).sort((a, b) => (tierOf[a.id] ?? a.tier) - (tierOf[b.id] ?? b.tier) || b.rating - a.rating);
  return (
    <section className="fb-olds" aria-label="Old Selves">
      <div className="fb-row"><span className="fb-t">Old Selves</span><span className="fb-s">{olds.filter((c) => !c.old!.standIn).length} of 7 from your months</span></div>
      <p className="fb-s">Your finished months play in the league. Each season the newest joins and the weakest retires to the Old Selves Cup.</p>
      <ol className="fb-oldlist">{olds.map((c) => <OldSelfCard key={c.id} o={c.old!} tier={tierOf[c.id] ?? c.tier} />)}</ol>
      <span className="fb-lb">The Old Selves Cup</span>
      {retired.length ? <ol className="fb-oldlist">{retired.map((o) => <OldSelfCard key={o.id} o={o} />)}</ol> : <p className="fb-s">Nobody has retired yet. The first goes at the end of season 1.</p>}
    </section>
  );
}
