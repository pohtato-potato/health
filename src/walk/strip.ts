import { positionAt } from '../domain/walk';
import { STOP_WORDS, type SmallStop, type Stretch } from './content/types';

export interface StripStop {
  frac: number;
  word: string;
  passed: boolean;
  /** The first stop still ahead. */
  next: boolean;
  /** Whether its word fits without touching another; the dot is always drawn. */
  label: boolean;
}

export interface Strip {
  from: string;
  to: string;
  /** km left to the end, rounded up. */
  toKm: number;
  youFrac: number;
  /** Where today's walk began on the strip. */
  todayFrom: number;
  stops: StripStop[];
}

/** The strip's drawn width, and about how wide a 14 px word is per letter. */
const WIDTH = 292;
const LETTER = 7.8;

/**
 * The strip under the scene, as the board drew it: the stretch from its start to its end, you and today's walk on
 * it, and a dot for each small stop with its kind in words. Past the written stretches, the last city to the next.
 */
export function stripFor(km: number, todayKm: number, stretch: Stretch | undefined, stops: SmallStop[]): Strip {
  const p = positionAt(km);
  const ends = stretch?.plain.includes(' to ') ? stretch.plain.split(' to ') : [p.from.name, p.to?.name ?? p.from.name];
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const [from, to] = ends.map(cap);
  const [fromKm, toKm] = stretch ? [stretch.fromKm, stretch.toKm] : [p.from.km, p.to?.km ?? p.from.km + 1];
  const span = Math.max(1, toKm - fromKm);
  const frac = (k: number) => Math.min(1, Math.max(0, (k - fromKm) / span));
  const here = stretch ? stops.filter((s) => s.km >= fromKm && s.km < toKm) : [];
  const firstAhead = here.findIndex((s) => s.km > km);
  // The ends' own labels take the first and last 15% of the line.
  let lastRight = 0.15 * WIDTH;
  const list = here.map((s, i) => {
    const x = frac(s.km) * WIDTH;
    const half = (STOP_WORDS[s.kind].length * LETTER) / 2;
    const label = x - half > lastRight + 6 && x + half < WIDTH * 0.85;
    if (label) lastRight = x + half;
    return { frac: frac(s.km), word: STOP_WORDS[s.kind], passed: s.km <= km, next: i === firstAhead, label };
  });
  return { from: String(from), to: String(to), toKm: Math.max(0, Math.ceil(toKm - km)), youFrac: frac(km), todayFrom: frac(km - todayKm), stops: list };
}
