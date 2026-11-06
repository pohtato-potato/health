// The ground and the Kaai quarter (spec §8.9; stadium design §4).
// Bundles count only day or week totals from Health. They never read when anything was logged.
import { addDays, type DayKey } from '../domain/dates';
import type { AxisInput } from './axes';
import { keptOn } from './contracts';
import { AXES, type BraboAbility, type Tier } from './types';

export type Need = 'steps' | 'training' | 'sleep' | 'protein' | 'bedtime' | 'meds' | 'kcal' | 'youth' | 'none';
export type Place = 'kaai' | 'shop' | 'cafe' | 'academy' | 'training' | 'museum' | 'ferry';
export interface BundleDef {
  id: string;
  name: string;
  place: Place;
  /** What opens it: a tier reached, bundles done, or the move to Kaai 42. */
  tier?: Tier;
  after?: string[];
  moved?: boolean;
  needs: { what: Need; count: number }[];
  money: number;
  effect: string;
  /** A teasing line, shown while it's still sealed. */
  tease: string;
  capacity?: number;
  /** Days the building is shut while this stage is built. */
  downtime?: number;
}

export const BUNDLES: BundleDef[] = [
  { id: 'plot', name: 'The plot at the quay', place: 'kaai', tier: 5, needs: [{ what: 'steps', count: 20 }], money: 0.15, effect: 'Building can start. Kaai 42 appears on the map.', tease: 'A fenced-off patch of quay with a sign nobody reads.' },
  { id: 'kaai-stand', name: 'Kaai Stand', place: 'kaai', after: ['plot'], needs: [{ what: 'steps', count: 30 }, { what: 'training', count: 12 }], money: 0.4, effect: 'The main stand, with the dressing rooms. Moving day is possible.', tease: 'Somewhere to change that isn’t the landlords’ spare room.', capacity: 2500 },
  { id: 'river-end', name: 'River End', place: 'kaai', moved: true, needs: [{ what: 'sleep', count: 20 }], money: 0.6, effect: 'Home terrace: +1 on every test in the last 15 minutes at home.', tease: 'Somewhere to stand and sing with the river at your back.', capacity: 2000 },
  { id: 'crane-stand', name: 'Crane Stand', place: 'kaai', moved: true, tier: 4, needs: [{ what: 'protein', count: 25 }], money: 1.2, effect: 'More seats, more gate money.', tease: 'The old crane has been staring at the pitch for years.', capacity: 3000 },
  { id: 'dock-end', name: 'Dock End', place: 'kaai', moved: true, tier: 3, needs: [{ what: 'bedtime', count: 20 }], money: 2, effect: 'The away end. Away fans sing back.', tease: 'An empty end, for now.', capacity: 2500 },
  { id: 'floodlights', name: 'Floodlights', place: 'kaai', moved: true, needs: [{ what: 'training', count: 10 }], money: 0.3, effect: 'Night-match light at home.', tease: 'Four tall shadows on the quay.' },
  { id: 'roof', name: 'The roof', place: 'kaai', after: ['kaai-stand', 'river-end', 'crane-stand', 'dock-end'], needs: [{ what: 'kcal', count: 20 }], money: 3, effect: 'No weather at home.', tease: 'Rain, mostly, until then.' },
  { id: 'scoreboard', name: 'Scoreboard', place: 'kaai', moved: true, needs: [{ what: 'meds', count: 14 }], money: 0.2, effect: 'A big ground scoreboard on home nights.', tease: 'A blank wall facing the main stand.' },
  { id: 'physio', name: 'Physio room', place: 'kaai', moved: true, needs: [{ what: 'meds', count: 21 }], money: 0.5, effect: 'A missed medicine day only knocks after three missed days.', tease: 'A room with a bench and a kettle.' },
  // The quarter: optional overhauls, each a stage on a building.
  { id: 'shop-1', name: 'Kiosk', place: 'shop', needs: [{ what: 'none', count: 0 }], money: 0.05, effect: 'Scarves by the gate.', tease: 'A hatch in a wall.' },
  { id: 'shop-2', name: 'Club shop', place: 'shop', moved: true, after: ['shop-1'], needs: [], money: 0.25, effect: '+10% gate money. Kit-wall kits go on sale.', tease: 'Somewhere to buy last season’s shirt.' },
  { id: 'shop-3', name: 'Megastore', place: 'shop', tier: 3, after: ['shop-2'], needs: [{ what: 'steps', count: 20 }], money: 1, effect: '+10% more gate money.', tease: 'Bigger windows.', downtime: 14 },
  { id: 'cafe-1', name: 'Burger van', place: 'cafe', needs: [{ what: 'steps', count: 5 }], money: 0.02, effect: 'By the away gate.', tease: 'Something smells good by the away gate.' },
  { id: 'cafe-2', name: 'Supporters’ café', place: 'cafe', moved: true, after: ['cafe-1'], needs: [{ what: 'steps', count: 10 }], money: 0.1, effect: 'A little home crowd noise.', tease: 'Somewhere to wait out the rain.' },
  { id: 'cafe-3', name: 'River-terrace bar', place: 'cafe', tier: 3, after: ['cafe-2'], needs: [{ what: 'sleep', count: 15 }], money: 0.4, effect: 'Crowd noise, and tables on the water.', tease: 'Chairs stacked by the river.', downtime: 7 },
  { id: 'academy-1', name: 'Portakabin', place: 'academy', needs: [{ what: 'youth', count: 5 }], money: 0.05, effect: 'Somewhere for the youngsters.', tease: 'A cabin on bricks.' },
  { id: 'academy-2', name: 'Academy building', place: 'academy', tier: 4, after: ['academy-1'], needs: [{ what: 'youth', count: 15 }], money: 0.8, effect: 'Youngsters arrive with one more star of potential.', tease: 'Classrooms, eventually.' },
  { id: 'academy-3', name: 'Campus', place: 'academy', tier: 2, after: ['academy-2'], needs: [{ what: 'youth', count: 30 }], money: 3, effect: 'A full youth campus.', tease: 'A whole block, one day.', downtime: 42 },
  { id: 'training-1', name: 'Park pitch', place: 'training', needs: [{ what: 'training', count: 5 }], money: 0.02, effect: 'Somewhere to train.', tease: 'The council pitch, bookable on Tuesdays.' },
  { id: 'training-2', name: 'Training ground', place: 'training', tier: 4, after: ['training-1'], needs: [{ what: 'training', count: 20 }], money: 1, effect: 'Youngsters reach the bench 25% sooner.', tease: 'Our own grass.' },
  { id: 'training-3', name: 'Performance centre', place: 'training', tier: 2, after: ['training-2'], needs: [{ what: 'training', count: 40 }], money: 4, effect: 'Glass and machines.', tease: 'Plans on a desk.', downtime: 28 },
  { id: 'museum-1', name: 'Trophy cabinet', place: 'museum', moved: true, needs: [{ what: 'none', count: 0 }], money: 0.03, effect: 'Somewhere to put the silverware.', tease: 'An empty shelf.' },
  { id: 'museum-2', name: 'Museum', place: 'museum', tier: 2, after: ['museum-1'], needs: [{ what: 'steps', count: 30 }], money: 1.5, effect: 'The club’s story on the walls.', tease: 'Boxes of old programmes.', downtime: 14 },
  { id: 'ferry-1', name: 'A sign on a pole', place: 'ferry', needs: [{ what: 'none', count: 0 }], money: 0.01, effect: 'Ferry this way.', tease: 'A pole.' },
  { id: 'ferry-2', name: 'Matchday pier', place: 'ferry', tier: 3, after: ['ferry-1'], needs: [{ what: 'steps', count: 25 }], money: 0.6, effect: 'Away fans arrive by water.', tease: 'Old posts in the river.', downtime: 7 },
];
export const bundleById = (id: string) => BUNDLES.find((b) => b.id === id)!;
export const PLACES: { id: Place; name: string; x: number; y: number }[] = [
  { id: 'kaai', name: 'Kaai 42', x: 180, y: 96 },
  { id: 'shop', name: 'Club shop', x: 70, y: 70 },
  { id: 'cafe', name: 'Supporters’ café', x: 290, y: 70 },
  { id: 'academy', name: 'Youth academy', x: 60, y: 136 },
  { id: 'training', name: 'Training ground', x: 300, y: 136 },
  { id: 'museum', name: 'Museum', x: 180, y: 30 },
  { id: 'ferry', name: 'Ferry stop', x: 250, y: 190 },
];

