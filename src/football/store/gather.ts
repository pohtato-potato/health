import { dayRange, type Range } from '../../domain/nightOut';
// Reads Health's tables once for a date. Football reads values only, never log times.
import { bedOrder, NIGHT_FROM, sleepMinutes } from '../../domain/rings';
import { db } from '../../db/db';
import { addDays, daysBetween, weekStart, type DayKey } from '../../domain/dates';
import type { ChecklistItem, Day, Meal, RouteRun, SetEntry, Settings, TrainingSession } from '../../domain/types';
import { targetsFor } from '../../state/derived';
import { axisValues, sleepHours, type AxisInput } from '../axes';
import { hashSeed } from '../rng';
import { sealedNight } from '../seal';
import { comebackDue } from '../comeback';
import { conditionCap, conditionOn, type CondCap } from '../squadCare';
import { AXES, type Axis, type AxisFlags, type AxisValues } from '../types';

export interface Health {
  settings: Settings;
  days: Map<DayKey, Day>;
  sessions: TrainingSession[];
  kcal: Map<DayKey, { kcal: number; protein: number; n: number }>;
  /** Days with food logged as ranges (a night out, l-away): the day's totals as a range. */
  ranges?: Map<DayKey, Range & { ranged: boolean }>;
  measures: { date: DayKey; waist?: number }[];
  /** Every set logged and not skipped (engine 2 players read them). */
  sets: SetEntry[];
  /** Calories and protein by day and meal. */
  meals: Map<DayKey, Partial<Record<Meal, { kcal: number; protein: number }>>>;
  /** Walk journal entries with a distance. */
  walks: { date: DayKey; km: number }[];
  routes: RouteRun[];
  /** Check-in (Medical day) dates. */
  checkins?: DayKey[];
}
export async function loadHealth(): Promise<Health> {
  const [settings, days, sessions, entries, measures, sets, walk, routes, checkins] = await Promise.all([
    db.settings.get('app'), db.days.toArray(), db.sessions.toArray(), db.entries.toArray(), db.measurements.toArray(),
    db.sets.toArray(), db.walk.toArray(), db.routes.toArray(), db.checkins.toArray(),
  ]);
  const kcal = new Map<DayKey, { kcal: number; protein: number; n: number }>();
  const meals: Health['meals'] = new Map();
  for (const e of entries) {
    const k = kcal.get(e.date) ?? { kcal: 0, protein: 0, n: 0 };
    k.kcal += e.kcal; k.protein += e.protein; k.n++;
    kcal.set(e.date, k);
    const m = meals.get(e.date) ?? {};
    const x = m[e.meal] ?? { kcal: 0, protein: 0 };
    m[e.meal] = { kcal: x.kcal + e.kcal, protein: x.protein + e.protein };
    meals.set(e.date, m);
  }
  const ranges = new Map<DayKey, Range & { ranged: boolean }>();
  for (const date of new Set(entries.filter((e) => e.range).map((e) => e.date))) ranges.set(date, dayRange(entries.filter((e) => e.date === date)));
  const done = new Set(sessions.filter((s) => s.status === 'done').map((s) => s.id));
  return {
    ranges,
    settings: (settings ?? { targets: [], checklist: [] }) as Settings,
    days: new Map(days.map((d) => [d.date, d])),
    sessions: sessions.filter((s) => s.status === 'done'),
    kcal,
    measures: measures.map((m) => ({ date: m.date, waist: m.waistStanding })),
    sets: sets.filter((x) => !x.skipped && done.has(x.sessionId)),
    meals,
    walks: walk.filter((w) => w.kind === 'journal' && typeof w.km === 'number').map((w) => ({ date: w.date, km: w.km! })),
    routes,
    checkins: checkins.map((c) => c.date),
  };
}
const firsts = new WeakMap<Map<DayKey, unknown>, DayKey>();
function firstDay(h: Health): DayKey {
  let f = firsts.get(h.days);
  if (!f) { f = [...h.days.keys()].reduce((a, b) => (b < a ? b : a)); firsts.set(h.days, f); }
  return f;
}
export const medItems = (c: ChecklistItem[]) => c.filter((i) => i.active && i.med);
/** All of the day's medicines ticked (true when there are none). */
export function medsTaken(h: Health, date: DayKey): boolean {
  // Days before the first logged day (before the app was installed) are unknown, never missed.
  if (!h.days.size || date < firstDay(h)) return true;
  const day = h.days.get(date);
  return medItems(h.settings.checklist ?? []).every((i) => i.slots.every((_, k) => day?.ticks?.[`${i.id}:${k}`] != null));
}
function historyDays(h: Health, date: DayKey): Record<Axis, number> {
  let pace = 0, fuel = 0, rest = 0, routine = 0, shape = 0;
  for (const [d, day] of h.days) {
    if (d > date) continue;
    if (day.steps != null) pace++;
    if (day.sleep) rest++;
    if (day.ticks && Object.keys(day.ticks).length) routine++;
    if (day.weightKg != null) shape++;
    if (day.foodDone) fuel++;
  }
  for (const [d, k] of h.kcal) if (d <= date && k.n && !h.days.get(d)?.foodDone) fuel++;
  shape += new Set(h.measures.filter((m) => m.date <= date).map((m) => m.date)).size;
  const first = h.sessions.filter((s) => s.date <= date).map((s) => s.date).sort()[0];
  const power = first ? daysBetween(first, date) + 1 : 0;
  return { Pace: pace, Power: power, Fuel: fuel, Rest: rest, Routine: routine, Shape: shape };
}
/** Days since the last finished session before `date`; undefined when there was none. */
function lastBefore(h: Health, date: DayKey): number | undefined {
  let last: DayKey | undefined;
  for (const s of h.sessions) if (s.date < date && (!last || s.date > last)) last = s.date;
  return last ? daysBetween(last, date) : undefined;
}
export function axisInputFor(h: Health, date: DayKey): AxisInput {
  const day = h.days.get(date);
  const ws = weekStart(date);
  const k = h.kcal.get(date);
  const weighIns7 = [...h.days.values()].filter((d) => d.date <= date && d.date > addDays(date, -7) && d.weightKg != null).length;
  const waist28 = h.measures.filter((m) => m.waist != null && m.date <= date && m.date > addDays(date, -28)).sort((a, b) => a.date.localeCompare(b.date));
  return {
    day,
    kcal: k?.kcal ?? 0,
    protein: k?.protein ?? 0,
    foodLogged: Boolean(k?.n || day?.foodDone),
    sessionsToday: h.sessions.filter((s) => s.date === date),
    weekDoneBefore: h.sessions.filter((s) => s.date >= ws && s.date < date).length,
    weekdayMon1: daysBetween(ws, date) + 1,
    daysSinceLast: lastBefore(h, date),
    targets: targetsFor(h.settings, date),
    checklist: h.settings.checklist ?? [],
    weighIns7,
    // A Medical day (the monthly check-in) refreshes Shape for four weeks: it counts as the waist mark (R3 q-medical).
    waist7: waist28.some((m) => m.date > addDays(date, -7)) || medicalWithin(h, date),
    // Toward the goal: the waist is no bigger than at the start of the last 28 days.
    trendTowardGoal: waist28.length >= 2 && waist28[waist28.length - 1].waist! <= waist28[0].waist!,
    history: historyDays(h, date),
  };
}
/** A check-in in the 28 days up to `date`. */
export const medicalWithin = (h: Health, date: DayKey) => (h.checkins ?? []).some((d) => d <= date && d > addDays(date, -28));

