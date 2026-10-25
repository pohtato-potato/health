import type { ReactNode } from 'react';
import { ALL_STOPS } from '../../domain/walk';
import { STOPS } from '../../walk/content';
import { CITY_POINTS, REGIONS } from '../../walk/geo';
import { labelPoint, levelBox, pointAtKm, roadAhead, stateInk, trailLegs, type MapLevel } from '../../walk/mapView';
import { stretchAt } from '../../walk/road';
import { STRETCHES } from '../../walk/content';
import { whereLine, whereNow } from '../../walk/page';
import { useDrawnWidth } from '../../walk/ui/frame';
import { placeLabels, type Label } from '../../walk/ui/labels';

export { placeLabels };

/** The shape the map is drawn in. */
export const MAP_ASPECT = 328 / 380;

/** India's projection, as scripts/make-geo.py makes it, so graticule lines land where the land is. */
const C = Math.cos(((6 + 37.5) / 2) * (Math.PI / 180));
const K = 300 / ((98.5 - 66) * C);
const px = (lon: number) => (lon - 66) * C * K;
const py = (lat: number) => (37.5 - lat) * K;

/** Places the road passes that aren't stops, written at the stretch level (the road crosses Dholpur's corner of Rajasthan). */
const ROADSIDE: [string, [number, number]][] = [['Dholpur', [px(77.88), py(26.7)]]];

/**
 * The walk on a night map of India with the survey's graticule: every state, the ones walked into in the ink of
 * their land with their names; the road ahead dashed and your trail solid (by sea, both dotted); the cities as survey marks;
 * at the stretch level, its small stops. Labels are drawn in screen pixels, so they stay 14 px or more at any zoom.
 */
