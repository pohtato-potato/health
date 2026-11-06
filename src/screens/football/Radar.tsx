// The breathing radar: two glow layers, labels in band colours, values always in words beside them.
import { hexagon, polygon, radii, type Pt } from '../../football/radar';
import { AXES, type Axis, type AxisFlags, type AxisValues, type Side } from '../../football/types';

/** Band for a value: colour is only ever a second cue beside the number. */
export const band = (v: number) => (v >= 16 ? 'b4' : v >= 13 ? 'b3' : v >= 9 ? 'b2' : 'b1');
const FLAG: Record<string, string> = { 'no-data': 'no data', 'not-logged': 'not logged' };

const pts = (p: Pt[], c: number, r: number) => p.map(([x, y]) => `${(c + x * r).toFixed(1)},${(c + y * r).toFixed(1)}`).join(' ');

export function Radar({ values, flags = {}, side, reach, captain, size = 300, label = 'Tonight’s shape', bare = false }: { values: AxisValues; flags?: AxisFlags; side?: Side; reach?: number; captain?: Axis; size?: number; label?: string; bare?: boolean }) {
  const vb = 320, c = vb / 2, r = 92;
  const rs = side ? radii(values, side) : AXES.map((a) => Math.max(0.03, Math.min(1, values[a] / 20)));
  const shape = pts(polygon(rs), c, r);
  const rim = pts(hexagon(1), c, r);
  const mid = pts(hexagon(0.5), c, r);
  const summary = AXES.map((a) => `${a} ${values[a]}${flags[a] ? ` (${FLAG[flags[a]!]})` : ''}${captain === a ? ', captain' : ''}`).join(', ');
  return (
    <figure className="fb-radar" style={{ width: size, maxWidth: '100%' }}>
      <svg viewBox={bare ? `60 60 200 200` : `0 0 ${vb} ${vb}`} role="img" aria-label={`${label}: ${summary}`}>
        <polygon points={rim} className="rim" />
        <polygon points={mid} className="grid" />
        {AXES.map((_, i) => {
          const [x, y] = polygon([1, 1, 1, 1, 1, 1])[i];
          return <line key={i} x1={c} y1={c} x2={c + x * r} y2={c + y * r} className="grid" />;
        })}
        {reach !== undefined && <polygon points={pts(hexagon(reach), c, r)} className="reach" />}
        <g className="breathe">
          <polygon points={shape} className="glow" />
          <polygon points={shape} className="shape" />
        </g>
        {!bare && AXES.map((a, i) => {
          const [x, y] = polygon([1, 1, 1, 1, 1, 1])[i];
          const lx = c + x * (r + 22), ly = c + y * (r + 22);
          const anchor = Math.abs(x) < 0.2 ? 'middle' : x > 0 ? 'start' : 'end';
          const dy = y < -0.5 ? -8 : y > 0.5 ? 18 : 4;
          const f = flags[a];
          return (
            <text key={a} x={lx} y={ly + dy} textAnchor={anchor} className={`lab ${band(values[a])}${f ? ' flagged' : ''}`} aria-hidden="true">
              <tspan className="ax">{a}</tspan>
              <tspan className="v" dx="6">{values[a]}</tspan>
              {captain === a && <tspan className="cap" dx="6">[C]</tspan>}
              {f && <tspan x={lx} dy="18" className="fl">{FLAG[f]}</tspan>}
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
