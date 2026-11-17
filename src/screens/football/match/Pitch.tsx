// The radar as the pitch: your shape for the chance, the landing region, the ball, and the burst.
// The ball rolls in, bounces and settles on the stored landing (O44); the roll is drawn here and nowhere else.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hexagon, inside, polygon, radii, type Pt } from '../../../football/radar';
import { AXES, type ChanceEvent } from '../../../football/types';
import { band } from '../Radar';
import { Save } from './Save';
import { Shockwave } from './Shockwave';
import { GoalLineCaption, ZOOM } from './GoalLine';
import { roll } from './roll';
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

/**
 * `roll`: this shot rolls (O44). It starts when `flying` turns on for a new roll and plays on through the verdict;
 * `zoom` gives it the goal-line close-up; `ms` stretches the roll to the time the replay gives it; `ok` is the stored
 * result of this landing (inside your shape). Without `roll` the ball just sits on `ball`.
 */
export interface PitchState {
  chance?: ChanceEvent; ball?: [number, number]; flying: boolean; zoom: boolean; wave?: Wave; save: boolean; resultKey: number;
  roll?: { seed: number; ok: boolean; ms?: number };
}


const smooth = (e: number) => e * e * (3 - 2 * e);
/** The close-up's scale through the roll (the first prototype): it closes in over 62 to 82 % of the roll, to ZOOM. */
export const zoomAt = (u: number) => (u <= 0.62 ? 1 : 1 + (ZOOM - 1) * smooth(Math.min(1, (u - 0.62) / 0.2)));
/** After the roll: the burst, the verdict held at full close-up, then the ease back. */
const BURST_MS = 700, HOLD_MS = 1600, BACK_MS = 900, SHAKE_MS = 160, FLASH_MS = 380, SPARK_MS = 420, TRAIL = 30;

/**
 * `dots`: earlier chances stay on the radar as dots (yours orange, theirs blue; goals filled).
 * `onWord`: told IN or OUT (true/false) each time the rolling ball crosses your shape's edge, and null when no roll is on.
 */
