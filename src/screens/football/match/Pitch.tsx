// The radar as the pitch: your shape for the chance, the landing region, the ball, and the burst.
// The ball rolls in, bounces and settles on the stored landing (O44); the roll is drawn here and nowhere else.
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { hexagon, inside, polygon, radii, type Pt } from '../../../football/radar';
import { AXES, type ChanceEvent } from '../../../football/types';
import { band } from '../Radar';
import { Save } from './Save';
import { Shockwave } from './Shockwave';
import { GoalLineCaption, ZOOM } from './GoalLine';
import { INRADIUS, NORMALS, roll } from './roll';
import type { Wave } from './Replay';

export const C = 160, R = 92;
const pts = (p: Pt[]) => p.map(([x, y]) => `${(C + x * R).toFixed(1)},${(C + y * R).toFixed(1)}`).join(' ');
export const toPx = ([x, y]: [number, number]): [number, number] => [C + x * R, C + y * R];

/**
 * The play (match screen round, O44): your rim, and around it the landing region out to 1.3 rim-widths. Landings
 * further out (a wide reach, up to about 1.9 in the owner's matches) are drawn on that edge, on the same line from
 * the centre: still outside the rim and your shape, so what the picture says is unchanged.
 */
export const PLAY = 1.3;
const hexNorm = (p: Pt) => Math.max(...NORMALS.map(([nx, ny]) => p[0] * nx + p[1] * ny)) / INRADIUS;
export const onPitch = (p: Pt): [number, number] => { const n = hexNorm(p); return n > PLAY ? [(p[0] * PLAY) / n, (p[1] * PLAY) / n] : [p[0], p[1]]; };

/**
 * The picture's drawing area: cropped close to the play so the radar fills the width, with the axis labels at fixed
 * spots outside it, the same every chance: Pace above, Rest below, the four side axes in the picture's corners, clear
 * of the play's slanted sides, so nothing sits on the ball's way, a marker or the shape, and nothing moves under a
 * magnifier.
 */
export const VIEWBOX = '0 12 320 300';
type Spot = { x: number; y: number; anchor: 'start' | 'middle' | 'end' };
/** In AXES order: Pace, Power, Fuel, Rest, Routine, Shape. */
export const LABEL_SPOTS: Spot[] = [
  { x: C, y: 30, anchor: 'middle' },
  { x: 318, y: 60, anchor: 'end' },
  { x: 318, y: 276, anchor: 'end' },
  { x: C, y: 304, anchor: 'middle' },
  { x: 2, y: 276, anchor: 'start' },
  { x: 2, y: 60, anchor: 'start' },
];

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
  const ball = s.ball && onPitch(s.ball);
  const [bx, by] = ball ? toPx(ball) : [C, C];

  // The roll (O44), drawn frame by frame straight onto the picture; React only draws the still parts.
  const key = c && ball && s.roll ? `${s.roll.seed}|${ball[0]}|${ball[1]}|${s.zoom}` : '';
  const plan = useMemo(() => (key && c && ball ? roll(c, ball, s.roll!.seed, s.zoom) : null), [key]); // eslint-disable-line react-hooks/exhaustive-deps
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
      <svg className={`fb-pitch ${c?.side ?? ''}`} viewBox={VIEWBOX} role="img" aria-label={c ? `${c.side === 'atk' ? 'You attack' : 'They attack'}: ${c.type}, ${c.pct}%` : 'The pitch'}>
        <g ref={el.zoomer} className="zoomer">
          {/* The shake moves only the drawing, never the axis labels. */}
          <g ref={el.shaker}>
            <polygon points={pts(hexagon(1))} className="rim" />
            <polygon points={pts(hexagon(0.5))} className="grid" />
            {/* The reach is drawn out to the play's edge (see PLAY). */}
            {c && <polygon points={pts(hexagon(Math.min(PLAY, c.reach)))} className="reach" />}
            <polygon points={shape} className="glow" />
            <polygon points={shape} className={`mine ${c?.side ?? ''}`} />
            <polygon ref={el.flash} points={shape} className={`flash ${c?.side ?? ''}`} opacity={0} />
            {dots.map((d, k) => {
              if (d.kept) return null;
              const [x, y] = toPx(onPitch(d.land));
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
            const sp = LABEL_SPOTS[i];
            return (
              <text key={a} x={sp.x} y={sp.y} textAnchor={sp.anchor} className={`plab ${band(c.values[a])}${lit ? '' : ' dimlab'}`}>
                {a} <tspan className="v">{Math.round(c.values[a])}</tspan>
              </text>
            );
          })}
          {s.wave && ball && <Shockwave key={`w${s.resultKey}`} kind={s.wave} x={bx} y={by} />}
          {s.save && ball && <Save key={`s${s.resultKey}`} x={bx} y={by} />}
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

/** One option of a call drawn on the pitch: its shape's ink, and solid or dashed (never colour alone). */
export interface CallShape { pct: number; ink: string; dashed: boolean }

/**
 * A call, on the pitch (match screen round, O44): each option that shoots draws its own shape on the radar, sized so
 * its area is its chance (a 23% shot covers 23% of the rim), solid for the safer run and dashed for the long shot.
 * Keeping the ball shoots nothing, so it draws nothing.
 */
export function CallPitch({ shapes, side = 'atk' }: { shapes: CallShape[]; side?: 'atk' | 'def' }) {
  return (
    <svg className={`fb-pitch ms-callpitch ${side}`} viewBox="64 52 192 216" role="img" aria-label={`Your options on the pitch: ${shapes.map((x) => `${x.dashed ? 'dashed' : 'solid'} shape ${x.pct}%`).join(', ')}`}>
      <polygon points={pts(hexagon(1))} className="rim" />
      <polygon points={pts(hexagon(0.5))} className="grid" />
      {[...shapes].sort((a, b) => b.pct - a.pct).map((x, k) => (
        <polygon
          key={k}
          points={pts(hexagon(Math.sqrt(Math.max(0, Math.min(100, x.pct)) / 100)))}
          className={`ms-opt${x.dashed ? ' dash' : ''}`}
          style={{ ['--ink' as string]: x.ink, animationDelay: `${0.15 + k * 0.2}s` } as CSSProperties}
        />
      ))}
      <circle cx={C} cy={C} r={7} className="ball" />
    </svg>
  );
}

/** The small key beside each option's name: its shape as drawn on the pitch, or a struck-out one for "nothing". */
export function ShapeKey({ ink, dashed, none = false }: { ink: string; dashed?: boolean; none?: boolean }) {
  return (
    <svg className="ms-key" viewBox="-12 -12 24 24" aria-hidden="true" style={{ ['--ink' as string]: ink } as CSSProperties}>
      {none
        ? <><circle r="8" className="none" /><path d="M-6 6 L6 -6" className="none" /></>
        : <polygon points={hexagon(0.8).map(([x, y]) => `${(x * 11).toFixed(1)},${(y * 11).toFixed(1)}`).join(' ')} className={dashed ? 'dash' : 'solid'} />}
    </svg>
  );
}
