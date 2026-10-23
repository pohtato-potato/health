import { useEffect, useState, type ReactNode } from 'react';
import fortScene from './walk-art/gwalior-fort.svg?raw';
import stampGwalior from './walk-art/stamp-gwalior.svg?raw';
import { MAIN_CITIES, REGIONS } from './walkRoutes';

/**
 * Design prototype: arriving at a city, in five beats you tap through.
 * 1 the approach: the fort fills the screen, light sweeps across it, the name rises;
 * 2 footprints: the walk drawn as footsteps while the steps count up;
 * 3 the zoom out: from the city to all of India, the trail drawing itself;
 * 4 the race: you, an army, a goose and a train in lanes to the same place;
 * 5 the stamp: Madhya Pradesh's passport page, and the stamp landing in gold.
 */

const STEPS = 473_000;
const KM = 350;

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

export function Arrival({ beat, onNext }: { beat: number; onNext: () => void }) {
  let body: ReactNode;
  if (beat === 1) body = <Approach />;
  else if (beat === 2) body = <Footprints />;
  else if (beat === 3) body = <ZoomOut />;
  else if (beat === 4) body = <Race />;
  else body = <Stamp />;
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

function Approach() {
  const svg = fortScene.replace('<svg ', '<svg preserveAspectRatio="xMaxYMid slice" ');
  return (
    <div className="wp-arr-full">
      <div className="wp-arr-scene" dangerouslySetInnerHTML={{ __html: svg }} />
      <i className="wp-arr-sweep" aria-hidden="true" />
      <div className="wp-arr-head">
        <span className="wp-arr-kick">You've walked to</span>
        <h1 className="wp-arr-name" aria-label="Gwalior">
          {'Gwalior'.split('').map((c, i) => (
            <span key={i} aria-hidden="true" style={{ animationDelay: `${700 + i * 80}ms` }}>
              {c}
            </span>
          ))}
        </h1>
        <i className="wp-arr-rule" aria-hidden="true" />
        <p className="wp-arr-sub">Madhya Pradesh · day 36 · {KM} km from Delhi</p>
      </div>
    </div>
  );
}

function Footprints() {
  const steps = useCount(STEPS, 2600, 300);
  // A winding walk up the screen: pairs of prints, left and right, each fading in after the last.
  const prints = Array.from({ length: 34 }, (_, i) => {
    const t = i / 33;
    const x = 180 + Math.sin(t * Math.PI * 2.2) * 90;
    const y = 520 - t * 470;
    const a = Math.cos(t * Math.PI * 2.2) * 30;
    const side = i % 2 ? 1 : -1;
    return { x: x + side * 9, y, a, side, i };
  });
  return (
    <div className="wp-arr-col">
      <svg className="wp-prints" viewBox="0 0 360 540" aria-hidden="true">
        {prints.map((p) => (
          <g key={p.i} transform={`translate(${p.x} ${p.y}) rotate(${p.a})`} style={{ animationDelay: `${200 + p.i * 70}ms` }}>
            <ellipse cx="0" cy="0" rx="5" ry="8.5" />
            <ellipse cx="0" cy="-12.5" rx="4" ry="3.4" />
          </g>
        ))}
      </svg>
      <div className="wp-arr-over">
        <p className="wp-arr-big">{steps.toLocaleString('en-IN')}</p>
        <p className="wp-arr-sub">steps, from Delhi to Gwalior. Every one of them yours, taken at home, at the office, on the way.</p>
      </div>
    </div>
  );
}

function ZoomOut() {
  const india = REGIONS.india;
  const [gx, gy] = MAIN_CITIES.Gwalior;
  const trail = ['Delhi', 'Agra', 'Gwalior'].map((c) => MAIN_CITIES[c]);
  const ahead = ['Gwalior', 'Bhopal', 'Nagpur', 'Hyderabad', 'Bengaluru', 'Madurai', 'Kanyakumari'].map((c) => MAIN_CITIES[c]);
  const reached = new Set(['Delhi', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh']);
  const km = useCount(KM, 1800, 1500);
  return (
    <div className="wp-arr-col">
      <svg className="wp-zoom" viewBox={india.box.join(' ')} role="img" aria-label="India, with your trail from Delhi through Agra to Gwalior, and the road on to Kanyakumari">
        <g className="wp-zoom-cam" style={{ transformOrigin: `${gx}px ${gy}px` }}>
          <path d={india.outline} className="wp-zoom-land" vectorEffect="non-scaling-stroke" />
          {india.states?.map(([name, d]) => (
            <path key={name} d={d} className={`wp-zoom-state ${reached.has(name) ? 'on' : ''}`} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={'M' + ahead.map((p) => p.join(' ')).join(' L')} className="wp-zoom-ahead" vectorEffect="non-scaling-stroke" />
          <path d={'M' + trail.map((p) => p.join(' ')).join(' L')} className="wp-zoom-trail" pathLength={1} vectorEffect="non-scaling-stroke" />
          {trail.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === 2 ? 3.4 : 2.2} className={i === 2 ? 'wp-zoom-here' : 'wp-zoom-dot'} />
          ))}
        </g>
      </svg>
      <div className="wp-arr-over low">
        <p className="wp-arr-big">{km} km</p>
        <p className="wp-arr-sub">from Delhi. Kanyakumari is {(2870 - KM).toLocaleString('en-IN')} km on.</p>
      </div>
    </div>
  );
}

function Race() {
  // Each lane's length is its time, on a log scale so the slowest still fits: you are last, and that is the point.
  const lanes: [string, string, number][] = [
    ['The Gatimaan Express', 'about 3 hours', 3],
    ['A bar-headed goose', '[a day, from the record]', 24],
    ['A Mughal army', '[weeks, from the record]', 24 * 20],
    ['You, on foot', '36 days', 24 * 36],
  ];
  const max = Math.log10(24 * 36);
  return (
    <div className="wp-arr-col pad">
      <h1 className="wp-arr-title">The same 350 km, at other speeds</h1>
      <ul className="wp-race">
        {lanes.map(([who, t, hours], i) => (
          <li key={who} className={i === lanes.length - 1 ? 'you' : ''}>
            <span className="who">{who}</span>
            <span className="lane" aria-hidden="true" style={{ ['--f' as string]: Math.max(0.06, Math.log10(hours) / max), ['--d' as string]: `${0.5 + (Math.log10(hours) / max) * 2.4}s` }}>
              <i className="fill" />
              <i className="runner" />
            </span>
            <b>{t}</b>
          </li>
        ))}
      </ul>
      <p className="wp-arr-sub">Bracketed times are placeholders: each gets a checked source.</p>
    </div>
  );
}

function Stamp() {
  const india = REGIONS.india;
  const mp = india.states?.find(([n]) => n === 'Madhya Pradesh')?.[1] ?? '';
  return (
    <div className="wp-arr-col pad">
      <div className="wp-arr-page">
        <span className="wp-arr-page-head">
          <b>Madhya Pradesh</b>
          <small>State · page 5</small>
        </span>
        <svg className="wp-arr-state" viewBox="68 100 92 70" aria-hidden="true">
          <path d={mp} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="wp-arr-stamp" dangerouslySetInnerHTML={{ __html: stampGwalior }} />
        <span className="wp-arr-ring" aria-hidden="true" />
      </div>
      <h1 className="wp-arr-title center">Stamped · 3 of 46</h1>
      <p className="wp-arr-sub center">Gwalior joins Agra and Delhi. Replay any arrival from its stamp.</p>
    </div>
  );
}
