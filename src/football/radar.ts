// Radar geometry in unit space: the rim is radius 1, axis 0 (Pace) at the top, clockwise.
import { AXES, clamp, type Axis, type AxisValues, type Side } from './types';

export type Pt = [number, number];
export const LIT: Record<Side, Axis[]> = { atk: ['Pace', 'Power', 'Fuel'], def: ['Rest', 'Routine', 'Shape'] };
const DIM: Record<Side, number> = { atk: 0.7, def: 0.75 };
const N = 6;
const ang = (i: number) => -Math.PI / 2 + (i * Math.PI * 2) / N;

export function radii(v: AxisValues, side: Side): number[] {
  return AXES.map((a) => clamp((v[a] / 20) * (LIT[side].includes(a) ? 1 : DIM[side]), 0.03, 1));
}
export function polygon(rs: number[]): Pt[] {
  return rs.map((r, i) => [r * Math.cos(ang(i)), r * Math.sin(ang(i))]);
}
export const hexagon = (r: number) => polygon(Array(N).fill(r));

export function inside(p: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
export function area(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}
/** Sutherland–Hodgman: clip any polygon by a convex one (clockwise or not). */
function clip(subject: Pt[], convex: Pt[]): Pt[] {
  const sgn = Math.sign(signed(convex)) || 1;
  let out = subject;
  for (let i = 0; i < convex.length && out.length; i++) {
    const a = convex[i], b = convex[(i + 1) % convex.length];
    const side = (p: Pt) => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const inp = out;
    out = [];
    for (let k = 0; k < inp.length; k++) {
      const p = inp[k], q = inp[(k + 1) % inp.length];
      const sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
  }
  return out;
}
function signed(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return s;
}
/** Share of a convex region's area covered by a shape (exact, by clipping). */
export function coverage(region: Pt[], shape: Pt[]): number {
  const whole = area(region);
  return whole ? clamp(area(clip(shape, region)) / whole, 0, 1) : 0;
}
export function edgeDistance(p: Pt, poly: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    best = Math.min(best, Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)));
  }
  return best;
}
/** Uniform point inside a polygon by rejection sampling. */
export function randomIn(poly: Pt[], r: () => number): Pt {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let k = 0; k < 400; k++) {
    const p: Pt = [x0 + r() * (x1 - x0), y0 + r() * (y1 - y0)];
    if (inside(p, poly)) return p;
  }
  return [0, 0];
}
/** Which axis a point sits nearest to, by angle. */
export function nearAxis(p: Pt): Axis {
  const a = Math.atan2(p[1], p[0]);
  let best = 0, bd = 9;
  for (let i = 0; i < N; i++) {
    const d = Math.abs(((((a - ang(i)) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    if (d < bd) { bd = d; best = i; }
  }
  return AXES[best];
}