export function IndiaMap({ km, reached, level, width, box, gold }: { km: number; reached: string[]; level: MapLevel; width?: number; box?: [number, number, number, number]; gold?: boolean }) {
  const [ref, drawn] = useDrawnWidth(width, 328);
  const [x, y, w, h] = box ?? levelBox(level, km, MAP_ASPECT);
  const unit = drawn / w;
  const india = REGIONS.india;
  const here = pointAtKm(km);
  const trail = trailLegs(km);
  const reachedSet = new Set(reached);
  const nextStop = ALL_STOPS.find((s) => s.km > km);
  const passedNames = new Set(ALL_STOPS.filter((s) => s.km <= km).map((s) => s.name));
  const stretch = stretchAt(km, STRETCHES);
  const stops = level === 'stretch' && stretch ? STOPS.filter((s) => s.km >= stretch.fromKm && s.km < stretch.toKm) : [];
  const draw = (l: Label): ReactNode => (
    <g key={l.key} transform={`translate(${l.at[0]} ${l.at[1]}) scale(${1 / unit})`}>
      <text className={l.cls} fontSize={l.size} x={l.dx} y={l.dy} textAnchor={l.anchor}>
        {l.text}
      </text>
    </g>
  );
  const L = (key: string, at: [number, number], text: string, size: number, cls: string, dx = 6, dy = 4, anchor: Label['anchor'] = 'start'): Label => ({ key, at, text, size, cls, dx, dy, anchor });
  const path = (pts: [number, number][]) => 'M' + pts.map((p) => p.join(' ')).join(' L');
  const toScreen = ([mx, my]: [number, number]): [number, number] => [(mx - x) * unit, (my - y) * unit];
  const cities = ALL_STOPS.filter((s, i, a) => a.findIndex((t) => t.name === s.name) === i).filter((s) => (passedNames.has(s.name) || s.name === nextStop?.name) && CITY_POINTS[s.name]);
  const grid = { lon: level === 'india' ? [70, 75, 80, 85, 90, 95] : [66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92, 94, 96], lat: level === 'india' ? [10, 15, 20, 25, 30, 35] : [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36] };

  const degrees = [
    ...grid.lon.filter((lon) => px(lon) > x && px(lon) < x + w).map((lon) => L(`lon${lon}`, [px(lon), y + h], `${lon}°E`, 14, 'walk-imap-deg', 4, -8)),
    ...grid.lat.filter((lat) => py(lat) > y && py(lat) < y + h).map((lat) => L(`lat${lat}`, [x, py(lat)], `${lat}°N`, 14, 'walk-imap-deg', 6, -6)),
  ];
  // Most important first: the states walked into (the biggest first), the next city, the cities (latest first), the stretch's stops, roadside places (Dholpur), then the degrees where there's room.
  const next = cities.find((c) => c.name === nextStop?.name);
  const degreeKeys = new Set(degrees.map((d) => d.key));
  const placed = placeLabels(
    [
      ...(india.states ?? []).filter((s) => reachedSet.has(s.name) && s.name !== 'Delhi' && s.name !== 'Chandigarh').sort((a, b) => b.areaKm2 - a.areaKm2).map((s) => L(`state-${s.name}`, labelPoint(s.path), s.name, 14, 'walk-imap-statename', 0, 5, 'middle')),
      ...(next ? [L(`city-${next.name}`, CITY_POINTS[next.name]!, next.name, 15, 'walk-imap-city')] : []),
      ...cities.filter((c) => c !== next).reverse().map((c) => L(`city-${c.name}`, CITY_POINTS[c.name]!, c.name, 15, 'walk-imap-city')),
      ...[...stops].reverse().map((s) => L(`stop-${s.id}`, pointAtKm(s.km), s.name, 14, 'walk-imap-stopname', 6, 16)),
      ...(level === 'stretch' ? ROADSIDE.map(([n, p]) => L(`place-${n}`, p, n, 14, 'walk-imap-place', -6, 4, 'end')) : []),
      ...degrees,
    ],
    toScreen,
    [drawn, drawn / MAP_ASPECT],
  );
  const labels = placed.filter((l) => !degreeKeys.has(l.key));
  return (
    <svg
      ref={ref}
      className="walk-imap"
      viewBox={`${x} ${y} ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`India, with your trail from Delhi to ${whereLine(whereNow(km)).replace(/^Near /, 'near ').replace(/^Between /, 'between ')}; ${reached.length} states and territories walked into`}
    >
      <g className="walk-imap-grat" aria-hidden="true">
        {grid.lon.map((lon) => (
          <line key={`lon${lon}`} x1={px(lon)} y1={-50} x2={px(lon)} y2={india.box[3] + 50} vectorEffect="non-scaling-stroke" />
        ))}
        {grid.lat.map((lat) => (
          <line key={`lat${lat}`} x1={-50} y1={py(lat)} x2={350} y2={py(lat)} vectorEffect="non-scaling-stroke" />
        ))}
        {placed.filter((l) => degreeKeys.has(l.key)).map(draw)}
      </g>
      {india.extra && <path d={india.extra} className="walk-imap-near" vectorEffect="non-scaling-stroke" />}
      <path d={india.outline} className="walk-imap-land" vectorEffect="non-scaling-stroke" />
      {india.states?.map((s) => (
        <path key={s.name} d={s.path} className={`walk-map-state${reachedSet.has(s.name) ? ' on' : ''}`} style={reachedSet.has(s.name) ? { fill: `color-mix(in srgb, ${stateInk(s.name)} 45%, transparent)` } : undefined} vectorEffect="non-scaling-stroke" />
      ))}
      {roadAhead(km).map((leg, i) => (
        <path key={i} d={path(leg.points)} className={`walk-imap-road${leg.sea ? ' sea' : ''}`} vectorEffect="non-scaling-stroke" />
      ))}
      {trail.map((leg, i) => (
        <path key={i} d={path(leg.points)} className={`walk-imap-trail${leg.sea ? ' sea' : ''}${gold ? ' gold' : ''}`} vectorEffect="non-scaling-stroke" />
      ))}
      {cities.map((s) => {
        const p = CITY_POINTS[s.name]!;
        return <path key={s.name} d={`M${p[0]} ${p[1] - 3.2 / unit} l${2.8 / unit} ${4.8 / unit} h${-5.6 / unit} Z`} className={`walk-imap-mark${passedNames.has(s.name) ? ' on' : ''}`} />;
      })}
      {stops.map((s) => {
        const p = pointAtKm(s.km);
        return <circle key={s.id} cx={p[0]} cy={p[1]} r={3 / unit} className={`walk-imap-stop${s.km <= km ? ' on' : ''}`} />;
      })}
      {labels.map(draw)}
      <circle cx={here[0]} cy={here[1]} r={9 / unit} className="walk-halo" style={{ fill: 'var(--sage)' }} />
      <circle cx={here[0]} cy={here[1]} r={4.5 / unit} className="walk-imap-you" />
    </svg>
  );
}

const LEVELS: [MapLevel, (chapter: number) => string][] = [
  ['stretch', () => 'This stretch'],
  ['chapter', (n) => `Chapter ${n}`],
  ['india', () => 'All of India'],
];

/** The three levels, as buttons with words. */
export function MapLevels({ level, chapter, onLevel }: { level: MapLevel; chapter: number; onLevel: (l: MapLevel) => void }) {
  return (
    <div className="walk-levels" role="group" aria-label="How much of the map to show">
      {LEVELS.map(([l, name]) => (
        <button key={l} type="button" aria-pressed={l === level} className={l === level ? 'on' : ''} onClick={() => onLevel(l)}>
          {name(chapter)}
        </button>
      ))}
    </div>
  );
}

/** What each line means, in words. */
export function MapKey() {
  return (
    <ul className="walk-map-key">
      <li>
        <i className="trail" aria-hidden="true" /> Walked
      </li>
      <li>
        <i className="road" aria-hidden="true" /> The road ahead
      </li>
      <li>
        <i className="sea" aria-hidden="true" /> By sea
      </li>
      <li>
        <i className="state" aria-hidden="true" /> States walked into, in the colour of their land
      </li>
    </ul>
  );
}
