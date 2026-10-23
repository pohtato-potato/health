import { useEffect, useState, type ReactNode } from 'react';
import { ALL_STATES, ALL_STOPS, strideM } from '../../domain/walk';
import { Scene } from '../../walk/art/scene';
import fortScene from './walk-art/gwalior-fort.svg?raw';
import stampAgra from './walk-art/stamp-agra.svg?raw';
import stampGwalior from './walk-art/stamp-gwalior.svg?raw';
import { MAIN_CITIES, REGIONS } from './walkRoutes';
import { KM_A_DAY } from './walkSample';

/**
 * Design prototype: arriving at any city on the walk, in five beats you tap through. Everything comes from the
 * route's data, so every one of the 46 cities works without its own screen:
 * 1 the approach: the city's scene (hand-drawn art where it exists, otherwise the app's own landmark scene),
 *   a sweep of light, the name rising;
 * 2 footprints: the walk drawn as footsteps while your steps count up;
 * 3 the zoom out: from the city to all of India, the states you've walked into filling in;
 * 4 the race: the same distance at other speeds, each lane's length its time;
 * 5 the stamp on the state's passport page (an engraved stamp where one is drawn, the stamp template otherwise).
 */

/** Hand-drawn art, where it exists. Any other city falls back to the app's scene and the stamp template. */
const ART: Record<string, { scene?: string; stamp?: string }> = {
  Gwalior: { scene: fortScene, stamp: stampGwalior },
  Agra: { stamp: stampAgra },
};


/**
 * The real map's coordinates for any stop: an affine fit from the app's old map board (x, y on every stop) to the
 * projected India map, using the chapter-1 cities whose real places are known.
 */
function fitBoardToMap() {
  const pairs = Object.entries(MAIN_CITIES)
    .map(([name, [mx, my]]) => {
      const s = ALL_STOPS.find((t) => t.name === name);
      return s ? { bx: s.x, by: s.y, mx, my } : null;
    })
    .filter((p): p is { bx: number; by: number; mx: number; my: number } => !!p);
  // Least squares for m = a*bx + b*by + c, solved for x and y separately (3×3 normal equations).
  const solve = (key: 'mx' | 'my') => {
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const v = [0, 0, 0];
    for (const p of pairs) {
      const row = [p.bx, p.by, 1];
      for (let i = 0; i < 3; i++) {
        v[i] += row[i] * p[key];
        for (let j = 0; j < 3; j++) A[i][j] += row[i] * row[j];
      }
    }
    for (let i = 0; i < 3; i++) {
      const piv = A[i][i] || 1e-9;
      for (let j = i + 1; j < 3; j++) {
        const f = A[j][i] / piv;
        for (let k = i; k < 3; k++) A[j][k] -= f * A[i][k];
        v[j] -= f * v[i];
      }
    }
    const out = [0, 0, 0];
    for (let i = 2; i >= 0; i--) out[i] = (v[i] - A[i].slice(i + 1).reduce((s, a, k) => s + a * out[i + 1 + k], 0)) / (A[i][i] || 1e-9);
    return out;
  };
  const [ax, bx, cx] = solve('mx');
  const [ay, by, cy] = solve('my');
  return (x: number, y: number): [number, number] => [ax * x + bx * y + cx, ay * x + by * y + cy];
}
const toMap = fitBoardToMap();

export interface ArrivalCity {
  name: string;
  km: number;
  day: number;
  steps: number;
  state: string;
  ut: boolean;
  /** Stamp number among the walk's cities. */
  n: number;
  at: [number, number];
  trail: [number, number][];
  next?: { name: string; km: number };
  reached: string[];
}

/** Everything an arrival needs, from the route alone. */
export function arrivalFor(name: string): ArrivalCity {
  const stops = ALL_STOPS.filter((s, i, a) => a.findIndex((t) => t.name === s.name) === i);
  const stop = ALL_STOPS.find((s) => s.name === name) ?? ALL_STOPS[0];
  const before = ALL_STOPS.filter((s) => s.km <= stop.km);
  const states = ALL_STATES.filter((s) => s.km <= stop.km);
  const st = states[states.length - 1];
  const next = ALL_STOPS.find((s) => s.km > stop.km);
  return {
    name: stop.name,
    km: stop.km,
    day: Math.max(1, Math.round(stop.km / KM_A_DAY)),
    steps: Math.round((stop.km * 1000) / strideM()),
    state: st?.name ?? 'Delhi',
    ut: !!st?.ut,
    n: stops.findIndex((s) => s.name === stop.name) + 1,
    at: MAIN_CITIES[stop.name] ?? toMap(stop.x, stop.y),
    trail: before.map((s) => MAIN_CITIES[s.name] ?? toMap(s.x, s.y)),
    next: next && { name: next.name, km: next.km - stop.km },
    reached: [...new Set(states.map((s) => s.name))],
  };
}

