import { useEffect, useState, type ReactNode } from 'react';
import { Scene } from '../../walk/art/scene';
import { CITY_COUNT, type ArrivalInfo } from '../../walk/arrivals';
import { CITY_FACTS } from '../../walk/content/cities';
import { REGIONS } from '../../walk/geo';

/**
 * Arriving at any city on the walk, in five beats you tap through, with Skip always there. Everything comes from
 * the route's data, so every one of the 46 cities works without its own screen:
 * 1 the approach: the city's landmark scene, a sweep of light, the name rising;
 * 2 footprints: the walk drawn as footsteps while your steps count up;
 * 3 the zoom out: from the city to all of India, the states you've walked into filling in;
 * 4 the race: the same distance at other speeds, each lane's length its time;
 * 5 the stamp on its state's passport page.
 */

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

function useCount(to: number, ms = 1600, delay = 0) {
  const [n, setN] = useState(to);
  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    const tick = (t: number) => {
      if (!t0) t0 = t + delay;
      const p = Math.max(0, Math.min(1, (t - t0) / ms));
      setN(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, delay]);
  return n;
}

export function ArrivalView({ a, beat, onNext, onSkip }: { a: ArrivalInfo; beat: number; onNext: () => void; onSkip: () => void }) {
  let body: ReactNode;
  if (beat === 1) body = <Approach a={a} />;
  else if (beat === 2) body = <Footprints a={a} />;
  else if (beat === 3) body = <ZoomOut a={a} />;
  else if (beat === 4) body = <Race a={a} />;
  else body = <StampBeat a={a} />;
  return (
    <main className={`walk-arr b${beat}`} onClick={onNext}>
      {body}
      <button
        type="button"
        className="walk-arr-skip"
        onClick={(e) => {
          e.stopPropagation();
          onSkip();
        }}
      >
        Skip
      </button>
      <p className="walk-arr-tap">
        <button
          type="button"
          className="walk-arr-next"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          {beat >= 5 ? 'Back to the walk' : 'Next'}
        </button>
        <span className="walk-arr-dots" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <i key={i} className={i === beat ? 'on' : i < beat ? 'done' : ''} />
          ))}
        </span>
        <span>
          {beat} of 5 · tap to go on
        </span>
      </p>
    </main>
  );
}

function Approach({ a }: { a: ArrivalInfo }) {
  return (
    <div className="walk-arr-full">
      <div className="walk-arr-scene">
        <Scene city={a.name} part="dusk" people />
      </div>
      <i className="walk-arr-sweep" aria-hidden="true" />
      <div className="walk-arr-head">
        <span className="walk-arr-kick">You've walked to</span>
        <h1 className="walk-arr-name" aria-label={a.name} style={{ fontSize: Math.min(72, Math.floor(330 / (a.name.length * 0.56))) }}>
          {a.name.split('').map((c, i) => (
            <span key={i} aria-hidden="true" style={{ animationDelay: `${700 + i * 70}ms` }}>
              {c === ' ' ? ' ' : c}
            </span>
          ))}
        </h1>
        <i className="walk-arr-rule" aria-hidden="true" />
        <p className="walk-arr-sub">
          {a.state} · day {fmt(a.dayN)} · {fmt(a.km)} km from Delhi
        </p>
        <p className="walk-arr-board">{fmt(a.heightM)} m above sea level</p>
      </div>
    </div>
  );
}

function Footprints({ a }: { a: ArrivalInfo }) {
  const steps = useCount(a.steps, 2600, 300);
  const prints = Array.from({ length: 34 }, (_, i) => {
    const t = i / 33;
    const x = 180 + Math.sin(t * Math.PI * 2.2) * 90;
    return { x: x + (i % 2 ? 9 : -9), y: 520 - t * 470, ang: Math.cos(t * Math.PI * 2.2) * 30, i };
  });
  return (
    <div className="walk-arr-col">
      <svg className="walk-prints" viewBox="0 0 360 540" aria-hidden="true">
        {prints.map((p) => (
          <g key={p.i} transform={`translate(${p.x} ${p.y}) rotate(${p.ang})`} style={{ animationDelay: `${200 + p.i * 70}ms` }}>
            <ellipse cx="0" cy="0" rx="5" ry="8.5" />
            <ellipse cx="0" cy="-12.5" rx="4" ry="3.4" />
          </g>
        ))}
      </svg>
      <div className="walk-arr-over">
        <p className="walk-arr-big">{fmt(steps)}</p>
        <p className="walk-arr-sub">steps, from Delhi{a.chapter > 1 ? ', and round again,' : ''} to {a.name}. Every one of them yours, taken at home, at the office, on the way.</p>
      </div>
    </div>
  );
}

