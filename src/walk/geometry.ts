import type { RouteDef } from './catalogue';
import { ROUTE_LINES } from './geo';

type Pt = [number, number];

function lengths(line: Pt[]): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i++) out.push(out[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  return out;
}

/** The point a share of the way along a drawn line (0 is the start, 1 the end). */
export function along(line: Pt[], frac: number): Pt {
  const cum = lengths(line);
  const total = cum[cum.length - 1];
  const want = Math.max(0, Math.min(1, frac)) * total;
  for (let i = 1; i < line.length; i++) {
    if (want <= cum[i]) {
      const f = cum[i] === cum[i - 1] ? 0 : (want - cum[i - 1]) / (cum[i] - cum[i - 1]);
      return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * f, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * f];
    }
  }
  return line[line.length - 1];
}

/** How far along the drawn line a point of it is, as a share of the whole. */
export function lineFracAtIndex(line: Pt[], i: number): number {
  const cum = lengths(line);
  return cum[Math.max(0, Math.min(i, line.length - 1))] / (cum[cum.length - 1] || 1);
}

/**
 * The share of a route's drawn line you've reached at this km. The drawing and the real road differ in length, so
 * the dot is pinned to the places: it sits on a place exactly when you reach it, and moves evenly in km between.
 */
export function fracAtKm(def: Pick<RouteDef, 'id' | 'km' | 'places'>, km: number): number {
  const line = ROUTE_LINES[def.id]?.line;
  if (!line || def.km <= 0) return 0;
  const anchors: [number, number][] = [[0, 0], ...def.places.map((p): [number, number] => [p.km, lineFracAtIndex(line, p.at)]), [def.km, 1]];
  anchors.sort((a, b) => a[0] - b[0]);
  const k = Math.max(0, Math.min(def.km, km));
  for (let i = 1; i < anchors.length; i++) {
    const [k0, f0] = anchors[i - 1];
    const [k1, f1] = anchors[i];
    if (k <= k1) return k1 === k0 ? f1 : f0 + ((k - k0) / (k1 - k0)) * (f1 - f0);
  }
  return 1;
}
