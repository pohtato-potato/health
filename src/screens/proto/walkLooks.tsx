import type { CSSProperties, ReactNode } from 'react';
import { RouteArt, byId, fmt, inkOf } from './walkArt';
import { ROUTE_ART } from './walkRoutes';
import { KM_A_DAY } from './walkSample';

/**
 * Design prototype: four looks for challenge cards, shelf cards and route-page headers, to compare and pick one.
 * A ticket (a travel document, Flighty's feature), a painted poster (Firewatch's), data-art (Feltron's), and the
 * map card. Each route keeps its own ink in every look.
 */

export type Look = 'ticket' | 'poster' | 'data' | 'map';
export const LOOKS: [Look, string][] = [
  ['ticket', 'A · Ticket'],
  ['poster', 'B · Poster'],
  ['data', 'C · Data-art'],
  ['map', 'D · Map card'],
];

/** A short code for a place, like an airport's: the first three letters, ignoring "the". */
const code = (name: string) => name.replace(/^the\s+/i, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

function seeded(id: string) {
  let s = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7) || 7;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Sample daily distances for a route, about the sample pace, with runs like real days have. */
export function sampleDays(id: string, n: number): number[] {
  const rnd = seeded(id + 'days');
  let v = KM_A_DAY;
  return Array.from({ length: n }, () => {
    v = Math.max(5, Math.min(15, v + (rnd() - 0.5) * 4));
    return Math.round(v * 10) / 10;
  });
}

export interface CardData {
  id: string;
  km: number;
  day: number;
  stretch: string;
  line: string;
  target?: string;
}

/* ---------- B: the painted poster ---------- */

/** A landmark-free motif for each region's skyline, drawn on the far ridge. */
function Motif({ region, x, y, s }: { region: string; x: number; y: number; s: number }) {
  const g = (children: ReactNode) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="wp-po-motif" style={{ color: 'color-mix(in srgb, var(--ink) 45%, #5a3550)' }}>
      {children}
    </g>
  );
  switch (region) {
    case 'india':
      return g(
        <>
          <path d="M-70 0 C-50 -10 -30 -12 -10 -6 C10 -14 40 -14 70 0 Z" />
          {[-34, -20, 18].map((x, i) => (
            <g key={x} transform={`translate(${x} ${-6 - i * 2})`}>
              <path d={`M0 0 Q${2 + i} -14 ${1 + i} -26`} fill="none" stroke="currentColor" strokeWidth="2" />
              <path d={`M${1 + i} -26 q-10 -2 -16 6 M${1 + i} -26 q10 -2 16 6 M${1 + i} -26 q-6 -8 -14 -8 M${1 + i} -26 q6 -8 14 -8`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          ))}
        </>,
      );
    case 'britain':
      return g(<path d="M-60 0 V-8 H-50 V-11 H-46 V-8 H-24 V-16 H-12 V-8 H20 V-11 H24 V-8 H60 V0 Z" />);
    case 'japan':
      return g(<path d="M-60 0 L-8 -46 Q0 -52 8 -46 L60 0 Z" />);
    case 'med':
      return g(<path d="M-70 0 L-42 -30 L-30 -18 L-6 -52 L14 -26 L28 -38 L62 0 Z" />);
    case 'asia':
      return g(
        <>
          <path d="M-70 0 C-40 -20 -20 -20 0 -8 C20 -22 50 -22 70 0 Z" />
          <path d="M-14 0 V-18 Q0 -28 14 -18 V0 Z" />
        </>,
      );
    default:
      return g(<path d="M-50 0 L-12 -42 L-4 -38 L4 -44 L12 -40 L50 0 Z" />);
  }
}

/** A Firewatch-like poster of the route's land, in its own ink: sky, sun, three ridges, and the road with you on it. */
export function PosterScene({ id, frac, w = 324, h = 170, title }: { id: string; frac: number; w?: number; h?: number; title?: string }) {
  const rnd = seeded(id);
  const region = ROUTE_ART[id].region;
  const ridge = (y: number, amp: number, n: number) => {
    const pts = Array.from({ length: n + 1 }, (_, i) => [(i / n) * w, y - amp * (0.3 + rnd() * 0.7)]);
    let d = `M0 ${h} L0 ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1][0] + pts[i][0]) / 2;
      d += ` C${mx.toFixed(1)} ${pts[i - 1][1].toFixed(1)} ${mx.toFixed(1)} ${pts[i][1].toFixed(1)} ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
    }
    return d + ` L${w} ${h} Z`;
  };
  const sunX = w * (0.2 + rnd() * 0.6);
  const vp = { x: w * (0.4 + rnd() * 0.2), y: h * 0.62 };
  // the walker: nearer the bottom early on, climbing towards the horizon as the walk goes
  // kept in the upper part of the road, clear of any title laid over the bottom of the poster
  const wy = vp.y + (h * 0.7 - vp.y) * (1 - Math.min(0.92, frac));
  const wx = vp.x + (w / 2 - vp.x) * (1 - Math.min(0.92, frac)) * 0.6;
  const uid = `po-${id}-${w}`;
  return (
    <svg className="wp-poster" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={title ?? `${byId(id).name}, as a poster of its land`}>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--ink) 30%, #141a4a)' }} />
          <stop offset="0.62" style={{ stopColor: 'color-mix(in srgb, var(--ink) 55%, #a0506a)' }} />
          <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--ink) 35%, #ffd2a0)' }} />
        </linearGradient>
        <radialGradient id={`${uid}-sun`}>
          <stop offset="0" stopColor="#fff2d8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff2d8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${uid}-sky)`} />
      <circle cx={sunX} cy={h * 0.5} r={h * 0.32} fill={`url(#${uid}-sun)`} opacity="0.6" />
      <circle className="wp-sun" cx={sunX} cy={h * 0.52} r={h * 0.07} fill="#fff2d8" />
      <path d={ridge(h * 0.6, h * 0.14, 6)} style={{ fill: 'color-mix(in srgb, var(--ink) 55%, #8a5a78)' }} opacity="0.95" />
      <Motif region={region} x={w * (0.18 + rnd() * 0.64)} y={h * 0.55} s={h / 170} />
      <path d={ridge(h * 0.72, h * 0.1, 5)} style={{ fill: 'color-mix(in srgb, var(--ink) 40%, #4a2c48)' }} />
      <path d={`M${w / 2 - w * 0.2} ${h} C${w / 2 - 20} ${h * 0.86} ${vp.x - 6} ${vp.y + 20} ${vp.x - 1.5} ${vp.y} L${vp.x + 1.5} ${vp.y} C${vp.x + 6} ${vp.y + 20} ${w / 2 + 20} ${h * 0.86} ${w / 2 + w * 0.2} ${h} Z`} fill="#0c0a14" opacity="0.88" />
      <path d={`M${w / 2} ${h} C${w / 2} ${h * 0.86} ${vp.x} ${vp.y + 20} ${vp.x} ${vp.y}`} fill="none" style={{ stroke: 'var(--ink)' }} strokeWidth="1.6" strokeDasharray="5 6" opacity="0.8" />
      <path d={ridge(h * 0.9, h * 0.06, 4)} style={{ fill: 'color-mix(in srgb, var(--ink) 20%, #1e1226)' }} />
      <circle className="wp-ra-halo" cx={wx} cy={wy} r="9" style={{ fill: 'var(--ink)' }} />
      <circle cx={wx} cy={wy} r="5" style={{ fill: 'var(--ink)' }} stroke="#0c0a14" strokeWidth="2" />
    </svg>
  );
}

