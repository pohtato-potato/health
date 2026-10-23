import { useState, type ReactNode } from 'react';
import { go, useRoute } from '../../router';
import { Icon } from '../../ui/Icon';
import topScene from './walk-art/top-ravines.svg?raw';
import fortScene from './walk-art/gwalior-fort.svg?raw';
import stripArt from './walk-art/strip-stretch.svg?raw';
import mapArt from './walk-art/map-stretch.svg?raw';
import stampAgra from './walk-art/stamp-agra.svg?raw';
import stampGwalior from './walk-art/stamp-gwalior.svg?raw';
import visaDandi from './walk-art/visa-dandi.svg?raw';
import { CHAMBAL_FACTS, DANDI, EXPEDITIONS, EXPEDITION_KM, KIND_NAMES, KM_A_DAY, RECORD_NAMES, SHELF, WALKING, XUANZANG, type RouteKind, type ShelfRoute } from './walkSample';

/**
 * Design prototype (sample numbers and draft text; nothing is read or saved): the redesigned Walk tab,
 * challenges and expeditions, the passport, a small stop, the map and a city arrival, on the aurora.
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

export function WalkProto() {
  const { params } = useRoute();
  const screen = (params.get('screen') as Screen | null) ?? 'walk';
  const state = params.get('state') ?? '';
  const show = (s: Screen, st?: string) => go('/proto/walk', { screen: s, state: st }, { replace: true });

  const states: Partial<Record<Screen, [string, string][]>> = {
    walk: [['', 'A walking day'], ['banner', 'Expedition news'], ['rest', 'Resting']],
    harold: [['', 'Story paused'], ['story', 'With the story']],
    arrival: [['', 'Beat 1'], ['2', 'Beat 2'], ['3', 'Beat 3']],
  };

  return (
    <div className={`wp ${screen === 'expedition' ? 'tint-silk' : ''}`}>
      <Field />
      <div className="wp-dev" aria-label="Prototype controls">
        <div className="wp-dev-row">
          {SCREENS.map(([s, label]) => (
            <button key={s} type="button" className={s === screen ? 'on' : ''} onClick={() => show(s)}>
              {label}
            </button>
          ))}
        </div>
        {states[screen] && (
          <div className="wp-dev-row">
            {states[screen]!.map(([st, label]) => (
              <button key={st} type="button" className={st === state ? 'on' : ''} onClick={() => show(screen, st || undefined)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {screen === 'walk' && <WalkPage state={state} show={show} />}
      {screen === 'shelf' && <Shelf show={show} />}
      {screen === 'dandi' && <DandiPage show={show} />}
      {screen === 'harold' && <HaroldPage paused={state !== 'story'} show={show} />}
      {screen === 'join' && <JoinMoment show={show} />}
      {screen === 'expedition' && <ExpeditionPage show={show} />}
      {screen === 'passport' && <Passport show={show} />}
      {screen === 'stop' && <StopSheet show={show} />}
      {screen === 'map' && <MapPage show={show} />}
      {screen === 'arrival' && <Arrival beat={Number(state || 1)} show={show} />}
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
          <div className="wp-banner" role="status">
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
        <div>
          <h1 className="wp-title">Bandit Country</h1>
          <p className="wp-sub">Agra to Gwalior · day 3 of about 12</p>
        </div>
        <button type="button" className="wp-strip" onClick={() => show('map')} aria-label="The stretch, on the map">
          <Art svg={stripArt} />
        </button>
        <ul className="wp-lines">
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
        {WALKING.map((w) => (
          <ChallengeCard key={w.id} w={w} onOpen={() => show(w.id === 'dandi' ? 'dandi' : 'harold')} />
        ))}

        <h2 className="wp-h2">Expeditions</h2>
        {EXPEDITIONS.map((e) => (
          <button key={e.id} type="button" className="wp-exp" onClick={() => show('expedition')}>
            <span className="wp-exp-name">{byId(e.id).name}</span>
            <span className="wp-exp-meta">
              {fmt(e.km)} of about {fmt(byId(e.id).km)} km · in {e.place}
            </span>
            <MiniRoute frac={e.km / byId(e.id).km} />
          </button>
        ))}
        <button type="button" className="wp-exp empty" onClick={() => show('shelf')}>
          <span className="wp-exp-name">A second expedition</span>
          <span className="wp-exp-meta">Choose one, or let the app choose</span>
        </button>

        <nav className="wp-doors" aria-label="More of the walk">
          {(
            [
              ['Map', 'map'],
              ['Passport', 'passport'],
              ['Departures', 'walk'],
              ['Wrapped so far', 'walk'],
            ] as [string, Screen][]
          ).map(([label, to]) => (
            <button key={label} type="button" onClick={() => show(to)}>
              {label}
              <Icon name="right" size={16} stroke={1.8} />
            </button>
          ))}
        </nav>
        <button type="button" className="wp-shelf-btn" onClick={() => show('shelf')}>
          Choose a walk
        </button>
      </div>
    </main>
  );
}

function MiniRoute({ frac }: { frac: number }) {
  const x = 6 + Math.min(1, frac) * 288;
  return (
    <svg className="wp-mini" viewBox="0 0 300 16" aria-hidden="true">
      <line x1="6" y1="8" x2="294" y2="8" stroke="currentColor" strokeOpacity=".25" strokeWidth="4" strokeLinecap="round" />
      <line x1="6" y1="8" x2={x} y2="8" stroke="#8fc9b0" strokeWidth="4" strokeLinecap="round" />
      <circle cx={x} cy="8" r="6" fill="#8fc9b0" stroke="#0c0e1d" strokeWidth="2.5" />
    </svg>
  );
}

function ChallengeCard({ w, onOpen }: { w: (typeof WALKING)[number]; onOpen: () => void }) {
  const r = byId(w.id);
  return (
    <button type="button" className="wp-card" onClick={onOpen}>
      <span className="wp-card-top">
        <span className="wp-card-name">{r.name}</span>
        {r.book && <span className="wp-tag">Book</span>}
      </span>
      <MiniRoute frac={w.km / r.km} />
      <span className="wp-card-meta">
        {fmt(w.km)} of {fmt(r.km)} km · {w.stretch}
        {w.target ? ` · ${w.target}` : ''}
      </span>
      <span className="wp-card-line">{w.line}</span>
    </button>
  );
}

/* ---------- choosing a walk ---------- */

