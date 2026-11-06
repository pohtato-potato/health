// Cups as brackets: draws with byes for the strongest, then winners pair off in order.
import { shuffle } from './rng';
import type { Tier } from './types';

export interface Tie { home: string; away: string | null; score?: [number, number]; pens?: [number, number]; winner?: string }
export interface Round { name: string; day: number; ties: Tie[] }
export interface Bracket { id: string; name: string; size: number; rounds: Round[]; winner?: string }
export interface CupClub { id: string; tier: Tier; rating: number }

export const CUPS = {
  bigcup: { name: 'The Big Cup', size: 128, rounds: [['Last 128', 5], ['Last 64', 5], ['Last 32', 16], ['Last 16', 16], ['Quarter-final', 28], ['Semi-final', 34], ['Final', 41]] },
  tiercup: { size: 16, rounds: [['Last 16', 10], ['Quarter-final', 10], ['Semi-final', 22], ['Final', 42]] },
} as const;
/** Which tier cup a tier plays in, and its name. */
export const TIER_CUP: Record<Tier, { id: string; name: string }> = {
  1: { id: 'leaguecup', name: 'The League Cup' }, 2: { id: 'leaguecup', name: 'The League Cup' },
  3: { id: 'lowertrophy', name: 'The Lower Divisions Trophy' }, 4: { id: 'lowertrophy', name: 'The Lower Divisions Trophy' },
  5: { id: 'underdog', name: 'The Underdog Shield' }, 6: { id: 'underdog', name: 'The Underdog Shield' },
};

/**
 * Draw a bracket of `size` slots. The strongest get the byes; everyone else is drawn at random.
 * A bye is a tie with `away: null`, already won.
 */
export function draw(id: string, name: string, clubs: CupClub[], size: number, schedule: readonly (readonly [string, number])[], r: () => number): Bracket {
  const byes = Math.max(0, size - clubs.length);
  const ranked = [...clubs].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id));
  const seeded = ranked.slice(0, byes);
  const rest = shuffle(r, ranked.slice(byes));
  const ties: Tie[] = [];
  for (const s of seeded) ties.push({ home: s.id, away: null, winner: s.id });
  for (let i = 0; i + 1 < rest.length; i += 2) ties.push({ home: rest[i].id, away: rest[i + 1].id });
  const order = shuffle(r, ties);
  return { id, name, size, rounds: [{ name: schedule[0][0], day: schedule[0][1], ties: order }, ...schedule.slice(1).map(([n, d]) => ({ name: n, day: d, ties: [] }))] };
}
/** The Big Cup: every club enters, the top 20 by rating skip the last 128. */
export const drawBigCup = (clubs: CupClub[], r: () => number) => draw('bigcup', CUPS.bigcup.name, clubs, CUPS.bigcup.size, CUPS.bigcup.rounds, r);
/** A tier cup takes 16 clubs from its two tiers: Brabo when it belongs, then the highest-rated. */
export function drawTierCup(tierPair: Tier, clubs: CupClub[], own: string, r: () => number): Bracket {
  const cup = TIER_CUP[tierPair];
  const pool = clubs.filter((c) => TIER_CUP[c.tier].id === cup.id);
  const mine = pool.filter((c) => c.id === own);
  const others = pool.filter((c) => c.id !== own).sort((a, b) => b.rating - a.rating).slice(0, 16 - mine.length);
  return draw(cup.id, cup.name, [...mine, ...others], CUPS.tiercup.size, CUPS.tiercup.rounds, r);
}
/** Record results for the current round and fill the next round with its winners, in order. */
export function advance(b: Bracket, roundIdx: number, results: Record<string, { score: [number, number]; pens?: [number, number] }>): Bracket {
  const rounds = b.rounds.map((x) => ({ ...x, ties: x.ties.map((t) => ({ ...t })) }));
  const cur = rounds[roundIdx];
  for (const t of cur.ties) {
    if (!t.away || t.winner) continue;
    const res = results[`${t.home}-${t.away}`];
    if (!res) continue;
    t.score = res.score; t.pens = res.pens;
    const [a, c] = res.score, [pa, pc] = res.pens ?? [0, 0];
    t.winner = a > c || (a === c && pa > pc) ? t.home : t.away;
  }
  const winners = cur.ties.map((t) => t.winner).filter(Boolean) as string[];
  const out: Bracket = { ...b, rounds };
  if (winners.length === cur.ties.length) {
    if (roundIdx + 1 < rounds.length) {
      const next: Tie[] = [];
      for (let i = 0; i + 1 < winners.length; i += 2) next.push({ home: winners[i], away: winners[i + 1] });
      rounds[roundIdx + 1].ties = next;
    } else out.winner = winners[0];
  }
  return out;
}
/** The rounds from the last 16 on, the part drawn as a bracket. */
export const bracketFrom16 = (b: Bracket) => b.rounds.slice(b.rounds.findIndex((x) => x.name === 'Last 16'));
/** A drawn tie goes to penalties; the stronger side is a little likelier to win them. */
export function penalties(ra: number, rb: number, r: () => number): [number, number] {
  const a = 3 + Math.floor(r() * 3), b = 3 + Math.floor(r() * 3);
  if (a !== b) return [a, b];
  return r() < 0.5 + (ra - rb) / 400 ? [a + 1, b] : [a, b + 1];
}
export const roundOn = (b: Bracket, day: number) => b.rounds.map((x, i) => [x, i] as const).filter(([x]) => x.day === day);
