import type { PartOfDay } from '../../domain/dates';
import type { RegionId } from '../../ui/light';
import { fromOklch, mixVivid, toOklch } from './oklch';

/**
 * Walk's scenes in layered dusk (look pass, board four): one system, not one drawing per case.
 *  - the region gives the land's shapes (three flat layers) and its own colours, and what stands on it;
 *  - the hour gives the sky, the light and how far the land is pulled toward that light;
 *  - the theme tints the sky (festive.ts).
 * Everything here is plain data and paths, drawn in a 360 × 230 frame by Layered.tsx.
 */

export const W = 360;
export const H = 230;
/** The land runs past both edges, so the layers can drift a few units without showing a gap. */
const X0 = -24;
const X1 = W + 24;

/** The sky at each hour, top to horizon, as board four drew it. */
export const SKY: Record<PartOfDay, [string, string, string]> = {
  dawn: ['#3a3470', '#e9a0a0', '#f6d6a8'],
  day: ['#3f6fb0', '#8fc3e0', '#e8efe0'],
  dusk: ['#2a1f5c', '#e9735b', '#f2c46d'],
  night: ['#070a22', '#1c1c4c', '#3a2a5c'],
};

/** The hour's own land, far to near, as board four drew it: the light every region is pulled toward. */
const HOUR_LAND: Record<PartOfDay, [string, string, string]> = {
  dawn: ['#8a5a86', '#5a3a6c', '#2a1c40'],
  day: ['#6f8fb0', '#4f6a8c', '#2c3c5a'],
  dusk: ['#7a3f6e', '#4a2a5c', '#241838'],
  night: ['#26245a', '#1a1a44', '#0e0f2a'],
};

/** How much of the region's own colour survives each hour: most by day, least at night. */
const OWN: Record<PartOfDay, number> = { day: 0.72, dawn: 0.5, dusk: 0.46, night: 0.3 };

/** The sun or moon: where it stands and its colour. */
export const ORB: Record<PartOfDay, { x: number; y: number; r: number; ink: string }> = {
  dawn: { x: 70, y: 132, r: 26, ink: '#fff2d8' },
  day: { x: 262, y: 46, r: 24, ink: '#fffbe8' },
  dusk: { x: 262, y: 118, r: 28, ink: '#ffe9c0' },
  night: { x: 290, y: 44, r: 12, ink: '#f3efe4' },
};

/** The lit road: gold by day, steps green by night (board four). */
export const ROAD: Record<PartOfDay, string> = { dawn: '#f2c46d', day: '#f2c46d', dusk: '#f2c46d', night: '#8fdcb6' };

export type Profile = 'flat' | 'rolling' | 'dune' | 'mesa' | 'plateau' | 'peaks' | 'snow' | 'sea';
export type Tree = 'acacia' | 'palm' | 'conifer' | 'broadleaf' | 'round' | 'none';
export type Extra = 'fields' | 'rims' | 'strata' | 'mist' | 'glints' | 'sail' | 'terraces';

export interface LandShape {
  /** Far, mid and near: each layer's profile and how tall its bumps run. */
  layers: [[Profile, number], [Profile, number], [Profile, number]];
  /** The region's colours at full day, far to near. */
  inks: [string, string, string];
  tree: Tree;
  extras: Extra[];
  name: string;
}

