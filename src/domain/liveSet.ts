import type { ExerciseDef } from './plan';
import type { LiveCounter, SetEntry } from './types';

/** How long a press has to last to mark the burn. */
export const HOLD_MS = 450;

export type CounterAction = { t: 'tap'; at: number } | { t: 'hold'; at: number } | { t: 'undo' } | { t: 'cancel' };

/** Tap: one more rep. Hold: the burn starts here. −1: one fewer, and the burn never above the count. */
export function counter(c: LiveCounter, a: CounterAction): LiveCounter {
  switch (a.t) {
    case 'tap':
      return { ...c, taps: [...c.taps, a.at], startedAt: c.startedAt ?? a.at };
    case 'hold':
      return { ...c, burnAt: c.taps.length };
    case 'undo': {
      const taps = c.taps.slice(0, -1);
      if (!taps.length) return { key: c.key, taps };
      return { ...c, taps, burnAt: c.burnAt === undefined ? undefined : Math.min(c.burnAt, taps.length) };
    }
    case 'cancel':
      return c;
  }
}

/** A timed set: whole seconds since the first tap. */
export function seconds(c: LiveCounter, now: number): number {
  return c.startedAt === undefined ? 0 : Math.floor((now - c.startedAt) / 1000);
}

export type SetState = 'build' | 'in' | 'burn' | 'record';

/** The colour a set is in: a record outranks the burn, the burn outranks the range. */
export function setState(p: { reps: number; burnAt?: number; bottom?: number; bar?: number }): SetState {
  if (p.bar !== undefined && p.reps > p.bar) return 'record';
  if (p.burnAt !== undefined) return 'burn';
  if (p.bottom !== undefined && p.reps >= p.bottom) return 'in';
  return 'build';
}

const WORDS: Record<SetState | 'rest', string> = { build: 'building', in: 'in range', burn: 'in the burn', record: 'new record', rest: 'rest' };

/** The state in words, so colour never says it alone. */
export function stateWord(s: SetState | 'rest', bar?: number): string {
  if (s !== 'record' || bar === undefined) return WORDS[s];
  return bar === 0 ? 'new record · first time at this load' : `new record · best was ${bar}`;
}

/** Each tap is the top of a rep: lower for `downSec`, lift for `upSec`, then wait for the next tap. */
export function tapTempo(msSinceTap: number | undefined, downSec = 3, upSec = 1): { phase: 'idle' | 'down' | 'up'; beat: 3 | 2 | 1 | 0 | null; frac: number } {
  if (msSinceTap === undefined || msSinceTap >= (downSec + upSec) * 1000) return { phase: 'idle', beat: null, frac: 0 };
  const s = msSinceTap / 1000;
  if (s < downSec) return { phase: 'down', beat: (downSec - Math.floor(s)) as 3 | 2 | 1, frac: s / downSec };
  return { phase: 'up', beat: 0, frac: 1 - (s - downSec) / upSec };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** The last two reps take 30% longer than the first three: a sign the set is near its end. */
export function repsSlowing(taps: number[]): boolean {
  const gaps = taps.slice(1).map((t, i) => t - taps[i]);
  return gaps.length >= 5 && mean(gaps.slice(-2)) > 1.3 * mean(gaps.slice(0, 3));
}

/** Isolation work that ended last time with 2+ reps left: go through the burn this time. */
export function burnNudge(ex: Pick<ExerciseDef, 'isolation'>, prev: Pick<SetEntry, 'rir'> | undefined): boolean {
  return !!ex.isolation && (prev?.rir ?? 0) >= 2;
}

/** The set just done, as tags for the rest screen: "record", "burn from 10", "2 went well", "1 slipped". */
export function justTags(s: Pick<SetEntry, 'mark' | 'burnAt' | 'checks'>): string[] {
  const marks = Object.values(s.checks ?? {});
  const ok = marks.filter((m) => m === 'ok').length;
  const slip = marks.length - ok;
  return [s.mark === '!!' && 'record', s.burnAt !== undefined && `burn from ${s.burnAt + 1}`, ok > 0 && `${ok} went well`, slip > 0 && `${slip} slipped`].filter((t): t is string => !!t);
}

/** The counter kept on the session, when it is for this row; else a fresh one. */
export function restoreCounter(saved: LiveCounter | null | undefined, key: string): LiveCounter {
  return saved?.key === key ? saved : { key, taps: [] };
}
