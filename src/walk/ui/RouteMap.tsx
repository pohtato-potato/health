import { routeById } from '../catalogue';
import { REGIONS, ROUTE_LINES } from '../geo';
import { along, fracAtKm, partOf } from '../geometry';
import { frameRoute, pathOf } from './frame';

/**
 * A route page's map: the land, the whole road (out and home drawn differently where it turns), the labelled
 * places, and your dot. Drawn for a 360 px wide screen at 360 × 250; names are 14 px in screen pixels.
 */
export function RouteMap({ id, km }: { id: string; km: number }) {
  const def = routeById(id);
  const art = ROUTE_LINES[id];
  if (!def || !art) return null;
  const region = REGIONS[art.region];
  const line = art.line;
  const { x, y, w, h, unit } = frameRoute(line, region, [360, 250], [0.7, 0.5], 0.06);
  const turnAt = def.turn === undefined ? undefined : (def.places.find((p) => p.km === def.turn)?.at ?? undefined);
  const out = pathOf(turnAt === undefined ? line : line.slice(0, turnAt + 1));
  const home = turnAt === undefined ? '' : pathOf(line.slice(turnAt));
  const frac = fracAtKm(def, km);
  const [ux, uy] = along(line, frac);
  const places = def.places.length ? def.places : [{ name: art.ends[0], km: 0, at: 0 }, { name: art.ends[1], km: def.km, at: line.length - 1 }];
  return (
    <svg className="walk-map" viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${def.name}: the whole road, from ${art.ends[0]} to ${art.ends[1]}`}>
      {region.extra && <path className="walk-ridge" d={region.extra} vectorEffect="non-scaling-stroke" />}
      <path className="walk-land" d={region.outline} vectorEffect="non-scaling-stroke" />
      <path className="walk-map-out" d={out} vectorEffect="non-scaling-stroke" />
      {home && <path className="walk-map-home" d={home} vectorEffect="non-scaling-stroke" />}
      {km > 0 && <path className="walk-art-walked" d={pathOf(partOf(line, frac))} pathLength={1} style={{ strokeWidth: 4 / unit }} />}
      {places.map((p) => {
        const [px, py] = line[Math.min(p.at, line.length - 1)];
        const right = px < x + w * 0.7;
        return (
          <g key={`${p.at}-${p.name}`}>
            <circle className="walk-map-place" cx={px} cy={py} r={2.6 / unit} />
            <g transform={`translate(${px} ${py}) scale(${1 / unit})`}>
              <text className="walk-map-name" fontSize={14} x={right ? 5 : -5} y={-5} textAnchor={right ? 'start' : 'end'}>
                {p.name}
              </text>
            </g>
          </g>
        );
      })}
      <circle className="walk-halo" cx={ux} cy={uy} r={8 / unit} />
      <circle className="walk-you" cx={ux} cy={uy} r={4.5 / unit} />
    </svg>
  );
}