/** Nine regions, each recognisable by its outline first and its colour second. */
export const LANDS: Record<RegionId, LandShape> = {
  plains: { name: 'the plains', layers: [['rolling', 6], ['flat', 3], ['flat', 4]], inks: ['#b4cc7c', '#79a454', '#3f6a3c'], tree: 'round', extras: ['fields'] },
  desert: { name: 'the desert', layers: [['dune', 24], ['dune', 15], ['dune', 8]], inks: ['#f6cf88', '#ee9e6c', '#bd5f62'], tree: 'acacia', extras: ['rims'] },
  ravines: { name: 'the ravines', layers: [['mesa', 14], ['mesa', 20], ['rolling', 6]], inks: ['#ec9c84', '#cc6266', '#7e3052'], tree: 'acacia', extras: ['rims'] },
  deccan: { name: 'the Deccan', layers: [['plateau', 22], ['plateau', 11], ['rolling', 5]], inks: ['#e2bb6a', '#a17cb4', '#4f3f78'], tree: 'acacia', extras: ['strata'] },
  ghats: { name: 'the Ghats', layers: [['rolling', 48], ['rolling', 24], ['rolling', 8]], inks: ['#86d6a2', '#3fa676', '#1f5c4c'], tree: 'palm', extras: ['mist'] },
  coast: { name: 'the coast', layers: [['sea', 0], ['dune', 6], ['rolling', 4]], inks: ['#7fdcdc', '#e8cf96', '#2b7a6c'], tree: 'palm', extras: ['glints', 'sail'] },
  east: { name: 'the east', layers: [['rolling', 12], ['flat', 4], ['flat', 3]], inks: ['#9fd07a', '#c4e070', '#3d8250'], tree: 'broadleaf', extras: ['terraces'] },
  northeast: { name: 'the north-east', layers: [['rolling', 40], ['rolling', 26], ['rolling', 10]], inks: ['#80c4c0', '#3f9090', '#1f5260'], tree: 'conifer', extras: ['mist'] },
  himalaya: { name: 'the mountains', layers: [['snow', 74], ['peaks', 34], ['rolling', 10]], inks: ['#eaf0fa', '#96aed6', '#3e5684'], tree: 'conifer', extras: [] },
};

/** Where each layer's skyline sits, far to near. */
export const BASE: [number, number, number] = [146, 170, 194];

/** The three land colours for a region at an hour: the region's own inks pulled toward the hour's light. */
export function landInks(region: RegionId, part: PartOfDay): [string, string, string] {
  const own = LANDS[region].inks;
  const hour = HOUR_LAND[part];
  const k = OWN[part];
  const mixed = own.map((c, i) =>
    // By day the land keeps its own hue (only its light changes), so sand never turns green under a blue sky.
    toOklch(mixVivid(hour[i], c, k, part === 'day')),
  );
  // Far lighter, near darker, at every hour: the bands always recede. Chroma is held calm in low light.
  const cap = { day: 0.16, dawn: 0.13, dusk: 0.13, night: 0.09 }[part];
  let ceiling = 1;
  return mixed.map(([L, C, Hh], i) => {
    const l = Math.min(L + [0.03, 0, -0.03][i], ceiling);
    ceiling = l - 0.07;
    return fromOklch(Math.max(0.12, l), Math.min(C, cap), Hh);
  }) as [string, string, string];
}

export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const f1 = (n: number) => Math.round(n * 10) / 10;
const close = (d: string) => `${d} V${H} H${X0} Z`;

export interface Skyline {
  d: string;
  /** Lit edges: mesa and plateau tops, dune crests. */
  rims: string;
  /** Snow caps on the peaks. */
  snow: string;
  /** The height of the skyline at a few x, for standing trees on. */
  at: (x: number) => number;
}

