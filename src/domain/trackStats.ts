import { addDays, parseDay, type DayKey } from './dates';
import { cleanOf } from './quality';
import type { Day, FoodEntry, PlaceKind, SetEntry, TrainingSession } from './types';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

/** The latest value, and this week's average against the week before. */
export function todayAndChange(values: Map<DayKey, number>, today: DayKey) {
  const week = (from: number) => Array.from({ length: 7 }, (_, i) => values.get(addDays(today, -from - i))).filter((v): v is number => v !== undefined);
  const latestKey = [...values.keys()].filter((d) => d <= today).sort().pop();
  const thisWeek = avg(week(0));
  const lastWeek = avg(week(7));
  return { latest: latestKey ? values.get(latestKey) : undefined, thisWeek, lastWeek, delta: thisWeek !== undefined && lastWeek !== undefined ? thisWeek - lastWeek : undefined };
}

/** The middle half of the values: the usual range, shaded on the hero chart. */
export function usualRange(values: number[]): [number, number] | undefined {
  if (values.length < 5) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    const i = (s.length - 1) * p;
    const lo = Math.floor(i);
    return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo);
  };
  return [q(0.25), q(0.75)];
}

/** Office days against home days, on the same measure. */
export function placeSplit(dates: DayKey[], value: (d: DayKey) => number | null | undefined, kindOf: (d: DayKey) => PlaceKind) {
  const of = (k: PlaceKind) => avg(dates.filter((d) => kindOf(d) === k).map(value).filter((v): v is number => v !== null && v !== undefined));
  const office = of('office');
  const home = of('home');
  return { office, home, diff: office !== undefined && home !== undefined ? office - home : undefined };
}

/** The weekday with the highest average (0 Sunday). */
export function bestWeekday(values: Map<DayKey, number>): { weekday: number; avg: number } | undefined {
  const by = new Map<number, number[]>();
  for (const [d, v] of values) {
    const w = parseDay(d).getDay();
    by.set(w, [...(by.get(w) ?? []), v]);
  }
  let best: { weekday: number; avg: number } | undefined;
  for (const [w, xs] of by) {
    const a = avg(xs)!;
    if (!best || a > best.avg) best = { weekday: w, avg: a };
  }
  return best;
}

/** How much protein came from 9 pm on, and on how many days most of it did. */
export function lateShare(entries: Pick<FoodEntry, 'date' | 'eatenAt' | 'at' | 'protein'>[], fromMin = 21 * 60) {
  const by = new Map<DayKey, { late: number; all: number }>();
  for (const e of entries) {
    const t = new Date(e.eatenAt ?? e.at);
    const min = t.getHours() * 60 + t.getMinutes();
    const cur = by.get(e.date) ?? { late: 0, all: 0 };
    cur.all += e.protein;
    if (min >= fromMin || min < 4 * 60) cur.late += e.protein;
    by.set(e.date, cur);
  }
  const all = [...by.values()];
  const total = all.reduce((n, x) => n + x.all, 0);
  return { share: total ? all.reduce((n, x) => n + x.late, 0) / total : 0, lateDays: all.filter((x) => x.all && x.late / x.all > 0.5).length, days: all.length };
}

export function proteinByMeal(entries: Pick<FoodEntry, 'meal' | 'protein'>[]): Partial<Record<FoodEntry['meal'], number>> {
  const r: Partial<Record<FoodEntry['meal'], number>> = {};
  for (const e of entries) r[e.meal] = (r[e.meal] ?? 0) + e.protein;
  return r;
}

/** Minutes later (or earlier) asleep on office nights than on other nights. */
export function bedDrift(days: Pick<Day, 'date' | 'sleep'>[], isOffice: (d: DayKey) => boolean): number | undefined {
  const bed = (m: number) => (m < 720 ? m + 1440 : m);
  const withSleep = days.filter((d) => d.sleep);
  const office = avg(withSleep.filter((d) => isOffice(d.date)).map((d) => bed(d.sleep!.asleep)));
  const other = avg(withSleep.filter((d) => !isOffice(d.date)).map((d) => bed(d.sleep!.asleep)));
  return office !== undefined && other !== undefined ? Math.round(office - other) : undefined;
}

