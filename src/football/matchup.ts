// Today's view of tonight's match (release 1): the opponent's shape on the radar, their threat line and which axes a
// log takes ahead. The chance itself is played out by the engine (chance.ts, ledger O40). Pure: it reads the engine's numbers and never changes a match.
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
 * Before the day's first log (whole-app pass, 10 Nov): the axes that only today's logs fill are all still in fog.
 * Power and Shape carry over from the week, so they never count as a log today. The bar then says
 * "nothing logged yet" in place of a 4-to-96 that makes the morning look lost.
 */
export const DAILY_AXES: Axis[] = ['Pace', 'Fuel', 'Rest', 'Routine'];
export function nothingLoggedYet(flags: Partial<Record<Axis, string>>): boolean {
  return DAILY_AXES.every((a) => !!flags[a]);
}

/** Levels the opponent's drawing moves per point of the chance's lead (loss minus win, 0 to 1). */
export const CHANCE_SPREAD = 8;
/**
 * The opponent drawn to agree with the chance (ledger O40): their shape keeps where they bite (oppShape's lifts), but
 * its size sits around your own night, larger by how much likelier a loss is than a win, smaller the other way. An even
 * chance draws two shapes of a size; a 10–80 night draws theirs well outside yours. A picture of the chance, never an
 * input to the match.
 */
export function chanceShape(opp: Pick<Opponent, 'rating' | 'shrinks' | 'presses'>, mine: AxisValues, c: { w: number; l: number }): AxisValues {
  const own = AXES.reduce((t, a) => t + mine[a], 0) / AXES.length;
  const lifted = oppShape(opp), plain = levelForRating(opp.rating);
  const base = own + (c.l - c.w) * CHANCE_SPREAD;
  const out = {} as AxisValues;
  for (const a of AXES) out[a] = clamp(Math.round(base + (lifted[a] - plain)), 1, 20);
  return out;
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
