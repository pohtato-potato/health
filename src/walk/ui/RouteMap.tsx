import { routeById } from '../catalogue';
import { REGIONS, ROUTE_LINES } from '../geo';
import { along, fracAtKm, partOf } from '../geometry';
import { frameRoute, pathOf, useDrawnWidth } from './frame';
import { placeLabels, type Label } from './labels';

/**
 * A route page's map: the land, the whole road (out and home drawn differently where it turns), the labelled
 * places, and your dot. Shaped 360 × 250; names are 14 px on screen at whatever width it's shown, and kept apart.
 */
export function RouteMap({ id, km, width }: { id: string; km: number; width?: number }) {
  const [ref, drawn] = useDrawnWidth(width, 360);
  const def = routeById(id);
  const art = ROUTE_LINES[id];
  if (!def || !art) return null;
  const region = REGIONS[art.region];
  const line = art.line;
  const { x, y, w, h } = frameRoute(line, region, [360, 250], [0.7, 0.5], 0.06);
  const unit = drawn / w;
  const turnAt = def.turn === undefined ? undefined : (def.places.find((p) => p.km === def.turn)?.at ?? undefined);
  const out = pathOf(turnAt === undefined ? line : line.slice(0, turnAt + 1));
  const home = turnAt === undefined ? '' : pathOf(line.slice(turnAt));
  const frac = fracAtKm(def, km);
  const [ux, uy] = along(line, frac);
  // Only places marked for a label are written; a route with none shows its two ends.
  const labelled = def.places.filter((p) => p.label);
  const places = labelled.length ? labelled : [{ name: art.ends[0], km: 0, at: 0 }, { name: art.ends[1], km: def.km, at: line.length - 1 }];
  // Names in screen pixels, by priority: the start, the turn or the end, then the rest in order; one that would
  // overlap another, or leave the frame, is left out (its dot stays).
  const pt = (p: { at: number }) => line[Math.min(p.at, line.length - 1)];
  const label = (p: { name: string; at: number }): Label => {
    const right = pt(p)[0] < x + w * 0.7;
    return { key: `${p.at}-${p.name}`, at: pt(p), text: p.name, size: 14, cls: 'walk-map-name', dx: right ? 5 : -5, dy: -5, anchor: right ? 'start' : 'end' };
  };
  const firstAt = places[0]?.at;
  const keyAt = turnAt ?? places.at(-1)?.at;
  const order = [...places.filter((p) => p.at === firstAt || p.at === keyAt), ...places.filter((p) => p.at !== firstAt && p.at !== keyAt)];
  const names = placeLabels(order.map(label), ([mx, my]) => [(mx - x) * unit, (my - y) * unit], [drawn, (drawn * h) / w]);
  return (
    <svg ref={ref} className="walk-map" viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${def.name}: the whole road, from ${art.ends[0]} to ${art.ends[1]}`}>
      {region.extra && <path className="walk-ridge" d={region.extra} vectorEffect="non-scaling-stroke" />}
      <path className="walk-land" d={region.outline} vectorEffect="non-scaling-stroke" />
      <path className="walk-map-out" d={out} vectorEffect="non-scaling-stroke" />
      {home && <path className="walk-map-home" d={home} vectorEffect="non-scaling-stroke" />}
      {km > 0 && <path className="walk-art-walked" d={pathOf(partOf(line, frac))} pathLength={1} style={{ strokeWidth: 4 / unit }} />}
      {places.map((p) => (
        <circle key={`${p.at}-${p.name}`} className="walk-map-place" cx={pt(p)[0]} cy={pt(p)[1]} r={2.6 / unit} />
      ))}
      {names.map((l) => (
        <g key={l.key} transform={`translate(${l.at[0]} ${l.at[1]}) scale(${1 / unit})`}>
          <text className={l.cls} fontSize={l.size} x={l.dx} y={l.dy} textAnchor={l.anchor}>
            {l.text}
          </text>
        </g>
      ))}
      <circle className="walk-halo" cx={ux} cy={uy} r={8 / unit} />
      <circle className="walk-you" cx={ux} cy={uy} r={4.5 / unit} />
    </svg>
  );
}