function Shelf({ show }: { show: Show }) {
  const [kind, setKind] = useState<RouteKind | 'all'>('all');
  const kinds = Object.keys(KIND_NAMES) as RouteKind[];
  return (
    <main className="wp-page wp-col">
      <Back to="walk" label="Walk" show={show} />
      <div>
        <h1 className="wp-title">Choose a walk</h1>
        <p className="wp-sub">Challenges 2 of 2 walking · Expeditions 1 of 2</p>
      </div>
      <div className="wp-chips" role="group" aria-label="Kind of walk">
        <button type="button" className={kind === 'all' ? 'on' : ''} onClick={() => setKind('all')}>
          All
        </button>
        {kinds.map((k) => (
          <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
            {KIND_NAMES[k]}
          </button>
        ))}
      </div>
      {kinds
        .filter((k) => kind === 'all' || kind === k)
        .map((k) => (
          <section key={k} className="wp-group">
            <h2 className="wp-h2">{KIND_NAMES[k]}</h2>
            {SHELF.filter((r) => r.kind === k).map((r) => (
              <ShelfRow key={r.id} r={r} onOpen={() => (r.id === 'dandi' || r.id === 'harold' ? show(r.id) : r.id === 'xuanzang' ? show('expedition') : show('join'))} />
            ))}
          </section>
        ))}
    </main>
  );
}

function ShelfRow({ r, onOpen }: { r: ShelfRoute; onOpen: () => void }) {
  const long = r.km > EXPEDITION_KM;
  return (
    <div className="wp-row">
      <button type="button" className="wp-row-main" onClick={onOpen}>
        <span className="wp-row-top">
          <span className="wp-row-name">{r.name}</span>
          {long && <span className="wp-tag">Expedition</span>}
        </span>
        <span className="wp-row-meta">
          {fmt(r.km)} km · {timeAtPace(r.km)} · {r.era}
        </span>
        <span className="wp-row-hook">{r.hook}</span>
      </button>
      {r.book && (
        <details className="wp-about">
          <summary>About the {r.book.by.includes('Sircar') ? 'film' : 'book'} · {r.book.by}</summary>
          <p>{r.book.synopsis}</p>
          <p className="wp-quiet">Spoiler-free.</p>
        </details>
      )}
    </div>
  );
}

