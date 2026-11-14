// World 2's season end (ledger O38, spec 2026-11-14 §7 "Moving", decision 4a): the top two go up with the winner of a
// playoff between 3rd and 6th; the bottom three go down, Brabo included. Brabo's level check can add one step the same
// way, never against the table. Division Eight's bottom three swap with the outside pool. Replaces `doubleUp`.
import type { Row } from '../table';
import { PYRAMID, type Division } from './shape';

/**
 * After a title: over this simulated win rate in the division it lands in (the one above), go up two. LG-4 (15 Nov)
 * corrected both checks to the spec's wording: LG-3 read the rate in the division beyond the landing one.
 */
export const LEVEL_UP = 0.55;
/** After relegation: under this simulated win rate in the division it lands in (the one below), go down two. */
export const LEVEL_DOWN = 0.25;

/** Brabo moved one extra step by the level check, and the club that moved the other way to make room. */
export interface LevelMove { id: string; from: Division; to: Division; dir: 'up' | 'down'; swap: string; rate: number }
export interface Moves2 {
  up: Partial<Record<Division, string[]>>;
  down: Partial<Record<Division, string[]>>;
  level?: LevelMove;
  /** Out of Division Eight to the pool, and in from the pool. */
  pool: { out: string[]; in: string[] };
}
export interface EndOpts {
  own: string;
  /** The outside pool, with ratings. */
  pool: { id: string; rating: number }[];
  /** Brabo's simulated win rate (0–1) in a division, for the level check. Absent: no check. */
  rateIn?: (d: Division) => number;
}

/** Pool clubs rated nearest a band: by distance to it, then the higher rating, then the id. */
export function poolSwapIn(pool: { id: string; rating: number }[], band: [number, number], n: number): string[] {
  const dist = (r: number) => Math.max(band[0] - r, r - band[1], 0);
  return [...pool].sort((a, b) => dist(a.rating) - dist(b.rating) || b.rating - a.rating || a.id.localeCompare(b.id)).slice(0, n).map((c) => c.id);
}

export function seasonEnd2(tables: Record<Division, Row[]>, playoffWinners: Partial<Record<Division, string>>, o: EndOpts): Moves2 {
  const divs = Object.keys(tables).map(Number).sort((a, b) => a - b);
  const last = divs[divs.length - 1];
  const up: Moves2['up'] = {}, down: Moves2['down'] = {};
  for (const d of divs) {
    const tb = tables[d];
    if (d > divs[0]) up[d] = [tb[0].id, tb[1].id, playoffWinners[d] ?? tb[2].id];
    if (d < last) down[d] = tb.slice(-3).map((r) => r.id);
  }
  // The bottom of the pyramid: three out to the pool. Brabo never leave it; the club above them goes instead.
  const bottom = tables[last].map((r) => r.id).filter((id) => id !== o.own).slice(-3);
  const pool = { out: bottom, in: poolSwapIn(o.pool, PYRAMID[last - 1]?.band ?? [0, 0], bottom.length) };

  let level: LevelMove | undefined;
  const home = divs.find((d) => tables[d].some((r) => r.id === o.own));
  if (home !== undefined && o.rateIn) {
    const tb = tables[home];
    const pos = tb.findIndex((r) => r.id === o.own);
    if (pos === 0 && home - 2 >= divs[0]) {
      const to = home - 2, rate = o.rateIn(home - 1);
      if (rate > LEVEL_UP) {
        // Room is made by the best finisher there not already going down: fourth from bottom.
        const swap = tables[to].map((r) => r.id).filter((id) => !(down[to] ?? []).includes(id)).pop()!;
        level = { id: o.own, from: home, to, dir: 'up', swap, rate };
      }
    } else if ((down[home] ?? []).includes(o.own) && home + 2 <= last) {
      const to = home + 2, rate = o.rateIn(home + 1);
      if (rate < LEVEL_DOWN) {
        // Room is made by the best finisher there not already going up.
        const swap = tables[to].map((r) => r.id).find((id) => !(up[to] ?? []).includes(id))!;
        level = { id: o.own, from: home, to, dir: 'down', swap, rate };
      }
    }
  }
  return { up, down, pool, ...(level ? { level } : {}) };
}

/** Where a club in division `from` lands. */
export function landsIn2(m: Pick<Moves2, 'up' | 'down' | 'level'>, id: string, from: Division): Division {
  if (m.level?.id === id) return m.level.to;
  if (m.level?.swap === id) return m.level.dir === 'up' ? from + 1 : from - 1;
  if (m.up[from]?.includes(id)) return from - 1;
  if (m.down[from]?.includes(id)) return from + 1;
  return from;
}
/** The new division of every league club. Clubs going out to the pool leave the map; clubs coming in join the bottom. */
export function applyMoves2(divOf: Record<string, Division>, m: Moves2): Record<string, Division> {
  const out: Record<string, Division> = {};
  const last = Math.max(...Object.values(divOf));
  for (const [id, d] of Object.entries(divOf)) if (!m.pool.out.includes(id)) out[id] = landsIn2(m, id, d);
  for (const id of m.pool.in) out[id] = last;
  return out;
}
