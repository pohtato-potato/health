// The cup record book and what a run pays (spec §11). Pure. Every run counts for the book, paid or not: furthest stop
// in each cup, fastest win, biggest scoreline, clubs beaten, combinations landed. Only the first run that ends each day
// pays: research (1 for every two stops cleared, 5 for winning the cup, paid in full; any other run capped below a good league day) and an album
// card for reaching the final. Bond points and fog wait for the desk and the atlas (seams only).
import type { DayKey } from '../../domain/dates';
import { LESSON, LOGGED_DAY } from '../tree/research';
import type { RunSummary } from './run';

export interface CupRecord {
  /** Most stops cleared in one run of this cup. */
  furthest: number;
  /** Runs of this cup won. */
  won: number;
  runs: number;
  /** The quickest cup win, in cards played across the whole run. */
  fastest?: number;
}
export interface CupBook {
  id: 'book';
  cups: Record<number, CupRecord>;
  biggest?: { for: number; against: number; club: string; cup: number };
  beaten: string[];
  combos: Record<string, number>;
  /** The days a run has already paid. */
  paid: DayKey[];
  runs: number;
}
export const emptyBook = (): CupBook => ({ id: 'book', cups: {}, beaten: [], combos: {}, paid: [], runs: 0 });

/** A good league day: a win and a logged day. A run pays less than that. */
export const GOOD_DAY = LESSON.W + LOGGED_DAY;
export const PAY = { perTwoStops: 1, cupWin: 5, cap: GOOD_DAY - 1 };

export interface Pay { research: number; album: boolean; why: string }

/** What a run ending today pays: only the first run to end each day. */
export function payFor(book: CupBook, s: RunSummary, today: DayKey): Pay {
  if (book.paid.includes(today)) return { research: 0, album: false, why: 'A run already paid today. This one still counts for the record book.' };
  const raw = Math.floor(s.stopsCleared / 2) * PAY.perTwoStops + (s.result === 'won' ? PAY.cupWin : 0);
  // A run that wins its cup pays the cup's full 5 (owner, 12 Nov); any other run stays below a good league day.
  const research = Math.min(s.result === 'won' ? PAY.cupWin : PAY.cap, raw);
  return { research, album: s.reachedFinal, why: `The first run to end today: ${research} research${s.reachedFinal ? ' and an album card for reaching the final' : ''}.` };
}

/** The book after a run, and whether it broke a record. */
export function record(book0: CupBook, s: RunSummary, today: DayKey, paid: boolean): { book: CupBook; news: string[] } {
  const book: CupBook = JSON.parse(JSON.stringify(book0));
  const news: string[] = [];
  const c = book.cups[s.cup] ?? { furthest: 0, won: 0, runs: 0 };
  c.runs++;
  if (s.stopsCleared > c.furthest) { if (c.runs > 1) news.push('Furthest yet in this cup'); c.furthest = s.stopsCleared; }
  if (s.result === 'won') {
    c.won++;
    if (c.fastest == null || s.stats.cards < c.fastest) { if (c.fastest != null) news.push('Fastest win of this cup'); c.fastest = s.stats.cards; }
  }
  book.cups[s.cup] = c;
  const b = s.stats.biggest;
  if (b && (!book.biggest || b.for - b.against > book.biggest.for - book.biggest.against)) { if (book.biggest) news.push(`Biggest scoreline: ${b.for}–${b.against}`); book.biggest = { ...b, cup: s.cup }; }
  for (const id of s.stats.beaten) if (!book.beaten.includes(id)) book.beaten.push(id);
  for (const [k, v] of Object.entries(s.stats.combos)) book.combos[k] = (book.combos[k] ?? 0) + v;
  book.runs++;
  if (paid && !book.paid.includes(today)) book.paid = [...book.paid, today].slice(-30);
  return { book, news };
}

/** Cups open: the first, and each one after a cup won. */
export const cupsOpen = (book: CupBook | undefined, total = 12): number => {
  let n = 1;
  while (n < total && (book?.cups[n]?.won ?? 0) > 0) n++;
  return n;
};