/* ---------- A: the ticket ---------- */

function Barcode({ id, day }: { id: string; day: number }) {
  const days = sampleDays(id, Math.max(12, day));
  const max = Math.max(...days);
  return (
    <svg className="wp-tk-bars" viewBox={`0 0 ${days.length * 6} 30`} preserveAspectRatio="none" role="img" aria-label={`Your ${days.length} days on this road, as bars`}>
      {days.map((d, i) => (
        <rect key={i} x={i * 6} y={30 - (d / max) * 30} width="3.6" height={(d / max) * 30} />
      ))}
    </svg>
  );
}

function Ticket({ c, big = false }: { c: CardData; big?: boolean }) {
  const r = byId(c.id);
  const [from, to] = ROUTE_ART[c.id].ends;
  const left = Math.max(0, r.km - c.km);
  return (
    <span className={`wp-tk ${big ? 'big' : ''}`}>
      <span className="wp-tk-top">
        <span className="wp-tk-place">
          <b>{code(from)}</b>
          <small>{from}</small>
        </span>
        <span className="wp-tk-path" aria-hidden="true">
          <i className="done" style={{ width: `${(c.km / r.km) * 100}%` }} />
          <i className="dot" style={{ left: `${(c.km / r.km) * 100}%` }} />
        </span>
        <span className="wp-tk-place end">
          <b>{code(to)}</b>
          <small>{to}</small>
        </span>
      </span>
      <span className="wp-tk-name">{r.name}</span>
      <span className="wp-tk-perf" aria-hidden="true" />
      <span className="wp-tk-grid">
        <span>
          <small>Walked</small>
          <b>{fmt(c.km)} km</b>
        </span>
        <span>
          <small>To go</small>
          <b>{fmt(left)} km</b>
        </span>
        <span>
          <small>Day</small>
          <b>{c.day}</b>
        </span>
        <span>
          <small>Since</small>
          <b>{r.era}</b>
        </span>
      </span>
      <span className="wp-tk-line">{c.line}</span>
      <Barcode id={c.id} day={c.day} />
    </span>
  );
}