/* ---------- a history challenge ---------- */

function DandiPage({ show }: { show: Show }) {
  const w = WALKING[0];
  const r = byId('dandi');
  const [open, setOpen] = useState(false);
  const [deeper, setDeeper] = useState(false);
  return (
    <main className="wp-page wp-col">
      <Back to="walk" label="Walk" show={show} />
      <div>
        <h1 className="wp-title">{r.name}</h1>
        <p className="wp-sub">Sabarmati to Dandi · 1930 · {RECORD_NAMES[r.record]}</p>
      </div>
      <DandiRoute />
      <p className="wp-big">
        {fmt(w.km)} <small>of {fmt(r.km)} km · your day {w.day}</small>
      </p>

      <section className="wp-card static">
        <span className="wp-label">Today on the road · {w.stretch}</span>
        <p className="wp-voice">The marchers cross the Mahi and stop at Kareli.</p>
        {open && DANDI.page.map((p) => <p key={p} className="wp-para">{p}</p>)}
        <div className="wp-actions">
          <button type="button" className="wp-ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Less' : 'Read the day'}
          </button>
          <button type="button" className="wp-ghost" onClick={() => setDeeper(true)}>
            Go deeper
          </button>
        </div>
      </section>

      <section className="wp-card static">
        <span className="wp-label">Then and you</span>
        <div className="wp-then">
          <span>You</span>
          <b>Day 12 · Kareli</b>
        </div>
        <div className="wp-then">
          <span>The marchers, 1930</span>
          <b>Day 8 · Kareli</b>
        </div>
        <p className="wp-quiet">From the march's daily record.</p>
      </section>

      <section className="wp-group">
        <h2 className="wp-h2">The halts</h2>
        <ol className="wp-halts">
          {DANDI.halts.map((h) => (
            <li key={h.n} className={h.done ? 'done' : h.here ? 'here' : ''}>
              <span className="n">{h.n}</span>
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

      {deeper && (
        <div className="wp-sheet" role="dialog" aria-label="Go deeper">
          <div className="wp-sheet-in">
            <span className="wp-label">Go deeper · why salt</span>
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

function DandiRoute() {
  // A schematic of the march down the Gujarat coast: Sabarmati at the top, Dandi at the bottom.
  const pts = [
    [60, 18], [74, 40], [92, 62], [104, 88], [118, 110], [130, 134], [150, 156], [170, 176], [196, 196], [230, 212], [262, 236], [286, 262],
  ];
  const d = 'M' + pts.map((p) => p.join(' ')).join(' L');
  const here = 7;
  return (
    <svg className="wp-route" viewBox="0 0 320 280" role="img" aria-label="The route from Sabarmati to Dandi; you are at the eighth halt, Kareli">
      <path d="M300 120 C270 170 300 220 320 280" fill="none" stroke="#7f9ce0" strokeOpacity=".5" strokeWidth="2" />
      <text x="296" y="150" textAnchor="end" fontSize="14" fill="#9fb4e6" fontStyle="italic" fontFamily="var(--serif)">Gulf of Khambhat</text>
      <path d={d} fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="2.4" strokeDasharray="4 6" />
      <path d={'M' + pts.slice(0, here + 1).map((p) => p.join(' ')).join(' L')} fill="none" stroke="#8fc9b0" strokeWidth="4" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === here ? 7 : 4.5} fill={i < here ? '#8fc9b0' : i === here ? '#8fc9b0' : '#0c0e1d'} stroke={i <= here ? '#0c0e1d' : 'currentColor'} strokeWidth="2" />
      ))}
      <text x="72" y="22" fontSize="15" fill="currentColor" fontFamily="var(--serif)">Sabarmati</text>
      <text x="270" y="276" textAnchor="end" fontSize="15" fill="currentColor" fontFamily="var(--serif)">Dandi</text>
      <text x="184" y="174" fontSize="14" fill="#8fc9b0" fontWeight="700">You · Kareli</text>
    </svg>
  );
}

/* ---------- a book route ---------- */

function HaroldPage({ paused, show }: { paused: boolean; show: Show }) {
  const w = WALKING[1];
  const r = byId('harold');
  return (
    <main className="wp-page wp-col">
      <Back to="walk" label="Walk" show={show} />
      <div>
        <h1 className="wp-title">{r.name}</h1>
        <p className="wp-sub">The Unlikely Pilgrimage of Harold Fry · {r.book!.by} · 2012</p>
      </div>
      <MiniRoute frac={w.km / r.km} />
      <p className="wp-big">
        {fmt(w.km)} <small>of {fmt(r.km)} km · Kingsbridge to Berwick-upon-Tweed</small>
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
        <section className="wp-card static">
          <span className="wp-label">Story paused on your day 18</span>
          <p className="wp-para">From here the walk shows places only. Read on in the book whenever you like; the story waits at day 18.</p>
          <div className="wp-actions">
            <button type="button" className="wp-ghost" onClick={() => show('harold', 'story')}>
              Resume the story
            </button>
            <button type="button" className="wp-ghost">Catch me up first</button>
          </div>
        </section>
      ) : (
        <section className="wp-card static">
          <span className="wp-label">Today in the story · day 21</span>
          <p className="wp-voice">[The day's story, in our own words, would sit here.]</p>
          <div className="wp-actions">
            <button type="button" className="wp-ghost" onClick={() => show('harold')}>
              Pause the story here
            </button>
          </div>
        </section>
      )}
      <section className="wp-card static">
        <span className="wp-label">Places today · {w.stretch}</span>
        <p className="wp-para">The road leaves Devon behind for the farms and levels of Somerset.</p>
      </section>
      <section className="wp-card static">
        <span className="wp-label">About the book</span>
        <p className="wp-para">{r.book!.synopsis}</p>
        <details className="wp-about">
          <summary>Full synopsis · spoilers</summary>
          <p className="wp-para">Opens behind this warning, and freely once you finish the walk.</p>
        </details>
      </section>
    </main>
  );
}

/* ---------- joining ---------- */

function JoinMoment({ show }: { show: Show }) {
  const r = byId('dandi');
  return (
    <main className="wp-moment">
      <Art svg={visaDandi} className="wp-visa" />
      <h1 className="wp-moment-title">You've joined the Dandi March</h1>
      <p className="wp-para center">
        {fmt(r.km)} km, Sabarmati to Dandi. Your steps count from today: {timeAtPace(r.km)} at your pace, with no deadline.
      </p>
      <div className="wp-moment-btns">
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
    <main className="wp-page wp-col">
      <Back to="walk" label="Walk" show={show} />
      <div>
        <h1 className="wp-title">{r.name}</h1>
        <p className="wp-sub">Chang'an to Nalanda and home · 629–645 · {RECORD_NAMES[r.record]}</p>
      </div>
      <SilkRoute frac={e.km / r.km} />
      <p className="wp-big">
        {fmt(e.km)} <small>of about {fmt(r.km)} km · in {e.place}</small>
      </p>
      <section className="wp-card static">
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
      <section className="wp-card static">
        <span className="wp-label">Story layer</span>
        <p className="wp-para">Journey to the West, the novel that turned this road into legend, can run beside the history. It's off.</p>
        <button type="button" className="wp-ghost">Turn it on</button>
      </section>
      <div className="wp-actions">
        <button type="button" className="wp-ghost">Put it down</button>
      </div>
    </main>
  );
}

function SilkRoute({ frac }: { frac: number }) {
  const d = 'M300 70 C250 60 220 40 180 48 S120 70 90 90 S60 140 74 180 S120 220 150 232';
  return (
    <svg className="wp-route" viewBox="0 0 320 260" role="img" aria-label="Xuanzang's road from Chang'an west across Central Asia and south to India">
      <path d={d} fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="2.4" strokeDasharray="4 6" />
      <path d={d} fill="none" stroke="#8fc9b0" strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray={`${frac} 1`} />
      <circle cx="292" cy="68" r="7" fill="#8fc9b0" stroke="#0c0e1d" strokeWidth="2.5" />
      <text x="300" y="98" textAnchor="end" fontSize="15" fill="currentColor" fontFamily="var(--serif)">Chang'an</text>
      <text x="158" y="244" fontSize="15" fill="currentColor" fontFamily="var(--serif)">Nalanda</text>
      <text x="150" y="40" fontSize="14" fill="currentColor" opacity=".8">Gobi · Turfan</text>
      <text x="40" y="128" fontSize="14" fill="currentColor" opacity=".8">Samarkand</text>
    </svg>
  );
}

/* ---------- passport ---------- */

function Passport({ show }: { show: Show }) {
  const [tab, setTab] = useState<'pages' | 'visas'>('pages');
  return (
    <main className="wp-page wp-col">
      <Back to="walk" label="Walk" show={show} />
      <div>
        <h1 className="wp-title">Passport</h1>
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
        <section className="wp-pp">
          <div className="wp-pp-head">
            <span className="wp-pp-title">Uttar Pradesh</span>
            <span className="wp-quiet">State · entered 12 days ago</span>
          </div>
          <div className="wp-pp-stamps">
            <Art svg={stampAgra} />
          </div>
          <p className="wp-para">Kept: a box of petha from Agra.</p>
          <div className="wp-actions">
            <button type="button" className="wp-ghost">Haryana</button>
            <button type="button" className="wp-ghost">Replay Agra</button>
          </div>
        </section>
      ) : (
        <section className="wp-pp">
          <div className="wp-pp-head">
            <span className="wp-pp-title">Visas</span>
            <span className="wp-quiet">2 challenges · 1 expedition</span>
          </div>
          <div className="wp-pp-stamps">
            <Art svg={visaDandi} />
          </div>
          <p className="wp-para">The Dandi March · joined 12 days ago · stamped "Completed" at Dandi.</p>
        </section>
      )}
      <section className="wp-card static">
        <span className="wp-label">Next page</span>
        <p className="wp-para">Your next state appears here once you cross into it.</p>
        <div className="wp-pp-ghost">
          <Art svg={stampGwalior} />
        </div>
      </section>
    </main>
  );
}

