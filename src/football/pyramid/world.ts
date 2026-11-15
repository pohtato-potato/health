// Seeding world 2 (ledger O38, spec 2026-11-14 §5, §16): the real clubs, Brabo in the division placing chose and the
// Old Selves of real months, eight divisions of 12, the rest in the outside pool. LG-4 calls this once, at the move.
// What it reads from a club is only { id, rating, style, division }; LG-2's data is adapted to that shape.
import type { OldSelf } from '../oldSelves';
import type { Tier } from '../types';
import { OLD_IDS } from './oldSelves';
import { clipToBand, DIVISION_SIZE, POOL, PYRAMID, type Division } from './shape';

/** A real club as LG-3 reads it. `division` null or absent: the outside pool (spec §5); a number: the pyramid. */
export interface PyramidSeed { id: string; rating: number; style: string; division?: number | null }
export interface SeededClub { id: string; tier: Tier; rating: number; style: string; pool?: boolean; old?: OldSelf; folded?: boolean }

/**
 * Fill the pyramid top down by rating: each division takes 12 less the places Brabo and the Old Selves have there.
 * Pyramid clubs left over join the pool; if they run short, the pool's best fill the last places. Every real club in a division is clipped to its band. Unused Old Self seats
 * are folded. `own` is Brabo's id and `ownDivision` where placing put it.
 */
export function seedWorld2(seeds: PyramidSeed[], own: { id: string; style: string; rating: number }, ownDivision: Division, olds: OldSelf[]): SeededClub[] {
  const byRating = (a: PyramidSeed, b: PyramidSeed) => b.rating - a.rating || a.id.localeCompare(b.id);
  // Pyramid clubs first; if they cannot fill every place, the pool's best come up.
  const pyramid = [...seeds.filter((s) => s.division != null).sort(byRating), ...seeds.filter((s) => s.division == null).sort(byRating)];
  const out: SeededClub[] = [];
  let k = 0;
  for (const p of PYRAMID) {
    const here = olds.filter((o) => o.tier === p.no);
    let room = DIVISION_SIZE - here.length - (ownDivision === p.no ? 1 : 0);
    for (; room > 0 && k < pyramid.length; room--, k++) {
      const s = pyramid[k];
      out.push({ id: s.id, tier: p.no as Tier, rating: clipToBand(s.rating, p.no), style: s.style });
    }
  }
  for (; k < pyramid.length; k++) out.push({ id: pyramid[k].id, tier: POOL as Tier, rating: pyramid[k].rating, style: pyramid[k].style, pool: true });
  out.push({ id: own.id, tier: ownDivision as Tier, rating: own.rating, style: own.style });
  OLD_IDS.forEach((id, i) => {
    const o = olds[i];
    out.push(o ? { id, tier: o.tier, rating: o.rating, style: 'possession', old: { ...o, id } } : { id, tier: POOL as Tier, rating: 0, style: 'possession', folded: true });
  });
  return out;
}

/**
 * LG-4: the real clubs (LG-2's world.json) as seeds. Berchem Sport, the landlords, is a neighbour and never rated
 * into the league or the pool, so it is left out.
 */
export function realSeeds(clubs: readonly { id: string; rating: number; style: string; division: number | null; place: string }[]): PyramidSeed[] {
  return clubs.filter((c) => c.place !== 'neighbour').map((c) => ({ id: c.id, rating: c.rating, style: c.style, division: c.division }));
}
