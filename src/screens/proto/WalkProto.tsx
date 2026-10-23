import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { go, useRoute } from '../../router';
import { Icon } from '../../ui/Icon';
import { INDIA_OUTLINE } from '../../domain/walk';
import topScene from './walk-art/top-ravines.svg?raw';
import fortScene from './walk-art/gwalior-fort.svg?raw';
import stripArt from './walk-art/strip-stretch.svg?raw';
import mapArt from './walk-art/map-stretch.svg?raw';
import stampAgra from './walk-art/stamp-agra.svg?raw';
import stampGwalior from './walk-art/stamp-gwalior.svg?raw';
import visaDandi from './walk-art/visa-dandi.svg?raw';
import { CHAMBAL_FACTS, DANDI, EXPEDITIONS, EXPEDITION_KM, KIND_NAMES, KM_A_DAY, RECORD_NAMES, SHELF, WALKING, XUANZANG, type RouteKind, type ShelfRoute } from './walkSample';
import { REGIONS, ROUTE_ART } from './walkRoutes';

/**
 * Design prototype (sample numbers and draft text; nothing is read or saved): the redesigned Walk tab,
 * challenges and expeditions, the passport, a small stop, the map and a city arrival, on the aurora.
 * One motion idea runs through it: the trail draws itself.
 */

type Screen = 'walk' | 'shelf' | 'dandi' | 'harold' | 'join' | 'expedition' | 'passport' | 'stop' | 'map' | 'arrival';

const SCREENS: [Screen, string][] = [
  ['walk', 'Walk'],
  ['shelf', 'Choose a walk'],
  ['dandi', 'Dandi March'],
  ['harold', 'Harold Fry'],
  ['join', 'Joining'],
  ['expedition', 'Expedition'],
  ['passport', 'Passport'],
  ['stop', 'Small stop'],
  ['map', 'Map'],
  ['arrival', 'Arrival'],
];

const byId = (id: string) => SHELF.find((r) => r.id === id)!;
const fmt = (n: number) => n.toLocaleString('en-IN');
const inkOf = (id: string) => ({ '--ink': ROUTE_ART[id]?.ink ?? '#c9dcea' }) as CSSProperties;

/** "about 6 weeks" at the sample pace. */
export function timeAtPace(km: number): string {
  const days = Math.round(km / KM_A_DAY);
  if (days < 14) return `about ${days} days`;
  if (days < 75) return `about ${Math.round(days / 7)} weeks`;
  if (days < 540) return `about ${Math.round(days / 30)} months`;
  return `about ${Math.round(days / 365)} years`;
}

