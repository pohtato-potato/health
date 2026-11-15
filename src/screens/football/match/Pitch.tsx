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

/** The picture's drawing area (the viewBox) and an axis label's size, in its own units. */
const VIEW = { x0: -48, y0: 0, x1: 368, y1: 320 };
const LAB_PX = 18, CHAR_W = 0.62 * LAB_PX;
type Box = { x0: number; y0: number; x1: number; y1: number };
type Spot = { x: number; y: number; anchor: 'start' | 'middle' | 'end' };

/**
 * Where each axis label goes (tidy fix): by its spoke, but never over a marker dot, the ball, the shape's line or the
 * dashed reach.
 * Tries the usual spot, then nudges along and out from the spoke, keeping inside the picture; if every spot is taken
 * (a crowded edge), the one touching the fewest things wins. `marks` are circles [x, y, r] in picture units.
 */
export function placeLabels(texts: string[], lines: [number, number][][], marks: [number, number, number][]): Spot[] {
  const edges = lines.flatMap((l) => l.map((p, i) => [p, l[(i + 1) % l.length]] as const));
  const boxOf = (s: Spot, w: number): Box => {
    const x0 = s.anchor === 'start' ? s.x : s.anchor === 'end' ? s.x - w : s.x - w / 2;
    return { x0: x0 - 3, x1: x0 + w + 3, y0: s.y - LAB_PX * 0.8 - 2, y1: s.y + LAB_PX * 0.25 + 2 };
  };
  const hitsMark = (b: Box, [x, y, r]: [number, number, number]) => {
    const dx = Math.max(b.x0 - x, 0, x - b.x1), dy = Math.max(b.y0 - y, 0, y - b.y1);
    return dx * dx + dy * dy < r * r;
  };
  const hitsEdge = (b: Box, [[ax, ay], [bx, by]]: readonly [[number, number], [number, number]]) => {
    for (let t = 0; t <= 1; t += 0.05) { const x = ax + (bx - ax) * t, y = ay + (by - ay) * t; if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return true; }
    return false;
  };
  const cost = (b: Box) => {
    if (b.x0 < VIEW.x0 || b.x1 > VIEW.x1 || b.y0 < VIEW.y0 || b.y1 > VIEW.y1) return 100;
    return marks.filter((m) => hitsMark(b, m)).length + edges.filter((e) => hitsEdge(b, e)).length;
  };
  const NUDGE: [number, number][] = [[0, 0], [0, -18], [0, 18], [14, 0], [14, -18], [14, 18], [0, -34], [0, 34], [28, 0], [28, -26], [28, 26], [0, -52], [0, 52], [14, -52], [14, 52], [0, -70], [0, 70], [14, -70], [14, 70]];
  return texts.map((text, i) => {
    const [x, y] = polygon([1, 1, 1, 1, 1, 1])[i];
    const anchor = Math.abs(x) < 0.2 ? 'middle' : x > 0 ? 'start' : 'end';
    const w = text.length * CHAR_W;
    // Along the spoke (out) and across it (for top and bottom labels across is sideways; for the others, up and down).
    const across: [number, number] = Math.abs(x) < 0.2 ? [1, 0] : [0, 1];
    let best: Spot | undefined, bestCost = Infinity;
    for (const [out, side] of NUDGE) {
      const spot: Spot = {
        x: C + x * (R + 20 + out) + across[0] * side,
        y: C + y * (R + 20 + out) + (y < -0.5 ? -6 : y > 0.5 ? 16 : 5) + across[1] * side,
        anchor,
      };
      const k = cost(boxOf(spot, w));
      if (k < bestCost) { best = spot; bestCost = k; }
      if (k === 0) break;
    }
    return best!;
  });
}

export interface PitchState { chance?: ChanceEvent; ball?: [number, number]; flying: boolean; zoom: boolean; wave?: Wave; save: boolean; resultKey: number }

