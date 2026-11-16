// The video room's tape (ledger O40; project "Video room": "Every goal on tape: each loss names the unit it turned
// on"). Pure, and read after the match only: every goal against with its minute, its kind and the unit that kind
// leans on, and for a loss the unit it turned on. Nothing in a match reads it, so no chance or result moves.
import { TYPES } from './engine';
import { AXES, type Axis, type AxisValues, type ChanceEvent } from './types';

export const VIDEO_ROOM = 'training-video';

export interface TapeGoal { minute: number; type: string; unit: Axis | null }
export interface Tape { goals: TapeGoal[]; turnedOn?: Axis }

const unitOf = (type: string): Axis | null => TYPES.def.find(([t]) => t === type)?.[1] ?? null;

/**
 * The tape of one match. `turnedOn` (a loss only): the unit most of the goals against leaned on; a tie goes to the one
 * lower on the night; goals that lean on no unit (long-range efforts) point to the night's lowest unit.
 */
export function tapeOf(m: { result: 'W' | 'D' | 'L'; values: AxisValues; events: { chances: ChanceEvent[] } }): Tape {
  const goals = m.events.chances.filter((c) => c.side === 'def' && !c.ok && !c.kept).map((c) => ({ minute: c.minute, type: c.type, unit: unitOf(c.type) }));
  if (m.result !== 'L' || !goals.length) return { goals };
  const count = new Map<Axis, number>();
  for (const g of goals) if (g.unit) count.set(g.unit, (count.get(g.unit) ?? 0) + 1);
  const pool = count.size ? [...count.keys()] : [...AXES];
  const most = Math.max(0, ...pool.map((a) => count.get(a) ?? 0));
  const turnedOn = pool.filter((a) => (count.get(a) ?? 0) === most).sort((a, b) => m.values[a] - m.values[b] || AXES.indexOf(a) - AXES.indexOf(b))[0];
  return { goals, turnedOn };
}