function Art({ svg, className = '' }: { svg: string; className?: string }) {
  return <div className={`wp-art ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Field() {
  return (
    <div className="wp-field" aria-hidden="true">
      <i className="wp-blob b1" />
      <i className="wp-blob b2" />
      <i className="wp-blob b3" />
      <i className="wp-blob b4" />
    </div>
  );
}

/** The point a fraction of the way along a polyline. */
function along(line: [number, number][], frac: number): [number, number] {
  const seg = line.slice(1).map((p, i) => Math.hypot(p[0] - line[i][0], p[1] - line[i][1]));
  let left = seg.reduce((a, b) => a + b, 0) * Math.max(0, Math.min(1, frac));
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i]) {
      const t = seg[i] ? left / seg[i] : 0;
      return [line[i][0] + (line[i + 1][0] - line[i][0]) * t, line[i][1] + (line[i + 1][1] - line[i][1]) * t];
    }
    left -= seg[i];
  }
  return line[line.length - 1];
}

/**
 * A route drawn on a faint outline of its land: the road ahead dashed, the part walked inked in the route's
 * own colour (it draws itself on arrival), and a breathing dot where you are.
 */
function RouteArt({ id, frac, kind = 'band', label, names = true }: { id: string; frac: number; kind?: 'band' | 'thumb' | 'hero'; label?: string; names?: boolean }) {
  const art = ROUTE_ART[id];
  const region = REGIONS[art.region];
  // Frame the route itself: its bounding box, with room around it for the land and the names, stretched to the
  // shape of the box it is drawn in (thumb 168×132, band 324×150, hero 324×230), so every route fills its card.
  const [pw, ph] = kind === 'thumb' ? [168, 132] : kind === 'band' ? [324, 150] : [324, 230];
  const xs = art.line.map((p) => p[0]);
  const ys = art.line.map((p) => p[1]);
  const [bx0, bx1, by0, by1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(bx1 - bx0, by1 - by0, region.box[2] * 0.04);
  let w = bx1 - bx0 + span * (kind === 'thumb' ? 0.7 : 1.1);
  let h = by1 - by0 + span * (kind === 'thumb' ? 0.7 : 0.6);
  if (w / h < pw / ph) w = h * (pw / ph);
  else h = w / (pw / ph);
  const x = (bx0 + bx1) / 2 - w / 2;
  const y = (by0 + by1) / 2 - h / 2;
  const pad = 0;
  const vb = `${x} ${y} ${w} ${h}`;
  const d = 'M' + art.line.map((p) => p.join(' ')).join(' L');
  const [ux, uy] = along(art.line, frac);
  const [ex, ey] = art.line[art.line.length - 1];
  const [sx, sy] = art.line[0];
  // Screen size of one unit, so dots stay about 5 px and names stay 15 px whatever the region's scale.
  const unit = pw / w;
  const r = 5 / unit;
  return (
    <svg className={`wp-ra ${kind}`} viewBox={vb} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label ?? `${byId(id).name}: ${Math.round(frac * 100)}% walked`}>
      <g className="wp-ra-grid" aria-hidden="true">
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={`v${t}`} x1={x - pad + (w + pad * 2) * t} y1={y - pad} x2={x - pad + (w + pad * 2) * t} y2={y + h + pad} vectorEffect="non-scaling-stroke" />
        ))}
        {[0.33, 0.66].map((t) => (
          <line key={`h${t}`} x1={x - pad} y1={y - pad + (h + pad * 2) * t} x2={x + w + pad} y2={y - pad + (h + pad * 2) * t} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {region.extra && <path className="wp-ra-ridge" d={region.extra} vectorEffect="non-scaling-stroke" />}
      <path className="wp-ra-land" d={region.outline} vectorEffect="non-scaling-stroke" />
      <path className="wp-ra-ahead" d={d} vectorEffect="non-scaling-stroke" />
      <path className="wp-ra-walked" d={d} pathLength={1} style={{ strokeDasharray: `${frac} 1`, ['--f' as string]: frac }} vectorEffect="non-scaling-stroke" />
      {kind !== 'thumb' &&
        art.line.slice(1, -1).map(([px, py], k) => <circle key={k} className="wp-ra-stop" cx={px} cy={py} r={r * 0.32} />)}
      <circle className="wp-ra-start" cx={sx} cy={sy} r={r * 0.7} />
      <circle className="wp-ra-end" cx={ex} cy={ey} r={r * 0.85} vectorEffect="non-scaling-stroke" />
      <circle className="wp-ra-halo" cx={ux} cy={uy} r={r * 1.6} />
      <circle className="wp-ra-you" cx={ux} cy={uy} r={r} />
      {kind !== 'thumb' && names && (
        <g className="wp-ra-names" style={{ fontSize: 15 / unit }}>
          <text x={sx + r * 1.6} y={sy - r * 0.8}>
            {art.ends[0]}
          </text>
          <text x={ex + r * 1.6} y={ey + r * 2.4}>
            {art.ends[1]}
          </text>
        </g>
      )}
    </svg>
  );
}

export function WalkProto() {
  const { params } = useRoute();
  const screen = (params.get('screen') as Screen | null) ?? 'walk';
  const state = params.get('state') ?? '';
  const [take, setTake] = useState(0);
  const show = (s: Screen, st?: string) => {
    go('/proto/walk', { screen: s, state: st }, { replace: true });
    setTake((t) => t + 1);
  };

  const states: Partial<Record<Screen, [string, string][]>> = {
    walk: [['', 'A walking day'], ['banner', 'Expedition news'], ['rest', 'Resting']],
    harold: [['', 'Story paused'], ['story', 'With the story']],
    arrival: [['', '1 · Arrive'], ['2', '2 · Zoom out'], ['3', '3 · Other speeds'], ['4', '4 · Stamp']],
  };
  const tint = screen === 'expedition' ? 'tint-silk' : screen === 'harold' ? 'tint-green' : screen === 'dandi' || screen === 'join' ? 'tint-sea' : screen === 'arrival' && state === '4' ? 'tint-gold' : '';

  return (
    <div className={`wp ${tint}`}>
      <Field />
      <div className="wp-dev" aria-label="Prototype controls">
        <div className="wp-dev-row">
          {SCREENS.map(([s, label]) => (
            <button key={s} type="button" className={s === screen ? 'on' : ''} onClick={() => show(s)}>
              {label}
            </button>
          ))}
        </div>
        <div className="wp-dev-row">
          {(states[screen] ?? []).map(([st, label]) => (
            <button key={st} type="button" className={st === state ? 'on' : ''} onClick={() => show(screen, st || undefined)}>
              {label}
            </button>
          ))}
          <button type="button" onClick={() => setTake((t) => t + 1)}>
            Replay motion
          </button>
        </div>
      </div>
      <div key={`${screen}-${state}-${take}`} className="wp-screen">
        {screen === 'walk' && <WalkPage state={state} show={show} />}
        {screen === 'shelf' && <Shelf show={show} />}
        {screen === 'dandi' && <DandiPage show={show} />}
        {screen === 'harold' && <HaroldPage paused={state !== 'story'} show={show} />}
        {screen === 'join' && <JoinMoment show={show} />}
        {screen === 'expedition' && <ExpeditionPage show={show} />}
        {screen === 'passport' && <Passport show={show} />}
        {screen === 'stop' && <StopMoment show={show} />}
        {screen === 'map' && <MapPage show={show} />}
        {screen === 'arrival' && <Arrival beat={Number(state || 1)} show={show} />}
      </div>
    </div>
  );
}

type Show = (s: Screen, st?: string) => void;

function Back({ to, label, show }: { to: Screen; label: string; show: Show }) {
  return (
    <button type="button" className="wp-back" onClick={() => show(to)}>
      <Icon name="left" size={20} stroke={1.8} />
      {label}
    </button>
  );
}

/* ---------- the Walk tab ---------- */

function WalkPage({ state, show }: { state: string; show: Show }) {
  const [news, setNews] = useState(true);
  const resting = state === 'rest';
  return (
    <main className="wp-page">
      <div className="wp-scene">
        <Art svg={topScene} className="melt" />
        <div className="wp-place">
          <button type="button" className="wp-pill">
            <Icon name="home" size={18} stroke={1.8} />
            Home
          </button>
          <button type="button" className="wp-pill">{resting ? 'Sick' : 'Usual day'}</button>
        </div>
      </div>
      <div className="wp-col">
        {state === 'banner' && news && (
          <div className="wp-banner rise" role="status" style={inkOf('xuanzang')}>
            <span className="grow">
              <b>Expedition news.</b> Xuanzang has reached the court of Turfan.
            </span>
            <button type="button" className="wp-banner-act" onClick={() => show('expedition')}>
              Read
            </button>
            <button type="button" className="wp-banner-x" aria-label="Dismiss" onClick={() => setNews(false)}>
              <Icon name="close" size={18} stroke={1.8} />
            </button>
          </div>
        )}
        <div className="rise">
          <h1 className="wp-title">Bandit Country</h1>
          <p className="wp-sub">Agra to Gwalior · day 3 of about 12</p>
        </div>
        <button type="button" className="wp-strip rise" onClick={() => show('map')} aria-label="The stretch, on the map">
          <Art svg={stripArt} />
        </button>
        <ul className="wp-lines rise">
          {resting ? (
            <>
              <li>Resting at camp outside Agra. The road waits.</li>
              <li>241 km from Delhi</li>
            </>
          ) : (
            <>
              <li>Today 10.4 km · 241 km from Delhi</li>
              <li>
                <button type="button" className="wp-linkline" onClick={() => show('stop')}>
                  Rajasthan's border in 17 km.
                </button>
              </li>
              <li>Tomorrow: the border. A big day reaches Dholpur.</li>
            </>
          )}
        </ul>

        <h2 className="wp-h2">Challenges</h2>
        <div className="wp-rc-list">
          {WALKING.map((w, i) => (
            <ChallengeCard key={w.id} w={w} i={i} onOpen={() => show(w.id === 'dandi' ? 'dandi' : 'harold')} />
          ))}
        </div>

        <h2 className="wp-h2">Expeditions</h2>
        {EXPEDITIONS.map((e) => (
          <button key={e.id} type="button" className="wp-exp" style={inkOf(e.id)} onClick={() => show('expedition')}>
            <span className="wp-exp-art">
              <RouteArt id={e.id} frac={e.km / byId(e.id).km} kind="thumb" />
            </span>
            <span className="wp-exp-text">
              <span className="wp-exp-name">{byId(e.id).name}</span>
              <span className="wp-exp-meta">
                {fmt(e.km)} of about {fmt(byId(e.id).km)} km · in {e.place}
              </span>
            </span>
          </button>
        ))}
        <button type="button" className="wp-exp empty" onClick={() => show('shelf')}>
          <span className="wp-exp-art empty" aria-hidden="true">
            <Icon name="plus" size={22} stroke={1.8} />
          </span>
          <span className="wp-exp-text">
            <span className="wp-exp-name">A second expedition</span>
            <span className="wp-exp-meta">Choose one, or let the app choose</span>
          </span>
        </button>

        <nav className="wp-doors" aria-label="More of the walk">
          {(
            [
              ['Map', 'map'],
              ['Passport', 'passport'],
              ['Departures', 'walk'],
              ['Wrapped', 'walk'],
            ] as [string, Screen][]
          ).map(([label, to]) => (
            <button key={label} type="button" onClick={() => show(to)}>
              {label}
              <Icon name="right" size={16} stroke={1.8} />
            </button>
          ))}
        </nav>
        <button type="button" className="wp-primary" onClick={() => show('shelf')}>
          Choose a walk
        </button>
      </div>
    </main>
  );
}

/** A challenge in the app's collectible style: the route on its land in a band, the words on a panel below. */
function ChallengeCard({ w, i, onOpen }: { w: (typeof WALKING)[number]; i: number; onOpen: () => void }) {
  const r = byId(w.id);
  return (
    <button type="button" className={`wp-rc rise ${r.book ? 'book' : ''}`} style={{ ...inkOf(w.id), animationDelay: `${120 + i * 90}ms` }} onClick={onOpen}>
      <span className="wp-rc-band">
        <RouteArt id={w.id} frac={w.km / r.km} />
        <span className="wp-era-stamp" aria-hidden="true">
          {r.era}
        </span>
        {r.book && <span className="wp-ribbon" aria-hidden="true" />}
      </span>
      <span className="wp-rc-panel">
        <span className="wp-rc-name">{r.name}</span>
        <span className="wp-rc-nums">
          <b>{fmt(w.km)}</b>
          <span>of {fmt(r.km)} km · {w.stretch}</span>
        </span>
        <span className="wp-rc-line">{w.line}</span>
        {w.target && <span className="wp-rc-target">{w.target}</span>}
      </span>
    </button>
  );
}

/* ---------- choosing a walk ---------- */

function Shelf({ show }: { show: Show }) {
  const [open, setOpen] = useState<ShelfRoute | null>(null);
  const kinds = Object.keys(KIND_NAMES) as RouteKind[];
  return (
    <main className="wp-page">
      <div className="wp-col">
        <Back to="walk" label="Walk" show={show} />
        <div className="rise">
          <h1 className="wp-title big">Choose a walk</h1>
          <p className="wp-sub">Challenges 2 of 2 walking · Expeditions 1 of 2</p>
        </div>
      </div>
      {kinds.map((k, ki) => (
        <section key={k} className="wp-shelf-row">
          <h2 className="wp-h2 wp-col">{KIND_NAMES[k]}</h2>
          <div className="wp-cards" role="list">
            {SHELF.filter((r) => r.kind === k).map((r, i) => (
              <button key={r.id} type="button" role="listitem" className="wp-sc rise" style={{ ...inkOf(r.id), animationDelay: `${ki * 80 + i * 60}ms` }} onClick={() => setOpen(r)}>
                <span className="wp-sc-art">
                  <RouteArt id={r.id} frac={0} kind="thumb" label={`${r.name} on its map`} />
                </span>
                <span className="wp-sc-text">
                  <span className="wp-sc-name">{r.name}</span>
                  <span className="wp-sc-meta">
                    {fmt(r.km)} km · {timeAtPace(r.km)}
                  </span>
                  <span className="wp-sc-era">
                    {r.era}
                    {r.km > EXPEDITION_KM ? ' · Expedition' : ''}
                    {r.book ? ' · Book' : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
      {open && (
        <div className="wp-sheet" role="dialog" aria-label={open.name} onClick={() => setOpen(null)}>
          <div className="wp-sheet-in ink" style={inkOf(open.id)} onClick={(e) => e.stopPropagation()}>
            <RouteArt id={open.id} frac={0} kind="hero" label={`${open.name} on its map`} />
            <h2 className="wp-title">{open.name}</h2>
            <p className="wp-sub">
              {fmt(open.km)} km · {timeAtPace(open.km)} at your pace · {open.era} · {RECORD_NAMES[open.record]}
            </p>
            <p className="wp-para">{open.hook}</p>
            {open.book && (
              <p className="wp-para">
                <b>{open.book.by}.</b> {open.book.synopsis} <span className="wp-quiet">(Spoiler-free.)</span>
              </p>
            )}
            <div className="wp-actions">
              <button type="button" className="wp-primary" onClick={() => show('join')}>
                {open.km > EXPEDITION_KM ? 'Start this expedition' : 'Join this walk'}
              </button>
              <button type="button" className="wp-ghost" onClick={() => setOpen(null)}>
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- a history challenge ---------- */

function RouteHero({ id, frac, title, sub }: { id: string; frac: number; title: string; sub: string }) {
  return (
    <header className="wp-hero" style={inkOf(id)}>
      <RouteArt id={id} frac={frac} kind="hero" />
      <div className="wp-hero-text">
        <h1 className="wp-title big">{title}</h1>
        <p className="wp-sub">{sub}</p>
      </div>
    </header>
  );
}

function DandiPage({ show }: { show: Show }) {
  const w = WALKING[0];
  const r = byId('dandi');
  const [open, setOpen] = useState(false);
  const [deeper, setDeeper] = useState(false);
  return (
    <main className="wp-page" style={inkOf('dandi')}>
      <div className="wp-col">
        <Back to="walk" label="Walk" show={show} />
      </div>
      <RouteHero id="dandi" frac={w.km / r.km} title={r.name} sub={`Sabarmati to Dandi · 1930 · ${RECORD_NAMES[r.record]}`} />
      <div className="wp-col">
        <p className="wp-big rise">
          <span className="wp-count">{fmt(w.km)}</span>
          <small>of {fmt(r.km)} km · your day {w.day} · {w.stretch}</small>
        </p>

        <section className="wp-dispatch rise">
          <span className="wp-label">Today on the road</span>
          <p className="wp-voice">The marchers cross the Mahi and stop at Kareli.</p>
          <div className={`wp-unfold ${open ? 'open' : ''}`}>
            <div>
              {DANDI.page.map((p) => (
                <p key={p} className="wp-para">
                  {p}
                </p>
              ))}
            </div>
          </div>
          <div className="wp-actions">
            <button type="button" className="wp-ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
              {open ? 'Less' : 'Read the day'}
            </button>
            <button type="button" className="wp-ghost" onClick={() => setDeeper(true)}>
              Go deeper
            </button>
          </div>
        </section>

        <ThenAndYou />

        <section className="wp-group rise">
          <h2 className="wp-h2">The halts</h2>
          <ol className="wp-halts">
            {DANDI.halts.map((h, i) => (
              <li key={h.n} className={h.done ? 'done' : h.here ? 'here' : ''} style={{ animationDelay: `${300 + i * 50}ms` }}>
                <span className="wp-halt-stamp" aria-hidden="true">
                  {h.n}
                </span>
                <span className="grow">{h.name}</span>
                <span className="st">{h.done ? 'Stamped' : h.here ? "You're here" : ''}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="wp-actions">
          <button type="button" className="wp-ghost">Add a target date</button>
          <button type="button" className="wp-ghost">Put it down</button>
        </div>
      </div>

      {deeper && (
        <div className="wp-sheet" role="dialog" aria-label="Go deeper" onClick={() => setDeeper(false)}>
          <div className="wp-sheet-in ink" onClick={(e) => e.stopPropagation()}>
            <span className="wp-label">Go deeper</span>
            <h2 className="wp-title">Why salt</h2>
            <p className="wp-para">{DANDI.deeper}</p>
            <button type="button" className="wp-primary" onClick={() => setDeeper(false)}>
              Back to the road
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/** You and the 1930 marchers on one day-line: who reached Kareli when. */
function ThenAndYou() {
  const days = 24;
  const at = (d: number) => `${(d / days) * 100}%`;
  return (
    <section className="wp-then rise" aria-label="Then and you: the marchers reached Kareli on day 8, you on day 12">
      <span className="wp-label">Then and you · reaching Kareli</span>
      <div className="wp-then-line">
        <i className="track" />
        <span className="mark them" style={{ left: at(8) }}>
          <i />
          <b>Day 8</b>
          <small>1930</small>
        </span>
        <span className="mark you" style={{ left: at(12) }}>
          <i />
          <b>Day 12</b>
          <small>You</small>
        </span>
      </div>
      <p className="wp-quiet">The march took 24 days in all. From its daily record.</p>
    </section>
  );
}

/* ---------- a book route ---------- */

function HaroldPage({ paused, show }: { paused: boolean; show: Show }) {
  const w = WALKING[1];
  const r = byId('harold');
  return (
    <main className="wp-page" style={inkOf('harold')}>
      <div className="wp-col">
        <Back to="walk" label="Walk" show={show} />
      </div>
      <RouteHero id="harold" frac={w.km / r.km} title={r.name} sub={`The Unlikely Pilgrimage of Harold Fry · ${r.book!.by} · 2012`} />
      <div className="wp-col">
        <p className="wp-big rise">
          <span className="wp-count">{fmt(w.km)}</span>
          <small>of {fmt(r.km)} km · Kingsbridge to Berwick-upon-Tweed</small>
        </p>
        <div className="wp-chips" role="group" aria-label="Story or places">
          <button type="button" className={!paused ? 'on' : ''} onClick={() => show('harold', 'story')}>
            With the story
          </button>
          <button type="button" className={paused ? 'on' : ''} onClick={() => show('harold')}>
            Places only
          </button>
        </div>
        {paused ? (
          <section className="wp-dispatch bookmark rise">
            <span className="wp-ribbon big" aria-hidden="true" />
            <span className="wp-label">Bookmarked · your day 18</span>
            <p className="wp-voice">The story waits here while you read on in the book.</p>
            <p className="wp-para">Until you come back, the walk shows places only.</p>
            <div className="wp-actions">
              <button type="button" className="wp-primary" onClick={() => show('harold', 'story')}>
                Resume the story
              </button>
              <button type="button" className="wp-ghost">Catch me up first</button>
            </div>
          </section>
        ) : (
          <section className="wp-dispatch rise">
            <span className="wp-label">Today in the story · day 21</span>
            <p className="wp-voice">[The day's story, in our own words, would sit here.]</p>
            <div className="wp-actions">
              <button type="button" className="wp-ghost" onClick={() => show('harold')}>
                Pause the story here
              </button>
            </div>
          </section>
        )}
        <section className="wp-dispatch quiet rise">
          <span className="wp-label">Places today · {w.stretch}</span>
          <p className="wp-para">The road leaves Devon behind for the farms and levels of Somerset.</p>
        </section>
        <section className="wp-dispatch quiet rise">
          <span className="wp-label">About the book</span>
          <p className="wp-para">{r.book!.synopsis}</p>
          <details className="wp-about">
            <summary>Full synopsis · spoilers</summary>
            <p className="wp-para">Opens behind this warning, and freely once you finish the walk.</p>
          </details>
        </section>
      </div>
    </main>
  );
}

/* ---------- joining: the visa stamps down and the route inks itself in ---------- */

function JoinMoment({ show }: { show: Show }) {
  const r = byId('dandi');
  return (
    <main className="wp-moment join" style={inkOf('dandi')}>
      <div className="wp-join-map" aria-hidden="true">
        <RouteArt id="dandi" frac={1} kind="hero" names={false} label="The route, inking itself in" />
      </div>
      <div className="wp-join-stamp">
        <span className="wp-join-ring" aria-hidden="true" />
        <span className="wp-join-ring r2" aria-hidden="true" />
        <Art svg={visaDandi} className="wp-visa" />
        <span className="wp-dust" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} style={{ ['--a' as string]: `${i * 36}deg` }} />
          ))}
        </span>
      </div>
      <h1 className="wp-moment-title late1">You've joined the Dandi March</h1>
      <p className="wp-para center late2">
        {fmt(r.km)} km, Sabarmati to Dandi. Your steps count from today: {timeAtPace(r.km)} at your pace, with no deadline.
      </p>
      <div className="wp-moment-btns late3">
        <button type="button" className="wp-primary" onClick={() => show('dandi')}>
          Start walking
        </button>
        <button type="button" className="wp-ghost">Add a target date</button>
      </div>
    </main>
  );
}

/* ---------- an expedition ---------- */

function ExpeditionPage({ show }: { show: Show }) {
  const e = EXPEDITIONS[0];
  const r = byId('xuanzang');
  return (
    <main className="wp-page" style={inkOf('xuanzang')}>
      <div className="wp-col">
        <Back to="walk" label="Walk" show={show} />
      </div>
      <RouteHero id="xuanzang" frac={e.km / r.km} title={r.name} sub={`Chang'an to Nalanda and home · 629–645 · ${RECORD_NAMES[r.record]}`} />
      <div className="wp-col">
        <p className="wp-big rise">
          <span className="wp-count">{fmt(e.km)}</span>
          <small>of about {fmt(r.km)} km · in {e.place}</small>
        </p>
        <section className="wp-dispatch rise">
          <span className="wp-label">On the road · {XUANZANG.stretch}</span>
          <p className="wp-voice">{XUANZANG.line}</p>
          {XUANZANG.page.map((p) => (
            <p key={p} className="wp-para">
              {p}
            </p>
          ))}
          <div className="wp-actions">
            <button type="button" className="wp-ghost">Go deeper</button>
          </div>
        </section>
        <section className="wp-dispatch quiet rise">
          <span className="wp-label">Story layer</span>
          <p className="wp-para">Journey to the West, the novel that turned this road into legend, can run beside the history. It's off.</p>
          <button type="button" className="wp-ghost">Turn it on</button>
        </section>
        <div className="wp-actions">
          <button type="button" className="wp-ghost">Put it down</button>
        </div>
      </div>
    </main>
  );
}

