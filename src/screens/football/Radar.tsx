// The breathing radar: two glow layers, labels in band colours, values always in words beside them.
import { hexagon, polygon, radii, type Pt } from '../../football/radar';
import { AXES, type Axis, type AxisFlags, type AxisValues, type Side } from '../../football/types';
import { AXIS_INK, valueTier } from '../../ui/inks';
import { lerp, spring, useChange, useTween } from '../../ui/motion/motion';

/** The five-step value scale for a 1–20 value: colour is only ever a second cue beside the number. */
export const band = (v: number) => valueTier(v);
const FLAG: Record<string, string> = { 'no-data': 'no data', 'not-logged': 'not logged' };

const pts = (p: Pt[], c: number, r: number) => p.map(([x, y]) => `${(c + x * r).toFixed(1)},${(c + y * r).toFixed(1)}`).join(' ');

/**
 * `opp` draws the opponent's shape dashed in their colour; `fog` hatches an axis with no data (q-pg-fog A);
 * `inked` colours each axis word in its own ink (pages round 2) and dots the corners by value.
 */
export function Radar({ values, flags = {}, side, reach, captain, size = 300, label = 'Tonight’s shape', bare = false, gold, opp, oppInk = '#ff8fa8', oppName, fog = [], inked = false, pulse, motionId }: { /** Remember the shape here: when an axis moved since it was last seen, the shape springs toward it (O44). */ motionId?: string; gold?: Axis; values: AxisValues; flags?: AxisFlags; side?: Side; reach?: number; captain?: Axis; size?: number; label?: string; bare?: boolean; opp?: AxisValues; oppInk?: string; oppName?: string; fog?: Axis[]; inked?: boolean; pulse?: { axis: Axis; id: number } }) {
  const vb = 320, c = vb / 2, r = 92;
  const seen = useChange(motionId, values);
  const k = spring(useTween(seen.n, 1300));
  const was = seen.n ? seen.from : undefined;
  // While it springs, the shape is drawn between where it was and where it is; the labels say the new values at once.
  const drawn: AxisValues = was ? (Object.fromEntries(AXES.map((a) => [a, Math.max(0, lerp(was[a], values[a], k))])) as AxisValues) : values;
  const rs = side ? radii(drawn, side) : AXES.map((a) => Math.max(0.03, Math.min(1.12, drawn[a] / 20)));
  const shape = pts(polygon(rs), c, r);
  const rim = pts(hexagon(1), c, r);
  const mid = pts(hexagon(0.5), c, r);
  const summary = AXES.map((a) => `${a} ${values[a]}${flags[a] ? ` (${FLAG[flags[a]!]})` : ''}${captain === a ? ', captain' : ''}${opp ? `, ${oppName ?? 'them'} ${opp[a]}` : ''}`).join(', ');
  const spoke = (i: number, k = 1) => { const [x, y] = polygon([1, 1, 1, 1, 1, 1])[i]; return [c + x * r * k, c + y * r * k] as const; };
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
        {fog.length > 0 && (
          <>
            <defs>
              <pattern id="fb-fog" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(243,238,230,.42)" strokeWidth="2.4" />
              </pattern>
            </defs>
            {fog.map((a) => {
              const i = AXES.indexOf(a), n = AXES.length;
              const [lx, ly] = spoke((i + n - 1) % n, 0.5), [tx, ty] = spoke(i, 1), [rx, ry] = spoke((i + 1) % n, 0.5);
              return <polygon key={a} className="fog" points={`${c},${c} ${lx},${ly} ${tx},${ty} ${rx},${ry}`} fill="url(#fb-fog)" />;
            })}
          </>
        )}
        {opp && <polygon points={pts(polygon(AXES.map((a) => Math.max(0.03, Math.min(1, opp[a] / 20)))), c, r)} className="opp" style={{ stroke: oppInk }} />}
        <g className="breathe">
          <polygon points={shape} className="glow" />
          <polygon points={shape} className="shape" />
        </g>
        {inked && AXES.map((a, i) => {
          if (fog.includes(a)) return null;
          const kk = Math.max(0.03, Math.min(1.12, drawn[a] / 20));
          const [x, y] = spoke(i, kk);
          return <circle key={a} cx={x} cy={y} r={pulse?.axis === a ? 9 : 7} className={`dot ${band(values[a])}${pulse?.axis === a ? ' hit' : ''}`} data-axis={a} />;
        })}
        {!bare && AXES.map((a, i) => {
          const [x, y] = polygon([1, 1, 1, 1, 1, 1])[i];
          const lx = c + x * (r + 22), ly = c + y * (r + 22);
          const anchor = Math.abs(x) < 0.2 ? 'middle' : x > 0 ? 'start' : 'end';
          const dy = y < -0.5 ? -8 : y > 0.5 ? 18 : 4;
          const f = flags[a];
          return (
            <text key={a} x={lx} y={ly + dy} textAnchor={anchor} className={`lab ${band(values[a])}${f ? ' flagged' : ''}${gold === a ? ' gold' : ''}`} aria-hidden="true" data-axis={a}>
              <tspan className="ax" style={inked ? { fill: AXIS_INK[a] } : undefined}>{a}</tspan>
              <tspan className="v" dx="6">{fog.includes(a) ? '?' : values[a]}</tspan>
              {captain === a && <tspan className="cap" dx="6">[C]</tspan>}
              {f && <tspan x={lx} dy="18" className="fl">{FLAG[f]}</tspan>}
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
