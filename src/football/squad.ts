// The squad: six habits, the armband and awakening (spec §8.1–8.2).
import type { Axis, MatchEvents, Result } from './types';
import type { FbMoment } from './data/abilities';

export type HabitId = 'steps' | 'training' | 'food' | 'sleep' | 'checklist' | 'body';
export const HABITS: { id: HabitId; axis: Axis; label: string; contract: string }[] = [
  { id: 'steps', axis: 'Pace', label: 'Steps', contract: 'At the step goal' },
  { id: 'training', axis: 'Power', label: 'Training', contract: 'At the planned sessions' },
  { id: 'food', axis: 'Fuel', label: 'Food', contract: 'Inside the range, with the protein target' },
  { id: 'sleep', axis: 'Rest', label: 'Sleep', contract: 'At the sleep target' },
  { id: 'checklist', axis: 'Routine', label: 'Checklist', contract: 'Every slot ticked' },
  { id: 'body', axis: 'Shape', label: 'Body logs', contract: 'A weigh-in on 5 days in 7' },
];
export const habitFor = (axis: Axis) => HABITS.find((h) => h.axis === axis)!;

/**
 * Harmony: four different captains over the last four weeks (newest last).
 * Keeping the same captain two weeks running restarts the count.
 */
export function armbandHarmony(captains: Axis[]): boolean {
  let start = 0;
  for (let i = 1; i < captains.length; i++) if (captains[i] === captains[i - 1]) start = i;
  const run = captains.slice(start);
  if (run.length < 4) return false;
  return new Set(run.slice(-4)).size === 4;
}
export const AWAKEN_AT = [11, 16, 18] as const;
/** The band an axis awakens at when its 28-day average first reaches it, or null. */
export function awakens(prevAvg: number, nowAvg: number, done: number[]): 11 | 16 | 18 | null {
  for (const t of AWAKEN_AT) if (prevAvg < t && nowAvg >= t && !done.includes(t)) return t;
  return null;
}


export interface MomentInput { events: MatchEvents; result: Result; home: boolean; derby: boolean; vsHigher: boolean; finalWon: boolean; last4: Result[]; auto: boolean }
/** The moments a match produced (each earns its ability the first time). Score is Brabo first. */
export function momentsOf(m: MomentInput): FbMoment[] {
  const out: FbMoment[] = [];
  const cs = m.events.chances;
  const win = m.result === 'W';
  if (cs.some((c) => c.tag === 'SCREAMER')) out.push('screamer');
  if (cs.some((c) => c.tag === 'WONDER SAVE')) out.push('wonder-save');
  if (cs.some((c) => c.tag === 'HEARTBREAK')) out.push('heartbreak');
  let mine = 0, theirs = 0, behind = false, lastTieBreak = -1, half = 0;
  for (const c of cs) {
    if (c.side === 'atk' && c.ok) {
      if (mine === theirs) lastTieBreak = c.minute;
      mine++;
      if (c.minute <= 45) half++;
    } else if (c.side === 'def' && !c.ok) theirs++;
    if (theirs > mine) behind = true;
  }
  if (win && behind) out.push('comeback');
  if (m.events.score[1] === 0) out.push('clean-sheet');
  if (m.events.score[0] >= 3) out.push('hat-trick');
  if (win && lastTieBreak >= 80 && m.events.score[0] - m.events.score[1] === 1) out.push('late-winner');
  if (win && m.derby) out.push('derby-win');
  if (win && m.vsHigher) out.push('giant-kill');
  if (win && !m.home) out.push('away-win');
  if (half >= 2) out.push('first-half-blitz');
  if (m.last4.length >= 4 && ![...m.last4, m.result].includes('L')) out.push('unbeaten-5');
  if (m.finalWon) out.push('cup-win');
  if (win && m.auto) out.push('night-shift');
  return out;
}