/* ---------- passport ---------- */

function Passport({ show }: { show: Show }) {
  const [tab, setTab] = useState<'pages' | 'visas'>('pages');
  return (
    <main className="wp-page">
      <div className="wp-col">
        <Back to="walk" label="Walk" show={show} />
        <div className="rise">
          <h1 className="wp-title big">Passport</h1>
          <p className="wp-sub">3 of 28 states · 1 of 8 union territories · 2 of 46 cities</p>
        </div>
        <div className="wp-chips" role="group" aria-label="Passport section">
          <button type="button" className={tab === 'pages' ? 'on' : ''} onClick={() => setTab('pages')}>
            Pages
          </button>
          <button type="button" className={tab === 'visas' ? 'on' : ''} onClick={() => setTab('visas')}>
            Visas
          </button>
        </div>
        {tab === 'pages' ? (
          <section key="pages" className="wp-pp rise">
            <div className="wp-pp-head">
              <span className="wp-pp-title">Uttar Pradesh</span>
              <span className="wp-quiet">State · entered 12 days ago</span>
            </div>
            <div className="wp-pp-stamps">
              <Art svg={stampAgra} className="wp-pp-stamp" />
            </div>
            <p className="wp-para">Kept: a box of petha from Agra.</p>
            <div className="wp-actions">
              <button type="button" className="wp-ghost">Haryana</button>
              <button type="button" className="wp-ghost" onClick={() => show('arrival')}>
                Replay Agra
              </button>
            </div>
          </section>
        ) : (
          <section key="visas" className="wp-pp rise">
            <div className="wp-pp-head">
              <span className="wp-pp-title">Visas</span>
              <span className="wp-quiet">2 challenges · 1 expedition</span>
            </div>
            <div className="wp-pp-stamps">
              <Art svg={visaDandi} className="wp-pp-stamp" />
            </div>
            <p className="wp-para">The Dandi March · joined 12 days ago · stamped "Completed" at Dandi.</p>
          </section>
        )}
        <section className="wp-dispatch quiet">
          <span className="wp-label">Next page</span>
          <p className="wp-para">Your next state appears here once you cross into it.</p>
          <div className="wp-pp-ghost" aria-hidden="true">
            <Art svg={stampGwalior} />
          </div>
        </section>
      </div>
    </main>
  );
}

