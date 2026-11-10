// Season end (spec §9.1): the top two go up with the playoff winner; the bottom three go down.
import { parityRating } from './engine';
import type { Row } from './table';
import { AXES, TIERS, type AxisValues, type Tier } from './types';

/** Playoff semi-finals: 3rd v 6th and 4th v 5th (one match each, the higher finisher at home). */
export function playoffPairs(table: Row[]): [string, string][] {
  return [[table[2].id, table[5].id], [table[3].id, table[4].id]];
}
/** A double promotion: `id` goes from `from` straight up two, and `swap` (fourth from bottom two divisions up) also goes down. */
export interface DoubleUp { id: string; from: Tier; swap: string; rating: number }
export interface SeasonMoves { up: Partial<Record<Tier, string[]>>; down: Partial<Record<Tier, string[]>>; double?: DoubleUp }

/** Form: the parity rating of the average real (non-rotation) night over the last 28 days. Undefined with no nights. */
export function formRating(nights: AxisValues[]): number | undefined {
  if (!nights.length) return undefined;
  const avg = {} as AxisValues;
  for (const a of AXES) avg[a] = nights.reduce((t, v) => t + v[a], 0) / nights.length;
  return parityRating(avg);
}
/** Fewest real nights in the last 28 days for form to count towards a double promotion. */
export const DOUBLE_MIN_NIGHTS = 14;

/**
 * Brabo's double promotion (11 Nov, O29 5a): the champions of Division Three or below go up two divisions when their
 * form over the last 28 days (at least DOUBLE_MIN_NIGHTS real nights) is above the top of the next division's rating
 * band: they have outclassed the division they would land in. The title alone is not enough, and neither is form alone.
 */
export function doubleUp(tables: Record<Tier, Row[]>, id: string, tier: Tier, form: number | undefined, nights: number, bands: Record<string, [number, number]>): DoubleUp | undefined {
  if (tier < 3 || tables[tier]?.[0]?.id !== id || form == null || nights < DOUBLE_MIN_NIGHTS) return undefined;
  const [, top] = bands[String(tier - 1)];
  if (form <= top) return undefined;
  const above = tables[(tier - 2) as Tier];
  return { id, from: tier, swap: above[above.length - 4].id, rating: Math.round(form) };
}

/** Who moves. `playoffWinners[t]` is the club that won tier t's playoff final. Tier 1 has no promotion; tier 6 no relegation. */
export function seasonEnd(tables: Record<Tier, Row[]>, playoffWinners: Partial<Record<Tier, string>>, double?: DoubleUp): SeasonMoves {
  const up: SeasonMoves['up'] = {}, down: SeasonMoves['down'] = {};
  for (const t of TIERS) {
    const tb = tables[t];
    if (t > 1) up[t] = [tb[0].id, tb[1].id, playoffWinners[t] ?? tb[2].id];
    if (t < 6) down[t] = tb.slice(-3).map((r) => r.id);
  }
  // Every division keeps 18: the club fourth from bottom where the champions land drops with the bottom three.
  if (double) down[(double.from - 2) as Tier] = [double.swap, ...(down[(double.from - 2) as Tier] ?? [])];
  return { up, down, ...(double ? { double } : {}) };
}
/** Apply the moves to a tier map. Every tier keeps 18 clubs. */
export function applyMoves(tierOf: Record<string, Tier>, moves: SeasonMoves): Record<string, Tier> {
  const out = { ...tierOf };
  for (const [t, ids] of Object.entries(moves.up)) for (const id of ids!) out[id] = (Number(t) - 1) as Tier;
  for (const [t, ids] of Object.entries(moves.down)) for (const id of ids!) out[id] = (Number(t) + 1) as Tier;
  if (moves.double) out[moves.double.id] = (moves.double.from - 2) as Tier;
  return out;
}
/** Where a club goes at a season's end: the tier it lands in. */
export const landsIn = (moves: Pick<SeasonMoves, 'up' | 'down' | 'double'>, id: string, from: Tier): Tier =>
  moves.double?.id === id ? (from - 2) as Tier : moves.up[from]?.includes(id) ? (from - 1) as Tier : moves.down[from]?.includes(id) ? (from + 1) as Tier : from;
