// The scout line (spec §9.5): the night before a match, one line names the opponent's strongest unit and its key player,
// and the habit that answers it. A clear target, not a forecast. The Programme tech turns it on; the scout (staff)
// also names their weakest unit.
import { SCOUT_LINES } from '../content/words';
import type { Opponent } from '../opponent';
import { hashSeed } from '../rng';
import { AXES, type Axis } from '../types';

/** Shirt numbers for the key player of each unit (the league has no player names; numbers say enough). */
const KEY_NUMBERS: Record<Axis, number[]> = { Pace: [7, 11, 17], Power: [9, 10, 19], Fuel: [8, 6, 14], Rest: [1, 4, 13], Routine: [6, 8, 16], Shape: [2, 3, 5] };
/** The habit that answers each unit, for the weak-spot line. */
export const UNIT_HABIT: Record<Axis, string> = { Pace: 'steps', Power: 'a training session', Fuel: 'meals and protein', Rest: 'sleep', Routine: 'the checklist', Shape: 'the body log' };

/** How hard the opponent leans on each of our units: their modifiers (negative hurts us more). */
function pressure(o: Pick<Opponent, 'shrinks' | 'presses'>): Record<Axis, number> {
  return Object.fromEntries(AXES.map((a) => [a, (o.shrinks[a] ?? 0) + (o.presses[a] ?? 0)])) as Record<Axis, number>;
}
export function strongestUnit(o: Pick<Opponent, 'shrinks' | 'presses'>): Axis {
  const p = pressure(o);
  return AXES.reduce((best, a) => (p[a] < p[best] ? a : best), AXES[0]);
}
export function weakestUnit(o: Pick<Opponent, 'shrinks' | 'presses'>): Axis {
  const p = pressure(o);
  return AXES.reduce((best, a) => (p[a] > p[best] ? a : best), AXES[0]);
}

export interface ScoutLine { unit: Axis; key: string; line: string; weak?: { unit: Axis; line: string } }
/** Tomorrow's scout line, seeded by the night so it reads the same all day. */
export function scoutLine(o: Pick<Opponent, 'id' | 'shrinks' | 'presses'>, oppName: string, seed: string, weak = false): ScoutLine {
  const unit = strongestUnit(o);
  const h = hashSeed('scout', o.id, seed);
  const key = `No. ${KEY_NUMBERS[unit][h % KEY_NUMBERS[unit].length]}`;
  const lines = SCOUT_LINES[unit];
  const line = lines[h % lines.length].replace(/\{opp\}/g, oppName).replace(/\{key\}/g, key);
  const w = weakestUnit(o);
  return { unit, key, line, ...(weak && w !== unit ? { weak: { unit: w, line: `Their weak spot is the ${w} side of the game: ${UNIT_HABIT[w]} tomorrow will find it.` } } : {}) };
}