/* ---------- a small stop: the river scene, then one fact at a time ---------- */

function StopMoment({ show }: { show: Show }) {
  const [i, setI] = useState(0);
  return (
    <main className="wp-moment stop">
      <ChambalScene />
      <div className="wp-col">
        <span className="wp-kind rise">
          <RiverMark />
          River · small stop
        </span>
        <h1 className="wp-title big rise">The Chambal</h1>
        <div className="wp-deck" aria-live="polite">
          <i className="wp-deck-back b2" aria-hidden="true" />
          <i className="wp-deck-back b1" aria-hidden="true" />
          <button key={i} type="button" className="wp-fact" onClick={() => setI((i + 1) % CHAMBAL_FACTS.length)}>
            <span className="wp-fact-text">{CHAMBAL_FACTS[i]}</span>
            <span className="wp-fact-foot">
              <span className="wp-dots" aria-hidden="true">
                {CHAMBAL_FACTS.map((_, k) => (
                  <i key={k} className={k === i ? 'on' : ''} />
                ))}
              </span>
              <span>
                {i + 1} of {CHAMBAL_FACTS.length} · tap for the next
              </span>
            </span>
          </button>
        </div>
        <button type="button" className="wp-ghost" onClick={() => show('walk')}>
          Back to the walk
        </button>
      </div>
    </main>
  );
}

