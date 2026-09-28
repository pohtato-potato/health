import type { DayKey } from './dates';
import type { Day, FoodEntry, Targets, TargetsRecord } from './types';

/** The targets in force on a given day. */
export function targetsOn(history: TargetsRecord[], date: DayKey): Targets | undefined {
  let found: Targets | undefined;
  for (const r of [...history].sort((a, b) => a.from.localeCompare(b.from))) {
    if (r.from <= date) found = r.targets;
  }
  return found ?? history[0]?.targets;
}

export interface Totals {
  kcal: number;
  protein: number;
  steps: number;
  waterMl: number;
  freeMeal: boolean;
  entries: number;
  /** The day after a night out, when the step goal eases off. */
  eased?: boolean;
}

/** The step goal for a day: 2,000 lower the day after a night out, never under 6,000. */
export function stepsGoal(targets: Targets, eased?: boolean): number {
  return eased ? Math.max(6000, targets.steps - 2000) : targets.steps;
}

export function totalsFor(day: Day | undefined, entries: FoodEntry[]): Totals {
  let kcal = 0;
  let protein = 0;
  let freeMeal = false;
  for (const e of entries) {
    kcal += e.kcal;
    protein += e.protein;
    if (e.kind === 'free') freeMeal = true;
  }
  return { kcal, protein, steps: day?.steps ?? 0, waterMl: day?.waterMl ?? 0, freeMeal, entries: entries.length, eased: day?.eased };
}

export interface Ring {
  value: number;
  /** 0 to 1, for drawing. */
  progress: number;
  closed: boolean;
}

export interface CalorieRing extends Ring {
  state: 'under' | 'in' | 'over';
}

export interface Rings {
  kcal: CalorieRing;
  protein: Ring;
  steps: Ring;
  closed: number;
  perfect: boolean;
}

/**
 * Calories close inside a range: a floor as well as a ceiling, so eating too
 * little never counts. A free meal lifts the ceiling for its day.
 */
export function ringsFor(t: Totals, targets: Targets): Rings {
  const over = !t.freeMeal && t.kcal > targets.kcalMax;
  const kcalState = t.kcal < targets.kcalMin ? 'under' : over ? 'over' : 'in';
  const kcal: CalorieRing = {
    value: t.kcal,
    progress: clamp(t.kcal / targets.kcalMin),
    closed: kcalState === 'in',
    state: kcalState,
  };
  const protein: Ring = { value: t.protein, progress: clamp(t.protein / targets.proteinG), closed: t.protein >= targets.proteinG };
  const goal = stepsGoal(targets, t.eased);
  const steps: Ring = { value: t.steps, progress: clamp(t.steps / goal), closed: t.steps >= goal };
  const closed = [kcal, protein, steps].filter((r) => r.closed).length;
  return { kcal, protein, steps, closed, perfect: closed === 3 };
}

const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

/** Sleep minutes from asleep and woke times, across midnight. */
export function sleepMinutes(asleep: number, woke: number): number {
  return (((woke - asleep) % 1440) + 1440) % 1440;
}
