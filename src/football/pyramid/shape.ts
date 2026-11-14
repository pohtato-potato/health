// The league rebuilt around peers (ledger O38, spec 2026-11-14 §5, §9): eight divisions of 12. The world version on
// the save is the one switch: absent or 1 is the old world (six divisions of 18, 42 days); 2 is the new one. Every
// rule that differs reads the shape from here, never a hard-coded count.
import { TIER_BANDS, TIER_NAMES } from '../data/load';
import { TIERS, type Tier } from '../types';

export type WorldVersion = 1 | 2;
/** The world a save or a season plays in. Absent means the old world. */
export const worldOf = (x: { world?: WorldVersion } | undefined | null): WorldVersion => (x?.world === 2 ? 2 : 1);

/**
 * A division number: 1 is the top. In world 1 it is the old tier (1–6); in world 2 it runs 1–8. Stored in the same
 * places the tier always was (`tierOf`, `FbClub.tier`), so old code keeps reading it; anything keyed to six tiers goes
 * through `stageOf` first.
 */
export type Division = number;

export interface DivisionDef { no: Division; name: string; band: [number, number] }
/** World 2's pyramid (spec §5, bands rebalanced 14 Nov after the placing simulation; decision 2a for the names). */
export const PYRAMID: DivisionDef[] = [
  { no: 1, name: 'The Crown League', band: [99, 104] },
  { no: 2, name: 'Division Two', band: [94, 99] },
  { no: 3, name: 'Division Three', band: [88, 93] },
  { no: 4, name: 'Division Four', band: [83, 88] },
  { no: 5, name: 'Division Five', band: [77, 82] },
  { no: 6, name: 'Division Six', band: [72, 77] },
  { no: 7, name: 'Division Seven', band: [67, 72] },
  { no: 8, name: 'Division Eight', band: [62, 67] },
];
/** Clubs in a world-2 division. */
export const DIVISION_SIZE = 12;
/** The outside pool's place in a `tierOf` map or on an `FbClub`: one below the last division. Never a league. */
export const POOL = PYRAMID.length + 1;

export interface WorldShape {
  world: WorldVersion;
  /** Divisions, top first. Typed as Tier for the old code that indexes by it; in world 2 they run past 6. */
  divisions: Tier[];
  size: number;
  name: (d: Division) => string;
  band: (d: Division) => [number, number];
}
const W1: WorldShape = {
  world: 1, divisions: TIERS, size: 18,
  name: (d) => TIER_NAMES[String(d)], band: (d) => TIER_BANDS[String(d)],
};
const W2: WorldShape = {
  world: 2, divisions: PYRAMID.map((p) => p.no as Tier), size: DIVISION_SIZE,
  name: (d) => PYRAMID[d - 1]?.name ?? 'The clubs abroad', band: (d) => PYRAMID[d - 1]?.band ?? [0, PYRAMID[PYRAMID.length - 1].band[0]],
};
export const shapeOf = (x: { world?: WorldVersion } | undefined | null): WorldShape => (worldOf(x) === 2 ? W2 : W1);
export const lastDivision = (x: { world?: WorldVersion } | undefined | null) => shapeOf(x).divisions.length;

/**
 * Spec §9: one mapping from a world-2 division to the old six tiers ("stages"), so kit slots, the ground, crest steps,
 * income, sponsors, loan fees, the tree and cup-run levels keep their six-step tables.
 */
const STAGE: Record<number, Tier> = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 6 };
export const stageOf = (d: Division): Tier => STAGE[d] ?? 6;
/** The stage for a division in either world: world 1's tiers are their own stage. */
export const stageIn = (x: { world?: WorldVersion } | undefined | null, d: Division): Tier => (worldOf(x) === 2 ? stageOf(d) : (d as Tier));

/** The division a rating falls in (world 2): the highest whose band starts at or below it; below the bottom, Eight. */
export function divisionForRating(rating: number): Division {
  for (const p of PYRAMID) if (rating >= p.band[0]) return p.no;
  return PYRAMID[PYRAMID.length - 1].no;
}
/** A club kept inside its division's band (spec §7: "clipped to the band's edge while it stays in that division"). */
export function clipToBand(rating: number, d: Division): number {
  const p = PYRAMID[d - 1];
  if (!p) return rating;
  return Math.max(p.band[0], Math.min(p.band[1], rating));
}