/** Days steps were last logged in the evening, and how many of those reached the goal. */
export function eveningTopUps(days: Pick<Day, 'steps' | 'stepsAt'>[], goal: number) {
  const evening = days.filter((d) => d.steps !== undefined && d.stepsAt !== undefined && new Date(d.stepsAt).getHours() >= 18);
  return { tried: evening.length, reached: evening.filter((d) => d.steps! >= goal).length };
}

/** A good day on either 0–100 scale. */
export const GOOD_LINE = 60;

/** Sessions where the readiness score and the session's quality were both good, or both not. */
export function readinessHits(sessions: Pick<TrainingSession, 'readiness' | 'quality'>[]) {
  const both = sessions.filter((s) => s.readiness !== undefined && s.quality !== undefined);
  return { agreed: both.filter((s) => s.readiness! >= GOOD_LINE === s.quality! >= GOOD_LINE).length, total: both.length };
}

/** Clean reps over all reps in the last 14 days, and in the 14 before. */
export function formTrend(sets: Pick<SetEntry, 'date' | 'reps' | 'cleanReps'>[], today: DayKey) {
  const ratio = (from: DayKey, to: DayKey) => {
    const xs = sets.filter((s) => s.date > from && s.date <= to && s.reps);
    const all = xs.reduce((n, s) => n + (s.reps ?? 0), 0);
    return all ? Math.round((xs.reduce((n, s) => n + cleanOf(s), 0) / all) * 100) / 100 : undefined;
  };
  return { now: ratio(addDays(today, -14), today), before: ratio(addDays(today, -28), addDays(today, -14)) };
}

/** Which exercises the discomfort tags came from. */
export function discomfortByExercise(sets: Pick<SetEntry, 'exercise' | 'discomfort'>[]) {
  const by = new Map<string, Record<string, number>>();
  for (const s of sets) {
    if (!s.discomfort) continue;
    const tags = by.get(s.exercise) ?? {};
    tags[s.discomfort] = (tags[s.discomfort] ?? 0) + 1;
    by.set(s.exercise, tags);
  }
  return [...by].map(([exercise, tags]) => ({ exercise, tags }));
}

/** Readiness at sessions the day after drinks, against every other session. */
export function readinessAfter(drinkDates: Set<DayKey>, sessions: Pick<TrainingSession, 'date' | 'readiness'>[]) {
  const scored = sessions.filter((s) => s.readiness !== undefined);
  const after = scored.filter((s) => drinkDates.has(addDays(s.date, -1)));
  const other = scored.filter((s) => !drinkDates.has(addDays(s.date, -1)));
  if (!after.length || !other.length) return undefined;
  return { after: Math.round(avg(after.map((s) => s.readiness!))!), other: Math.round(avg(other.map((s) => s.readiness!))!), sessions: after.length };
}

/** A plain verdict from four weeks of change in weight, waist and strength. */
export function recompVerdict(c: { weightKg?: number; waistIn?: number; strengthPct?: number }): 'recomposition' | 'losing' | 'gaining' | 'steady' | undefined {
  if (c.weightKg === undefined || c.waistIn === undefined) return undefined;
  const flat = Math.abs(c.weightKg) < 0.5;
  if (flat && c.waistIn <= -0.25 && (c.strengthPct ?? 0) > 0) return 'recomposition';
  if (c.weightKg <= -0.5 || c.waistIn <= -0.5) return 'losing';
  if (c.weightKg >= 0.5 || c.waistIn >= 0.5) return 'gaining';
  return 'steady';
}

/** A lift's line on Tracks › Training (s25): heavier, past its range with nowhere heavier to go, or how far up the ladder. */
export function liftLine(st: { advice?: { kind: string } }, ladder: { done: number; of: number }): string {
  const k = st.advice?.kind;
  if (k === 'maxed' || k === 'needs-plates') return 'past range · try a challenge';
  if (k === 'heavier' || k === 'add-load' || k === 'variant' || k === 'band') return 'ready to go heavier';
  return ladder.of ? `ladder ${ladder.done} / ${ladder.of}` : 'building';
}
