import type { ReactNode } from 'react';
import { back } from '../../router';
import { Seg } from '../../ui/controls';
import { Icon } from '../../ui/Icon';
import type { PlaceMark } from './data';

/** The colour of each kind of place, the same everywhere a day carries one. */
export const PLACE_INK: Record<PlaceMark, string> = {
  home: 'var(--sage)',
  home2: 'var(--pearl)',
  office: 'var(--apricot)',
  trip: 'var(--blue)',
  friends: 'var(--lavender)',
};

const PLACE_NAME: Record<PlaceMark, string> = { home: 'home', home2: 'second home', office: 'office', trip: 'trip', friends: 'friends' };

/** A small glyph per place kind: a roof for homes, a block for the office, a dot for trips, a diamond for friends. */
function PlaceGlyph({ kind, x, y, s = 5 }: { kind: PlaceMark; x: number; y: number; s?: number }) {
  const fill = PLACE_INK[kind];
  if (kind === 'home' || kind === 'home2') return <path d={`M${x - s} ${y + s * 0.8}L${x} ${y - s * 0.8}L${x + s} ${y + s * 0.8}Z`} fill={fill} />;
  if (kind === 'office') return <rect x={x - s * 0.8} y={y - s * 0.8} width={s * 1.6} height={s * 1.6} rx={1} fill={fill} />;
  if (kind === 'trip') return <circle cx={x} cy={y} r={s * 0.85} fill={fill} />;
  return <path d={`M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z`} fill={fill} />;
}

export interface HeroPoint {
  label: string;
  /** null: not logged, drawn as an empty outline, never a zero. */
  value: number | null;
  trend?: number | null;
  second?: number | null;
  place?: PlaceMark;
  nightOut?: boolean;
  marker?: string;
  /** Drawn hatched: office days on Steps. */
  hatch?: boolean;
  /** Drawn in gold on top: loaded steps. */
  extra?: number;
}

/**
 * The one hero chart every Tracks page shares: daily bars (or dots) with the trend over them,
 * the usual range shaded, markers, and each day's place under its column.
 */
