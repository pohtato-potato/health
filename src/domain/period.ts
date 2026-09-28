import { dayRange, weekday, type DayKey } from './dates';
import { ringsFor, sleepMinutes, totalsFor } from './rings';
import { targetsAt } from './occasions';
import { weightTrend } from './streaks';
import { arrivals, kmFromSteps } from './walk';
import type { Day, FoodEntry, Measurement, SetEntry, Settings, TrainingSession, Unlock } from './types';

/** Everything a month (or the whole journey) adds up to, for the climate report and Wrapped. */
export interface PeriodStats {
  from: DayKey;
  to: DayKey;
  days: number;
  logged: number;
  steps: number;
  stepsAvg: number;
  km: number;
  bestSteps?: { date: DayKey; steps: number };
  stepTarget: number;
  kcalAvg?: number;
  inRange: number;
  foodDays: number;
  proteinAvg?: number;
  proteinDays: number;
  waterAvg?: number;
  waterDays: number;
  sleepAvg?: number;
  sleepNights: number;
  sleepLogged: number;
  bestNight?: { date: DayKey; minutes: number };
  sessions: number;
  sets: number;
  reps: number;
  kgMoved: number;
  records: string[];
  perfect: number;
  trendStart?: number;
  trendEnd?: number;
  waistStart?: number;
  waistEnd?: number;
  topFoods: { name: string; n: number }[];
  busiestWeekday?: number;
  unlocked: string[];
  cities: string[];
}

export function periodStats(
  settings: Settings,
  from: DayKey,
  to: DayKey,
  data: { days: Day[]; entries: FoodEntry[]; sessions: TrainingSession[]; sets: SetEntry[]; measurements: Measurement[]; unlocks: Unlock[]; pairs?: (exerciseId: string) => boolean },
): PeriodStats {
  const range = dayRange(from, to);
  const byDate = new Map(data.days.map((d) => [d.date, d]));
  const byEntries = new Map<DayKey, FoodEntry[]>();
  for (const e of data.entries) if (e.date >= from && e.date <= to) byEntries.set(e.date, [...(byEntries.get(e.date) ?? []), e]);
  const s: PeriodStats = {
    from,
    to,
    days: range.length,
    logged: 0,
    steps: 0,
    stepsAvg: 0,
    km: 0,
    stepTarget: 0,
    inRange: 0,
    foodDays: 0,
    proteinDays: 0,
    waterDays: 0,
    sleepNights: 0,
    sleepLogged: 0,
    sessions: 0,
    sets: 0,
    reps: 0,
    kgMoved: 0,
    records: [],
    perfect: 0,
    topFoods: [],
    unlocked: [],
    cities: [],
  };
  let stepDays = 0;
  let kcal = 0;
  let protein = 0;
  let water = 0;
  let waterDays = 0;
  let sleep = 0;
  const wd = Array.from({ length: 7 }, () => ({ n: 0, steps: 0 }));
  const foods = new Map<string, number>();
  for (const d of range) {
    const day = byDate.get(d);
    const es = byEntries.get(d) ?? [];
    const t = targetsAt(settings, d);
    if (day || es.length) s.logged++;
    if (day?.steps !== undefined) {
      s.steps += day.steps;
      stepDays++;
      wd[weekday(d)].n++;
      wd[weekday(d)].steps += day.steps;
      if (!s.bestSteps || day.steps > s.bestSteps.steps) s.bestSteps = { date: d, steps: day.steps };
      if (t && day.steps >= t.steps) s.stepTarget++;
    }
    if (es.length) {
      s.foodDays++;
      kcal += es.reduce((n, e) => n + e.kcal, 0);
      protein += es.reduce((n, e) => n + e.protein, 0);
      for (const e of es) if (e.kind === 'food') foods.set(e.name, (foods.get(e.name) ?? 0) + 1);
    }
    if (t && es.length) {
      const r = ringsFor(totalsFor(day, es), t);
      if (r.kcal.closed) s.inRange++;
      if (r.protein.closed) s.proteinDays++;
      if (r.perfect) s.perfect++;
    }
    if (day?.waterMl) {
      water += day.waterMl;
      waterDays++;
      if (t && day.waterMl >= t.waterMl) s.waterDays++;
    }
    if (day?.sleep) {
      const m = sleepMinutes(day.sleep.asleep, day.sleep.woke);
      sleep += m;
      s.sleepLogged++;
      if (t && m >= t.sleepMin) s.sleepNights++;
      if (!s.bestNight || m > s.bestNight.minutes) s.bestNight = { date: d, minutes: m };
    }
  }
  s.stepsAvg = stepDays ? Math.round(s.steps / stepDays) : 0;
  s.km = kmFromSteps(s.steps);
  s.kcalAvg = s.foodDays ? Math.round(kcal / s.foodDays) : undefined;
  s.proteinAvg = s.foodDays ? Math.round(protein / s.foodDays) : undefined;
  s.waterAvg = waterDays ? water / waterDays / 1000 : undefined;
  s.sleepAvg = s.sleepLogged ? sleep / s.sleepLogged : undefined;
  s.topFoods = [...foods.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => ({ name, n }));
  const withSteps = wd.map((w, i) => ({ i, avg: w.n >= 2 ? w.steps / w.n : 0 })).filter((w) => w.avg > 0);
  s.busiestWeekday = withSteps.length >= 5 ? withSteps.reduce((a, b) => (b.avg > a.avg ? b : a)).i : undefined;

  const done = data.sessions.filter((x) => x.status === 'done' && x.date >= from && x.date <= to);
  const ids = new Set(done.map((x) => x.id));
  const mine = data.sets.filter((x) => ids.has(x.sessionId));
  s.sessions = done.length;
  s.sets = mine.filter((x) => !x.drop).length;
  s.reps = mine.reduce((n, x) => n + (x.reps ?? 0), 0);
  s.kgMoved = Math.round(mine.reduce((n, x) => n + (x.loadKg ?? 0) * (x.reps ?? 0) * (data.pairs?.(x.exerciseId) ? 2 : 1), 0));
  s.records = [...new Set(mine.filter((x) => x.mark === '!!').map((x) => x.exercise))];

  const trend = weightTrend(data.days.filter((d) => d.weightKg !== undefined && d.date <= to).map((d) => ({ date: d.date, kg: d.weightKg! })));
  s.trendStart = [...trend].reverse().find((t) => t.date < from)?.trend ?? trend.find((t) => t.date >= from)?.trend;
  s.trendEnd = [...trend].reverse().find((t) => t.date <= to)?.trend;
  const waists = data.measurements.filter((m) => m.waistStanding !== undefined && m.date <= to);
  s.waistStart = ([...waists].reverse().find((m) => m.date < from) ?? waists.find((m) => m.date >= from))?.waistStanding;
  s.waistEnd = [...waists].reverse()[0]?.waistStanding;
  s.unlocked = data.unlocks.filter((u) => u.date >= from && u.date <= to && !u.quiet).map((u) => u.id);
  const steps = new Map(data.days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
  s.cities = arrivals(steps)
    .filter((a) => a.km > 0 && a.date >= from && a.date <= to)
    .map((a) => a.name);
  return s;
}

export const monthRange = (month: string): [DayKey, DayKey] => {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const d = new Date(Number(next.slice(0, 4)), Number(next.slice(5, 7)) - 1, 0);
  return [`${month}-01`, `${month}-${String(d.getDate()).padStart(2, '0')}`];
};

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (month: string) => MONTH_NAMES[Number(month.slice(5, 7)) - 1];