function ChambalScene() {
  return (
    <svg className="wp-river melt" viewBox="0 0 360 220" role="img" aria-label="The Chambal at dusk between ravine banks, a gharial on a sandbank">
      <defs>
        <linearGradient id="rvSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f2358" stopOpacity=".2" />
          <stop offset=".7" stopColor="#b8626a" stopOpacity=".8" />
          <stop offset="1" stopColor="#ee9e68" />
        </linearGradient>
        <linearGradient id="rvWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c48a86" />
          <stop offset="1" stopColor="#3a4a78" />
        </linearGradient>
      </defs>
      <rect width="360" height="150" fill="url(#rvSky)" />
      <circle className="wp-sun" cx="250" cy="118" r="16" fill="#ffe2bc" />
      <path d="M0 132 L30 120 L46 128 L70 114 L96 126 L120 116 L150 128 L360 128 V150 H0Z" fill="#8d5a68" />
      <path d="M210 132 L236 118 L262 126 L290 112 L322 124 L360 116 V150 H210Z" fill="#7a4b5a" />
      <rect y="140" width="360" height="80" fill="url(#rvWater)" />
      <g className="wp-water" stroke="#f6d2b4" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round">
        <path d="M20 160 h40 M120 168 h60 M240 158 h50 M60 182 h70 M200 190 h80 M300 176 h40 M10 202 h50 M150 206 h60" />
      </g>
      <path d="M0 150 C40 146 70 152 96 158 L0 176 Z" fill="#5a3546" />
      <path d="M248 182 C270 172 320 170 360 174 V196 C320 192 280 194 248 182 Z" fill="#d9b18c" />
      <g fill="#3b3a2c">
        <path d="M262 180 C276 174 300 172 316 176 C322 177 326 178 330 177 L344 176 L330 180 C322 182 300 184 276 183 Z" />
        <path d="M270 181 l-3 4 M282 182 l-2 4 M300 182 l2 4 M312 181 l2 4" stroke="#3b3a2c" strokeWidth="2" />
      </g>
      <g className="wp-birds" fill="none" stroke="#2a1d3a" strokeWidth="1.3" strokeLinecap="round">
        <path d="M90 60 q4 -4 8 0 q4 -4 8 0" />
        <path d="M114 72 q3 -3 6 0 q3 -3 6 0" />
      </g>
    </svg>
  );
}

function RiverMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 9c3-2 5 2 9 0s6-2 9 0M3 15c3-2 5 2 9 0s6-2 9 0" />
    </svg>
  );
}

/* ---------- map ---------- */

function MapPage({ show }: { show: Show }) {
  const [zoom, setZoom] = useState('Stretch');
  return (
    <main className="wp-page">
      <div className="wp-col">
        <Back to="walk" label="Walk" show={show} />
        <div className="rise">
          <h1 className="wp-title">Bandit Country</h1>
          <p className="wp-sub">Agra to Gwalior · 8 of 120 km</p>
        </div>
      </div>
      <Art svg={mapArt} className="wp-map" />
      <div className="wp-col">
        <div className="wp-chips" role="group" aria-label="How far out">
          {['Stretch', 'Chapter', 'India'].map((z) => (
            <button key={z} type="button" className={zoom === z ? 'on' : ''} onClick={() => setZoom(z)}>
              {z}
            </button>
          ))}
        </div>
        <button type="button" className="wp-ghost wp-fly">
          <Icon name="play" size={18} stroke={1.8} />
          Fly the trail
        </button>
      </div>
    </main>
  );
}

/* ---------- a city arrival, in four beats ---------- */

/** Counts up to a number once, unless motion is reduced. */
function useCount(to: number, ms = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return n;
}

