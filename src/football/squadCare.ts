// Release 1, the 5.1 rows that engine 2 did not already cover (owner, 9 Nov). All pure: the store wires them in.
// - Medicines (C2, R3 q-meds3 A): three or more missed days in a week is an injury, as two in a row already was;
//   a full week of medicines earns a clean bill; the physio storyline opens and closes in the news.
// - The injury list (C6): sick, injured and break days freeze contracts (form and ageing already pause); the first
//   match back reports how the Rotation XI did. The comeback lift itself lives in comeback.ts.
// - Low-log weeks (R3 b-lowlog): one week at a time, only medicines and one chosen habit are needed; every other axis
//   plays at your typical level (the 28-day median) unless you logged it higher.
// - The dressing room (R3 b-morale): the match after a defeat gets +1 on the axis that let you down; two defeats in a
//   row bring a meeting, never a penalty.
// - Squad condition (R7 q-cond A): hard days tire the squad, rest and full nights refill it. Low condition caps how
//   high a chance can lift Power and Pace, never below the values you logged.
import { addDays, weekStart, type DayKey } from '../domain/dates';
import { AXES, clamp, type Axis, type AxisFlags, type AxisValues, type Mod, type Result } from './types';

// ---------- medicines ----------
export interface MedDay { date: DayKey; allTaken: boolean }
/** Missed medicine days in the 7 days ending on `end`. */
export function missedInWeek(meds: MedDay[], end: DayKey): number {
  const from = addDays(end, -6);
  return meds.filter((d) => !d.allTaken && d.date >= from && d.date <= end).length;
}
/** Three or more missed days in the week before a match is an injury, and it lasts two matches (the window ending the night before, or the one before that). */
export const weekInjury = (meds: MedDay[], date: DayKey, heal = 0) =>
  missedInWeek(meds, addDays(date, -1)) >= 3 || (heal < 1 && missedInWeek(meds, addDays(date, -2)) >= 3);
/** A clean bill: medicines kept on all of the 7 days before the match. Needs the 7 days to be known. */
export function cleanBill(meds: MedDay[], date: DayKey): boolean {
  const week = Array.from({ length: 7 }, (_, i) => addDays(date, -(i + 1)));
  return week.every((d) => meds.find((m) => m.date === d)?.allTaken === true);
}

// ---------- the injury list ----------
/** Days the injury list covers: contracts don't count them, as form and the ageing clock already don't. */
export const onInjuryList = (status?: string) => status === 'sick' || status === 'injured' || status === 'break';
/** The line for the first match back after Rotation XI nights: what they did while you were away. */
export function backLine(away: Pick<{ result: Result }, 'result'>[]): string | undefined {
  if (!away.length) return undefined;
  const n = (r: Result) => away.filter((m) => m.result === r).length;
  const rec = [n('W') && `won ${n('W')}`, n('D') && `drew ${n('D')}`, n('L') && `lost ${n('L')}`].filter(Boolean).join(', ');
  return `Back from the treatment table. Form, board confidence and contracts were frozen while you were out; nothing was lost. The Rotation XI ${rec} while you were away. The squad wants you back.`;
}

// ---------- low-log weeks ----------
export interface LowLog { week: DayKey; axis: Axis }
export const lowLogOn = (l: LowLog | undefined, date: DayKey): l is LowLog => !!l && weekStart(date) === l.week;
/** The 28-day median on each axis: your typical level. */
export function typicalShape(last28: AxisValues[]): AxisValues | undefined {
  if (!last28.length) return undefined;
  const out = {} as AxisValues;
  for (const a of AXES) {
    const xs = last28.map((v) => v[a]).sort((x, y) => x - y);
    const mid = xs.length >> 1;
    out[a] = Math.round(xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2);
  }
  return out;
}
/**
 * A low-log night: when the chosen habit's axis was logged, every other axis plays at least at its typical level, and a
 * blank there no longer counts as not logged. When the chosen axis wasn't logged, the night plays as normal.
 */
export function lowLogNight(values: AxisValues, flags: AxisFlags, typical: AxisValues | undefined, axis: Axis): { values: AxisValues; flags: AxisFlags; applied: boolean } {
  if (!typical || flags[axis]) return { values, flags, applied: false };
  const v = { ...values }, f: AxisFlags = { ...flags };
  for (const a of AXES) {
    if (a === axis) continue;
    if (f[a] || v[a] < typical[a]) { v[a] = Math.max(f[a] ? 0 : v[a], typical[a]); delete f[a]; }
  }
  return { values: v, flags: f, applied: true };
}

// ---------- the dressing room ----------
/** The axis that let you down: the weakest one you logged (any axis when none was). */
export function letDown(values: AxisValues, flags: AxisFlags = {}): Axis {
  const logged = AXES.filter((a) => !flags[a]);
  return (logged.length ? logged : AXES).reduce((lo, a) => (values[a] < values[lo] ? a : lo));
}
/** After a defeat, the dressing room responds: +1 on the axis that let you down, for the next match only. */
export function dressingRoom(last: { result: Result; values: AxisValues; flags?: AxisFlags; rotation?: boolean } | undefined): Mod | undefined {
  if (!last || last.result !== 'L' || last.rotation) return undefined;
  return { axis: letDown(last.values, last.flags), d: 1, why: 'Dressing room responds', kind: 'ability' };
}
/** Two defeats in a row bring a meeting: a scene in the news, never a penalty. */
export const meetingDue = (results: Result[]) => results.length >= 2 && results[results.length - 1] === 'L' && results[results.length - 2] === 'L' && results[results.length - 3] !== 'L';

// ---------- squad condition ----------
const LOOKBACK = 21;
/**
 * Condition, 50–100 (%). Each hard day straight after another costs 15; each easy day gives 20 back; a full night's sleep
 * gives 5 more. Power reads training days, Pace reads big walking days.
 */
export function conditionOn(hard: (d: DayKey) => boolean, slept: (d: DayKey) => boolean, date: DayKey): number {
  let c = 100;
  for (let d = addDays(date, -LOOKBACK); d <= date; d = addDays(d, 1)) {
    if (!hard(d)) c += 20;
    else if (hard(addDays(d, -1))) c -= 15;
    if (slept(d)) c += 5;
    c = clamp(c, 50, 100);
  }
  return Math.round(c);
}
/** The highest a chance can lift an axis at this condition: 20 at 100%, 15 at 75%, 10 at 50%. */
export const conditionCap = (c: number) => clamp(Math.round(10 + (c - 50) / 5), 10, 20);
export type CondCap = Partial<Record<'Power' | 'Pace', number>>;
/** Applies the cap to one chance: never below `base` (logged values and knocks), only the lifts above it. */
export function capChance(v: AxisValues, base: AxisValues, cap: CondCap | undefined): Mod[] {
  const out: Mod[] = [];
  if (!cap) return out;
  for (const a of ['Power', 'Pace'] as const) {
    const c = cap[a];
    if (c === undefined) continue;
    const ceil = Math.max(base[a], c);
    if (v[a] > ceil) { out.push({ axis: a, d: ceil - v[a], why: 'Squad condition', kind: 'tired' }); v[a] = ceil; }
  }
  return out;
}