function ZoomOut({ a }: { a: ArrivalInfo }) {
  const india = REGIONS.india;
  const [gx, gy] = a.at;
  const km = useCount(a.km, 1800, 1500);
  return (
    <div className="walk-arr-col">
      <svg className="walk-zoom" viewBox={india.box.join(' ')} role="img" aria-label={`India, with your trail from Delhi to ${a.name}`}>
        <g className="walk-zoom-cam" style={{ transformOrigin: `${gx}px ${gy}px` }}>
          <path d={india.outline} className="walk-zoom-land" vectorEffect="non-scaling-stroke" />
          {india.states?.map((s) => <path key={s.name} d={s.path} className={`walk-zoom-state ${a.reached.includes(s.name) ? 'on' : ''}`} vectorEffect="non-scaling-stroke" />)}
          {a.trail.length > 1 && <path d={'M' + a.trail.map((p) => p.join(' ')).join(' L')} className="walk-zoom-trail" pathLength={1} vectorEffect="non-scaling-stroke" />}
          <circle cx={gx} cy={gy} r={3.4} className="walk-zoom-here" />
        </g>
      </svg>
      <div className="walk-arr-over">
        <p className="walk-arr-big">{fmt(km)} km</p>
        <p className="walk-arr-sub">
          from Delhi · {a.reached.length} states and territories walked into
          {a.next ? ` · ${a.next.name} is ${fmt(a.next.km)} km on` : ''}.
        </p>
      </div>
    </div>
  );
}

