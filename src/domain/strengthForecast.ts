import { addDays, daysBetween, type DayKey } from './dates';
import { e1rm } from './insights';
import { realSets, type ExerciseDef } from './plan';
import { cleanOf } from './quality';
import type { SetEntry } from './types';

/** Sessions of history needed before a forecast says anything. */
export const MIN_SESSIONS = 3;

/** The best estimated one-rep max in each session, by clean reps. */
function sessionBests(ex: Pick<ExerciseDef, 'id'>, sets: SetEntry[]): { date: DayKey; e: number }[] {
  const best = new Map<string, { date: DayKey; e: number }>();
  for (const s of realSets(sets)) {
    if (s.exerciseId !== ex.id || s.drop || s.reps === undefined || !s.loadKg) continue;
    const e = e1rm(s.loadKg, cleanOf(s));
    const cur = best.get(s.sessionId);
    if (!cur || e > cur.e) best.set(s.sessionId, { date: s.date, e });
  }
  return [...best.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * When this lift should reach the target ("Row 15 kg × 12 around 2 Dec"), from the trend of
 * its estimated one-rep max, with a range. Nothing under three sessions; no date when flat.
 */
export function strengthForecast(ex: Pick<ExerciseDef, 'id'>, sets: SetEntry[], target: { kg: number; reps: number }): { date?: DayKey; range?: [DayKey, DayKey] } | undefined {
  const pts = sessionBests(ex, sets);
  if (pts.length < MIN_SESSIONS) return undefined;
  const t0 = pts[0].date;
  const xs = pts.map((p) => daysBetween(t0, p.date));
  const ys = pts.map((p) => p.e);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const vx = xs.reduce((n, x) => n + (x - mx) ** 2, 0);
  const slope = vx ? xs.reduce((n, x, i) => n + (x - mx) * (ys[i] - my), 0) / vx : 0;
  if (slope <= 0) return {};
  const goal = e1rm(target.kg, target.reps);
  const last = pts[pts.length - 1];
  const fitLast = my + slope * (xs[xs.length - 1] - mx);
  const daysOut = Math.max(0, Math.ceil((goal - Math.max(fitLast, last.e)) / slope));
  return { date: addDays(last.date, daysOut), range: [addDays(last.date, Math.round(daysOut / 1.3)), addDays(last.date, Math.round(daysOut * 1.3))] };
}

/** "2 reps from a floor press record": when last time came within two reps of the best at that weight. */
export function recordShot(ex: Pick<ExerciseDef, 'id' | 'name'>, sets: SetEntry[]): string | undefined {
  const mine = realSets(sets).filter((s) => s.exerciseId === ex.id && !s.drop && s.reps !== undefined);
  const sessions = [...new Set([...mine].sort((a, b) => a.at - b.at).map((s) => s.sessionId))];
  if (sessions.length < 2) return undefined;
  const lastId = sessions[sessions.length - 1];
  const last = mine.filter((s) => s.sessionId === lastId);
  const load = Math.max(...last.map((s) => s.loadKg ?? 0));
  const lastBest = Math.max(...last.filter((s) => (s.loadKg ?? 0) === load).map(cleanOf));
  const record = Math.max(...mine.filter((s) => (s.loadKg ?? 0) >= load).map(cleanOf));
  const need = record + 1 - lastBest;
  if (need < 1 || need > 2) return undefined;
  return `${need} rep${need === 1 ? '' : 's'} from a ${ex.name.toLowerCase()} record`;
}