function useCount(to: number, ms = 1600, delay = 0) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(to);
      return;
    }
    let raf = 0;
    let t0 = 0;
    const tick = (t: number) => {
      if (!t0) t0 = t + delay;
      const p = Math.max(0, Math.min(1, (t - t0) / ms));
      setN(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, delay]);
  return n;
}

const fmt = (n: number) => n.toLocaleString('en-IN');

export function Arrival({ city, beat, onNext }: { city: string; beat: number; onNext: () => void }) {
  const a = arrivalFor(city);
  let body: ReactNode;
  if (beat === 1) body = <Approach a={a} />;
  else if (beat === 2) body = <Footprints a={a} />;
  else if (beat === 3) body = <ZoomOut a={a} />;
  else if (beat === 4) body = <Race a={a} />;
  else body = <StampBeat a={a} />;
  return (
    <main className={`wp-arr b${beat}`} onClick={onNext}>
      {body}
      <p className="wp-arr-tap">
        <span className="wp-arr-dots" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <i key={i} className={i === beat ? 'on' : i < beat ? 'done' : ''} />
          ))}
        </span>
        Tap to go on
      </p>
    </main>
  );
}

function Approach({ a }: { a: ArrivalCity }) {
  const art = ART[a.name]?.scene;
  return (
    <div className="wp-arr-full">
      {art ? (
        <div className="wp-arr-scene" dangerouslySetInnerHTML={{ __html: art.replace('<svg ', '<svg preserveAspectRatio="xMaxYMid slice" ') }} />
      ) : (
        <div className="wp-arr-scene app">
          <Scene city={a.name} part="dusk" people />
        </div>
      )}
      <i className="wp-arr-sweep" aria-hidden="true" />
      <div className="wp-arr-head">
        <span className="wp-arr-kick">You've walked to</span>
        <h1 className="wp-arr-name" aria-label={a.name} style={{ fontSize: Math.min(72, Math.floor(330 / (a.name.length * 0.56))) }}>
          {a.name.split('').map((c, i) => (
            <span key={i} aria-hidden="true" style={{ animationDelay: `${700 + i * 70}ms` }}>
              {c}
            </span>
          ))}
        </h1>
        <i className="wp-arr-rule" aria-hidden="true" />
        <p className="wp-arr-sub">
          {a.state} · day {a.day} · {fmt(a.km)} km from Delhi
        </p>
      </div>
    </div>
  );
}

function Footprints({ a }: { a: ArrivalCity }) {
  const steps = useCount(a.steps, 2600, 300);
  const prints = Array.from({ length: 34 }, (_, i) => {
    const t = i / 33;
    const x = 180 + Math.sin(t * Math.PI * 2.2) * 90;
    const y = 520 - t * 470;
    const ang = Math.cos(t * Math.PI * 2.2) * 30;
    return { x: x + (i % 2 ? 9 : -9), y, ang, i };
  });
  return (
    <div className="wp-arr-col">
      <svg className="wp-prints" viewBox="0 0 360 540" aria-hidden="true">
        {prints.map((p) => (
          <g key={p.i} transform={`translate(${p.x} ${p.y}) rotate(${p.ang})`} style={{ animationDelay: `${200 + p.i * 70}ms` }}>
            <ellipse cx="0" cy="0" rx="5" ry="8.5" />
            <ellipse cx="0" cy="-12.5" rx="4" ry="3.4" />
          </g>
        ))}
      </svg>
      <div className="wp-arr-over">
        <p className="wp-arr-big">{fmt(steps)}</p>
        <p className="wp-arr-sub">steps, from Delhi to {a.name}. Every one of them yours, taken at home, at the office, on the way.</p>
      </div>
    </div>
  );
}

