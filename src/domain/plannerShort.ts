import { groupKey, type ExerciseDef } from './plan';
import type { ExerciseStatus } from './progression';

/** About how long an exercise takes: each set (both sides when per-side) plus its rest. */
export function estMinutes(ex: ExerciseDef): number {
  const work = ex.perSide ? 1.4 : 0.8;
  const rest = (ex.restSec ?? 90) / 60;
  return Math.round(ex.sets * (work + rest) * 10) / 10;
}

/**
 * "I have 30 min": the main lifts first, then lifts behind on progress, then lifts ready to
 * go heavier, packed into the minutes. Each pick says why; any can be unticked.
 */
export function shortPlan(exercises: ExerciseDef[], minutes: number, statuses: Map<string, ExerciseStatus>): { picks: { exId: string; reason: string }[] } {
  const firstGroups = [...new Set(exercises.map((e) => groupKey(e.order)))].slice(0, 2);
  const reasonFor = (e: ExerciseDef): [number, string] => {
    if (firstGroups.includes(groupKey(e.order))) return [0, 'Main lift'];
    const st = statuses.get(e.id);
    const lastMarks = st?.last?.sets.map((s) => s.mark) ?? [];
    if (st?.last && !lastMarks.some((m) => m === '!' || m === '!!')) return [1, 'Behind on progress'];
    if (st?.advice?.kind === 'heavier' || st?.advice?.kind === 'add-load') return [2, 'Ready to go heavier'];
    return [3, 'Fits the time'];
  };
  const ranked = exercises.map((e, i) => ({ e, i, r: reasonFor(e) })).sort((a, b) => a.r[0] - b.r[0] || a.i - b.i);
  const picks: { exId: string; reason: string }[] = [];
  let left = minutes;
  for (const { e, r } of ranked) {
    const t = estMinutes(e);
    if (t > left) continue;
    picks.push({ exId: e.id, reason: r[1] });
    left -= t;
  }
  const order = new Map(exercises.map((e, i) => [e.id, i]));
  return { picks: picks.sort((a, b) => order.get(a.exId)! - order.get(b.exId)!) };
}
