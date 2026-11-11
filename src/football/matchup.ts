// Today's view of tonight's match (release 1): the opponent's shape on the radar, their threat line, the live
// matchup bar and which axes a log takes ahead. Pure: it reads the engine's numbers and never changes a match.
import { parityRating } from './engine';
import type { Opponent } from './opponent';
import { AXES, clamp, type Axis, type AxisValues } from './types';

/** The engine's parity table read backwards: the average night (1–20) that plays like a club of this rating. */
export function levelForRating(rating: number): number {
  let lo = 1, hi = 20;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (parityRating({ Pace: mid, Power: mid, Fuel: mid, Rest: mid, Routine: mid, Shape: mid }) < rating) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The opponent drawn as a shape: their level on every axis, lifted where they hurt you most (their biggest
 * shrinks and presses) and lowered where they barely touch you. Whole numbers, 1 to 20.
 */
export function oppShape(opp: Pick<Opponent, 'rating' | 'shrinks' | 'presses'>): AxisValues {
  const base = levelForRating(opp.rating);
  const bite = AXES.map((a) => Math.abs(opp.shrinks[a] ?? opp.presses[a] ?? 0));
  const mean = bite.reduce((s, x) => s + x, 0) / AXES.length;
  const out = {} as AxisValues;
  AXES.forEach((a, i) => {
    const lift = mean > 0 ? clamp((bite[i] / mean - 1) * 2, -3, 3) : 0;
    out[a] = clamp(Math.round(base + lift), 1, 20);
  });
  return out;
}

/** The axis they are strongest on (the first of a tie, in radar order). */
export const strongest = (opp: AxisValues): Axis => AXES.reduce((b, a) => (opp[a] > opp[b] ? a : b), AXES[0]);

const ANSWER: Record<Axis, string> = {
  Pace: 'A big walking day matters most tonight.',
  Power: 'A session tonight answers it.',
  Fuel: 'Reaching your protein answers it.',
  Rest: 'An early night answers it.',
  Routine: 'Ticking the checklist answers it.',
  Shape: 'A weigh-in answers it.',
};

/**
 * The threat line under tonight's shape. Before anything is logged it names their strongest axis; once you are
 * logging, the axis where they lead you by most. Undefined when you lead everywhere.
 */
export function threatLine(name: string, opp: AxisValues, mine?: Partial<AxisValues>, logged: Partial<Record<Axis, boolean>> = {}): { axis: Axis; kind: 'strong' | 'lead'; answer: string; text: string } | undefined {
  const any = AXES.some((a) => logged[a]);
  if (!any || !mine) {
    const a = strongest(opp);
    return { axis: a, kind: 'strong', answer: ANSWER[a], text: `${name} are strong on ${a}. ${ANSWER[a]}` };
  }
  let best: Axis | undefined, gap = 0;
  for (const a of AXES) {
    const g = opp[a] - (mine[a] ?? 0);
    if (g > gap) { gap = g; best = a; }
  }
  if (!best) return undefined;
  return { axis: best, kind: 'lead', answer: ANSWER[best], text: `${name} lead you on ${best}. ${ANSWER[best]}` };
}

/**
 * The live matchup bar: your share of tonight as it stands, from the same parity rating the engine sizes a match
 * with. 50 is an even match. A presentation of the engine's numbers, never a forecast of the score.
 */
/**
 * Before the day's first log (whole-app pass, 10 Nov): the axes that only today's logs fill are all still in fog.
 * Power and Shape carry over from the week, so they never count as a log today. The bar then says
 * "nothing logged yet" in place of a 4-to-96 that makes the morning look lost.
 */
export const DAILY_AXES: Axis[] = ['Pace', 'Fuel', 'Rest', 'Routine'];
export function nothingLoggedYet(flags: Partial<Record<Axis, string>>): boolean {
  return DAILY_AXES.every((a) => !!flags[a]);
}

export function matchupShare(mine: AxisValues, opp: Pick<Opponent, 'rating'>): number {
  const gap = parityRating(mine) - opp.rating;
  return clamp(Math.round(100 / (1 + Math.exp(-gap / 9))), 3, 97);
}

/**
 * Logging moment C: the axes a log takes ahead of the opponent. Ahead only: drawing level does not count,
 * and neither does an axis moving up a band while still behind.
 */
export function wentAhead(before: AxisValues, after: AxisValues, opp: AxisValues): Axis[] {
  return AXES.filter((a) => before[a] <= opp[a] && after[a] > opp[a]);
}

/** Axes that moved with a log, for the fly-to-axis motion; the batch reel plays them in radar order. */
export function movedAxes(before: AxisValues, after: AxisValues): Axis[] {
  return AXES.filter((a) => after[a] !== before[a]);
}
