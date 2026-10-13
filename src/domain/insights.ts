import { addDays, dayRange, weekday, weekStart, type DayKey } from './dates';
import { sleepMinutes } from './rings';
import { STRIDE_M } from './walk';
import type { CheckIn, Day, FoodEntry, SetEntry } from './types';

/** What the track pages say beyond the chart. Pure functions, so they're easy to test. */

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_NAMES = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

/** Average steps by weekday over the last few weeks, Monday first. Today is left out, since it isn't over. */
export function weekdayPattern(steps: Map<DayKey, number>, today: DayKey, weeks = 8) {
  const sums = Array<number>(7).fill(0);
  const counts = Array<number>(7).fill(0);
  for (const d of dayRange(addDays(today, -7 * weeks), addDays(today, -1))) {
    const v = steps.get(d);
    if (v === undefined) continue;
    sums[weekday(d)] += v;
    counts[weekday(d)]++;
  }
  const avg = sums.map((s, i) => (counts[i] ? s / counts[i] : null));
  const known = avg.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null && counts[x.i] >= 2);
  if (known.length < 5) return { avg, counts };
  const low = known.reduce((a, b) => (b.v < a.v ? b : a));
  const high = known.reduce((a, b) => (b.v > a.v ? b : a));
  return { avg, counts, low: low.i, high: high.i };
}

/**
 * Rough energy spent walking: about half a kilocalorie per kilo of body weight
 * per kilometre, with the stride the walk map uses.
 */
export function walkingKcal(steps: number, weightKg?: number): number {
  return Math.round(0.5 * (weightKg ?? 75) * ((steps * STRIDE_M) / 1000));
}

/**
 * This week against last week, day by day, as running totals. Today isn't
 * over, so it only counts once it has already pulled ahead; otherwise the
 * comparison stops at yesterday. On a Monday that's still behind, there's
 * nothing to compare yet.
 */
export function raceLastWeek(steps: Map<DayKey, number>, today: DayKey) {
  const w = weekStart(today);
  const day = weekday(today);
  const run = (from: DayKey) => {
    let n = 0;
    return Array.from({ length: 7 }, (_, i) => (n += steps.get(addDays(from, i)) ?? 0));
  };
  const now = run(w);
  const last = run(addDays(w, -7));
  const upto = now[day] >= last[day] ? day : day - 1;
  return { now: now.slice(0, day + 1), last, day, ahead: upto >= 0 ? now[upto] - last[upto] : undefined, asOfYesterday: upto === day - 1 };
}

export interface Night {
  date: DayKey;
  /** Minutes relative to midnight: negative for the evening before. */
  from: number;
  to: number;
  minutes: number;
  rested?: number;
}

/** Each night's window, for a chart that runs from the evening to late morning. */
export function sleepWindows(days: Day[], range: DayKey[]): (Night | null)[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return range.map((date) => {
    const s = byDate.get(date)?.sleep;
    if (!s) return null;
    const from = s.asleep > s.woke ? s.asleep - 1440 : s.asleep;
    return { date, from, to: s.woke, minutes: sleepMinutes(s.asleep, s.woke), rested: s.rested };
  });
}

/** When to be asleep tonight to get the target, from the usual wake time. */
export function bedtimeFor(wake: number, sleepMin: number): number {
  return (((wake - sleepMin) % 1440) + 1440) % 1440;
}

/**
 * Days after a good night against days after a short one: steps, and how
 * rested you said you felt. Needs a few of each before it says anything.
 */
export function sleepPayoff(days: Day[], sleepMin: number, today: DayKey, min = 4) {
  const good = { steps: [] as number[], rested: [] as number[] };
  const short = { steps: [] as number[], rested: [] as number[] };
  for (const d of days) {
    if (!d.sleep || d.date >= today) continue;
    const bucket = sleepMinutes(d.sleep.asleep, d.sleep.woke) >= sleepMin ? good : short;
    if (d.sleep.rested !== undefined) bucket.rested.push(d.sleep.rested);
    // Sleep is logged on the morning the night ends, so the same day's steps come after it.
    if (d.steps !== undefined) bucket.steps.push(d.steps);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
  if (good.steps.length < min || short.steps.length < min) return undefined;
  return {
    nights: { good: good.steps.length, short: short.steps.length },
    steps: { good: avg(good.steps)!, short: avg(short.steps)! },
    rested: good.rested.length >= min && short.rested.length >= min ? { good: avg(good.rested)!, short: avg(short.rested)! } : undefined,
  };
}

/** Where the calories or protein came from over a stretch of days. */
export function sources(entries: FoodEntry[], from: DayKey, to: DayKey, key: 'kcal' | 'protein', top = 6) {
  const m = new Map<string, number>();
  let total = 0;
  for (const e of entries) {
    if (e.date < from || e.date > to) continue;
    const v = e[key];
    if (!v) continue;
    const name = e.kind === 'quick' ? 'Quick adds' : e.kind === 'free' ? 'Free meals' : e.name;
    m.set(name, (m.get(name) ?? 0) + v);
    total += v;
  }
  const rows = [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, v]) => ({ name, value: v, share: total ? v / total : 0 }));
  const rest = rows.slice(top).reduce((n, r) => n + r.value, 0);
  return { total, rows: rows.slice(0, top), rest: rest > 0 ? { value: rest, share: rest / total } : undefined };
}

/** Estimated one-rep max from a set: Epley's formula, per dumbbell. */
export function e1rm(kg: number, reps: number): number {
  return reps <= 1 ? kg : kg * (1 + reps / 30);
}

