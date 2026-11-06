// Tier-relative ratings (spec §6.3): a value is shown against the division's average.
import { clamp, type Tier } from './types';

export const TIER_AVG: Record<Tier, number> = { 6: 7, 5: 9, 4: 11, 3: 13, 2: 15.5, 1: 18 };
/** Typical real values a side in each tier plays at, used by calibration. */
export const TIER_TYPICAL: Record<Tier, number> = { 6: 8, 5: 10, 4: 12, 3: 14, 2: 16, 1: 18 };

export const shownRating = (real: number, tier: Tier) => clamp(Math.round(10 + 2 * (real - TIER_AVG[tier])), 1, 20);
export const band = (v: number): 1 | 2 | 3 | 4 => (v <= 5 ? 1 : v <= 10 ? 2 : v <= 15 ? 3 : 4);
