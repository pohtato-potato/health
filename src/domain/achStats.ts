import { dayRange, type DayKey } from './dates';
import { ringsFor, sleepMinutes, totalsFor } from './rings';
import { weightTrend, type StepStreak, type TrainingWeeks, type TrendPoint } from './streaks';
import { stepStreakOf, targetsAt, trainingWeeksOf } from './occasions';
import type {
  CheckIn,
  Counter,
  Day,
  Food,
  FoodEntry,
  Measurement,
  Occasion,
  SetEntry,
  Settings,
  Targets,
  TrainingSession,
  Unlock,
  WeekNote,
  Win,
} from './types';
import { arrivals, kmFromSteps, statesReached, setStride } from './walk';

export interface DayStat {
  date: DayKey;
  day?: Day;
  entries: FoodEntry[];
  targets?: Targets;
  kcal: number;
  protein: number;
  steps?: number;
  water: number;
  sleepMin?: number;
  logged: boolean;
  kcalIn: boolean;
  proteinOk: boolean;
  stepsOk: boolean;
  waterOk: boolean;
  sleepOk: boolean;
  perfect: boolean;
  trained: boolean;
  drinks: number;
  free: boolean;
  nightOut: boolean;
}

export interface AchInput {
  today: DayKey;
  now: number;
  settings: Settings;
  days: Day[];
  entries: FoodEntry[];
  foods: Food[];
  sessions: TrainingSession[];
  sets: SetEntry[];
  measurements: Measurement[];
  wins: Win[];
  checkins: CheckIn[];
  occasions: Occasion[];
  weekNotes: WeekNote[];
  clips: number;
  counters: Counter[];
  unlocked: Unlock[];
}

export interface AchStats extends Omit<AchInput, 'counters' | 'unlocked' | 'sessions' | 'sets'> {
  /** Done sessions only, oldest first. */
  sessions: TrainingSession[];
  /** Sets from done sessions only. */
  sets: SetEntry[];
  daily: DayStat[];
  dayMap: Map<DayKey, DayStat>;
  counters: Map<string, Counter>;
  unlocked: Map<string, Unlock>;
  totalSteps: number;
  km: number;
  cities: string[];
  states: number;
  streak: StepStreak;
  weeks: TrainingWeeks & { perWeek: number };
  trend: TrendPoint[];
  /** The first waist reading on or after setup, the baseline for waist goals. */
  baselineWaist?: number;
  heightIn?: number;
}

