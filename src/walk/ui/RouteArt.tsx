import type { CSSProperties } from 'react';
import { routeById } from '../catalogue';
import { REGIONS, ROUTE_LINES } from '../geo';
import { along, fracAtKm, partOf } from '../geometry';
import { fmtKm, frameRoute, pathOf, useDrawnWidth } from './frame';

/** The route's own ink, for its card glow, border and walked line. */
export function inkStyle(id: string): CSSProperties {
  return { '--route-ink': routeById(id)?.ink ?? '#c9dcea' } as CSSProperties;
}

/** Screen sizes each kind of drawing is made for, at a 360 px phone with 16 px gutters. */
const SIZES = { thumb: [168, 132], band: [324, 150], hero: [324, 230] } as const;

/**
 * The map card's drawing: the route on a faint outline of its real land, framed to the route's own extent, the
 * road ahead dashed, the part walked inked in the route's colour (it draws itself on arrival), and a breathing
 * dot where you are. Names at the ends are drawn in screen pixels, so they stay 15 px at any scale.
 */
export function RouteArt({ id, km, kind = 'band', label, names = true, width }: { id: string; km: number; kind?: keyof typeof SIZES; label?: string; names?: boolean; width?: number }) {
  const [ref, drawn] = useDrawnWidth(width, SIZES[kind][0]);
  const def = routeById(id);
  const art = ROUTE_LINES[id];
  if (!def || !art) return null;
  const region = REGIONS[art.region];
  const thumb = kind === 'thumb';
  const { x, y, w, h } = frameRoute(art.line, region, [...SIZES[kind]], thumb ? [0.7, 0.7] : [1.1, 0.6], 0.04);
  const unit = drawn / w;
  const frac = fracAtKm(def, km);
  const d = pathOf(art.line);
  const [ux, uy] = along(art.line, frac);
  const [sx, sy] = art.line[0];
  // A round trip ends where it began, so its far end is named (and ringed) at the turn.
  const turnAt = def.turn === undefined ? undefined : def.places.find((p) => p.km === def.turn)?.at;
  const [ex, ey] = art.line[turnAt ?? art.line.length - 1];
  const r = 5 / unit;
  const label15 = (px: number, py: number, text: string) => (
    <g transform={`translate(${px} ${py}) scale(${1 / unit})`}>
      <text fontSize={15}>{text}</text>
    </g>
  );
  return (
    <svg ref={ref} className={`walk-art ${kind}`} viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label ?? `${def.name}: ${fmtKm(km)} of ${fmtKm(def.km)} km walked`}>
      <g className="walk-art-grid" aria-hidden="true">
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={`v${t}`} x1={x + w * t} y1={y} x2={x + w * t} y2={y + h} vectorEffect="non-scaling-stroke" />
        ))}
        {[0.33, 0.66].map((t) => (
          <line key={`h${t}`} x1={x} y1={y + h * t} x2={x + w} y2={y + h * t} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {region.extra && <path className="walk-ridge" d={region.extra} vectorEffect="non-scaling-stroke" />}
      <path className="walk-land" d={region.outline} vectorEffect="non-scaling-stroke" />
      <path className="walk-art-ahead" d={d} vectorEffect="non-scaling-stroke" />
      {km > 0 && <path className="walk-art-walked" d={pathOf(partOf(art.line, frac))} pathLength={1} style={{ strokeWidth: 4 / unit }} />}
      {!thumb && art.line.slice(1, -1).map(([px, py], k) => <circle key={k} className="walk-art-stop" cx={px} cy={py} r={r * 0.32} />)}
      <circle className="walk-art-start" cx={sx} cy={sy} r={r * 0.7} />
      <circle className="walk-art-end" cx={ex} cy={ey} r={r * 0.85} vectorEffect="non-scaling-stroke" />
      <circle className="walk-halo" cx={ux} cy={uy} r={r * 1.6} />
      <circle className="walk-you" cx={ux} cy={uy} r={r} />
      {!thumb && names && (
        <g className="walk-art-names">
          {label15(sx + r * 1.6, sy - r * 0.8, art.ends[0])}
          {label15(ex + r * 1.6, ey + r * 2.4, art.ends[1])}
        </g>
      )}
    </svg>
  );
}
