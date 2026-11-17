// The roll (O44): a stored chance becomes the ball's path across the radar. Presentation only: the engine's stored
// landing and result are the truth; the path always ends exactly on the landing, and the same seed always rolls the
// same way. Units are the radar's own (rim radius 1, centre 0,0). One point per frame at 60 frames a second.
import { hashSeed, rng } from '../../../football/rng';
import type { Pt } from '../../../football/radar';
import type { ChanceEvent } from '../../../football/types';

export const FPS = 60;
/** The rim's flat sides sit at cos 30° from the centre; the ball (radius about 0.08) bounces off them. */
const INRADIUS = Math.cos(Math.PI / 6);
const WALL = INRADIUS - 0.08;
/** Outward normals of the rim's six flat sides (the spokes run through the corners, Pace at the top). */
const NORMALS: Pt[] = Array.from({ length: 6 }, (_, k) => {
  const a = -Math.PI / 2 + Math.PI / 6 + (k * Math.PI) / 3;
  return [Math.cos(a), Math.sin(a)];
});

/** Where each kind of chance comes in from, as a point outside the rim (a through ball from the right, a cross from the left…). */
const FROM: Record<string, Pt> = {
  'Through ball': [1.9, 1.1],
  'Counter-attack': [-0.4, 1.9],
  'Set piece': [1.9, -0.9],
  'Tap-in': [0.5, 0.6],
  'Long shot': [-0.2, -2.0],
  'Cross into the box': [-1.9, -0.4],
  'Corner': [-1.9, 1.0],
  'Break through the middle': [0, 1.9],
  'Scramble in the box': [-0.5, -0.5],
  'Long-range effort': [0.3, 2.0],
};
export const entryFrom = (c: Pick<ChanceEvent, 'type' | 'side'>): Pt => FROM[c.type] ?? [c.side === 'atk' ? 1.6 : -1.6, 1.2];

export interface Roll {
  /** The ball's place each frame; the last is the stored landing. */
  path: Pt[];
  /** Frames where the ball bounces (off the rim, or the late deflection). */
  hits: number[];
  /** Whether this roll ends in the goal-line close-up. */
  close: boolean;
  ms: number;
}

const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const turn = ([x, y]: Pt, j: number): Pt => [x * Math.cos(j) - y * Math.sin(j), x * Math.sin(j) + y * Math.cos(j)];
const smoother = (u: number) => u * u * u * (u * (u * 6 - 15) + 10);

/** One simulated roll from the rim: speed decays, the ball bounces off the rim's sides, some take a late kick. */
function simulate(start: Pt, dir: Pt, n: number, secs: number, dist: number, kickAt: number | null, kickTurn: number, jit: () => number) {
  const k = 3.4 / secs;
  const v0 = (dist * k) / (1 - Math.exp(-k * secs));
  let p: Pt = [...start], v: Pt = [...dir];
  const raw: Pt[] = [], hits: number[] = [];
  for (let i = 0; i < n; i++) {
    let s = (v0 * Math.exp((-k * i) / FPS)) / FPS;
    if (kickAt !== null && i >= kickAt) {
      s += ((v0 * 0.22) / FPS) * Math.exp((-5 * (i - kickAt)) / FPS);
      if (i === kickAt) { v = turn(v, kickTurn); hits.push(i); }
    }
    p = [p[0] + v[0] * s, p[1] + v[1] * s];
    for (const nrm of NORMALS) {
      const over = dot(p, nrm) - WALL;
      if (over <= 0) continue;
      const vn = dot(v, nrm);
      if (vn > 0) v = turn([v[0] - 2 * vn * nrm[0], v[1] - 2 * vn * nrm[1]], jit());
      p = [p[0] - over * nrm[0], p[1] - over * nrm[1]];
      if (hits[hits.length - 1] !== i) hits.push(i);
    }
    raw.push(p);
  }
  return { raw, hits };
}

/**
 * The ball's path for one shot. `seed` should come from the match and the chance (and which try, for a retake);
 * `close` asks for the goal-line roll: more bounces, longer, ending in the close-up.
 */
export function roll(c: Pick<ChanceEvent, 'type' | 'side'>, land: Pt, seed: number, close: boolean): Roll {
  const r = rng(seed);
  const secs = close ? 5 + r() : 3.6 + r();
  const bounces = close ? 6 + Math.floor(r() * 2) : 4 + Math.floor(r() * 2);
  const n = Math.round(secs * FPS);
  const kick = r() < 1 / 3;
  const kickAt = kick ? Math.round(n * (0.6 + r() * 0.08)) : null;
  const kickTurn = (r() < 0.5 ? -1 : 1) * (1.4 + r() * 0.8);
  const [fx, fy] = entryFrom(c);
  const a0 = Math.atan2(fy, fx);
  const start: Pt = [Math.cos(a0) * WALL * 0.98, Math.sin(a0) * WALL * 0.98];
  // A handful of seeded tries; keep the one that naturally ends nearest the landing, so the final pull is gentle.
  let best: ReturnType<typeof simulate> | undefined, bestGap = Infinity;
  for (let t = 0; t < 10; t++) {
    const a = a0 + Math.PI + (r() - 0.5) * 1.4;
    const seedT = Math.floor(r() * 2 ** 31);
    const jr = rng(seedT);
    const sim = simulate(start, [Math.cos(a), Math.sin(a)], n, secs, (bounces + 1) * 1.15, kickAt, kickTurn, () => (jr() - 0.5) * 0.6);
    const end = sim.raw[n - 1];
    const gap = Math.hypot(end[0] - land[0], end[1] - land[1]);
    if (gap < bestGap) { best = sim; bestGap = gap; }
  }
  const { raw, hits } = best!;
  const [ex, ey] = raw[n - 1];
  const dx = land[0] - ex, dy = land[1] - ey;
  const path = raw.map(([x, y], i): Pt => {
    if (i === n - 1) return [land[0], land[1]];
    const u = i / (n - 1);
    const e = smoother(Math.min(1, Math.max(0, (u - 0.5) / 0.5)));
    return keepIn([x + dx * e, y + dy * e]);
  });
  return { path, hits, close, ms: Math.round((n / FPS) * 1000) };
}

/** Pull a point back inside the rim (the pull toward the landing never carries the ball off the radar). */
function keepIn(p: Pt): Pt {
  let q = p;
  for (const nrm of NORMALS) {
    const over = dot(q, nrm) - INRADIUS * 0.99;
    if (over > 0) q = [q[0] - over * nrm[0], q[1] - over * nrm[1]];
  }
  return q;
}

/** The seed for a shot: the match's seed, the chance's place in the match, and which try (a retake rolls again). */
export const rollSeed = (matchSeed: number, chance: number, retake: boolean) => hashSeed('roll', String(matchSeed), String(chance), retake ? '2' : '1');
