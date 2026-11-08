// The eleven in 4-3-3 and tonight's axis value (spec §7, §8, §16).
import { AXES, clamp, type Axis, type AxisValues } from '../types';
import type { Unit, XiPlace } from './types';

/** Places per unit in each formation (spec §7). Only 4-3-3 is open at the start; the tree opens the rest (layer 3). */
export const FORMATIONS: Record<'4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2', Record<Unit, number>> = {
  '4-3-3': { Rest: 2, Shape: 2, Routine: 2, Fuel: 2, Pace: 2, Power: 1 },
  '4-4-2': { Rest: 2, Shape: 2, Routine: 2, Fuel: 1, Pace: 2, Power: 2 },
  '4-2-3-1': { Rest: 2, Shape: 2, Routine: 1, Fuel: 2, Pace: 2, Power: 2 },
  '3-5-2': { Rest: 2, Shape: 2, Routine: 1, Fuel: 2, Pace: 2, Power: 2 },
};
export type Formation = keyof typeof FORMATIONS;
export const OPEN_FORMATIONS: Formation[] = ['4-3-3'];

/** Where each place stands on the pitch (x, y in 0–100, own goal at the bottom), in the round-six drawing's order. */
export const PLACES_433: Record<Unit, { place: string; x: number; y: number }[]> = {
  Rest: [{ place: 'Keeper', x: 50, y: 92 }, { place: 'Centre-back', x: 37, y: 74 }],
  Shape: [{ place: 'Centre-back', x: 63, y: 74 }, { place: 'Right-back', x: 87, y: 69 }],
  Routine: [{ place: 'Left-back', x: 13, y: 69 }, { place: 'Midfield', x: 50, y: 51 }],
  Fuel: [{ place: 'Midfield', x: 22, y: 46 }, { place: 'Midfield', x: 78, y: 46 }],
  Pace: [{ place: 'Left wing', x: 15, y: 19 }, { place: 'Right wing', x: 85, y: 19 }],
  Power: [{ place: 'Striker', x: 50, y: 11 }],
};
/** Unit colours from the round-six drawing; every unit also carries its name, so colour is never the only signal. */
export const UNIT_COLOUR: Record<Unit, string> = { Pace: '#8fdcb6', Power: '#ff9a76', Fuel: '#c2b2ff', Rest: '#93c3dc', Routine: '#f4aedb', Shape: '#d9e8f3' };
/** Where a unit plays (spec §2). */
export const UNIT_WHERE: Record<Unit, string> = { Pace: 'wings', Power: 'attack', Fuel: 'midfield', Routine: 'midfield and full-back', Shape: 'defence', Rest: 'goal and centre-back' };
/** A unit short of players: its best covers the extra place at 90%. */
export const COVER = 0.9;
/** Tonight = 70% today, 30% squad (spec §8). */
export const TODAY_SHARE = 0.7;

export interface SquadMember { id: string; unit: Unit; name: string; rating: number; /** Exercises: their exercise ids. */ refs?: string[] }

/**
 * The starters of one unit: your team-sheet pick (layer 2) when it names players still in the squad, else the highest
 * match ratings. A short unit's best covers the extra places at 90%.
 */
export function startersOf(unit: Unit, members: SquadMember[], places: number, pick?: string[]): XiPlace[] {
  const pool = members.filter((m) => m.unit === unit).sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  if (!pool.length) return [];
  const picked = (pick ?? []).map((id) => pool.find((m) => m.id === id)).filter((m): m is SquadMember => Boolean(m));
  const order = [...picked, ...pool.filter((m) => !picked.includes(m))];
  const spots = PLACES_433[unit];
  return Array.from({ length: places }, (_, i) => {
    const m = order[i] ?? order[0];
    const cover = i >= order.length;
    return { player: m.id, unit, place: spots[i]?.place ?? spots[0].place, name: m.name, rating: Math.round(cover ? m.rating * COVER : m.rating) };
  });
}
export function elevenOf(members: SquadMember[], formation: Formation = '4-3-3', picks: Partial<Record<Unit, string[]>> = {}): XiPlace[] {
  return AXES.flatMap((u) => startersOf(u, members, FORMATIONS[formation][u], picks[u]));
}
/** The bench: every squad player not starting. On a sick day they play (the rotation squad). */
export function benchOf(members: SquadMember[], xi: XiPlace[], formation: Formation = '4-3-3'): XiPlace[] {
  const starting = new Set(xi.map((x) => x.player));
  const rest = members.filter((m) => !starting.has(m.id));
  // A unit with nobody on the bench is played by its starters.
  return AXES.flatMap((u) => startersOf(u, rest.some((m) => m.unit === u) ? rest : members, FORMATIONS[formation][u]));
}
/** Squad share of an axis, 1–20: the starters' average match rating ÷ 5. Undefined when the unit has no players. */
export function squadValues(xi: XiPlace[]): Partial<AxisValues> {
  const out: Partial<AxisValues> = {};
  for (const a of AXES) {
    const xs = xi.filter((x) => x.unit === a);
    if (xs.length) out[a] = clamp(xs.reduce((t, x) => t + x.rating, 0) / xs.length / 5, 1, 20);
  }
  return out;
}
/** Base = 0.7 × today + 0.3 × squad, rounded and clamped. A unit with no players plays on today alone. */
export function blend(today: AxisValues, squad: Partial<AxisValues>, todayShare = TODAY_SHARE): AxisValues {
  const out = {} as AxisValues;
  for (const a of AXES as Axis[]) out[a] = clamp(Math.round(squad[a] == null ? today[a] : todayShare * today[a] + (1 - todayShare) * squad[a]!), 1, 20);
  return out;
}
