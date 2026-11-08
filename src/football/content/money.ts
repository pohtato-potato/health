// Money numbers for engine 2 (spec §12, §16): gate money, sponsors, wages and buy-back prices.
// Amounts are in millions of euros, like money.ts and ground.ts. They were drafted against a real
// logging history (a 41-day backup), so that a careful season affords one staff wage plus one
// building stage in every division. Only the resulting constants live here; no personal numbers.
import { incomeFor } from '../money';
import { LEAGUE } from '../data/load';
import type { Tier } from '../types';
import type { Rarity } from './types';

/**
 * A careful season: about what a steady logger manages in 42 days, rounded down. Building stages
 * and journeys are sized so that one stage's needs fit inside it.
 */
export const CAREFUL_SEASON = { logged: 38, steps: 35, training: 20, sleep: 24, bedtime: 16, protein: 21, kcal: 18, meds: 30, youth: 12 } as const;

/** One wage unit a season, by division. Wages rise more slowly than income, so a growing staff stays affordable as the club climbs. */
export const WAGE_UNIT: Record<Tier, number> = { 6: 0.04, 5: 0.1, 4: 0.25, 3: 0.6, 2: 1.5, 1: 3.75 };
export const wage = (units: number, tier: Tier) => Math.round(units * WAGE_UNIT[tier] * 1000) / 1000;
/** Wages are paid at season end from that season's income. Staff the budget can't cover go on leave (their effect pauses) until it can. No debt. */
export const UNPAID_STAFF = 'on-leave' as const;

/**
 * Gate money per fan per home league match, in euros: the season's gate in league.json `income`
 * spread over 17 home matches at the division's typical crowd (ground.ts `attendance`).
 */
export const GATE_PER_FAN: Record<Tier, number> = { 6: 7, 5: 16, 4: 34, 3: 70, 2: 136, 1: 294 };
export const HOME_LEAGUE_MATCHES = 17;

/** New sponsor slots from the tree, as a share of the shirt deal's range for the division. */
export const SPONSOR_SHARE = { sleeve: 0.4, partner: 0.25, abroad: 0.5 } as const;

/** Buy-back clause (spec §6): wage units at today's division, by the card's best tier. Never expires. */
export const BUYBACK_UNITS: Record<Rarity, number> = { bronze: 1, silver: 2, gold: 3, prism: 5, icon: 8, legend: 12 };
export const buyBack = (card: Rarity, tier: Tier) => wage(BUYBACK_UNITS[card], tier);

/** A stable shirt deal for the division: the low end of the range, as `offers` prices a stable brand. */
export function stableShirt(tier: Tier): number {
  const row = (LEAGUE.income as unknown as Record<string, { shirt: [number, number] }>)[String(tier)];
  return Math.round((row.shirt[0] + (row.shirt[1] - row.shirt[0]) * 0.2) * 1000) / 1000;
}
/** A careful season's income: mid-table (9th), no promotion, one stable shirt sponsor, a full ground share. */
export const carefulIncome = (tier: Tier) => incomeFor(tier, 9, false, stableShirt(tier), 1);