function ZoomOut({ a }: { a: ArrivalCity }) {
  const india = REGIONS.india;
  const [gx, gy] = a.at;
  const km = useCount(a.km, 1800, 1500);
  return (
    <div className="wp-arr-col">
      <svg className="wp-zoom" viewBox={india.box.join(' ')} role="img" aria-label={`India, with your trail from Delhi to ${a.name}`}>
        <g className="wp-zoom-cam" style={{ transformOrigin: `${gx}px ${gy}px` }}>
          <path d={india.outline} className="wp-zoom-land" vectorEffect="non-scaling-stroke" />
          {india.states?.map(([name, d]) => (
            <path key={name} d={d} className={`wp-zoom-state ${a.reached.includes(name) ? 'on' : ''}`} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={'M' + a.trail.map((p) => p.join(' ')).join(' L')} className="wp-zoom-trail" pathLength={1} vectorEffect="non-scaling-stroke" />
          <circle cx={gx} cy={gy} r={3.4} className="wp-zoom-here" />
        </g>
      </svg>
      <div className="wp-arr-over low">
        <p className="wp-arr-big">{fmt(km)} km</p>
        <p className="wp-arr-sub">
          from Delhi · {a.reached.length} states and territories walked into
          {a.next ? ` · ${a.next.name} is ${fmt(a.next.km)} km on` : ''}.
        </p>
      </div>
    </div>
  );
}

function Race({ a }: { a: ArrivalCity }) {
  // Typical speeds, so every city works without its own research; each lane's length is its time on a log scale.
  const lanes: [string, number, string][] = [
    ['A train, at about 80 km an hour', a.km / 80, `about ${Math.max(1, Math.round(a.km / 80))} hours`],
    ['A car, at about 60 km an hour', a.km / 60, `about ${Math.max(1, Math.round(a.km / 60))} hours`],
    ['A horse rider, about 50 km a day', (a.km / 50) * 24, `about ${Math.max(1, Math.round(a.km / 50))} days`],
    ['You, on foot', a.day * 24, `${a.day} days`],
  ];
  const max = Math.log10(Math.max(...lanes.map((l) => l[1])) + 1);
  return (
    <div className="wp-arr-col pad">
      <h1 className="wp-arr-title">The same {fmt(a.km)} km, at other speeds</h1>
      <ul className="wp-race">
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
      <p className="wp-arr-sub">Where a historical traveller is recorded on this road, they join the race.</p>
    </div>
  );
}

/** The stamp template, for any city without an engraved stamp: the same paper, border and lettering. */
function StampTemplate({ a }: { a: ArrivalCity }) {
  return (
    <svg viewBox="0 0 170 190" width="170" height="190" role="img" aria-label={`Passport stamp: arrived, ${a.name}, ${a.state}`}>
      <rect x="3" y="3" width="164" height="184" rx="6" fill="#eee8dc" />
      <rect x="10" y="10" width="150" height="170" rx="4" fill="none" stroke="#2a2620" strokeWidth="1.3" strokeDasharray="1.2 2.6" />
      <text x="85" y="34" textAnchor="middle" fontFamily="DM Mono" fontSize="13" letterSpacing="2" fill="#2a2620">
        ARRIVED
      </text>
      <circle cx="85" cy="82" r="30" fill="none" stroke="#2a2620" strokeWidth="1.4" />
      <text x="85" y="90" textAnchor="middle" fontFamily="Fraunces Variable, Georgia, serif" fontSize="22" fill="#2a2620">
        {a.n}
      </text>
      <text x="85" y="140" textAnchor="middle" fontFamily="Fraunces Variable, Georgia, serif" fontSize={a.name.length > 9 ? 17 : 22} fill="#2a2620" {...(a.name.length > 12 ? { textLength: 136, lengthAdjust: 'spacingAndGlyphs' as const } : {})}>
        {a.name.toUpperCase()}
      </text>
      <text x="85" y="160" textAnchor="middle" fontFamily="DM Mono" fontSize="13" fill="#2a2620">
        {a.state.length > 16 ? a.state.split(' ')[0].toUpperCase() : a.state.toUpperCase()}
      </text>
    </svg>
  );
}

function StampBeat({ a }: { a: ArrivalCity }) {
  const shape = REGIONS.india.states?.find(([n]) => n === a.state)?.[1] ?? '';
  const nums = (shape.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const vb = xs.length ? `${Math.min(...xs) - 3} ${Math.min(...ys) - 3} ${Math.max(...xs) - Math.min(...xs) + 6} ${Math.max(...ys) - Math.min(...ys) + 6}` : '0 0 10 10';
  const stamp = ART[a.name]?.stamp;
  return (
    <div className="wp-arr-col pad">
      <div className={`wp-arr-page ${a.ut ? 'ut' : ''}`}>
        <span className="wp-arr-page-head">
          <b>{a.state}</b>
          <small>{a.ut ? 'Union territory' : 'State'}</small>
        </span>
        {shape && (
          <svg className="wp-arr-state" viewBox={vb} aria-hidden="true">
            <path d={shape} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        <span className="wp-arr-stamp">{stamp ? <span dangerouslySetInnerHTML={{ __html: stamp }} /> : <StampTemplate a={a} />}</span>
        <span className="wp-arr-ring" aria-hidden="true" />
      </div>
      <h1 className="wp-arr-title center">Stamped · {a.n} of 46</h1>
      <p className="wp-arr-sub center">{a.name} goes in your passport. Replay any arrival from its stamp.</p>
    </div>
  );
}
