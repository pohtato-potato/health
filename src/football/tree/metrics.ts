// One day's real-habit counts for the tree (content README, "New Metric values"). Reads values Health
// already logs, never the time a log was made. A sick day is "no data" (spec §16): it counts only as a
// day something was logged, so the season track still moves.
import { addDays, daysBetween, weekStart, type DayKey } from '../../domain/dates';
import { placeFor } from '../../domain/places';
import { stepsGoal } from '../../domain/rings';
import { keptOn } from '../contracts';
import { sleepHours } from '../axes';
import { BIG_DAY, LONG_WALK_KM } from '../players/catalogue';
import { bedtimeKept, usualBedtime } from '../players/attributes';
import type { Metric } from '../content/types';
import { axisInputFor, medsTaken, type Health } from '../store/gather';
import type { DayMetrics } from './types';

/** Rated rested 4 or 5. */
export const RESTED_AT = 4;
/** A week with this many sessions counts as a session week. */
export const SESSION_WEEK = 3;

const stride = (h: Health) => h.settings.strideM ?? 0.74;
const hasLog = (h: Health, date: DayKey) => {
  const d = h.days.get(date);
  return Boolean(
    d && (d.steps != null || d.sleep || d.weightKg != null || (d.ticks && Object.keys(d.ticks).length) || d.foodDone || d.waterMl),
  ) || Boolean(h.kcal.get(date)?.n) || h.sessions.some((s) => s.date === date) || h.measures.some((m) => m.date === date) || h.walks.some((w) => w.date === date);
};

export interface MetricOpts {
  /** The bedtime target (Football settings), else the usual bedtime. */
  bedtime?: number;
  /** Sessions logged today for academy-linked habits. */
  youthDays?: number;
}

/** Every metric that happened on `date`, as counts. */
export function dayMetrics(h: Health, date: DayKey, o: MetricOpts = {}): DayMetrics {
  const day = h.days.get(date);
  const out: DayMetrics = {};
  const add = (m: Metric, n = 1) => { if (n > 0) out[m] = (out[m] ?? 0) + n; };
  if (!hasLog(h, date)) return out;
  add('logged');
  if (day?.status === 'sick') return out;
  const i = axisInputFor(h, date);
  const t = i.targets;
  const steps = day?.steps;
  if (keptOn('steps', i)) add('steps');
  add('training', i.sessionsToday.length);
  if (keptOn('sleep', i)) add('sleep');
  if (i.foodLogged && i.protein >= t.proteinG) add('protein');
  if (i.foodLogged && i.kcal >= t.kcalMin && i.kcal <= t.kcalMax) add('kcal');
  const target = o.bedtime ?? usualBedtime(h, addDays(date, -1));
  if (day?.sleep && target !== undefined && bedtimeKept(day.sleep.asleep, target)) add('bedtime');
  const meds = (h.settings.checklist ?? []).some((c) => c.active && c.med);
  if (meds && medsTaken(h, date)) add('meds');
  add('youth', o.youthDays ?? 0);
  if (day?.foodDone) add('closed');
  if (steps != null && steps >= BIG_DAY) add('big-day');
  add('long-walk', h.walks.filter((w) => w.date === date && w.km >= LONG_WALK_KM).length);
  if (steps != null && steps > 0) add('km', Math.round((steps * stride(h)) / 100) / 10);
  add('route-leg', h.routes.filter((r) => r.doneOn === date).length);
  const place = placeFor(day, h.settings);
  if (steps != null && (place.kind === 'office' || place.kind === 'trip') && steps >= stepsGoal(t, true)) add('commute');
  if (day?.weightKg != null) add('weigh-in');
  if (h.measures.some((m) => m.date === date && m.waist != null)) add('waist');
  const habits = (i.checklist ?? []).filter((c) => c.active && !c.med);
  const ticked = (id: string, slots: number) => Array.from({ length: slots }, (_, k) => day?.ticks?.[`${id}:${k}`] != null).every(Boolean);
  const kept = habits.filter((c) => ticked(c.id, c.slots.length)).length;
  if (habits.length && kept === habits.length) add('checklist-full');
  add('habit-kept', kept);
  if ((day?.sleep?.rested ?? 0) >= RESTED_AT) add('rested');
  if (!i.sessionsToday.length && restDayKept(h, date, t.sessionsPerWeek)) add('rest-day');
  const meals = h.meals.get(date) ?? {};
  if (meals.breakfast) add('breakfast');
  if (meals.lunch) add('lunch');
  if (meals.dinner) add('dinner');
  if (meals.breakfast && meals.lunch && meals.dinner) add('three-meals');
  if (date === addDays(weekStart(date), 6) && h.sessions.filter((s) => s.date >= weekStart(date) && s.date <= date).length >= SESSION_WEEK) add('session-week');
  add('form-ok', formOkSessions(h, date));
  if (unitsLogged(day, i, h, date) === 6) add('all-units');
  // 'gym-session' waits for the coach's kit tags on gym plans (calibration §12): nothing to count yet.
  return out;
}

/** A planned rest: no session today, and either the last one was 2 or fewer days ago or the week's target can still be reached (calibration §8). */
function restDayKept(h: Health, date: DayKey, perWeek: number): boolean {
  const last = h.sessions.filter((s) => s.date < date).map((s) => s.date).sort().pop();
  if (!last) return false;
  if (daysBetween(last, date) <= 2) return true;
  const ws = weekStart(date);
  const done = h.sessions.filter((s) => s.date >= ws && s.date < date).length;
  const left = 7 - daysBetween(ws, date) - 1;
  return done + left >= perWeek;
}

/** Sessions on `date` whose every form check was marked ok (at least one check). */
function formOkSessions(h: Health, date: DayKey): number {
  let n = 0;
  for (const s of h.sessions.filter((x) => x.date === date)) {
    const marks = h.sets.filter((x) => x.sessionId === s.id).flatMap((x) => Object.values(x.checks ?? {}));
    if (marks.length && marks.every((m) => m === 'ok')) n++;
  }
  return n;
}

function unitsLogged(day: ReturnType<Health['days']['get']>, i: ReturnType<typeof axisInputFor>, h: Health, date: DayKey): number {
  return [
    day?.steps != null,
    i.sessionsToday.length > 0,
    i.foodLogged,
    Boolean(day?.sleep && sleepHours(day.sleep) > 0),
    Boolean(day?.ticks && Object.keys(day.ticks).length),
    day?.weightKg != null || h.measures.some((m) => m.date === date),
  ].filter(Boolean).length;
}

/** Adds one day's counts into a running total. */
export function addMetrics(a: DayMetrics, b: DayMetrics): DayMetrics {
  const out = { ...a };
  for (const [k, v] of Object.entries(b) as [Metric, number][]) out[k] = Math.round(((out[k] ?? 0) + v) * 10) / 10;
  return out;
}
/** The sum of a metric over the stored days from `from` to `to`, inclusive. */
export function countIn(days: { date: DayKey; m: DayMetrics }[], what: Metric, from: DayKey, to: DayKey): number {
  return days.filter((d) => d.date >= from && d.date <= to).reduce((t, d) => t + (d.m[what] ?? 0), 0);
}