export function Pitch({ s, dots = [], onWord }: { s: PitchState; dots?: ChanceEvent[]; onWord?: (inShape: boolean | null) => void }) {
  const c = s.chance;
  const poly = c ? polygon(radii(c.values, c.side)) : hexagon(0.5);
  const shape = pts(poly);
  // The ball waits on the centre spot, clear of the axis labels (it used to wait under "Rest").
  const [bx, by] = s.ball ? toPx(s.ball) : [C, C];
  const px = (p: Pt[]) => p.map(([x, y]) => [C + x * R, C + y * R] as [number, number]);
  const lines = c ? [px(poly), px(hexagon(c.reach))] : [];
  const marks: [number, number, number][] = [
    ...dots.filter((d) => !d.kept).map((d) => [...toPx(d.land), 10] as [number, number, number]),
    [bx, by, 12],
  ];
  const spots = c ? placeLabels(AXES.map((a) => `${a} ${Math.round(c.values[a])}`), lines, marks) : [];

  // The roll (O44), drawn frame by frame straight onto the picture; React only draws the still parts.
  const key = c && s.ball && s.roll ? `${s.roll.seed}|${s.ball[0]}|${s.ball[1]}|${s.zoom}` : '';
  const plan = useMemo(() => (key && c && s.ball ? roll(c, s.ball, s.roll!.seed, s.zoom) : null), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const el = {
    zoomer: useRef<SVGGElement>(null), shaker: useRef<SVGGElement>(null), ball: useRef<SVGCircleElement>(null),
    trail: useRef<SVGPathElement>(null), flash: useRef<SVGPolygonElement>(null), ring: useRef<SVGCircleElement>(null),
    sparks: [useRef<SVGCircleElement>(null), useRef<SVGCircleElement>(null), useRef<SVGCircleElement>(null)],
  };
  const [cap, setCap] = useState<'line' | 'verdict' | null>(null);
  const raf = useRef(0), started = useRef(''), still = useRef<[number, number]>([bx, by]);
  still.current = [bx, by];
  const word = useRef(onWord);
  word.current = onWord;

  // A new roll (or none): stop the old one and put everything back where React drew it.
  useLayoutEffect(() => () => {
    cancelAnimationFrame(raf.current);
    started.current = '';
    const [x, y] = still.current;
    el.ball.current?.setAttribute('cx', String(x)); el.ball.current?.setAttribute('cy', String(y)); el.ball.current?.setAttribute('r', '7');
    el.zoomer.current?.removeAttribute('transform'); el.shaker.current?.removeAttribute('transform');
    el.trail.current?.setAttribute('d', ''); el.flash.current?.setAttribute('opacity', '0'); el.ring.current?.setAttribute('opacity', '0');
    for (const sp of el.sparks) sp.current?.setAttribute('opacity', '0');
    setCap(null);
    word.current?.(null);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!plan || !c || !s.roll || !s.flying || started.current === key) return;
    started.current = key;
    const { path, hits, close } = plan, n = path.length, ms = s.roll.ms ?? plan.ms, ok = s.roll.ok;
    const ball = el.ball.current!, zoomer = el.zoomer.current!, shaker = el.shaker.current!, trail = el.trail.current!, flash = el.flash.current!, ring = el.ring.current!;
    const sparks = el.sparks.map((r) => ({ el: r.current!, born: -1, x: 0, y: 0 }));
    ring.setAttribute('class', `ring ${ok ? 'good' : 'bad'}`);
    let t0 = -1, last = -1, si = 0, was: boolean | null = null, flashAt = -1e9, shakeAt = -1e9, doneAt = -1, z = 1, capNow: typeof cap = null;
    const draw = (ts: number) => {
      if (t0 < 0) t0 = ts;
      const f = Math.min(n - 1, Math.floor(((ts - t0) / ms) * n));
      const [x, y] = toPx(path[f]);
      for (const h of hits) if (h > last && h <= f) { const sp = sparks[si++ % sparks.length]; [sp.x, sp.y] = toPx(path[h]); sp.born = ts; shakeAt = ts; }
      last = f;
      const now = f === n - 1 ? ok : inside(path[f], poly);
      if (now !== was) { if (was !== null) flashAt = ts; was = now; word.current?.(now); }
      if (doneAt < 0 && f === n - 1) {
        doneAt = ts;
        ring.setAttribute('cx', String(x)); ring.setAttribute('cy', String(y));
        if (close) { capNow = 'verdict'; setCap('verdict'); }
      }
      if (doneAt < 0) {
        z = close ? zoomAt(f / (n - 1)) : 1;
        if (close && z > 1 && capNow !== 'line') { capNow = 'line'; setCap('line'); }
      } else if (close) {
        const q = ts - doneAt - HOLD_MS;
        z = q <= 0 ? ZOOM : 1 + (ZOOM - 1) * (1 - smooth(Math.min(1, q / BACK_MS)));
      }
      if (z > 1.001) zoomer.setAttribute('transform', `translate(${x} ${y}) scale(${z.toFixed(3)}) translate(${-x} ${-y})`);
      else zoomer.removeAttribute('transform');
      ball.setAttribute('cx', x.toFixed(1)); ball.setAttribute('cy', y.toFixed(1)); ball.setAttribute('r', (7 / Math.sqrt(z)).toFixed(2));
      trail.setAttribute('d', doneAt < 0 && f > 0 ? 'M' + path.slice(Math.max(0, f - TRAIL), f + 1).map((p) => toPx(p).map((v) => v.toFixed(1)).join(' ')).join(' L') : '');
      let busy = false;
      for (const sp of sparks) {
        const q = sp.born < 0 ? 1 : Math.min(1, (ts - sp.born) / SPARK_MS);
        if (q < 1) busy = true;
        sp.el.setAttribute('cx', sp.x.toFixed(1)); sp.el.setAttribute('cy', sp.y.toFixed(1));
        sp.el.setAttribute('r', ((4 + 26 * q) / Math.sqrt(z)).toFixed(1)); sp.el.setAttribute('opacity', (1 - q).toFixed(2));
      }
      const sh = Math.max(0, 1 - (ts - shakeAt) / SHAKE_MS);
      if (sh > 0) shaker.setAttribute('transform', `translate(${(Math.sin(ts / 14) * 3 * sh).toFixed(2)} ${(Math.cos(ts / 11) * 3 * sh).toFixed(2)})`);
      else shaker.removeAttribute('transform');
      flash.setAttribute('opacity', Math.max(0, 1 - (ts - flashAt) / FLASH_MS).toFixed(2));
      if (doneAt >= 0) {
        const q = Math.min(1, (ts - doneAt) / BURST_MS);
        ring.setAttribute('r', ((6 + 44 * q) / Math.sqrt(z)).toFixed(1)); ring.setAttribute('opacity', (1 - q).toFixed(2));
      }
      const end = doneAt >= 0 && ts - doneAt >= (close ? HOLD_MS + BACK_MS : BURST_MS) && !busy;
      if (!end) { raf.current = requestAnimationFrame(draw); return; }
      zoomer.removeAttribute('transform'); ball.setAttribute('r', '7');
      if (close) setCap(null);
    };
    draw(performance.now()); // the first frame now, so the landing never shows before the roll
    return undefined;
  }, [plan, s.flying]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <svg className={`fb-pitch ${c?.side ?? ''}`} viewBox="-48 0 416 320" role="img" aria-label={c ? `${c.side === 'atk' ? 'You attack' : 'They attack'}: ${c.type}, ${c.pct}%` : 'The pitch'}>
        <g ref={el.zoomer} className="zoomer">
          {/* The shake moves only the drawing, never the axis labels. */}
          <g ref={el.shaker}>
            <polygon points={pts(hexagon(1))} className="rim" />
            <polygon points={pts(hexagon(0.5))} className="grid" />
            {c && <polygon points={pts(hexagon(c.reach))} className="reach" />}
            <polygon points={shape} className="glow" />
            <polygon points={shape} className={`mine ${c?.side ?? ''}`} />
            <polygon ref={el.flash} points={shape} className={`flash ${c?.side ?? ''}`} opacity={0} />
            {dots.map((d, k) => {
              if (d.kept) return null;
              const [x, y] = toPx(d.land);
              const goal = d.side === 'atk' ? d.ok : !d.ok;
              return <circle key={`d${k}`} cx={x} cy={y} r={goal ? 6 : 5} className={`pdot ${d.side}${goal ? ' goal' : ''}`} />;
            })}
            <path ref={el.trail} className="trail" d="" />
            {el.sparks.map((r, k) => <circle key={`sp${k}`} ref={r} className="spark" r={0} opacity={0} />)}
            <circle ref={el.ring} className="ring" r={0} opacity={0} />
            <circle ref={el.ball} cx={bx} cy={by} r={7} className="ball" />
          </g>
          {c && AXES.map((a, i) => {
            const lit = c.side === 'atk' ? i < 3 : i >= 3;
            const sp = spots[i];
            return (
              <text key={a} x={sp.x} y={sp.y} textAnchor={sp.anchor} className={`plab ${band(c.values[a])}${lit ? '' : ' dimlab'}`}>
                {a} <tspan className="v">{Math.round(c.values[a])}</tspan>
              </text>
            );
          })}
          {s.wave && s.ball && <Shockwave key={`w${s.resultKey}`} kind={s.wave} x={bx} y={by} />}
          {s.save && s.ball && <Save key={`s${s.resultKey}`} x={bx} y={by} />}
        </g>
      </svg>
      {cap && c && s.roll && <GoalLineCaption ok={s.roll.ok} decided={cap === 'verdict'} side={c.side} />}
    </>
  );
}

/** The live IN or OUT word that sits beside the chance caption while the ball rolls (a word, never colour alone). */
export function RollWord({ inShape }: { inShape: boolean | null }) {
  // Between rolls the slot stays, unseen, so the caption never reflows under a magnifier.
  if (inShape === null) return <b className="fb-io" aria-hidden="true" style={{ visibility: 'hidden' }}>OUT</b>;
  return <b className={`fb-io ${inShape ? 'in' : 'out'}`} role="status">{inShape ? 'IN' : 'OUT'}</b>;
}
