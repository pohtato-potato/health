import type { CSSProperties } from 'react';
import { SHELF } from './walkSample';
import { REGIONS, ROUTE_ART } from './walkRoutes';

/** Design prototype: the route drawing shared by every look, and small helpers. */

export const byId = (id: string) => SHELF.find((r) => r.id === id)!;
export const fmt = (n: number) => n.toLocaleString('en-IN');
export const inkOf = (id: string) => ({ '--ink': ROUTE_ART[id]?.ink ?? '#c9dcea' }) as CSSProperties;

/** The point a fraction of the way along a polyline. */
export function along(line: [number, number][], frac: number): [number, number] {
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
export function RouteArt({ id, frac, kind = 'band', label, names = true }: { id: string; frac: number; kind?: 'band' | 'thumb' | 'hero'; label?: string; names?: boolean }) {
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