/* ---------- C: data-art ---------- */

function Ring({ frac, size, children }: { frac: number; size: number; children: ReactNode }) {
  const r = size / 2 - 8;
  const ticks = 40;
  return (
    <span className="wp-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {Array.from({ length: ticks }, (_, i) => {
          const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
          const on = i / ticks < frac;
          const r1 = r - (on ? 10 : 6);
          return <line key={i} x1={size / 2 + Math.cos(a) * r} y1={size / 2 + Math.sin(a) * r} x2={size / 2 + Math.cos(a) * r1} y2={size / 2 + Math.sin(a) * r1} className={on ? 'on' : ''} style={{ animationDelay: `${i * 18}ms` }} />;
        })}
      </svg>
      <span className="wp-ring-in">{children}</span>
    </span>
  );
}

function DataArt({ c, big = false }: { c: CardData; big?: boolean }) {
  const r = byId(c.id);
  const days = sampleDays(c.id, Math.min(c.day, 14));
  const max = Math.max(...days);
  const avg = days.reduce((a, b) => a + b, 0) / days.length;
  const left = Math.max(0, r.km - c.km);
  return (
    <span className={`wp-da ${big ? 'big' : ''}`}>
      <span className="wp-da-name">{r.name}</span>
      <span className="wp-da-row">
        <Ring frac={c.km / r.km} size={big ? 180 : 120}>
          <b>{Math.round((c.km / r.km) * 100)}%</b>
          <small>walked</small>
        </Ring>
        <span className="wp-da-stats">
          <span>
            <b>{fmt(c.km)}</b>
            <small>of {fmt(r.km)} km</small>
          </span>
          <span>
            <b>{avg.toFixed(1)}</b>
            <small>km a day</small>
          </span>
          <span>
            <b>{Math.ceil(left / avg)}</b>
            <small>days to go</small>
          </span>
        </span>
      </span>
      <span className="wp-da-bars" role="img" aria-label={`Your last ${days.length} days, between ${Math.min(...days)} and ${max} km`}>
        {days.map((d, i) => (
          <i key={i} style={{ height: `${(d / max) * 100}%`, animationDelay: `${200 + i * 40}ms` }} />
        ))}
      </span>
      <span className="wp-da-line">{c.line}</span>
    </span>
  );
}

/* ---------- the card, in each look ---------- */

