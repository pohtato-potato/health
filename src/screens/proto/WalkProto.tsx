import { useState } from 'react';
import { go, useRoute } from '../../router';
import { Icon } from '../../ui/Icon';
import topScene from './walk-art/top-ravines.svg?raw';
import stripArt from './walk-art/strip-stretch.svg?raw';
import mapArt from './walk-art/map-stretch.svg?raw';
import visaDandi from './walk-art/visa-dandi.svg?raw';
import { CHAMBAL_FACTS, DANDI, EXPEDITIONS, EXPEDITION_KM, KIND_NAMES, KM_A_DAY, RECORD_NAMES, SHELF, WALKING, type RouteKind, type ShelfRoute } from './walkSample';
import { RouteArt, byId, fmt, inkOf } from './walkArt';
import { CardLook, HeroLook, LOOKS, ShelfLook, type Look } from './walkLooks';
import { ExpeditionPage } from './walkExpedition';
import { Arrival } from './walkArrival';
import { PassportBook } from './walkPassport';
import { IndiaMap } from './walkIndiaMap';

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
  const [take, setTake] = useState(0);
  const look = (params.get('look') as Look | null) ?? 'poster';
  const show = (s: Screen, st?: string, lk: Look = look) => {
    go('/proto/walk', { screen: s, state: st, look: lk }, { replace: true });
    setTake((t) => t + 1);
  };

  const states: Partial<Record<Screen, [string, string][]>> = {
    walk: [['', 'A walking day'], ['banner', 'Expedition news'], ['rest', 'Resting']],
    harold: [['', 'Story paused'], ['story', 'With the story']],
    map: [['', 'This stretch'], ['india', 'All of India']],
    arrival: [['', '1 · Approach'], ['2', '2 · Footprints'], ['3', '3 · Zoom out'], ['4', '4 · Race'], ['5', '5 · Stamp']],
  };
  const tint = screen === 'expedition' ? 'tint-silk' : screen === 'harold' ? 'tint-green' : screen === 'dandi' || screen === 'join' ? 'tint-sea' : screen === 'arrival' && state === '5' ? 'tint-gold' : '';

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
        <div className="wp-dev-row" aria-label="Look">
          {LOOKS.map(([lk, label]) => (
            <button key={lk} type="button" className={lk === look ? 'on' : ''} onClick={() => show(screen, state || undefined, lk)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div key={`${screen}-${state}-${take}`} className="wp-screen">
        {screen === 'walk' && <WalkPage state={state} show={show} />}
        {screen === 'shelf' && <Shelf show={show} />}
        {screen === 'dandi' && <DandiPage show={show} />}
        {screen === 'harold' && <HaroldPage paused={state !== 'story'} show={show} />}
        {screen === 'join' && <JoinMoment show={show} />}
        {screen === 'expedition' && <ExpeditionPage look={look} onBack={() => show('walk')} />}
        {screen === 'passport' && <PassportBook onBack={() => show('walk')} onReplay={() => show('arrival')} />}
        {screen === 'stop' && <StopMoment show={show} />}
        {screen === 'map' && <MapPage india={state === 'india'} show={show} />}
        {screen === 'arrival' && <Arrival beat={Number(state || 1)} onNext={() => (Number(state || 1) >= 5 ? show('passport') : show('arrival', String(Number(state || 1) + 1)))} />}
      </div>
    </div>
  );
}

type Show = (s: Screen, st?: string) => void;

/** The look being compared, from the address, so it survives moving between screens. */
function useLook(): Look {
  return (useRoute().params.get('look') as Look | null) ?? 'poster';
}

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
  const look = useLook();
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
            <CardLook key={w.id} look={look} c={w} delay={120 + i * 90} onOpen={() => show(w.id === 'dandi' ? 'dandi' : 'harold')} />
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

/* ---------- choosing a walk ---------- */

function Shelf({ show }: { show: Show }) {
  const look = useLook();
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
              <ShelfLook key={r.id} look={look} id={r.id} time={timeAtPace(r.km)} delay={ki * 80 + i * 60} onOpen={() => setOpen(r)} />
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
      <HeroLook look={useLook()} c={w} title={r.name} sub={`Sabarmati to Dandi · 1930 · ${RECORD_NAMES[r.record]}`} />
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
      <HeroLook look={useLook()} c={w} title={r.name} sub={`The Unlikely Pilgrimage of Harold Fry · ${r.book!.by} · 2012`} />
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

function MapPage({ india, show }: { india: boolean; show: Show }) {
  return (
    <main className="wp-page">
      <div className="wp-col">
        <Back to="walk" label="Walk" show={show} />
        <div className="rise">
          <h1 className="wp-title">{india ? 'India' : 'Bandit Country'}</h1>
          <p className="wp-sub">{india ? 'Chapter 1 · 241 of 2,870 km · 3 of 36 states and territories' : 'Agra to Gwalior · 8 of 120 km'}</p>
        </div>
      </div>
      {india ? <IndiaMap /> : <Art svg={mapArt} className="wp-map" />}
      <div className="wp-col">
        <div className="wp-chips" role="group" aria-label="How far out">
          <button type="button" className={!india ? 'on' : ''} onClick={() => show('map')}>
            This stretch
          </button>
          <button type="button" className={india ? 'on' : ''} onClick={() => show('map', 'india')}>
            All of India
          </button>
        </div>
        <button type="button" className="wp-ghost wp-fly">
          <Icon name="play" size={18} stroke={1.8} />
          Fly the trail
        </button>
      </div>
    </main>
  );
}
