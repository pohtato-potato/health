// Who is the same player (calibration §13.2, the coach's answers in spec §16). Nothing is matched by name across ids:
// the exercise id decides the player. Within one id, a change of form is a profile change: the baseline resets, the player stays.
import type { DayKey } from '../../domain/dates';
import type { ExerciseDef } from '../../domain/plan';
import type { SetEntry, TrainingSession } from '../../domain/types';

/**
 * The days a player's form changed, oldest first (never its first day). A profile change is:
 * - the logged name changing on the same id (a harder variant, a new setup: the name records the variant), or
 * - the plan starting the lift afresh (`loadFrom`, or `resetLoad` from the first session under the plan's version).
 */
export function profileStarts(sets: SetEntry[], def?: ExerciseDef, sessions?: Map<string, TrainingSession>, planVersion?: string): DayKey[] {
  const xs = [...sets].sort((a, b) => a.at - b.at);
  if (!xs.length) return [];
  const out = new Set<DayKey>();
  for (let i = 1; i < xs.length; i++) if (norm(xs[i].exercise) !== norm(xs[i - 1].exercise) && xs[i].date !== xs[0].date) out.add(xs[i].date);
  if (def?.loadFrom) {
    const first = xs.find((s) => s.at >= def.loadFrom!);
    if (first && first.date !== xs[0].date) out.add(first.date);
  } else if (def?.resetLoad && planVersion && sessions) {
    const first = xs.find((s) => sessions.get(s.sessionId)?.planVersion === planVersion);
    if (first && first.date !== xs[0].date && xs.some((s) => s.at < first.at && sessions.get(s.sessionId)?.planVersion !== planVersion)) out.add(first.date);
  }
  return [...out].sort();
}
const norm = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ');

/** The profile a day belongs to: the last profile change on or before it, else the player's first day. */
export function profileStart(starts: DayKey[], first: DayKey, date: DayKey): DayKey {
  let p = first;
  for (const s of starts) if (s <= date) p = s;
  return p;
}

/**
 * Loads that count for Strength: a load must be used in two sessions before it counts. A one-off spike
 * (a mistyped plate, a single heavy try) stays out of baselines and bests until it's held.
 */
export function heldLoads(sets: SetEntry[]): Set<number> {
  const by = new Map<number, Set<string>>();
  for (const s of sets) if (s.loadKg != null) by.set(s.loadKg, (by.get(s.loadKg) ?? new Set()).add(s.sessionId));
  return new Set([...by].filter(([, ids]) => ids.size >= 2).map(([kg]) => kg));
}
