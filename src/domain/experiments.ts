/** Days needed on each side before an experiment says anything. */
export const MIN_EXPERIMENT_DAYS = 10;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((n, x) => n + (x - m) ** 2, 0) / Math.max(1, xs.length - 1));
};

/**
 * A personal experiment ("does eating protein earlier help my sleep?"): the metric's average
 * before and during, and whether the change is bigger than the day-to-day noise.
 */
export function experimentResult(before: number[], during: number[]): { before: number; during: number; change: number; verdict: 'up' | 'down' | 'same' } | undefined {
  if (before.length < MIN_EXPERIMENT_DAYS || during.length < MIN_EXPERIMENT_DAYS) return undefined;
  const b = mean(before);
  const d = mean(during);
  const change = Math.round((d - b) * 10) / 10;
  const noise = Math.sqrt((sd(before) ** 2 + sd(during) ** 2) / 2);
  const verdict = Math.abs(change) <= noise * 0.5 ? 'same' : change > 0 ? 'up' : 'down';
  return { before: Math.round(b * 10) / 10, during: Math.round(d * 10) / 10, change, verdict };
}
