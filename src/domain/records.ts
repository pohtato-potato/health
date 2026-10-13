import { isPlaceholder, realSets, type ExerciseDef } from './plan';
import { cleanOf } from './quality';
import type { DayKey } from './dates';
import type { SetEntry } from './types';

export type Medal = 'gold' | 'silver' | 'bronze';

export interface MedalSet {
  medal: Medal;
  loadKg: number | null;
  reps: number;
  clean: number;
  date: DayKey;
  score: number;
}

const MEDALS: Medal[] = ['gold', 'silver', 'bronze'];

/**
 * The three best sets of an exercise, by clean reps times load (bodyweight counts as 1 kg),
 * each from a different session. Skipped and placeholder sets never win.
 */
export function medalsFor(ex: Pick<ExerciseDef, 'id'>, sets: SetEntry[]): MedalSet[] {
  const best = new Map<string, MedalSet>();
  for (const s of realSets(sets)) {
    if (s.exerciseId !== ex.id || s.drop || isPlaceholder(s) || s.reps === undefined) continue;
    const clean = cleanOf(s);
    const score = clean * Math.max(s.loadKg ?? 1, 1);
    const cur = best.get(s.sessionId);
    if (!cur || score > cur.score) best.set(s.sessionId, { medal: 'gold', loadKg: s.loadKg, reps: s.reps, clean, date: s.date, score });
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, 3)
    .map((m, i) => ({ ...m, medal: MEDALS[i] }));
}
