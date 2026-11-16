// Every building in plain words (finding 12, O42): what counts, the days that counted, and roughly how long is left.
import { addDays, daysBetween, type DayKey } from '../../domain/dates';
import { METRIC_WORDS } from './words';

export interface NeedLike { what: string; count: number }
export interface StateLike { progress: Record<string, number>; from?: DayKey; counted?: DayKey[]; credit?: DayKey; done?: DayKey }

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** "Counts days at the step goal and training sessions." */
export const countsLine = (needs: NeedLike[]) => `Counts ${list(needs.map((n) => METRIC_WORDS[n.what as keyof typeof METRIC_WORDS] ?? n.what))}.`;

const short = (d: DayKey) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
/** "Counted lately: Tue 17 Nov, Sat 21 Nov" (the last few days that counted, newest last), or that none has yet. */
export function countedLine(s: StateLike | undefined): string {
  const credit = s?.credit ? 'Your 28 days before arrival counted once. ' : '';
  const xs = (s?.counted ?? []).filter((d) => !s?.credit || d >= s.credit);
  if (!xs.length) return `${credit}No day has counted ${s?.credit ? 'since arrival' : s?.from ? `since ${short(s.from)}` : 'yet'}.`;
  return `${credit}Counted lately: ${xs.slice(-4).map(short).join(', ')}.`;
}

/** Days left at the rate so far (each need's count per day since it began counting, at least a week). */
export function daysLeft(needs: NeedLike[], s: StateLike | undefined, today: DayKey): number | null {
  if (!s?.from) return null;
  const days = Math.max(7, daysBetween(s.from, today) + 1);
  let worst = 0;
  for (const n of needs) {
    const have = Math.min(n.count, s.progress[n.what] ?? 0);
    if (have >= n.count) continue;
    const rate = have / days;
    if (rate <= 0) return null;
    worst = Math.max(worst, (n.count - have) / rate);
  }
  return Math.ceil(worst);
}
/** "About three weeks to go at this rate." */
export function leftLine(needs: NeedLike[], s: StateLike | undefined, today: DayKey): string {
  if (needs.every((n) => (s?.progress[n.what] ?? 0) >= n.count)) return 'Every need is in; it is built once the budget covers it.';
  const d = daysLeft(needs, s, today);
  if (d === null) return 'No rate yet: it moves from the first day that counts.';
  if (d <= 1) return 'About a day to go at this rate.';
  if (d < 14) return `About ${d} days to go at this rate.`;
  if (d < 70) return `About ${Math.round(d / 7)} weeks to go at this rate.`;
  return `About ${Math.round(d / 30)} months to go at this rate.`;
}

/** Research banked a day lately (finding 14, O42): the gains of the last 14 days over the days they span (at least 7). */
export function researchRate(gains: { on: DayKey; n: number }[], today: DayKey): number {
  const start = addDays(today, -13);
  const xs = gains.filter((g) => g.on >= start && g.on <= today);
  if (!xs.length) return 0;
  const oldest = xs.reduce((a, g) => (g.on < a ? g.on : a), today);
  return xs.reduce((t, g) => t + g.n, 0) / Math.max(7, daysBetween(oldest, today) + 1);
}
/** "In about 9 days at this rate", or "Covered now". */
export function etaWords(cost: number, bank: number, rate: number): string {
  if (bank >= cost) return 'The bank covers it now.';
  if (rate <= 0) return 'No research came in lately, so no date yet.';
  const d = Math.ceil((cost - bank) / rate);
  return d <= 1 ? 'In about a day at this rate.' : `In about ${d} days at this rate.`;
}