export function buildStats(i: AchInput): AchStats {
  // Distances use the stride in these settings, even before the app-wide setting has caught up.
  setStride(i.settings.strideM);
  const done = i.sessions.filter((s) => s.status === 'done').sort((a, b) => a.startedAt - b.startedAt);
  const doneIds = new Set(done.map((s) => s.id));
  const sets = i.sets.filter((s) => doneIds.has(s.sessionId)).sort((a, b) => a.at - b.at);
  const dayByDate = new Map(i.days.map((d) => [d.date, d]));
  const entriesByDate = new Map<DayKey, FoodEntry[]>();
  for (const e of i.entries) entriesByDate.set(e.date, [...(entriesByDate.get(e.date) ?? []), e]);
  const trainedDates = new Set(done.map((s) => s.date));

  const allDates = [...dayByDate.keys(), ...entriesByDate.keys(), ...trainedDates].sort();
  const first = allDates[0];
  const daily: DayStat[] = [];
  if (first) {
    for (const date of dayRange(first, i.today > allDates[allDates.length - 1] ? i.today : allDates[allDates.length - 1])) {
      const day = dayByDate.get(date);
      const entries = (entriesByDate.get(date) ?? []).sort((a, b) => a.at - b.at);
      const targets = targetsAt(i.settings, date);
      const totals = totalsFor(day, entries);
      const rings = targets ? ringsFor(totals, targets) : undefined;
      const sleepMin = day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : undefined;
      daily.push({
        date,
        day,
        entries,
        targets,
        kcal: totals.kcal,
        protein: totals.protein,
        steps: day?.steps,
        water: day?.waterMl ?? 0,
        sleepMin,
        logged: !!day || entries.length > 0 || trainedDates.has(date),
        kcalIn: !!rings?.kcal.closed && entries.length > 0,
        proteinOk: !!rings?.protein.closed,
        stepsOk: !!rings?.steps.closed && day?.steps !== undefined,
        waterOk: !!targets && (day?.waterMl ?? 0) >= targets.waterMl,
        sleepOk: !!targets && sleepMin !== undefined && sleepMin >= targets.sleepMin,
        perfect: !!rings?.perfect && entries.length > 0,
        trained: trainedDates.has(date),
        drinks: entries.filter((e) => e.kind === 'drink').reduce((n, e) => n + (e.drink?.count ?? 1), 0),
        free: entries.some((e) => e.kind === 'free'),
        nightOut: !!day?.nightOut,
      });
    }
  }

  const steps = new Map(i.days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
  const totalSteps = [...steps.values()].reduce((a, b) => a + b, 0);
  const km = kmFromSteps(totalSteps);
  const t = targetsAt(i.settings, i.today);
  const perWeek = t?.sessionsPerWeek ?? 4;
  const trend = weightTrend(i.days.filter((d) => d.weightKg !== undefined).map((d) => ({ date: d.date, kg: d.weightKg! })));
  const setupDay = new Date(i.settings.createdAt);
  const setupKey = `${setupDay.getFullYear()}-${String(setupDay.getMonth() + 1).padStart(2, '0')}-${String(setupDay.getDate()).padStart(2, '0')}`;
  const waists = i.measurements.filter((m) => m.waistStanding !== undefined).sort((a, b) => a.date.localeCompare(b.date));
  const baseline = waists.find((m) => m.date >= setupKey) ?? waists[waists.length - 1];

  return {
    ...i,
    sessions: done,
    sets,
    daily,
    dayMap: new Map(daily.map((d) => [d.date, d])),
    counters: new Map(i.counters.map((c) => [c.id, c])),
    unlocked: new Map(i.unlocked.map((u) => [u.id, u])),
    totalSteps,
    km,
    cities: [...new Set(arrivals(steps)
      .filter((a) => a.km > 0)
      .map((a) => a.name))],
    states: statesReached(km).length,
    streak: stepStreakOf(i.settings, i.days, i.today),
    weeks: { ...trainingWeeksOf(i.settings, done.map((s) => s.date), perWeek, i.today), perWeek },
    trend,
    baselineWaist: baseline?.waistStanding,
    heightIn: i.settings.heightCm ? i.settings.heightCm / 2.54 : undefined,
  };
}

/** Helpers the conditions share. */
export const count = (s: AchStats, id: string) => s.counters.get(id)?.n ?? 0;
export const countDays = (s: AchStats, id: string) => s.counters.get(id)?.days?.length ?? 0;

/** The longest run of consecutive calendar days that pass a test. */
export function longestRun(days: DayStat[], test: (d: DayStat) => boolean): number {
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = test(d) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Days grouped by calendar month, 'YYYY-MM'. */
export function byMonth(days: DayStat[]): Map<string, DayStat[]> {
  const m = new Map<string, DayStat[]>();
  for (const d of days) {
    const k = d.date.slice(0, 7);
    m.set(k, [...(m.get(k) ?? []), d]);
  }
  return m;
}

/** A strength score per exercise per set: Epley's estimate for loaded work, reps for bodyweight. */
export function setScore(s: SetEntry): number {
  const v = s.reps ?? s.seconds ?? 0;
  return s.loadKg ? s.loadKg * (1 + v / 30) : v;
}

export function isPalindrome(n: number): boolean {
  const s = String(n);
  return s.length >= 4 && s === [...s].reverse().join('');
}
