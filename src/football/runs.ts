// Runs and slides (finding 5, ledger O42): three or more results the same way in a row, good or bad, said once in
// the parcel and on Story, with the reason in plain words. It describes; it never rewards or blames.
import type { Axis } from './types';
import { DAILY_AXES } from './matchup';

export interface RunMatch { date: string; result: 'W' | 'D' | 'L'; flags: Partial<Record<Axis, string>>; values: Record<Axis, number>; home: string; away: string; comp: string }
export interface Run { kind: 'W' | 'L'; n: number; from: string; to: string; fog: number; reason: string; line: string }

const N = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const num = (n: number) => N[n] ?? String(n);
const AXIS_WORD: Record<Axis, string> = { Pace: 'steps', Power: 'training', Fuel: 'food', Rest: 'sleep', Routine: 'the checklist', Shape: 'weigh-ins' };

/** A night in fog: at least half of the daily axes not logged. */
export const inFog = (m: Pick<RunMatch, 'flags'>) => DAILY_AXES.filter((a) => m.flags[a] === 'not-logged').length >= DAILY_AXES.length / 2;

/**
 * The run Brabo is on, from its matches oldest first: three or more wins, or three or more losses, ending with the
 * latest match. A draw ends a run. Undefined when there is none.
 */
export function currentRun(ms: RunMatch[]): Run | undefined {
  const last = ms[ms.length - 1];
  if (!last || last.result === 'D') return undefined;
  const run: RunMatch[] = [];
  for (let i = ms.length - 1; i >= 0 && ms[i].result === last.result; i--) run.unshift(ms[i]);
  if (run.length < 3) return undefined;
  const fog = run.filter(inFog).length;
  const avg = (a: Axis) => run.reduce((s, m) => s + (m.values[a] ?? 0), 0) / run.length;
  const logged = DAILY_AXES.filter((a) => run.every((m) => !m.flags[a]));
  let reason: string;
  if (last.result === 'L') {
    if (fog > 0) reason = `${fog === run.length ? 'All of them were' : `${num(fog).replace(/^./, (c) => c.toUpperCase())} of them ${fog === 1 ? 'was' : 'were'}`} played in fog: little or nothing logged that day, so the team played far below itself.`;
    else {
      const low = [...DAILY_AXES].sort((a, b) => avg(a) - avg(b))[0];
      reason = `Every night was logged. ${AXIS_WORD[low].replace(/^./, (c) => c.toUpperCase())} was the lowest part of the shape, ${Math.round(avg(low))} on average.`;
    }
  } else {
    const high = [...DAILY_AXES].sort((a, b) => avg(b) - avg(a))[0];
    reason = `${logged.length === DAILY_AXES.length ? 'Every night was fully logged. ' : ''}${AXIS_WORD[high].replace(/^./, (c) => c.toUpperCase())} led the shape, ${Math.round(avg(high))} on average.`;
  }
  const n = run.length;
  const line = last.result === 'W' ? `${num(n).replace(/^./, (c) => c.toUpperCase())} wins in a row.` : `${num(n).replace(/^./, (c) => c.toUpperCase())} losses in a row.`;
  return { kind: last.result, n, from: run[0].date, to: last.date, fog, reason, line };
}