function Race({ a }: { a: ArrivalInfo }) {
  // Typical speeds, so every city works without its own research; each lane's length is its time on a log scale.
  const lanes: [string, number, string][] = [
    ['A train, at about 80 km an hour', a.km / 80, `about ${Math.max(1, Math.round(a.km / 80))} hours`],
    ['A car, at about 60 km an hour', a.km / 60, `about ${Math.max(1, Math.round(a.km / 60))} hours`],
    ['A horse rider, about 50 km a day', (a.km / 50) * 24, `about ${Math.max(1, Math.round(a.km / 50))} days`],
    ['You, on foot', a.dayN * 24, `${fmt(a.dayN)} days`],
  ];
  const max = Math.log10(Math.max(...lanes.map((l) => l[1])) + 1);
  return (
    <div className="walk-arr-col pad">
      <h1 className="walk-arr-title">The same {fmt(a.km)} km, at other speeds</h1>
      <ul className="walk-race">
        {lanes.map(([who, hours, t], i) => {
          const f = Math.max(0.06, Math.log10(hours + 1) / max);
          return (
            <li key={who} className={i === lanes.length - 1 ? 'you' : ''}>
              <span className="who">{who}</span>
              <span className="lane" aria-hidden="true" style={{ ['--f' as string]: f, ['--d' as string]: `${0.5 + f * 2.4}s` }}>
                <i className="fill" />
                <i className="runner" />
              </span>
              <b>{t}</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * A passport stamp from the template, for any city: the same paper and lettering, a round seal for a state and a
 * double-ruled square for a union territory, with the name fitted, never cut off.
 */
export function StampTemplate({ name, state, n, ut, date }: { name: string; state: string; n: number; ut: boolean; date?: string }) {
  const upper = name.toUpperCase();
  const fit = upper.length > 12 ? { textLength: 136, lengthAdjust: 'spacingAndGlyphs' as const } : {};
  const kind = state.toUpperCase();
  return (
    <svg className={`walk-stamp ${ut ? 'ut' : 'state'}`} viewBox="0 0 170 190" width="170" height="190" role="img" aria-label={`Passport stamp: arrived, ${name}, ${state}${date ? `, ${date}` : ''}`}>
      <rect x="3" y="3" width="164" height="184" rx={ut ? 2 : 6} fill="#eee8dc" />
      {ut ? (
        <>
          <rect x="10" y="10" width="150" height="170" rx="1" fill="none" stroke="#2a2620" strokeWidth="1.3" />
          <rect x="15" y="15" width="140" height="160" rx="1" fill="none" stroke="#2a2620" strokeWidth="0.8" />
        </>
      ) : (
        <rect x="10" y="10" width="150" height="170" rx="4" fill="none" stroke="#2a2620" strokeWidth="1.3" strokeDasharray="1.2 2.6" />
      )}
      <text x="85" y="36" textAnchor="middle" fontFamily="DM Mono" fontSize="13" letterSpacing="2" fill="#2a2620">
        ARRIVED
      </text>
      {ut ? <rect x="58" y="56" width="54" height="54" fill="none" stroke="#2a2620" strokeWidth="1.4" /> : <circle cx="85" cy="83" r="30" fill="none" stroke="#2a2620" strokeWidth="1.4" />}
      <text x="85" y="91" textAnchor="middle" fontFamily="Fraunces Variable, Georgia, serif" fontSize="22" fill="#2a2620">
        {n}
      </text>
      <text x="85" y="140" textAnchor="middle" fontFamily="Fraunces Variable, Georgia, serif" fontSize={upper.length > 9 ? 17 : 22} fill="#2a2620" {...fit}>
        {upper}
      </text>
      <text x="85" y="160" textAnchor="middle" fontFamily="DM Mono" fontSize={kind.length > 20 ? 11 : 13} fill="#2a2620" {...(kind.length > 16 ? { textLength: 136, lengthAdjust: 'spacingAndGlyphs' as const } : {})}>
        {kind}
      </text>
    </svg>
  );
}

/** A state's outline, framed to itself, for its passport page. */
export function StateShape({ state, className }: { state: string; className?: string }) {
  const shape = REGIONS.india.states?.find((s) => s.name === state)?.path ?? '';
  const nums = (shape.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  if (!xs.length) return null;
  const vb = `${Math.min(...xs) - 3} ${Math.min(...ys) - 3} ${Math.max(...xs) - Math.min(...xs) + 6} ${Math.max(...ys) - Math.min(...ys) + 6}`;
  return (
    <svg className={className} viewBox={vb} aria-hidden="true">
      <path d={shape} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StampBeat({ a }: { a: ArrivalInfo }) {
  return (
    <div className="walk-arr-col pad">
      <div className={`walk-arr-page ${a.ut ? 'ut' : ''}${a.state.length > 18 ? ' long' : ''}`}>
        <span className="walk-arr-page-head">
          <b>{a.state}</b>
          <small>{a.ut ? 'Union territory' : 'State'}</small>
        </span>
        <StateShape state={a.state} className="walk-arr-state" />
        <span className="walk-arr-stamp">
          <StampTemplate name={a.name} state={a.state} n={a.n} ut={a.ut} />
        </span>
        <span className="walk-arr-ring" aria-hidden="true" />
      </div>
      <h1 className="walk-arr-title center">
        Stamped · {a.n} of {CITY_COUNT}
      </h1>
      <p className="walk-arr-sub center">{a.name} goes in your passport. Replay any arrival from its stamp.</p>
    </div>
  );
}

/** Crossing into a new state or territory: its name, the count, and how the land has changed since the start. */
export function StateLineView({ state, ut, counts, landFrom, landNow, onNext }: { state: string; ut: boolean; counts: { states: number; uts: number }; landFrom: string; landNow: string; onNext: () => void }) {
  return (
    <main className="walk-arr b5" onClick={onNext}>
      <div className="walk-arr-col pad">
        <span className="walk-kind">{ut ? 'Union territory' : 'State'} line</span>
        <h1 className="walk-arr-title">Into {state}</h1>
        <StateShape state={state} className="walk-line-state" />
        <p className="walk-arr-sub">
          {counts.states} of 28 states · {counts.uts} of 8 union territories
        </p>
        <p className="walk-arr-sub">{landFrom === landNow ? `Still ${landNow}, as when you set off.` : `You set off on ${landFrom}. Now it’s ${landNow}.`}</p>
      </div>
      <p className="walk-arr-tap">
        <button
          type="button"
          className="walk-arr-next"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          Back to the walk
        </button>
      </p>
    </main>
  );
}

export function ArrivalFallback({ city, onBack }: { city?: string; onBack: () => void }) {
  const onWalk = !!city && CITY_FACTS[city] !== undefined;
  return (
    <div className="walk-stop">
      <h1 className="walk-title">{onWalk ? `You haven’t reached ${city} yet.` : 'That arrival isn’t on the walk.'}</h1>
      <button type="button" className="walk-ghost" onClick={onBack}>
        Back to the walk
      </button>
    </div>
  );
}