/** Where each kind of chance comes in from (presentation only): a through ball curls, a cross arcs, a long shot from far out. */
function entryPath(c: ChanceEvent, [bx, by]: [number, number]): string {
  const far = c.side === 'atk' ? 1 : -1;
  const from: Record<string, [number, number, number, number]> = {
    'Through ball': [C + R * 1.9, C + R * 1.1, C + R * 1.4, C - R * 0.2],
    'Counter-attack': [C - R * 0.4, C + R * 1.9, C - R * 1.2, C + R * 0.8],
    'Set piece': [C + R * 1.9, C - R * 0.9, C + R * 0.9, C - R * 1.4],
    'Tap-in': [C + R * 0.5, C + R * 0.6, C + R * 0.6, C + R * 0.2],
    'Long shot': [C - R * 0.2, -R * 0.3, C + R * 0.5, C - R * 0.6],
    'Cross into the box': [C - R * 1.9, C - R * 0.4, C - R * 1.1, C - R * 1.3],
    'Corner': [C - R * 1.9, C + R * 1.0, C - R * 1.6, C - R * 0.2],
    'Break through the middle': [C, C + R * 1.9, C + R * 0.4, C + R * 0.9],
    'Scramble in the box': [C - R * 0.5, C - R * 0.5, C - R * 0.6, C - R * 0.1],
    'Long-range effort': [C + R * 0.3, 2 * C + R * 0.3, C - R * 0.6, C + R * 0.8],
  };
  const [x0, y0, qx, qy] = from[c.type] ?? [C + far * R * 1.6, C + R * 1.2, C + R, C];
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
}

/** `dots`: earlier chances stay on the radar as dots (yours orange, theirs blue; goals filled). `entry`: draw the move coming in. */
export function Pitch({ s, dots = [], entry = false }: { s: PitchState; dots?: ChanceEvent[]; entry?: boolean }) {
  const c = s.chance;
  const shape = c ? pts(polygon(radii(c.values, c.side))) : pts(hexagon(0.5));
  // The ball waits on the centre spot, clear of the axis labels (it used to wait under "Rest").
  const [bx, by] = s.ball ? toPx(s.ball) : [C, C];
  const px = (p: Pt[]) => p.map(([x, y]) => [C + x * R, C + y * R] as [number, number]);
  const lines = c ? [px(polygon(radii(c.values, c.side))), px(hexagon(c.reach))] : [];
  const marks: [number, number, number][] = [
    ...dots.filter((d) => !d.kept).map((d) => [...toPx(d.land), 10] as [number, number, number]),
    [bx, by, 12],
  ];
  const spots = c ? placeLabels(AXES.map((a) => `${a} ${Math.round(c.values[a])}`), lines, marks) : [];
  return (
    <svg className={`fb-pitch ${c?.side ?? ''}`} viewBox="-48 0 416 320" role="img" aria-label={c ? `${c.side === 'atk' ? 'You attack' : 'They attack'}: ${c.type}, ${c.pct}%` : 'The pitch'}>
      <g transform={s.zoom && s.ball ? zoomTransform(bx, by) : undefined} className="zoomer">
        <polygon points={pts(hexagon(1))} className="rim" />
        <polygon points={pts(hexagon(0.5))} className="grid" />
        {c && <polygon points={pts(hexagon(c.reach))} className="reach" />}
        <polygon points={shape} className="glow" />
        <polygon points={shape} className={`mine ${c?.side ?? ''}`} />
        {c && AXES.map((a, i) => {
          const lit = c.side === 'atk' ? i < 3 : i >= 3;
          const sp = spots[i];
          return (
            <text key={a} x={sp.x} y={sp.y} textAnchor={sp.anchor} className={`plab ${band(c.values[a])}${lit ? '' : ' dimlab'}`}>
              {a} <tspan className="v">{Math.round(c.values[a])}</tspan>
            </text>
          );
        })}
        {dots.map((d, k) => {
          if (d.kept) return null;
          const [x, y] = toPx(d.land);
          const goal = d.side === 'atk' ? d.ok : !d.ok;
          return <circle key={`d${k}`} cx={x} cy={y} r={goal ? 6 : 5} className={`pdot ${d.side}${goal ? ' goal' : ''}`} />;
        })}
        {entry && c && s.ball && <path key={`e${s.resultKey}`} d={entryPath(c, [bx, by])} className="entry" />}
        <circle cx={bx} cy={by} r={s.zoom ? 3 : 7} className={`ball${s.flying ? ' flying' : ''}`} />
        {s.wave && s.ball && <Shockwave key={`w${s.resultKey}`} kind={s.wave} x={bx} y={by} />}
        {s.save && s.ball && <Save key={`s${s.resultKey}`} x={bx} y={by} />}
      </g>
    </svg>
  );
}