/** Tonight's values from the logs; once the day is sealed at Close the day, the sealed shape (Pace may still rise). */
export function nightFor(h: Health, date: DayKey): { values: AxisValues; flags: AxisFlags; input: AxisInput } {
  const input = axisInputFor(h, date);
  return { ...sealedNight(axisValues(input), h.days.get(date)?.seal), input };
}
/** The live values, ignoring any seal (what sealing stores). */
export function liveNightFor(h: Health, date: DayKey): { values: AxisValues; flags: AxisFlags } {
  return axisValues(axisInputFor(h, date));
}
/** Whether tonight earns the comeback lift. */
export function comebackOn(h: Health, date: DayKey): boolean {
  return h.days.size > 0 && comebackDue(date, (d) => ({ day: h.days.get(d), foodEntries: h.kcal.get(d)?.n ?? 0 }), firstDay(h));
}
/** Data conditions true for this night, used by data-linked abilities. */
export function conditions(h: Health, date: DayKey, i: AxisInput, auto: boolean): string[] {
  const out: string[] = [];
  const day = i.day, t = i.targets;
  const ws = weekStart(date);
  const week = [...h.days.values()].filter((d) => d.date >= ws && d.date <= date);
  if (day?.sleep) {
    const hrs = sleepHours(day.sleep), a = day.sleep.asleep;
    if (hrs * 60 < t.sleepMin) out.push('sleep-under-target');
    if (hrs < 6) out.push('sleep-under-6');
    if (a >= 1080 && a < 1380) out.push('bed-before-23');
    if (a >= 0 && a < NIGHT_FROM) out.push('bed-after-0'); // after midnight, up to an afternoon bedtime after a sleepless night
  }
  const beds = week.filter((d) => d.sleep).map((d) => bedOrder(d.sleep!.asleep));
  if (beds.length >= 2 && Math.max(...beds) - Math.min(...beds) > 60) out.push('bed-moved');
  const weekDone = i.weekDoneBefore + i.sessionsToday.length;
  if (weekDone < 2) out.push('trained-under-2-week');
  if (h.sessions.some((s) => s.date === addDays(date, -1))) out.push('trained-yesterday');
  if (weekDone < Math.round((t.sessionsPerWeek * i.weekdayMon1) / 7)) out.push('skipped-training-week');
  if (i.foodLogged && i.protein >= t.proteinG) out.push('protein-hit');
  const steps = day?.steps;
  if (steps != null && steps > 10000) out.push('steps-over-10k');
  if (steps != null && steps < 5000) out.push('steps-under-5k');
  if (steps != null && steps >= t.steps) out.push('steps-goal-hit'); else out.push('steps-goal-missed');
  const prev = [1, 2, 3, 4, 5, 6, 7].map((n) => h.days.get(addDays(date, -n))?.steps).filter((x): x is number => x != null);
  if (steps != null && prev.length && steps < prev.reduce((a, b) => a + b, 0) / prev.length) out.push('steps-under-last-week');
  if (h.days.get(addDays(date, -1))?.nightOut) out.push('drink-yesterday');
  if (week.some((d) => d.nightOut)) out.push('drink-week');
  for (let d = ws; d <= date; d = addDays(d, 1)) if (!medsTaken(h, d)) { out.push('meds-missed-week'); break; }
  if (auto) out.push('auto');
  const mo = Number(date.slice(5, 7));
  if (mo >= 11 || mo <= 2) out.push('winter');
  if (hashSeed(date, 'wind') % 4 === 0) out.push('windy');
  return out;
}
export const bestAxis = (v: AxisValues) => AXES.reduce((b, a) => (v[a] > v[b] ? a : b), AXES[0]);