export function HeroChart({
  points,
  color,
  fmt,
  band,
  target,
  mode = 'bars',
  secondColor,
  height = 190,
  label,
}: {
  points: HeroPoint[];
  color: string;
  fmt: (n: number) => string;
  band?: [number, number];
  target?: number;
  mode?: 'bars' | 'dots';
  secondColor?: string;
  height?: number;
  label: string;
}) {
  const W = 340;
  const H = height;
  const top = 14;
  const glyphs = points.length <= 31 && points.some((p) => p.place);
  const bottom = glyphs ? 36 : 22;
  const right = 34;
  const vals = points.flatMap((p) => [p.value, p.trend, p.extra !== undefined && p.value !== null ? p.value : null]).filter((v): v is number => v !== null && v !== undefined);
  if (!vals.length) return <div className="t14 q" style={{ padding: '28px 0' }}>Nothing logged in this range yet.</div>;
  const lo = mode === 'bars' ? 0 : Math.min(...vals, band?.[0] ?? Infinity);
  const hi = Math.max(...vals, target ?? 0, band?.[1] ?? 0);
  const pad = mode === 'bars' ? hi * 0.08 : (hi - lo) * 0.12 || 1;
  const min = mode === 'bars' ? 0 : lo - pad;
  const max = hi + pad;
  const plotW = W - right;
  const bw = plotW / points.length;
  const y = (v: number) => top + (1 - (v - min) / (max - min || 1)) * (H - top - bottom);
  const cx = (i: number) => i * bw + bw / 2;
  const secVals = points.map((p) => p.second).filter((v): v is number => v !== null && v !== undefined);
  // The second series keeps its own scale: from zero beside bars, its own spread beside dots.
  const secHi = secVals.length ? Math.max(...secVals) : 1;
  const secLo = mode === 'dots' && secVals.length ? Math.min(...secVals) : 0;
  const secPad = mode === 'dots' ? (secHi - secLo) * 0.2 || 1 : secHi * 0.1;
  const ys = (v: number) => top + (1 - (v - (secLo - (mode === 'dots' ? secPad : 0))) / (secHi + secPad - (secLo - (mode === 'dots' ? secPad : 0)) || 1)) * (H - top - bottom);
  const trend = points.map((p, i) => ({ i, v: p.trend })).filter((p): p is { i: number; v: number } => p.v !== null && p.v !== undefined);
  const every = Math.ceil(points.length / 7);
  const base = H - bottom;
  const places = [...new Set(points.map((p) => p.place).filter((p): p is PlaceMark => !!p))];

  return (
    <div className="col gap8">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ display: 'block' }}>
        <defs>
          <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill={color} fillOpacity="0.25" />
            <line x1="0" y1="0" x2="0" y2="5" stroke={color} strokeWidth="2" />
          </pattern>
        </defs>
        {band && (
          <>
            <rect x={0} y={y(band[1])} width={plotW} height={Math.max(1, y(band[0]) - y(band[1]))} fill={color} fillOpacity="0.09" />
            <text x={W} y={y(band[1]) + 3.5} textAnchor="end" fill="var(--dim)" fontSize="10" fontFamily="var(--sans)">
              {fmt(band[1])}
            </text>
            <text x={W} y={y(band[0]) + 3.5} textAnchor="end" fill="var(--dim)" fontSize="10" fontFamily="var(--sans)">
              {fmt(band[0])}
            </text>
          </>
        )}
        {target !== undefined && (
          <>
            <line x1="0" x2={plotW} y1={y(target)} y2={y(target)} stroke={color} strokeOpacity="0.55" strokeDasharray="3 4" />
            {!band && (
              <text x={W} y={y(target) + 3.5} textAnchor="end" fill="var(--dim)" fontSize="10" fontFamily="var(--sans)">
                {fmt(target)}
              </text>
            )}
          </>
        )}
        {points.map((p, i) => {
          const x = i * bw + bw * 0.2;
          const w = bw * 0.6;
          if (p.value === null) {
            return mode === 'bars' ? <rect key={i} x={x} y={base - 22} width={w} height={22} rx={Math.min(3, w * 0.3)} fill="none" stroke="var(--btn-border)" strokeDasharray="2 2" /> : null;
          }
          if (mode === 'dots') return <circle key={i} cx={cx(i)} cy={y(p.value)} r="2.8" fill="none" stroke={color} strokeOpacity="0.6" strokeWidth="1.3" />;
          const h = Math.max(base - y(p.value), 2);
          const eh = p.extra ? Math.min(h, base - y(p.extra)) : 0;
          return (
            <g key={i}>
              <rect x={x} y={base - h} width={w} height={h} rx={Math.min(3, w * 0.3)} fill={p.hatch ? 'url(#hatch)' : color} opacity={target !== undefined && p.value < target && !p.hatch ? 0.55 : 1} />
              {eh > 0 && <rect x={x} y={base - eh} width={w} height={eh} rx={Math.min(3, w * 0.3)} fill="var(--gold)" />}
            </g>
          );
        })}
        {secondColor &&
          points.map((p, i) => (p.second !== null && p.second !== undefined ? <circle key={`s${i}`} cx={cx(i)} cy={ys(p.second)} r="3.2" fill={secondColor} stroke="var(--ink)" strokeWidth="1" /> : null))}
        {trend.length > 1 && <path d={trend.map((p, k) => `${k ? 'L' : 'M'}${cx(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')} fill="none" stroke={mode === 'bars' ? 'var(--text)' : color} strokeOpacity={mode === 'bars' ? 0.7 : 1} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((p, i) =>
          p.marker ? (
            <g key={`m${i}`}>
              <line x1={cx(i)} x2={cx(i)} y1={top} y2={base} stroke="var(--gold)" strokeOpacity="0.5" strokeDasharray="2 3" />
              <circle cx={cx(i)} cy={top} r="3" fill="var(--gold)">
                <title>{p.marker}</title>
              </circle>
            </g>
          ) : null,
        )}
        {glyphs &&
          points.map((p, i) => (
            <g key={`g${i}`}>
              {p.place && <PlaceGlyph kind={p.place} x={cx(i)} y={base + 9} s={Math.min(4.5, bw * 0.3)} />}
              {p.nightOut && <circle cx={cx(i)} cy={base + 9} r={Math.min(6.5, bw * 0.42)} fill="none" stroke="var(--gold)" strokeWidth="1.2" />}
            </g>
          ))}
        {points.map((p, i) =>
          i % every === 0 ? (
            <text key={`l${i}`} x={cx(i)} y={H - 4} textAnchor="middle" fill="var(--dim)" fontSize="10" fontFamily="var(--sans)">
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
      {glyphs && (
        <div className="place-key t12 q">
          {places.map((k) => (
            <span key={k}>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <PlaceGlyph kind={k} x={6} y={6} s={4.5} />
              </svg>
              {PLACE_NAME[k]}
            </span>
          ))}
          {points.some((p) => p.nightOut) && (
            <span>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <circle cx="6" cy="6" r="5" fill="none" stroke="var(--gold)" strokeWidth="1.2" />
              </svg>
              night out
            </span>
          )}
          {mode === 'bars' && points.some((p) => p.value === null) && (
            <span>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <rect x="2" y="1" width="8" height="10" rx="2" fill="none" stroke="var(--btn-border)" strokeDasharray="2 2" />
              </svg>
              not logged
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The shared Tracks page: today's value and the change against last week, a range switch,
 * the hero chart, two or three plain insights, the page's extras, then its history.
 */
export function TrackShell({
  title,
  color,
  value,
  sub,
  change,
  span,
  spans = ['7', '30', '90'],
  unit = 'd',
  onSpan,
  hero,
  insights,
  children,
  history,
}: {
  title: string;
  color: string;
  value: ReactNode;
  sub?: ReactNode;
  change?: { text: string; good?: boolean };
  span?: string;
  spans?: string[];
  unit?: string;
  onSpan?: (s: string) => void;
  hero?: ReactNode;
  insights?: (string | undefined | false)[];
  children?: ReactNode;
  history?: { title: string; rows: [string, string][]; onRow?: (i: number) => void };
}) {
  const lines = (insights ?? []).filter((x): x is string => !!x).slice(0, 3);
  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/tracks')}>
        <Icon name="left" size={20} stroke={1.8} />
        Tracks
      </button>
      <div className="row top">
        <h1 className="h1" style={{ color }}>
          {title}
        </h1>
        {span && onSpan && (
          <div style={{ width: 150 }}>
            <Seg options={spans.map((s) => ({ id: s, label: s === 'all' ? 'All' : `${s} ${unit}` }))} value={span} onChange={onSpan} />
          </div>
        )}
      </div>
      <div className="col gap6">
        <div className="num" style={{ fontSize: 44 }}>
          {value}
        </div>
        {(sub || change) && (
          <div className="t14 q lh">
            {sub}
            {sub && change ? ' · ' : ''}
            {change && <span className={change.good === undefined ? '' : change.good ? 'sage' : 'apri'}>{change.text}</span>}
          </div>
        )}
      </div>
      {hero && <div className="card">{hero}</div>}
      {lines.length > 0 && (
        <div className="insights">
          {lines.map((l) => (
            <div key={l} className="t14 lh">
              {l}
            </div>
          ))}
        </div>
      )}
      {children}
      {history && history.rows.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            {history.title}
          </div>
          {history.rows.map(([a, b], i) =>
            history.onRow ? (
              <button key={i} type="button" className="sess" style={{ minHeight: 44 }} onClick={() => history.onRow!(i)}>
                <span className="t14">{a}</span>
                <span className="t14 q tn">{b}</span>
              </button>
            ) : (
              <div key={i} className="sess" style={{ minHeight: 44 }}>
                <span className="t14">{a}</span>
                <span className="t14 q tn">{b}</span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/** "+2,000 on last week" / "−0.4 kg on last week". */
export function changeText(delta: number | undefined, fmt: (n: number) => string, higherIsGood?: boolean) {
  if (delta === undefined || Math.abs(delta) < 1e-9) return delta === undefined ? undefined : { text: 'level with last week' };
  return { text: `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))} on last week`, good: higherIsGood === undefined ? undefined : delta > 0 === higherIsGood };
}