export interface Strength {
  exerciseId: string;
  name: string;
  /** e1rm for loaded work; best reps or seconds for bodyweight and bands. */
  kind: 'kg' | 'reps' | 'seconds';
  now: number;
  before?: number;
  /** One value per session, oldest first. */
  series: number[];
  last: DayKey;
}

/** A strength score for each exercise: the best set of each session, then its trend. */
export function strengthScores(sets: SetEntry[], today: DayKey, weeksBack = 4): Strength[] {
  const byEx = new Map<string, SetEntry[]>();
  for (const s of sets) if (!s.drop) byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), s]);
  const cutoff = addDays(today, -7 * weeksBack);
  const out: Strength[] = [];
  for (const [id, xs] of byEx) {
    const loaded = xs.some((s) => s.loadKg !== null && (s.reps ?? 0) > 0);
    const timed = !loaded && xs.some((s) => s.seconds !== undefined);
    const kind: Strength['kind'] = loaded ? 'kg' : timed ? 'seconds' : 'reps';
    const score = (s: SetEntry) => (kind === 'kg' ? (s.loadKg !== null && s.reps ? e1rm(s.loadKg, s.reps) : 0) : kind === 'seconds' ? s.seconds ?? 0 : s.reps ?? 0);
    const bySession = new Map<string, { date: DayKey; at: number; best: number }>();
    for (const s of xs) {
      const cur = bySession.get(s.sessionId);
      const v = score(s);
      if (!cur) bySession.set(s.sessionId, { date: s.date, at: s.at, best: v });
      else if (v > cur.best) cur.best = v;
    }
    const sessions = [...bySession.values()].filter((v) => v.best > 0).sort((a, b) => a.at - b.at);
    if (!sessions.length) continue;
    const before = [...sessions].reverse().find((v) => v.date <= cutoff);
    const latest = xs.reduce((a, b) => (b.at > a.at ? b : a));
    out.push({ exerciseId: id, name: latest.exercise, kind, now: sessions[sessions.length - 1].best, before: before?.best, series: sessions.map((v) => v.best), last: sessions[sessions.length - 1].date });
  }
  return out.sort((a, b) => b.last.localeCompare(a.last) || a.name.localeCompare(b.name));
}

/** The t-shirt test over time: first and latest ratings. */
export function tshirtTrend(checkins: CheckIn[]) {
  const rated = checkins.filter((c) => c.tshirt).sort((a, b) => a.date.localeCompare(b.date));
  if (!rated.length) return undefined;
  return { first: rated[0], latest: rated[rated.length - 1], count: rated.length };
}

/** Waist-to-height, from inches and centimetres. Under 0.5 is the usual guideline. */
export function waistToHeight(waistIn: number, heightCm: number): number {
  return (waistIn * 2.54) / heightCm;
}

export interface DrinkNight {
  date: DayKey;
  count: number;
  types: Record<string, number>;
}

export function drinkNights(entries: FoodEntry[]): DrinkNight[] {
  const m = new Map<DayKey, DrinkNight>();
  for (const e of entries) {
    if (e.kind !== 'drink') continue;
    const cur = m.get(e.date) ?? { date: e.date, count: 0, types: {} };
    const n = e.drink?.count ?? 1;
    const t = e.drink?.type ?? e.name;
    cur.count += n;
    cur.types[t] = (cur.types[t] ?? 0) + n;
    m.set(e.date, cur);
  }
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** The day after a drinking night against other days: sleep, how rested, steps. */
export function morningAfter(nights: DrinkNight[], days: Day[], today: DayKey, min = 2) {
  const drank = new Set(nights.map((n) => n.date));
  const after = { sleep: [] as number[], rested: [] as number[], steps: [] as number[] };
  const other = { sleep: [] as number[], rested: [] as number[], steps: [] as number[] };
  for (const d of days) {
    if (d.date >= today) continue;
    const b = drank.has(addDays(d.date, -1)) ? after : drank.has(d.date) ? undefined : other;
    if (!b) continue;
    if (d.sleep) {
      b.sleep.push(sleepMinutes(d.sleep.asleep, d.sleep.woke));
      if (d.sleep.rested !== undefined) b.rested.push(d.sleep.rested);
    }
    if (d.steps !== undefined) b.steps.push(d.steps);
  }
  const avg = (xs: number[]) => (xs.length >= min ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
  const pair = (k: 'sleep' | 'rested' | 'steps') => {
    const a = avg(after[k]);
    const o = avg(other[k]);
    return a !== undefined && o !== undefined ? { after: a, other: o } : undefined;
  };
  return { sleep: pair('sleep'), rested: pair('rested'), steps: pair('steps') };
}

/** The t-shirt test against last month's check-in (s22): the latest ratings and how each moved. */
export function tshirtVsLast(checkins: CheckIn[]) {
  const rated = checkins.filter((c) => c.tshirt).sort((a, b) => a.date.localeCompare(b.date));
  const latest = rated.at(-1);
  if (!latest) return undefined;
  const prev = rated.at(-2);
  const keys = ['shoulders', 'arms', 'stomach'] as const;
  return {
    latest: latest.tshirt!,
    change: prev ? (Object.fromEntries(keys.map((k) => [k, latest.tshirt![k] - prev.tshirt![k]])) as Record<(typeof keys)[number], number>) : undefined,
    since: prev?.date,
  };
}
