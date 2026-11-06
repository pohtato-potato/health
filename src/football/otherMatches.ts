// Results for matches without Brabo (spec §7.5): Poisson goals from the rating gap.
import { clamp } from './types';

export function poisson(mean: number, r: () => number): number {
  const L = Math.exp(-mean);
  let k = 0, p = 1;
  do { k++; p *= r(); } while (p > L && k < 12);
  return k - 1;
}
/** Each side's mean is 1.35 × e^((own − other ± home) ÷ 25), clamped to 0.2–4. */
export function simResult(home: { rating: number }, away: { rating: number }, r: () => number, homeAdv = 3): [number, number] {
  const mh = clamp(1.35 * Math.exp((home.rating - away.rating + homeAdv) / 25), 0.2, 4);
  const ma = clamp(1.35 * Math.exp((away.rating - home.rating - homeAdv) / 25), 0.2, 4);
  return [poisson(mh, r), poisson(ma, r)];
}
