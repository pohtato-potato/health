// The comeback lift (R3 b-comeback, R8 n-return): +1, at most, on the first fully logged day after a gap.
// It reads only what was logged on each day, never when (standing rule).
import { addDays, type DayKey } from '../domain/dates';
import type { Day } from '../domain/types';
import { AXES, type Axis, type AxisFlags, type AxisValues, type Mod } from './types';

const LOOK_BACK = 21;
/** Days that are neither a gap nor a logged day: being ill, injured or on a break is never held against you. */
const RESTING = new Set(['sick', 'injured', 'break']);

export interface DayLogs { day?: Day; foodEntries: number }

/** Nothing at all was logged: no steps, sleep, food, weigh-in or tick. */
export function isGap({ day, foodEntries }: DayLogs): boolean {
  if (day?.status && RESTING.has(day.status)) return false;
  return !foodEntries && !day?.foodDone && !day?.partial && day?.steps == null && !day?.sleep && day?.weightKg == null && !Object.keys(day?.ticks ?? {}).length;
}

/** Steps, sleep, the food closed and the checklist touched: the whole day is in. */
export function isFullyLogged({ day }: DayLogs): boolean {
  return day?.steps != null && !!day.sleep && !!day.foodDone && (Object.keys(day.ticks ?? {}).length > 0 || Object.keys(day.missed ?? {}).length > 0);
}

/**
 * True when `date` is fully logged, a gap came before it within three weeks, and no fully logged day sits between.
 * Resting days (sick, injured, break) are skipped over, never counted as the gap; nor is anything before `first`.
 */
export function comebackDue(date: DayKey, logs: (d: DayKey) => DayLogs, first?: DayKey): boolean {
  if (!isFullyLogged(logs(date))) return false;
  for (let k = 1; k <= LOOK_BACK; k++) {
    const d = addDays(date, -k);
    // Before the first day ever logged is before the app, never a gap.
    if (first && d < first) return false;
    const l = logs(d);
    if (l.day?.status && RESTING.has(l.day.status)) continue;
    if (isGap(l)) return true;
    if (isFullyLogged(l)) return false;
  }
  return false;
}

/** The lift itself: +1 on tonight's lowest logged axis. Never more than one point, never a token. */
export function comebackLift(values: AxisValues, flags: AxisFlags): Mod | undefined {
  const open = AXES.filter((a) => !flags[a]);
  if (!open.length) return undefined;
  const low: Axis = open.reduce((b, a) => (values[a] < values[b] ? a : b), open[0]);
  return { axis: low, d: 1, why: 'Comeback lift', kind: 'ability' };
}
