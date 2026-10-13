import { addDays, weekStart, type DayKey } from './dates';

export interface StepStreak {
  /** Days in a row at or over the step target, today included once it's met. */
  current: number;
  best: number;
  shields: number;
  /** Days a shield covered, oldest first. */
  shieldsUsed: DayKey[];
  /** Streak days until the next shield, when there's room for one. */
  toNextShield: number;
  /** Shields ever banked. */
  earned: number;
  /** Days a streak of three or more ended. */
  broken: DayKey[];
}

export const SHIELD_EVERY = 7;
export const SHIELD_CAP = 2;

/**
 * A step streak with shields: one shield for every 7 days in a row, up to 2
 * banked, spent automatically on a missed day. Yesterday doesn't count as
 * missed until its steps are in, since the final count arrives next morning.
 */
export function stepStreak(steps: Map<DayKey, number>, target: (d: DayKey) => number, today: DayKey, eased: Set<DayKey> = new Set()): StepStreak {
  const logged = [...steps.keys()].sort();
  const empty: StepStreak = { current: 0, best: 0, shields: 0, shieldsUsed: [], toNextShield: SHIELD_EVERY, earned: 0, broken: [] };
  if (!logged.length) return empty;

  let streak = 0;
  let best = 0;
  let shields = 0;
  let since = 0;
  let earned = 0;
  const used: DayKey[] = [];
  const broken: DayKey[] = [];
  const yesterday = addDays(today, -1);
  const met = (d: DayKey) => (steps.get(d) ?? -1) >= target(d);
  const earn = () => {
    since++;
    if (since >= SHIELD_EVERY) {
      since = 0;
      if (shields < SHIELD_CAP) earned++;
      shields = Math.min(SHIELD_CAP, shields + 1);
    }
  };

  for (let d = logged[0]; d <= yesterday; d = addDays(d, 1)) {
    if (d === yesterday && !steps.has(d)) continue;
    if (met(d)) {
      streak++;
      earn();
    } else if (eased.has(d)) {
      // The day after a night out: missing it costs nothing.
      continue;
    } else if (streak > 0 && shields > 0) {
      shields--;
      used.push(d);
    } else {
      if (streak >= 3) broken.push(d);
      streak = 0;
      since = 0;
    }
    best = Math.max(best, streak);
  }
  if (met(today)) {
    streak++;
    earn();
    best = Math.max(best, streak);
  }
  return { current: streak, best, shields, shieldsUsed: used, toNextShield: shields >= SHIELD_CAP ? 0 : SHIELD_EVERY - since, earned, broken };
}

export interface TrainingWeeks {
  thisWeek: number;
  /** Weeks in a row at the target. This week counts once it's reached. */
  streak: number;
  best: number;
}

/** Weeks run Monday to Sunday. Sessions beyond the target earn nothing extra. */
export function trainingWeeks(dates: DayKey[], perWeek: number, today: DayKey, paused: Set<DayKey> = new Set()): TrainingWeeks {
  const counts = new Map<DayKey, number>();
  for (const d of dates) counts.set(weekStart(d), (counts.get(weekStart(d)) ?? 0) + 1);
  const thisWeekKey = weekStart(today);
  const thisWeek = counts.get(thisWeekKey) ?? 0;
  if (!counts.size) return { thisWeek: 0, streak: 0, best: 0 };

  const first = [...counts.keys()].sort()[0];
  let run = 0;
  let best = 0;
  for (let w = first; w < thisWeekKey; w = addDays(w, 7)) {
    const met = (counts.get(w) ?? 0) >= perWeek;
    // A short week inside occasion mode neither counts nor breaks the run.
    if (!met && paused.has(w)) continue;
    run = met ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const streak = thisWeek >= perWeek ? run + 1 : run;
  return { thisWeek, streak, best: Math.max(best, streak) };
}

export interface TrendPoint {
  date: DayKey;
  kg: number;
  trend: number;
}

/** Smooths daily weigh-ins: trend moves a tenth of the way to each new weight. */
export function weightTrend(points: { date: DayKey; kg: number }[], alpha = 0.1): TrendPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  let t: number | undefined;
  return sorted.map((p) => {
    t = t === undefined ? p.kg : t + alpha * (p.kg - t);
    return { date: p.date, kg: p.kg, trend: Math.round(t * 100) / 100 };
  });
}

const weeks = (n: number) => `${n} week${n === 1 ? '' : 's'}`;

/** "This week 2 of 4 · 3 weeks running · best run 5 weeks". */
export function trainingStreakLine(w: TrainingWeeks, perWeek: number): string {
  const parts = [`This week ${w.thisWeek} of ${perWeek}`];
  if (w.streak > 0) parts.push(`${weeks(w.streak)} running`);
  if (w.best > 0) parts.push(`best run ${weeks(w.best)}`);
  return parts.join(' · ');
}
