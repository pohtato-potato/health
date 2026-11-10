// Benchmarks: one day of Health data -> six real axis values, 1–20 (spec §6.1–6.2).
// Reads values only; never the time a log was made.
import type { ChecklistItem, Day, Targets, TrainingSession } from '../domain/types';
import { AXES, clamp, type Axis, type AxisFlags, type AxisValues } from './types';

export interface AxisInput {
  day?: Day;
  kcal: number;
  protein: number;
  /** Any food entry that day, or food marked complete. */
  foodLogged: boolean;
  /** Sessions finished on that day. */
  sessionsToday: TrainingSession[];
  /** Sessions finished earlier in the same week (Monday start), before that day. */
  weekDoneBefore: number;
  /** 1 = Monday … 7 = Sunday. */
  weekdayMon1: number;
  /** Days since the last finished session before that day (undefined: none yet). */
  daysSinceLast?: number;
  targets: Targets;
  checklist: ChecklistItem[];
  weighIns7: number;
  waist7: boolean;
  trendTowardGoal?: boolean;
  /** Days of history each axis has; under 7 plays as "no data". */
  history: Record<Axis, number>;
}

type Table = [number, number][];
export const PACE_PTS: Table = [[0, 1], [2000, 3], [4000, 5], [6000, 8], [8000, 10], [10000, 12], [12000, 14], [15000, 16], [18000, 19], [20000, 20]];
export const REST_PTS: Table = [[5, 6], [6, 9], [7, 13], [7.5, 15], [8, 17], [8.5, 18]];
export const ROUTINE_PTS: Table = [[0, 3], [0.5, 10], [0.8, 15], [1, 19]];
export const NO_DATA = 10;
/**
 * An axis not logged today (fog of war, R8 q-unlogged A, 11 Nov): it plays low, under any honest bad day, and the
 * engine draws it afresh between FOG values on every chance. A sick day or too little history is "no data" instead.
 */
export const NOT_LOGGED = 2;

function lerp(pts: Table, x: number): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}
const v20 = (x: number) => clamp(Math.round(x), 1, 20);

export const paceFromSteps = (steps: number) => v20(lerp(PACE_PTS, steps));

/** Hours asleep plus the rested rating (1–5 maps to −2…+2). Under 5 hours is 4. */
export function restFromSleep(hours: number, rested?: number): number {
  const base = hours < 5 ? 4 : lerp(REST_PTS, hours);
  return v20(base + (rested ? clamp(rested, 1, 5) - 3 : 0));
}
export const sleepHours = (s: { asleep: number; woke: number }) => (((s.woke - s.asleep) % 1440) + 1440) % 1440 / 60;

/** round(20 × (half calories, half protein)). Below the floor always scores under inside the range. */
export function fuelScore(kcal: number, protein: number, t: Targets): number {
  const cal = kcal >= t.kcalMin && kcal <= t.kcalMax ? 1 : kcal < t.kcalMin ? 0.4 : kcal <= t.kcalMax * 1.1 ? 0.6 : 0.2;
  const prot = t.proteinG > 0 ? Math.min(1, protein / t.proteinG) : 1;
  return v20(20 * (0.5 * cal + 0.5 * prot));
}

/**
 * Done 16, extra 18, short 11, a kept rest day 13, a missed one 4. A rest day is kept (calibration): the last
 * session was 2 days ago or less, or the week's target can still be reached in the days left after today.
 */
export function powerFromTraining(today: TrainingSession[], weekDoneBefore: number, weekdayMon1: number, perWeek: number, daysSinceLast?: number): number {
  const done = today.filter((s) => s.status === 'done');
  if (done.length >= 2 || (done.length && weekDoneBefore >= perWeek)) return 18;
  if (done.length) return done.some((s) => !s.short) ? 16 : 11;
  const recent = daysSinceLast !== undefined && daysSinceLast <= 2;
  const reachable = perWeek - weekDoneBefore <= 7 - weekdayMon1;
  return recent || reachable ? 13 : 4;
}

export const routineFromShare = (share: number) => v20(lerp(ROUTINE_PTS, clamp(share, 0, 1)));

export const shapeFromLogs = (weighIns: number, waist: boolean, trend: boolean) =>
  6 + 1.5 * Math.min(5, weighIns) + (waist ? 3 : 0) + (trend ? 2 : 0);

/** Share of today's checklist slots ticked, medicines left out. null when nothing was ticked or marked. */
export function checklistShare(items: ChecklistItem[], day?: Day): number | null | 'none' {
  const keys = items.filter((i) => i.active && !i.med).flatMap((i) => i.slots.map((_, k) => `${i.id}:${k}`));
  if (!keys.length) return 'none';
  const ticked = keys.filter((k) => day?.ticks?.[k] != null).length;
  const marked = keys.filter((k) => day?.missed?.[k]).length;
  if (!ticked && !marked) return null;
  return ticked / keys.length;
}

export function axisValues(i: AxisInput): { values: AxisValues; flags: AxisFlags } {
  const flags: AxisFlags = {};
  const d = i.day;
  const share = checklistShare(i.checklist, d);
  const raw: Record<Axis, number | null> = {
    Pace: d?.steps != null ? paceFromSteps(d.steps) : null,
    Power: powerFromTraining(i.sessionsToday, i.weekDoneBefore, i.weekdayMon1, i.targets.sessionsPerWeek, i.daysSinceLast),
    Fuel: i.foodLogged ? fuelScore(i.kcal, i.protein, i.targets) : null,
    Rest: d?.sleep ? restFromSleep(sleepHours(d.sleep), d.sleep.rested) : null,
    Routine: share === 'none' ? NO_DATA : share == null ? null : routineFromShare(share),
    Shape: v20(shapeFromLogs(i.weighIns7, i.waist7, Boolean(i.trendTowardGoal))),
  };
  const values = {} as AxisValues;
  // A sick day (spec §16): every axis is "no data"; the rotation squad plays instead.
  const sick = d?.status === 'sick';
  for (const a of AXES) {
    if (sick || i.history[a] < 7 || (a === 'Routine' && share === 'none')) { values[a] = NO_DATA; flags[a] = 'no-data'; continue; }
    const v = raw[a];
    if (v == null) { values[a] = NOT_LOGGED; flags[a] = 'not-logged'; } else values[a] = v20(v);
  }
  return { values, flags };
}