/** A skyline from beyond the left edge to beyond the right, around height y. */
export function skyline(kind: Profile, y: number, amp: number, rnd: () => number): Skyline {
  const pts: [number, number][] = [];
  let d = '';
  let rims = '';
  let snow = '';
  if (kind === 'sea' || kind === 'flat') {
    const n = 6;
    for (let i = 0; i <= n; i++) pts.push([X0 + ((X1 - X0) * i) / n, y - (kind === 'sea' ? 0 : amp * rnd())]);
    d = `M${X0} ${f1(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1];
      const [x, yy] = pts[i];
      d += ` C${f1((px + x) / 2)} ${f1(py)} ${f1((px + x) / 2)} ${f1(yy)} ${f1(x)} ${f1(yy)}`;
    }
  } else if (kind === 'mesa' || kind === 'plateau') {
    // Flat tops at a few heights, cut by gullies (mesa) or stepped down in ledges (plateau).
    let x = X0;
    let h = y - amp * 0.5;
    d = `M${X0} ${f1(h)}`;
    while (x < X1) {
      const top = Math.min(X1, x + (kind === 'plateau' ? 70 + rnd() * 70 : 30 + rnd() * 46));
      d += ` H${f1(top)}`;
      rims += `M${f1(x + 2)} ${f1(h)} H${f1(top - 2)} `;
      pts.push([x, h], [top, h]);
      if (top >= X1) break;
      const next = y - amp * (kind === 'plateau' ? 0.2 + rnd() * 0.8 : rnd());
      if (kind === 'mesa') {
        const g = 6 + rnd() * 6;
        d += ` L${f1(top + g / 2)} ${f1(Math.max(h, next) + 8 + rnd() * 6)} L${f1(top + g)} ${f1(next)}`;
        x = top + g;
      } else {
        // A slope down or up with one ledge, like the Deccan's stepped traps.
        const run = 16 + rnd() * 10;
        const mid = (h + next) / 2;
        d += ` L${f1(top + run * 0.45)} ${f1(mid)} H${f1(top + run * 0.6)} L${f1(top + run)} ${f1(next)}`;
        x = top + run;
      }
      h = next;
    }
  } else {
    const n = kind === 'dune' ? 3 : kind === 'rolling' ? (amp > 20 ? 4 : 5) : kind === 'snow' ? 4 : 6;
    const step = (X1 - X0) / (n * 2);
    for (let i = 0; i <= n * 2; i++) {
      const x = X0 + i * step + (i === 0 || i === n * 2 ? 0 : (rnd() - 0.5) * step * 0.6);
      const up = i % 2 === 1;
      pts.push([x, up ? y - amp * (0.5 + rnd() * 0.5) : y - amp * rnd() * 0.25]);
    }
    d = `M${X0} ${f1(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1];
      const [x, yy] = pts[i];
      if (kind === 'peaks' || kind === 'snow') {
        d += ` L${f1(x)} ${f1(yy)}`;
        if (kind === 'snow' && i % 2 === 1) {
          const cap = (py - yy) * 0.34;
          const lx = x - (x - px) * 0.34;
          const rx = x + step * 0.34;
          snow += `M${f1(lx)} ${f1(yy + cap)} L${f1(x)} ${f1(yy)} L${f1(rx)} ${f1(yy + cap * 0.9)} L${f1((x + rx) / 2)} ${f1(yy + cap * 0.6)} L${f1(x)} ${f1(yy + cap * 1.1)} L${f1((x + lx) / 2)} ${f1(yy + cap * 0.7)} Z `;
        }
      } else if (kind === 'dune') {
        // Dunes: a long windward slope and a short steep lee, the crest lit.
        const cx = isUp(i) ? px + (x - px) * 0.8 : px + (x - px) * 0.2;
        d += ` Q${f1(cx)} ${f1(isUp(i) ? yy : py)} ${f1(x)} ${f1(yy)}`;
        if (isUp(i)) rims += `M${f1(px + (x - px) * 0.45)} ${f1(yy + (py - yy) * 0.3)} Q${f1(cx)} ${f1(yy)} ${f1(x)} ${f1(yy)} `;
      } else {
        const mx = (px + x) / 2;
        d += ` C${f1(mx)} ${f1(py)} ${f1(mx)} ${f1(yy)} ${f1(x)} ${f1(yy)}`;
      }
    }
  }
  const at = (x: number) => {
    if (!pts.length) return y;
    for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      return ay + ((by - ay) * (x - ax)) / Math.max(1, bx - ax);
    }
    return pts[pts.length - 1][1];
  };
  return { d: close(d), rims, snow, at };
}

const isUp = (i: number) => i % 2 === 1;

/** A region's three skylines, always the same for the same region. */
export function skylinesFor(region: RegionId, seed: number): [Skyline, Skyline, Skyline] {
  const rnd = seeded(seed * 977 + 31);
  const L = LANDS[region].layers;
  return [skyline(L[0][0], BASE[0], L[0][1], rnd), skyline(L[1][0], BASE[1], L[1][1], rnd), skyline(L[2][0], BASE[2], L[2][1], rnd)];
}

/** The road, from the bottom left up to where the walker stands (board four). */
export const ROAD_PATH = 'M118 236 Q166 206 190 192 T214 176';
/** Where the walker stands, and the milestone. */
export const WALKER_AT: [number, number] = [214, 178];
export const STONE_AT: [number, number] = [64, 192];

/** Today's walked share of the road in view, which stands for 40 km: brighter the more you walked. */
export function todayShare(todayKm: number): number {
  return Math.max(0, Math.min(1, Math.sqrt(Math.max(0, todayKm) / 40)));
}

/** The landmark ahead grows as you near it: small from 60 km out, full size on arrival. */
export function approachScale(kmToNext: number | undefined): number {
  if (kmToNext === undefined) return 1;
  return 0.55 + 0.45 * (1 - Math.min(1, kmToNext / 60));
}
