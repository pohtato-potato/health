// How other clubs change in world 2 (ledger O38, spec 2026-11-14 §7, decision 7a): by the table, at most 2 points
// either way by finish; by the world, the lore events of world.ts (takeovers, sales, fallen giants, record signings)
// kept; and every club clipped to its division's band while it stays there, so divisions stay narrow. Brabo and the
// Old Selves never drift: Brabo's level comes from its nights, an Old Self's from its month.
import type { RatingChange } from '../world';
import { clipToBand, type Division } from './shape';

/** The table's push on a club's rating by its finish: 1st +2, 2nd and 3rd +1, the bottom three −1, last −2. */
export function finishDrift(pos: number, size: number): number {
  if (pos === 1) return 2;
  if (pos <= 3) return 1;
  if (pos === size) return -2;
  if (pos > size - 3) return -1;
  return 0;
}
/** Finish drift for every club in the tables (positions 1-based by order). `skip`: Brabo and the Old Selves. */
export function tableDrift(tables: Record<Division, { id: string }[]>, skip: (id: string) => boolean): RatingChange[] {
  const out: RatingChange[] = [];
  for (const rows of Object.values(tables)) rows.forEach((r, i) => {
    const d = finishDrift(i + 1, rows.length);
    if (d && !skip(r.id)) out.push({ id: r.id, d, why: 'finish' });
  });
  return out;
}
/**
 * Every change added up, then each club kept inside the band of the division it plays in next season. Clubs not in a
 * division (the outside pool) take their changes unclipped, within 40 to 104. Skipped clubs are left exactly as they are.
 */
export function settle2<T extends { id: string; rating: number }>(clubs: T[], changes: RatingChange[], divisionOf: (id: string) => Division | undefined, skip: (id: string) => boolean): T[] {
  const net = new Map<string, number>();
  for (const ch of changes) net.set(ch.id, (net.get(ch.id) ?? 0) + ch.d);
  return clubs.map((c) => {
    if (skip(c.id)) return c;
    const raw = c.rating + (net.get(c.id) ?? 0);
    const d = divisionOf(c.id);
    const rating = d === undefined ? Math.max(40, Math.min(104, raw)) : clipToBand(raw, d);
    return rating === c.rating ? c : { ...c, rating };
  });
}
