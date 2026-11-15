// World 2's cups (ledger O38, spec 2026-11-14 §6 "Meeting stronger clubs"). The Big Cup is drawn openly "up": each
// round, the lowest clubs are drawn first and each is paired with a club from a higher division while one is left;
// Brabo are drawn first of all, so they play up until they go out. It fills 128 places from the 96 clubs and the
// outside pool, with byes for the highest-rated when the pool is short. The pair cup replaces the tier cups: Brabo's
// division and the one above, 24 clubs, the top eight by rating given byes. Neither pays league points.
import { BIGCUP_DAYS_2, PAIRCUP_DAYS } from '../calendar';
import { draw, type Bracket, type CupClub, type Tie } from '../cups';
import { shuffle } from '../rng';
import { shapeOf, type Division } from './shape';

export const BIGCUP_SIZE = 128;
export const PAIRCUP_ID = 'paircup';
const schedule = (days: Record<number, string[]>) => Object.entries(days).flatMap(([d, rs]) => rs.map((n) => [n, Number(d)] as const));
export const BIGCUP_ROUNDS_2 = schedule(BIGCUP_DAYS_2);
export const PAIRCUP_ROUNDS = schedule(PAIRCUP_DAYS);

/**
 * Pair the clubs by the "up" rule. `own` (Brabo) first; then the lowest-placed club left, with a random club from a
 * strictly higher division if any is left, else any club left. The lower side is at home. Seeded by `r`.
 */
export function drawUp(ids: string[], divOf: (id: string) => Division, r: () => number, own?: string): Tie[] {
  let left = shuffle(r, [...ids].sort());
  const ties: Tie[] = [];
  const take = (id: string) => {
    left = left.filter((x) => x !== id);
    const higher = left.filter((x) => divOf(x) < divOf(id));
    const pool = higher.length ? higher : left;
    if (!pool.length) return;
    const opp = pool[Math.floor(r() * pool.length)];
    left = left.filter((x) => x !== opp);
    ties.push({ home: id, away: opp });
  };
  if (own && left.includes(own)) take(own);
  while (left.length > 1) {
    const lowest = Math.max(...left.map(divOf));
    take(left.find((x) => divOf(x) === lowest)!);
  }
  return ties;
}

/** The Big Cup: every league club and the pool's best, 128 places; byes for the highest-rated if fewer enter. */
export function drawBigCup2(league: CupClub[], pool: CupClub[], own: string, r: () => number): Bracket {
  const pick = [...pool].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)).slice(0, Math.max(0, BIGCUP_SIZE - league.length));
  const all = [...league, ...pick];
  const divOf = new Map(all.map((c) => [c.id, c.tier as number]));
  const byes = Math.max(0, BIGCUP_SIZE - all.length);
  const ranked = [...all].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id));
  const seeded = ranked.slice(0, byes).filter((c) => c.id !== own);
  const rest = all.filter((c) => !seeded.includes(c)).map((c) => c.id);
  const ties: Tie[] = [...seeded.map((c) => ({ home: c.id, away: null, winner: c.id })), ...drawUp(rest, (id) => divOf.get(id)!, r, own)];
  const [first, ...later] = BIGCUP_ROUNDS_2;
  return { id: 'bigcup', name: 'The Big Cup', size: BIGCUP_SIZE, rounds: [{ name: first[0], day: first[1], ties }, ...later.map(([n, d]) => ({ name: n, day: d, ties: [] }))] };
}
/** After a round is complete and `advance` has filled the next, that next round is drawn again by the up rule. */
export function redrawUp(b: Bracket, ri: number, divOf: (id: string) => Division, r: () => number, own: string): Bracket {
  const round = b.rounds[ri];
  if (!round || round.ties.some((t) => t.score || (t.winner && t.away))) return b;
  const ids = round.ties.flatMap((t) => [t.home, t.away]).filter(Boolean) as string[];
  if (ids.length < 2) return b;
  const rounds = b.rounds.map((x, i) => (i === ri ? { ...x, ties: drawUp(ids, divOf, r, own) } : x));
  return { ...b, rounds };
}

/** The pair of divisions Brabo's pair cup is for: its own and the one above (the Crown League pairs with Two). */
export const pairOf = (d: Division): [Division, Division] => (d <= 1 ? [1, 2] : [d - 1, d]);
export const pairCupName = (d: Division, world: { world?: 1 | 2 } = { world: 2 }) => {
  const [a, b] = pairOf(d), s = shapeOf(world);
  return `The Pair Cup: ${s.name(a)} and ${s.name(b)}`;
};
/** Brabo's pair cup: the 24 clubs of its division and the one above; the top eight by rating skip the first round. */
export function drawPairCup(ownDiv: Division, clubs: CupClub[], r: () => number): Bracket {
  const [a, b] = pairOf(ownDiv);
  const field = clubs.filter((c) => c.tier === a || c.tier === b);
  return draw(PAIRCUP_ID, pairCupName(ownDiv), field, 32, PAIRCUP_ROUNDS, r);
}
