import { addDays, dayRange, weekStart, type DayKey } from './dates';
import { stepsGoal, targetsOn } from './rings';
import { stepStreak, trainingWeeks, type StepStreak, type TrainingWeeks } from './streaks';
import type { Day, Occasion, OccasionKind, Settings, Targets } from './types';

/**
 * Occasion mode: festivals, weddings, travel, being ill. Calories move up to
 * maintenance, and nothing that happens inside one can break a streak.
 */

export const OCCASION_KINDS: { id: OccasionKind; name: string; hint: string }[] = [
  { id: 'festival', name: 'Festival', hint: 'Diwali, Holi, Eid, Christmas' },
  { id: 'wedding', name: 'Wedding', hint: 'Sangeet to reception' },
  { id: 'travel', name: 'Travel', hint: 'Trips and time away' },
  { id: 'sick', name: 'Ill', hint: 'Rest first' },
  { id: 'other', name: 'Something else', hint: 'Anything that takes over a few days' },
];

export function occasionOn(settings: Pick<Settings, 'occasions'>, date: DayKey): Occasion | undefined {
  return settings.occasions?.find((o) => date >= o.from && date <= o.to);
}

/** Every day inside an occasion. */
export function pausedDays(occasions: Occasion[] = []): Set<DayKey> {
  const out = new Set<DayKey>();
  for (const o of occasions) for (const d of dayRange(o.from, o.to)) out.add(d);
  return out;
}

/** Training weeks that touch an occasion: a short one there can't break the streak. */
export function pausedWeeks(occasions: Occasion[] = []): Set<DayKey> {
  const out = new Set<DayKey>();
  for (const d of pausedDays(occasions)) out.add(weekStart(d));
  return out;
}

/**
 * Calories to hold weight steady. The learned estimate once there is one;
 * until then, about 500 above the middle of the target range.
 */
export function maintenanceKcal(settings: Pick<Settings, 'maintenance'>, t: Targets): number {
  if (settings.maintenance?.kcal) return Math.max(settings.maintenance.kcal, t.kcalMax);
  return Math.round(((t.kcalMin + t.kcalMax) / 2 + 500) / 50) * 50;
}

/** The day's targets, with the calorie ceiling raised to maintenance inside an occasion. */
export function withOccasion(settings: Pick<Settings, 'occasions' | 'maintenance'>, date: DayKey, t: Targets): Targets {
  if (!occasionOn(settings, date)) return t;
  return { ...t, kcalMax: Math.max(t.kcalMax, maintenanceKcal(settings, t)) };
}

export function targetsAt(settings: Pick<Settings, 'targets' | 'occasions' | 'maintenance'>, date: DayKey): Targets | undefined {
  const t = targetsOn(settings.targets, date);
  return t ? withOccasion(settings, date, t) : undefined;
}

/** The step streak, with nights out easing the goal and occasions pausing it. */
export function stepStreakOf(settings: Pick<Settings, 'targets' | 'occasions'>, days: Day[], today: DayKey, fallback = 10000): StepStreak {
  const steps = new Map<DayKey, number>();
  const eased = new Set<DayKey>();
  for (const d of days) {
    if (d.steps !== undefined) steps.set(d.date, d.steps);
    if (d.eased) eased.add(d.date);
  }
  const forgiven = new Set([...eased, ...pausedDays(settings.occasions)]);
  const goal = (d: DayKey) => {
    const t = targetsOn(settings.targets, d);
    return t ? stepsGoal(t, eased.has(d)) : fallback;
  };
  return stepStreak(steps, goal, today, forgiven);
}

export function trainingWeeksOf(settings: Pick<Settings, 'occasions'>, sessionDates: DayKey[], perWeek: number, today: DayKey): TrainingWeeks {
  return trainingWeeks(sessionDates, perWeek, today, pausedWeeks(settings.occasions));
}

/** The weight trend at the start and just after the end: did it hold steady? */
export function heldSteady(o: Occasion, trend: { date: DayKey; trend: number }[], today: DayKey): { change: number } | undefined {
  const after = addDays(o.to, 2);
  if (today < after) return undefined;
  const at = (d: DayKey) => [...trend].reverse().find((t) => t.date <= d)?.trend;
  const a0 = at(addDays(o.from, -1)) ?? at(o.from);
  const a1 = at(after);
  if (a0 === undefined || a1 === undefined) return undefined;
  return { change: Math.round((a1 - a0) * 10) / 10 };
}
