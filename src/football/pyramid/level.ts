// Brabo's level and placing (ledger O38, spec 2026-11-14 §7, decision 3a). The level is what its matches are worth
// as played: the typical real night of the last 28 days (the median of each value, rotation nights left out) with
// the bonuses it would carry tonight. Placing simulates that night against every division on fixed seeds and picks
// the division whose win rate is nearest 40%, the lower one on a tie. The same simulation is the level check's rate.
// Pure: the store gathers the nights and the bonuses (store/play.ts `levelNightIn`).
import { playMatch, type MatchInput } from '../engine';
import { modsFromStyle, reachFor, type Opponent } from '../opponent';
import { AXES, type Axis, type AxisValues, type BraboAbility } from '../types';
import type { Division } from './shape';

/** Real nights wanted in the window; with fewer, the nights there are, and the owner is told. */
export const LEVEL_MIN_NIGHTS = 7;
/** The window the level looks at, in days. */
export const LEVEL_DAYS = 28;
/** The win rate placing aims at. */
export const PLACE_TARGET = 0.4;
/** Seeded matches per club when a division is simulated: 11 clubs × 40 = 440 a division. */
export const LEVEL_SEEDS_PER_CLUB = 40;

/** The median of each value over the nights. Undefined with none. */
export function typicalNight(nights: AxisValues[]): AxisValues | undefined {
  if (!nights.length) return undefined;
  const out = {} as AxisValues;
  for (const a of AXES) {
    const xs = nights.map((v) => v[a]).sort((x, y) => x - y);
    const mid = xs.length >> 1;
    out[a] = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  }
  return out;
}

/** Brabo's level: the typical night and what it carries tonight. */
export interface LevelNight {
  values: AxisValues;
  /** Real nights the median came from (fewer than LEVEL_MIN_NIGHTS: say so). */
  nights: number;
  captain?: Axis;
  stack: number;
  abilities: BraboAbility[];
}
/** Any club the simulation meets: only its rating and style matter (no abilities, as in the 14 Nov simulation). */
export interface SimClub { id: string; rating: number; style: string }
export interface Rate { w: number; d: number; l: number; n: number }

const opponentOf = (c: SimClub): Opponent => ({ id: c.id, rating: c.rating, reach: reachFor(c.rating), ...modsFromStyle(c.rating, c.style), abilities: [] });

/**
 * The level night against a division's clubs: `perClub` seeded matches against each, home and away in turn. The seeds
 * are fixed, so the same night against the same clubs always gives the same rate. The night is its own typical shape,
 * so history adds nothing either way.
 */
export function winRate(night: LevelNight, clubs: SimClub[], perClub = LEVEL_SEEDS_PER_CLUB): Rate {
  let w = 0, d = 0, l = 0;
  const opps = [...clubs].sort((a, b) => a.id.localeCompare(b.id)).map(opponentOf);
  for (let k = 0; k < perClub; k++) for (let j = 0; j < opps.length; j++) {
    const i = k * opps.length + j;
    const input: MatchInput = {
      seed: 3001 + i * 7919, values: night.values, typical: night.values, opp: opps[j], home: i % 2 === 0,
      captain: night.captain, stack: night.stack, abilities: night.abilities, bench: [], pre: [], conds: [], parity: 2,
    };
    const [a, b] = playMatch(input).score;
    if (a > b) w++; else if (a === b) d++; else l++;
  }
  const n = w + d + l;
  return { w: n ? w / n : 0, d: n ? d / n : 0, l: n ? l / n : 0, n };
}

/** The division whose win rate is nearest the target; on a tie, the lower division (the larger number). */
export function placeDivision(rates: Partial<Record<Division, number>>, target = PLACE_TARGET): Division {
  const ds = Object.keys(rates).map(Number).sort((a, b) => b - a); // lowest division first, so it wins ties
  let best = ds[0], gap = Infinity;
  for (const d of ds) {
    // Rates are compared to the nearest tenth of a point, so float noise never breaks a real tie.
    const g = Math.round(Math.abs(rates[d]! - target) * 1000);
    if (g < gap) { gap = g; best = d; }
  }
  return best;
}

export interface Placing { division: Division; rates: Partial<Record<Division, Rate>>; nights: number; short: boolean }
/**
 * Place Brabo: simulate the level night against every division (its clubs, Brabo left out) and take the one nearest
 * 40%. With no real night at all there is nothing to simulate: Brabo starts at the bottom, and the result says so.
 */
export function placeBrabo(night: LevelNight | undefined, divisions: Record<Division, SimClub[]>, perClub = LEVEL_SEEDS_PER_CLUB): Placing {
  const ds = Object.keys(divisions).map(Number).sort((a, b) => a - b);
  if (!night) return { division: ds[ds.length - 1], rates: {}, nights: 0, short: true };
  const rates: Placing['rates'] = {};
  for (const d of ds) rates[d] = winRate(night, divisions[d], perClub);
  const division = placeDivision(Object.fromEntries(ds.map((d) => [d, rates[d]!.w])));
  return { division, rates, nights: night.nights, short: night.nights < LEVEL_MIN_NIGHTS };
}