/** Release 1 (R7 q-cond A): squad condition, 50–100 %. Power reads training days, Pace big walking days; full nights refill both. */
export function squadCondition(h: Health, date: DayKey): { Power: number; Pace: number } {
  const trained = new Set(h.sessions.filter((x) => x.status === 'done').map((x) => x.date));
  const t = targetsFor(h.settings, date);
  const big = (d: DayKey) => (h.days.get(d)?.steps ?? 0) >= Math.max(12000, Math.round(t.steps * 1.5));
  // A day's night is logged on the next day's morning.
  const slept = (d: DayKey) => { const n = h.days.get(addDays(d, 1))?.sleep; return !!n && sleepMinutes(n.asleep, n.woke) >= t.sleepMin; };
  return { Power: conditionOn((d) => trained.has(d), slept, date), Pace: conditionOn(big, slept, date) };
}
/** The caps squad condition puts on tonight's chances. Full condition caps nothing. */
export function condCapFor(h: Health, date: DayKey): CondCap | undefined {
  const c = squadCondition(h, date);
  const cap: CondCap = {};
  if (c.Power < 100) cap.Power = conditionCap(c.Power);
  if (c.Pace < 100) cap.Pace = conditionCap(c.Pace);
  return Object.keys(cap).length ? cap : undefined;
}
