// Old Selves in world 2 (ledger O38, spec 2026-11-14 §8): only months with real data, no stand-ins. Each is rated by
// the level rule (the median of the month's real nights) and plays in the division its rating falls in, taking a
// real club's place; that club waits in the outside pool. At most seven; the weakest retires to the Old Selves Cup.
import { parityRating } from '../engine';
import { AXES, type Axis } from '../types';
import { monthName, type MonthData, type OldSelf } from '../oldSelves';
import { typicalNight } from './level';
import { divisionForRating, PYRAMID, type Division } from './shape';

export const OLD_MAX = 7;
/** Real nights a month needs to become an Old Self (the level rule's minimum). */
export const OLD_MIN_NIGHTS = 7;
/** The club ids Old Selves play under (league.json keeps a club for each). */
export const OLD_IDS = ['os1', 'os2', 'os3', 'os4', 'os5', 'os6', 'os7'];
const NICK: Record<Axis, string> = { Pace: 'The Walkers', Power: 'The Lifters', Fuel: 'The Cooks', Rest: 'The Sleepers', Routine: 'The Regulars', Shape: 'The Measured' };

export function oldSelfFrom2(m: MonthData, id: string): OldSelf | undefined {
  const typ = typicalNight(m.values);
  if (!typ || m.values.length < OLD_MIN_NIGHTS) return undefined;
  const best = AXES.reduce((b, a) => (typ[a] > typ[b] ? a : b), AXES[0]);
  const rating = Math.round(parityRating(typ));
  return { id, tier: divisionForRating(rating) as OldSelf['tier'], name: `AFC ${monthName(m.month)}`, nickname: NICK[best], rating, month: m.month, best, standIn: false, values: typ };
}

/**
 * A season's turn: every finished month with real data not yet seen joins (oldest first), then while there are more
 * than seven the weakest retires (on a tie, the older month). `seen` holds months already in or retired.
 */
export function rollOldSelves2(current: OldSelf[], months: MonthData[], seen: string[]): { kept: OldSelf[]; joined: OldSelf[]; retired: OldSelf[] } {
  const taken = new Set(current.map((o) => o.id));
  const free = OLD_IDS.filter((id) => !taken.has(id));
  const fresh: OldSelf[] = [];
  for (const m of [...months].sort((a, b) => a.month.localeCompare(b.month))) {
    if (seen.includes(m.month) || current.some((o) => o.month === m.month)) continue;
    const o = oldSelfFrom2(m, `new:${m.month}`);
    if (o) fresh.push(o);
  }
  const pool = [...current, ...fresh];
  const retired: OldSelf[] = [];
  while (pool.length > OLD_MAX) {
    const i = pool.reduce((w, o, k) => (o.rating < pool[w].rating || (o.rating === pool[w].rating && (o.month ?? '') < (pool[w].month ?? '')) ? k : w), 0);
    retired.push(pool.splice(i, 1)[0]);
  }
  // Ids: those retiring free theirs first, then the newcomers take the free ones in order.
  const ids = [...free, ...retired.filter((o) => taken.has(o.id)).map((o) => o.id)];
  const joined = pool.filter((o) => o.id.startsWith('new:')).map((o, i) => ({ ...o, id: ids[i] }));
  return { kept: pool.filter((o) => !o.id.startsWith('new:')), joined, retired: retired.filter((o) => !o.id.startsWith('new:')) };
}

interface Seat { id: string; tier: number; rating: number; pool?: boolean; old?: OldSelf; folded?: boolean }
/**
 * Seat the turn in the world. A retiring Old Self's place goes to the pool club rated nearest that division's band;
 * a joining one takes the place of the real club in its division rated nearest it, which goes to the pool. Every
 * division keeps its size. `isReal` says which clubs may be displaced (never Brabo or another Old Self). Every Old Self id
 * has a seat in `clubs`; one not in use is folded.
 */
export function seatOldSelves<T extends Seat>(clubs: T[], turn: { joined: OldSelf[]; retired: OldSelf[] }, isReal: (c: T) => boolean, poolDiv: Division): T[] {
  let out = clubs.map((c) => ({ ...c }));
  const nearestPool = (d: Division) => {
    const [lo, hi] = PYRAMID[d - 1].band;
    const dist = (r: number) => Math.max(lo - r, r - hi, 0);
    return out.filter((c) => c.pool && isReal(c)).sort((a, b) => dist(a.rating) - dist(b.rating) || b.rating - a.rating || a.id.localeCompare(b.id))[0];
  };
  for (const o of turn.retired) {
    const seat = out.find((c) => c.id === o.id);
    if (!seat || seat.pool) continue;
    const d = seat.tier;
    const inc = nearestPool(d);
    // The retired Old Self's seat is put away (folded) until a newer month takes it; it never plays in the pool.
    out = out.map((c) => (c.id === o.id ? { ...c, folded: true, pool: false, tier: poolDiv, old: undefined } : inc && c.id === inc.id ? { ...c, pool: false, tier: d } : c));
  }
  for (const o of turn.joined) {
    const d = o.tier as Division;
    const there = out.filter((c) => !c.pool && c.tier === d && isReal(c));
    const gone = there.sort((a, b) => Math.abs(a.rating - o.rating) - Math.abs(b.rating - o.rating) || a.rating - b.rating || a.id.localeCompare(b.id))[0];
    out = out.map((c) => (c.id === o.id ? { ...c, pool: false, folded: false, tier: d, rating: o.rating, old: o } : gone && c.id === gone.id ? { ...c, pool: true, tier: poolDiv } : c));
  }
  return out;
}
