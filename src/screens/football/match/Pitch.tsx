// The radar as the pitch: your shape for the chance, the landing region, the ball, and the burst.
import { hexagon, polygon, radii, type Pt } from '../../../football/radar';
import { AXES, type ChanceEvent } from '../../../football/types';
import { band } from '../Radar';
import { Save } from './Save';
import { Shockwave } from './Shockwave';
import { zoomTransform } from './GoalLine';
import type { Wave } from './Replay';

export const C = 160, R = 92;
const pts = (p: Pt[]) => p.map(([x, y]) => `${(C + x * R).toFixed(1)},${(C + y * R).toFixed(1)}`).join(' ');
export const toPx = ([x, y]: [number, number]): [number, number] => [C + x * R, C + y * R];

export interface PitchState { chance?: ChanceEvent; ball?: [number, number]; flying: boolean; zoom: boolean; wave?: Wave; save: boolean; resultKey: number }

export function Pitch({ s }: { s: PitchState }) {
  const c = s.chance;
  const shape = c ? pts(polygon(radii(c.values, c.side))) : pts(hexagon(0.5));
  const [bx, by] = s.ball ? toPx(s.ball) : [C, 300];
  return (
    <svg className={`fb-pitch ${c?.side ?? ''}`} viewBox="-48 0 416 320" role="img" aria-label={c ? `${c.side === 'atk' ? 'You attack' : 'They attack'}: ${c.type}, ${c.pct}%` : 'The pitch'}>
      <g transform={s.zoom && s.ball ? zoomTransform(bx, by) : undefined} className="zoomer">
        <polygon points={pts(hexagon(1))} className="rim" />
        <polygon points={pts(hexagon(0.5))} className="grid" />
        {c && <polygon points={pts(hexagon(c.reach))} className="reach" />}
        <polygon points={shape} className="glow" />
        <polygon points={shape} className={`mine ${c?.side ?? ''}`} />
        {c && AXES.map((a, i) => {
          const [x, y] = polygon([1, 1, 1, 1, 1, 1])[i];
          const lit = c.side === 'atk' ? i < 3 : i >= 3;
          const lx = C + x * (R + 20), ly = C + y * (R + 20) + (y < -0.5 ? -6 : y > 0.5 ? 16 : 5);
          return (
            <text key={a} x={lx} y={ly} textAnchor={Math.abs(x) < 0.2 ? 'middle' : x > 0 ? 'start' : 'end'} className={`plab ${band(c.values[a])}${lit ? '' : ' dimlab'}`}>
              {a} <tspan className="v">{c.values[a]}</tspan>
            </text>
          );
        })}
        <circle cx={bx} cy={by} r={s.zoom ? 3 : 7} className={`ball${s.flying ? ' flying' : ''}`} />
        {s.wave && s.ball && <Shockwave key={`w${s.resultKey}`} kind={s.wave} x={bx} y={by} />}
        {s.save && s.ball && <Save key={`s${s.resultKey}`} x={bx} y={by} />}
      </g>
    </svg>
  );
}
