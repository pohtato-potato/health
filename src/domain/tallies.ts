import { addDays, type DayKey } from './dates';

/**
 * Streaks are gone (O1, 8 Nov). In their place three numbers that a missed day can never take
 * anything away from: the last 28 days, the season so far (which only goes up), and the record
 * book (the best 28 days ever).
 */
export const WINDOW = 28;

export interface Tally {
  /** Hits in the 28 days ending today, today included. */
  last28: number;
  /** Hits since the season started (everything, with no season). */
  season: number;
  /** The best 28 days ever. */
  best28: number;
  /** The last day of that best window. */
  best28End?: DayKey;
  /** Every hit, ever. */
  total: number;
}

/** The best count in any 28-day window, from dated weights (a day can carry more than one, like two sessions). */
export function bestWindow(hits: { date: DayKey; n: number }[], window = WINDOW): { best: number; end?: DayKey } {
  const xs = [...hits].sort((a, b) => a.date.localeCompare(b.date));
  let best = 0;
  let end: DayKey | undefined;
  let sum = 0;
  let lo = 0;
  for (let hi = 0; hi < xs.length; hi++) {
    sum += xs[hi].n;
    const from = addDays(xs[hi].date, -(window - 1));
    while (xs[lo].date < from) sum -= xs[lo++].n;
    if (sum > best) {
      best = sum;
      end = xs[hi].date;
    }
  }
  return { best, end };
}

/** A tally of days that count (each day once). Days after today are ignored. */
export function tally(days: DayKey[], today: DayKey, seasonStart?: DayKey): Tally {
  return weighted([...new Set(days)].map((date) => ({ date, n: 1 })), today, seasonStart);
}

/** The same, for things that can happen more than once a day. */
export function weighted(hits: { date: DayKey; n: number }[], today: DayKey, seasonStart?: DayKey): Tally {
  const past = hits.filter((h) => h.date <= today && h.n > 0);
  const from = addDays(today, -(WINDOW - 1));
  const sum = (xs: typeof past) => xs.reduce((n, h) => n + h.n, 0);
  const { best, end } = bestWindow(past);
  return {
    last28: sum(past.filter((h) => h.date >= from)),
    season: sum(seasonStart ? past.filter((h) => h.date >= seasonStart) : past),
    best28: best,
    best28End: end,
    total: sum(past),
  };
}