/* ---------- a small stop ---------- */

function StopSheet({ show }: { show: Show }) {
  const [i, setI] = useState(0);
  return (
    <>
      <WalkPage state="" show={show} />
      <div className="wp-sheet" role="dialog" aria-label="Small stop: the Chambal">
        <div className="wp-sheet-in">
          <span className="wp-kind">
            <RiverMark />
            River
          </span>
          <h2 className="wp-title">The Chambal</h2>
          <button type="button" className="wp-fact" onClick={() => setI((i + 1) % CHAMBAL_FACTS.length)}>
            <span className="wp-fact-text">{CHAMBAL_FACTS[i]}</span>
            <span className="wp-quiet">
              {i + 1} of {CHAMBAL_FACTS.length} · tap for the next
            </span>
          </button>
          <button type="button" className="wp-primary" onClick={() => show('walk')}>
            Back to the walk
          </button>
        </div>
      </div>
    </>
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
        <div>
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

/* ---------- a city arrival ---------- */

function Arrival({ beat, show }: { beat: number; show: Show }) {
  const next = () => (beat >= 3 ? show('passport') : show('arrival', String(beat + 1)));
  let body: ReactNode;
  if (beat === 1) {
    body = (
      <>
        <Art svg={fortScene} className="melt2 wp-arrive-art" />
        <div className="wp-col center">
          <h1 className="wp-arrive-name">Gwalior</h1>
          <p className="wp-para center">Day 36 · 350 km from Delhi · [height] m above the sea</p>
        </div>
      </>
    );
  } else if (beat === 2) {
    body = (
      <div className="wp-col">
        <h1 className="wp-title">Delhi to Gwalior, 350 km</h1>
        <ul className="wp-speeds">
          {[
            ['You, on foot', '36 days'],
            ['A Mughal army on the march', '[from the record]'],
            ['The Gatimaan Express, Delhi to Gwalior', 'about 3 hours'],
            ['A bar-headed goose, flying', '[an afternoon]'],
          ].map(([who, t]) => (
            <li key={who}>
              <span>{who}</span>
              <b>{t}</b>
            </li>
          ))}
        </ul>
        <p className="wp-quiet">Bracketed lines are placeholders: each comparison gets a checked source.</p>
      </div>
    );
  } else {
    body = (
      <div className="wp-col center">
        <Art svg={stampGwalior} className="wp-stamp-land" />
        <h1 className="wp-title">Stamped</h1>
        <p className="wp-para center">Gwalior · Madhya Pradesh · stamp 3 of 46</p>
      </div>
    );
  }
  return (
    <main className="wp-moment" onClick={next}>
      {body}
      <p className="wp-quiet center">Tap to go on</p>
    </main>
  );
}