function Arrival({ beat, show }: { beat: number; show: Show }) {
  const next = () => (beat >= 4 ? show('passport') : show('arrival', String(beat + 1)));
  let body: ReactNode;
  if (beat === 1) {
    body = (
      <>
        <Art svg={fortScene} className="melt2 wp-arrive-art" />
        <div className="wp-col center">
          <h1 className="wp-arrive-name" aria-label="Gwalior">
            {'Gwalior'.split('').map((c, i) => (
              <span key={i} aria-hidden="true" style={{ animationDelay: `${500 + i * 70}ms` }}>
                {c}
              </span>
            ))}
          </h1>
          <i className="wp-arrive-rule" aria-hidden="true" />
          <p className="wp-para center late2">Day 36 · 350 km from Delhi · [height] m above the sea</p>
        </div>
      </>
    );
  } else if (beat === 2) {
    body = <ZoomOut />;
  } else if (beat === 3) {
    body = <Speeds />;
  } else {
    body = (
      <div className="wp-col center">
        <div className="wp-join-stamp gold">
          <span className="wp-join-ring" aria-hidden="true" />
          <Art svg={stampGwalior} className="wp-stamp-land" />
        </div>
        <h1 className="wp-title big late1">Stamped</h1>
        <p className="wp-para center late2">Gwalior · Madhya Pradesh · stamp 3 of 46</p>
      </div>
    );
  }
  return (
    <main className="wp-moment arrival" onClick={next}>
      {body}
      <p className="wp-quiet center late3">Tap to go on</p>
    </main>
  );
}