export function CardLook({ look, c, onOpen, delay = 0 }: { look: Look; c: CardData; onOpen: () => void; delay?: number }) {
  const r = byId(c.id);
  const style = { ...inkOf(c.id), animationDelay: `${delay}ms` } as CSSProperties;
  if (look === 'ticket')
    return (
      <button type="button" className="wp-look ticket rise" style={style} onClick={onOpen}>
        <Ticket c={c} />
      </button>
    );
  if (look === 'data')
    return (
      <button type="button" className="wp-look data rise" style={style} onClick={onOpen}>
        <DataArt c={c} />
      </button>
    );
  if (look === 'poster')
    return (
      <button type="button" className="wp-look poster rise" style={style} onClick={onOpen}>
        <span className="wp-po-frame">
          <PosterScene id={c.id} frac={c.km / r.km} />
          <span className="wp-po-title">
            <b>{r.name}</b>
            <small>
              {fmt(c.km)} of {fmt(r.km)} km · {c.stretch}
            </small>
          </span>
          {r.book && <span className="wp-ribbon" aria-hidden="true" />}
        </span>
        <span className="wp-po-line">{c.line}</span>
      </button>
    );
  return (
    <button type="button" className="wp-rc rise" style={style} onClick={onOpen}>
      <span className="wp-rc-band">
        <RouteArt id={c.id} frac={c.km / r.km} />
        <span className="wp-era-stamp" aria-hidden="true">
          {r.era}
        </span>
        {r.book && <span className="wp-ribbon" aria-hidden="true" />}
      </span>
      <span className="wp-rc-panel">
        <span className="wp-rc-name">{r.name}</span>
        <span className="wp-rc-nums">
          <b>{fmt(c.km)}</b>
          <span>
            of {fmt(r.km)} km · {c.stretch}
          </span>
        </span>
        <span className="wp-rc-line">{c.line}</span>
        {c.target && <span className="wp-rc-target">{c.target}</span>}
      </span>
    </button>
  );
}

/* ---------- the shelf card, in each look ---------- */

export function ShelfLook({ look, id, time, onOpen, delay = 0 }: { look: Look; id: string; time: string; onOpen: () => void; delay?: number }) {
  const r = byId(id);
  const [from, to] = ROUTE_ART[id].ends;
  const style = { ...inkOf(id), animationDelay: `${delay}ms` } as CSSProperties;
  const kind = r.km > 1500 ? 'Expedition' : r.book ? 'Book' : r.era;
  return (
    <button type="button" role="listitem" className={`wp-sc look-${look} rise`} style={style} onClick={onOpen}>
      <span className="wp-sc-art">
        {look === 'poster' ? (
          <PosterScene id={id} frac={0} w={168} h={132} />
        ) : look === 'ticket' ? (
          <span className="wp-sc-tk">
            <b>{code(from)}</b>
            <i aria-hidden="true" />
            <b>{code(to)}</b>
          </span>
        ) : look === 'data' ? (
          <span className="wp-sc-da">
            <b>{fmt(r.km)}</b>
            <small>km</small>
            <i style={{ width: `${Math.min(100, (Math.log10(r.km) / Math.log10(10000)) * 100)}%` }} aria-hidden="true" />
          </span>
        ) : (
          <RouteArt id={id} frac={0} kind="thumb" label={`${r.name} on its map`} />
        )}
      </span>
      <span className="wp-sc-text">
        <span className="wp-sc-name">{r.name}</span>
        <span className="wp-sc-meta">
          {fmt(r.km)} km · {time}
        </span>
        <span className="wp-sc-era">{kind === r.era ? r.era : `${r.era} · ${kind}`}</span>
      </span>
    </button>
  );
}

/* ---------- the route page's header, in each look ---------- */

export function HeroLook({ look, c, title, sub }: { look: Look; c: CardData; title: string; sub: string }) {
  const r = byId(c.id);
  if (look === 'poster')
    return (
      <header className="wp-hero poster" style={inkOf(c.id)}>
        <PosterScene id={c.id} frac={c.km / r.km} w={360} h={300} />
        <div className="wp-hero-over">
          <h1 className="wp-title big">{title}</h1>
          <p className="wp-sub">{sub}</p>
        </div>
      </header>
    );
  if (look === 'ticket')
    return (
      <header className="wp-hero ticket wp-col" style={inkOf(c.id)}>
        <Ticket c={c} big />
        <p className="wp-sub">{sub}</p>
      </header>
    );
  if (look === 'data')
    return (
      <header className="wp-hero data wp-col" style={inkOf(c.id)}>
        <DataArt c={c} big />
        <p className="wp-sub">{sub}</p>
      </header>
    );
  return (
    <header className="wp-hero" style={inkOf(c.id)}>
      <RouteArt id={c.id} frac={c.km / r.km} kind="hero" />
      <div className="wp-hero-text">
        <h1 className="wp-title big">{title}</h1>
        <p className="wp-sub">{sub}</p>
      </div>
    </header>
  );
}

