// The squad: six habits, the armband and awakening (spec §8.1–8.2).
import type { Axis } from './types';

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
