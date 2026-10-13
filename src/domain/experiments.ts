import { addDays, daysBetween } from './dates';
import { sleepMinutes } from './rings';
import type { Day, FoodEntry, TrainingSession } from './types';

/** Days needed on each side before an experiment says anything. */
export const MIN_EXPERIMENT_DAYS = 10;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((n, x) => n + (x - m) ** 2, 0) / Math.max(1, xs.length - 1));
};

/**
 * A personal experiment ("does eating protein earlier help my sleep?"): the metric's average
 * before and during, and whether the change is bigger than the day-to-day noise.
 */
export function experimentResult(before: number[], during: number[]): { before: number; during: number; change: number; verdict: 'up' | 'down' | 'same' } | undefined {
  if (before.length < MIN_EXPERIMENT_DAYS || during.length < MIN_EXPERIMENT_DAYS) return undefined;
  const b = mean(before);
  const d = mean(during);
  const change = Math.round((d - b) * 10) / 10;
  const noise = Math.sqrt((sd(before) ** 2 + sd(during) ** 2) / 2);
  const verdict = Math.abs(change) <= noise * 0.5 ? 'same' : change > 0 ? 'up' : 'down';
  return { before: Math.round(b * 10) / 10, during: Math.round(d * 10) / 10, change, verdict };
}

/**
 * The values during an experiment (from its start to its end, or today) and the same number of
 * days just before it, up to four weeks each side.
 */
export function experimentWindows(from: string, to: string | undefined, today: string, values: Map<string, number>): { before: number[]; during: number[] } {
  const end = to && to < today ? to : today;
  const span = Math.min(28, daysBetween(from, end) + 1);
  const pick = (start: string, n: number) =>
    Array.from({ length: n }, (_, i) => values.get(addDays(start, i))).filter((v): v is number => v !== undefined);
  return { during: pick(from, span), before: pick(addDays(from, -span), span) };
}

export const EXPERIMENT_METRICS = {
  steps: 'Steps',
  sleep: 'Sleep (minutes)',
  protein: 'Protein (g)',
  kcal: 'Calories',
  energy: 'Energy (1–5)',
  readiness: 'Readiness',
} as const;
export type ExperimentMetric = keyof typeof EXPERIMENT_METRICS;

/** A metric's value on each day it was logged. */
export function experimentValues(
  metric: ExperimentMetric,
  d: { days: Pick<Day, 'date' | 'steps' | 'sleep' | 'energy'>[]; entries: Pick<FoodEntry, 'date' | 'kcal' | 'protein'>[]; sessions: Pick<TrainingSession, 'date' | 'readiness'>[] },
): Map<string, number> {
  const out = new Map<string, number>();
  if (metric === 'protein' || metric === 'kcal') {
    for (const e of d.entries) out.set(e.date, (out.get(e.date) ?? 0) + (metric === 'kcal' ? e.kcal : e.protein));
  } else if (metric === 'readiness') {
    for (const s of d.sessions) if (s.readiness !== undefined) out.set(s.date, s.readiness);
  } else {
    for (const day of d.days) {
      const v = metric === 'steps' ? day.steps : metric === 'energy' ? day.energy : day.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : undefined;
      if (v !== undefined) out.set(day.date, v);
    }
  }
  return new Map([...out].sort((a, b) => a[0].localeCompare(b[0])));
}
