// The atlas (w3-atlas, desk spec §4): the land in layers with the unseen part as parchment, how much of the world you
// have seen, and a division's table where a club you haven't met or scouted has no crest yet. Tables are always open.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { crestSvg } from '../../../football/art/crest';
import { clubById, tierName } from '../../../football/data/load';
import { factsOf, pctOf, SURFACE, worldSeen } from '../../../football/fog/fog';
import { loadLeague, type League } from '../../../football/store/league';
import { fogClubs, fogToday } from '../../../football/store/fog';
import { OWN } from '../../../football/store/season';
import { TIERS, type Tier } from '../../../football/types';
import { go, useRoute } from '../../../router';
import { Art, CrestOrFog } from './Fog';

type Layer = Tier | 0;
const LAYERS: Layer[] = [...TIERS, 0];
const SHORT = (t: Layer) => (t === 0 ? 'Abroad' : t === 1 ? 'Crown' : `Div ${t}`);
const INK = (t: Layer) => (t === 0 ? '#f4aedb' : `var(--fb-t${t})`);

export interface AtlasModel { l: League; today: string; seen: number; layers: { t: Layer; seen: number; fog: boolean }[] }
export function atlasOf(l: League, today = fogToday()): AtlasModel {
  const all = fogClubs(l.season.tierOf);
  const layers = LAYERS.map((t) => {
    const ids = all.filter((c) => c.tier === t).map((c) => c.id);
    return { t, seen: worldSeen(l.save, ids, today), fog: ids.some((id) => { const f = factsOf(l.save, id); return SURFACE.some((x) => !f.has(x)); }) };
  });
  return { l, today, seen: worldSeen(l.save, all.map((c) => c.id), today), layers };
}

/** The land in layers: each band coloured as far as it is seen, parchment beyond. */
function LayerMap({ layers, on, pick }: { layers: AtlasModel['layers']; on: Layer; pick: (t: Layer) => void }) {
  const W = 336, H = 26, G = 4;
  return (
    <svg className="fg-map" viewBox={`0 0 ${W} ${layers.length * (H + G) - G}`} role="img" aria-label={`The world in layers: ${layers.map((x) => `${x.t === 0 ? 'abroad' : tierName(x.t)} ${x.seen}% seen`).join(', ')}`}>
      <defs>
        <pattern id="fg-parch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#d6c4a0" /><rect width="3" height="8" fill="#c7b38b" /></pattern>
      </defs>
      {layers.map((x, i) => {
        const y = i * (H + G), w = (W * x.seen) / 100;
        return (
          <g key={x.t} onClick={() => pick(x.t)} style={{ cursor: 'pointer' }}>
            <rect x="0" y={y} width={W} height={H} rx="8" fill="url(#fg-parch)" opacity=".9" />
            <rect x="0" y={y} width={w} height={H} rx="8" style={{ fill: INK(x.t), transition: 'width .9s' }} />
            {x.t === on && <rect x="1" y={y + 1} width={W - 2} height={H - 2} rx="7" fill="none" stroke="#fff" strokeWidth="2" />}
            <text x="10" y={y + 18} fontSize="16" fontWeight="700" fill="#1a1426">{x.t === 0 ? 'Abroad' : tierName(x.t)}</text>
            <text x={W - 10} y={y + 18} fontSize="16" fontWeight="700" fill="#3a2f1c" textAnchor="end">{x.seen}%</text>
          </g>
        );
      })}
    </svg>
  );
}

export function AtlasView({ a, start }: { a: AtlasModel; start?: Layer }) {
  const { l, today } = a;
  const mine = l.season.tierOf[OWN];
  const [on, setOn] = useState<Layer>(start ?? mine);
  const layer = a.layers.find((x) => x.t === on)!;
  const own = crestSvg(l.save.crest.step, l.save.crest.opt, 28);
  const rows = on === 0
    ? fogClubs(l.season.tierOf).filter((c) => c.tier === 0).map((c) => ({ id: c.id, pts: undefined as number | undefined }))
      .sort((x, y) => clubById(x.id).name.localeCompare(clubById(y.id).name))
    : l.tables[on].map((r) => ({ id: r.id, pts: r.pts as number | undefined }));
  return (
    <section className="fg fg-atlas" aria-label="The atlas">
      <div className="fg-door"><h2 className="fb-t" style={{ margin: 0 }}>The atlas</h2><span className="fb-s">World seen: <b className="fg-pct">{a.seen}%</b></span></div>
      <LayerMap layers={a.layers} on={on} pick={setOn} />
      <div className="fg-tabs" role="group" aria-label="Layer">
        {LAYERS.map((t) => <button key={t} type="button" aria-pressed={on === t} onClick={() => setOn(t)}>{SHORT(t)}</button>)}
      </div>
      <ol className="fg-trows" aria-label={on === 0 ? 'Clubs abroad' : `${tierName(on)} table`}>
        {rows.map((r, i) => {
          const me = r.id === OWN;
          const f = me ? undefined : factsOf(l.save, r.id, today);
          const c = clubById(r.id);
          return (
            <li key={r.id} className={`fg-tr${me ? ' me' : ''}`}>
              <a href={`#/football/club-page?id=${encodeURIComponent(r.id)}`} aria-label={`${on === 0 ? '' : `${i + 1}, `}${me ? 'Brabo United' : c.name}${f ? `, known ${pctOf(f)}%` : ''}${r.pts !== undefined ? `, ${r.pts} points` : ''}`}>
                <span className="q">{on === 0 ? '' : i + 1}</span>
                {me ? <Art svg={own} /> : <CrestOrFog id={r.id} known={f!.has('kit')} />}
                <span className="nm"><b>{me ? 'Brabo United' : c.name}</b>{f && <span>Known {pctOf(f)}%</span>}</span>
                <b className="n">{r.pts ?? ''}</b>
              </a>
            </li>
          );
        })}
      </ol>
      <p className="fg-note">Tables are always open. A club you haven’t met or scouted keeps its crest, style and secrets under the hatching.</p>
      <button type="button" className="fb-btn pri" disabled={!layer.fog} onClick={() => go('/football/desk/job', { id: 'scout', target: on === 0 ? 'abroad' : `div:${on}` })}>
        {layer.fog ? 'Send a scout here' : 'Every crest here is known'}
      </button>
    </section>
  );
}

/** /football/atlas */
export function Atlas() {
  const { params } = useRoute();
  const l = useLiveQuery(loadLeague, []);
  if (l === undefined) return null;
  if (l === null) return <p className="fb-s">The league starts once you found the club.</p>;
  const t = params.get('layer');
  return <AtlasView a={atlasOf(l)} start={t === 'abroad' ? 0 : t && Number(t) >= 1 && Number(t) <= 6 ? (Number(t) as Tier) : undefined} />;
}