function ZoomOut() {
  const km = useCount(350, 1800);
  const trail = 'M98.6 98.9 L106.1 113.2 L107.7 122.8';
  return (
    <div className="wp-col center">
      <svg className="wp-zoom" viewBox="0 0 300 322" role="img" aria-label="India, with your trail from Delhi through Agra to Gwalior">
        <g className="wp-zoom-cam" style={{ transformOrigin: '107.7px 122.8px' }}>
          <path d={INDIA_OUTLINE} className="wp-zoom-land" vectorEffect="non-scaling-stroke" />
          <path d={trail} className="wp-zoom-trail" pathLength={1} vectorEffect="non-scaling-stroke" />
          <circle cx="98.6" cy="98.9" r="2.4" className="wp-zoom-dot" />
          <circle cx="106.1" cy="113.2" r="2.4" className="wp-zoom-dot" />
          <circle cx="107.7" cy="122.8" r="3.4" className="wp-zoom-here" />
        </g>
      </svg>
      <p className="wp-big center">
        <span className="wp-count">{km}</span>
        <small>km from Delhi, every one of them your own steps</small>
      </p>
    </div>
  );
}

function Speeds() {
  const rows: [string, string, number][] = [
    ['You, on foot', '36 days', 1],
    ['A Mughal army on the march', '[from the record]', 0.62],
    ['A bar-headed goose, flying', '[an afternoon]', 0.22],
    ['The Gatimaan Express', 'about 3 hours', 0.12],
  ];
  return (
    <div className="wp-col">
      <h1 className="wp-title big rise">Delhi to Gwalior, 350 km</h1>
      <ul className="wp-speeds">
        {rows.map(([who, t, f], i) => (
          <li key={who} style={{ animationDelay: `${200 + i * 160}ms` }}>
            <span className="who">{who}</span>
            <b>{t}</b>
            <i className="bar" style={{ ['--f' as string]: f, animationDelay: `${300 + i * 160}ms` }} />
          </li>
        ))}
      </ul>
      <p className="wp-quiet late3">Bracketed lines are placeholders: each comparison gets a checked source.</p>
    </div>
  );
}
