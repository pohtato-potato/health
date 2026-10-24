import { regionAt } from '../domain/regions';
import { ALL_STATES, ALL_STOPS, chapterAt } from '../domain/walk';
import { inksFor } from '../ui/light';
import { STRETCHES } from './content';
import { CITY_POINTS, REGIONS } from './geo';
import { stretchAt } from './road';

type Pt = [number, number];
type Box = [number, number, number, number];

const at = (name: string): Pt => CITY_POINTS[name] ?? [0, 0];

/** Where a km of the main walk is on the India map: between the real places of the stops either side, by km. */
export function pointAtKm(km: number): Pt {
  const k = Math.max(0, km);
  for (let i = 1; i < ALL_STOPS.length; i++) {
    const a = ALL_STOPS[i - 1];
    const b = ALL_STOPS[i];
    if (k <= b.km) {
      const f = b.km === a.km ? 1 : (k - a.km) / (b.km - a.km);
      const [ax, ay] = at(a.name);
      const [bx, by] = at(b.name);
      return [ax + (bx - ax) * f, ay + (by - ay) * f];
    }
  }
  return at(ALL_STOPS[ALL_STOPS.length - 1].name);
}

/** Your trail: every stop passed, then where you are. */
export function trailTo(km: number): Pt[] {
  const passed = ALL_STOPS.filter((s) => s.km <= km).map((s) => at(s.name));
  const here = pointAtKm(km);
  const last = passed[passed.length - 1];
  return last && last[0] === here[0] && last[1] === here[1] ? passed : [...passed, here];
}

/** Your trail leg by leg, as `trailTo` draws it: a leg to a stop reached by boat (or towards one) is a sea leg. */
export function trailLegs(km: number): { points: Pt[]; sea: boolean }[] {
  const passed = ALL_STOPS.filter((s) => s.km <= km);
  const next = ALL_STOPS.find((s) => s.km > km);
  const pts = trailTo(km);
  const legs: { points: Pt[]; sea: boolean }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const sea = !!(i < passed.length ? passed[i].sea : next?.sea);
    const last = legs.at(-1);
    if (last && last.sea === sea) last.points.push(pts[i]);
    else legs.push({ points: [pts[i - 1], pts[i]], sea });
  }
  return legs;
}

/** The flyover needs a trail to fly along. */
export const flyoverAllowed = (km: number) => trailTo(km).length > 1;

/** The rest of the chapter from where you are, leg by leg; a leg to a stop reached by boat is a sea leg. */
export function roadAhead(km: number): { points: Pt[]; sea: boolean }[] {
  const ch = chapterAt(km);
  const ahead = ALL_STOPS.filter((s) => s.km > km && s.km <= ch.end);
  const legs: { points: Pt[]; sea: boolean }[] = [];
  let from = pointAtKm(km);
  for (const s of ahead) {
    const to = at(s.name);
    legs.push({ points: [from, to], sea: !!s.sea });
    from = to;
  }
  return legs;
}

/** A box around some points with room, stretched to the drawing's shape, never smaller than `min` map units. */
function frame(points: Pt[], aspect: number, room = 0.25, min = 30): Box {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let w = Math.max(min, (x1 - x0) * (1 + room * 2));
  let h = Math.max(min, (y1 - y0) * (1 + room * 2));
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h];
}

export type MapLevel = 'stretch' | 'chapter' | 'india';

/**
 * Each level's frame: the stretch you're on (or the road 60 km either side of you, where no stretch is written yet),
 * the chapter's cities, or all of India.
 */
export function levelBox(level: MapLevel, km: number, aspect: number): Box {
  if (level === 'india') return frame([[0, 0], [REGIONS.india.box[2], REGIONS.india.box[3]]], aspect, 0, 30);
  if (level === 'chapter') {
    const ch = chapterAt(km);
    return frame(ALL_STOPS.filter((s) => s.km >= ch.start && s.km <= ch.end).map((s) => at(s.name)), aspect, 0.06);
  }
  const s = stretchAt(km, STRETCHES);
  const [from, to] = s ? [s.fromKm, s.toKm] : [km - 60, km + 60];
  const pts: Pt[] = [];
  for (let k = from; k <= to; k += (to - from) / 8) pts.push(pointAtKm(k));
  pts.push(pointAtKm(km));
  return frame(pts, aspect);
}

/** A state's ink once reached: the first ink of the land the walk enters it through. */
export function stateInk(state: string): string {
  const km = ALL_STATES.find((s) => s.name === state)?.km ?? 0;
  return inksFor(regionAt(km))[0];
}

/** Where a state's name sits: the middle of its outline's bounding box. */
export function labelPoint(path: string): Pt {
  const n = (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0);
  const ys = n.filter((_, i) => i % 2 === 1);
  if (!xs.length) return [0, 0];
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/**
 * The flyover's frame at t (0 to 1): a close frame travelling along the trail from its start, widening in the last
 * fifth to show the whole trail. With one point, that point's frame.
 */
export function flyoverBox(trail: Pt[], t: number, aspect: number): Box {
  const close = (p: Pt) => frame([p], aspect, 0, 40);
  if (trail.length < 2) return close(trail[0] ?? [0, 0]);
  const whole = frame(trail, aspect, 0.1, 40);
  const lens = trail.slice(1).map((p, i) => Math.hypot(p[0] - trail[i][0], p[1] - trail[i][1]));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const travel = Math.min(1, Math.max(0, t) / 0.8);
  let left = travel * total;
  let here: Pt = trail[trail.length - 1];
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i]) {
      const f = lens[i] ? left / lens[i] : 0;
      here = [trail[i][0] + (trail[i + 1][0] - trail[i][0]) * f, trail[i][1] + (trail[i + 1][1] - trail[i][1]) * f];
      break;
    }
    left -= lens[i];
  }
  if (t <= 0.8) return close(here);
  const f = (t - 0.8) / 0.2;
  const c = close(here);
  return [c[0] + (whole[0] - c[0]) * f, c[1] + (whole[1] - c[1]) * f, c[2] + (whole[2] - c[2]) * f, c[3] + (whole[3] - c[3]) * f];
}
