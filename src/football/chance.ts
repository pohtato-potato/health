// The chance (ledger O40, letter 1a): tonight's match played out a few hundred times on fixed seeds, with everything the
// engine uses. Pure. It reads the engine's input for tonight (store/play.ts `tonightInput`) and never touches the real
// match: its seeds are its own, so tonight's result and its dice stay exactly as they would have been.
import { playMatch, type MatchInput } from './engine';
import { hashSeed } from './rng';

/** Matches played out for the figure. 300 keeps it within about 3 points of a long run, and quick on the phone. */
export const CHANCE_SEEDS = 300;
/** The fixed seed set: the same night always gives the same figure, so it never flickers. */
export const chanceSeed = (i: number) => hashSeed('the-chance', String(i));

export interface Chance { w: number; d: number; l: number; n: number }

/** Win, draw and loss as shares (0–1) over `n` played-out matches. A draw is level at full time (a cup goes to penalties). */
export function chanceOf(input: MatchInput, n = CHANCE_SEEDS): Chance {
  let w = 0, d = 0, l = 0;
  for (let i = 0; i < n; i++) {
    const [a, b] = playMatch({ ...input, seed: chanceSeed(i) }).score;
    if (a > b) w++; else if (a === b) d++; else l++;
  }
  return { w: w / n, d: d / n, l: l / n, n };
}

/** Whole percentages that add up to 100 (largest remainder), for the three parts of the bar. */
export function chancePercents(c: Pick<Chance, 'w' | 'd' | 'l'>): [number, number, number] {
  const raw = [c.w * 100, c.d * 100, c.l * 100];
  const out = raw.map(Math.floor);
  const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((x, y) => y[0] - x[0]);
  for (let k = 0; k < 100 - out.reduce((t, x) => t + x, 0); k++) out[order[k % 3][1]]++;
  return out as [number, number, number];
}
