// Every building in plain words (finding 12, O42): what counts, the days that counted, and roughly how long is left.
import { daysBetween, type DayKey } from '../../domain/dates';
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