export interface BundleState { id: string; progress: Record<string, number>; done?: DayKey }
export interface GroundState { tier: Tier; moved: boolean; done: string[]; budget: number }

/** Open to work on: its tier reached, its bundles done, the move made, and not built yet. */
export function isOpen(b: BundleDef, g: GroundState): boolean {
  if (g.done.includes(b.id)) return false;
  if (b.tier !== undefined && g.tier > b.tier) return false;
  if (b.moved && !g.moved) return false;
  return (b.after ?? []).every((a) => g.done.includes(a));
}

export interface DayTotals { input: AxisInput; medsKept: boolean; youthDays: number; usualBedtime?: number }
/** One day's contribution to each need. Training counts sessions; everything else counts days. */
export function dayCounts(d: DayTotals): Record<Need, number> {
  const asleep = d.input.day?.sleep?.asleep;
  const nearBedtime = asleep !== undefined && d.usualBedtime !== undefined && Math.min(Math.abs(asleep - d.usualBedtime), 1440 - Math.abs(asleep - d.usualBedtime)) <= 30;
  return {
    steps: keptOn('steps', d.input) ? 1 : 0,
    training: d.input.sessionsToday.length,
    sleep: keptOn('sleep', d.input) ? 1 : 0,
    protein: d.input.foodLogged && d.input.protein >= d.input.targets.proteinG ? 1 : 0,
    kcal: d.input.foodLogged && d.input.kcal >= d.input.targets.kcalMin && d.input.kcal <= d.input.targets.kcalMax ? 1 : 0,
    bedtime: nearBedtime ? 1 : 0,
    meds: d.medsKept ? 1 : 0,
    youth: d.youthDays,
    none: 0,
  };
}
/** Add a day to a bundle. It completes once every need is met and the budget covers the money. */
export function bundleDay(b: BundleDef, s: BundleState, counts: Record<Need, number>, budget: number, date: DayKey): { state: BundleState; spent: number } {
  if (s.done) return { state: s, spent: 0 };
  const progress = { ...s.progress };
  for (const n of b.needs) progress[n.what] = Math.min(n.count, (progress[n.what] ?? 0) + counts[n.what]);
  const met = b.needs.every((n) => (progress[n.what] ?? 0) >= n.count);
  if (met && budget >= b.money) return { state: { ...s, progress, done: date }, spent: b.money };
  return { state: { ...s, progress }, spent: 0 };
}
/** A building is shut while its newest stage is being built (its downtime after completion). */
export function shutUntil(b: BundleDef, done: DayKey): DayKey | undefined {
  return b.downtime ? addDays(done, b.downtime) : undefined;
}
export function isShut(b: BundleDef, done: DayKey | undefined, date: DayKey): boolean {
  const until = done && shutUntil(b, done);
  return Boolean(until && date >= done! && date < until);
}

export const TENANT_CAPACITY = 1800;
export const capacityOf = (moved: boolean, done: string[]) =>
  moved ? BUNDLES.filter((b) => b.capacity && done.includes(b.id)).reduce((t, b) => t + b.capacity!, 0) : TENANT_CAPACITY;
/** Attendance follows results and tier, up to capacity. */
export function attendance(capacity: number, tier: Tier, form: number, seed: number): number {
  const base = { 6: 900, 5: 1500, 4: 2600, 3: 4200, 2: 6500, 1: 9000 }[tier];
  const wobble = 0.9 + ((seed % 100) / 100) * 0.2;
  return Math.min(capacity, Math.round((base * (0.8 + 0.4 * form) * wobble) / 10) * 10);
}

/** The River End: +1 on every test in the last 15 minutes, at home only. */
export function groundAbilities(done: string[]): BraboAbility[] {
  if (!done.includes('river-end')) return [];
  return AXES.map((a) => ({ id: `river-end:${a}`, name: 'River End', axis: a, d: 1, when: 'home-late' as const }));
}
export const homeGround = (moved: boolean) => (moved ? 'Kaai 42' : 'Stadion aan de Stroom');
