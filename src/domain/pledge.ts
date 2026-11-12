// The lights-out pledge (matchday spec §5, y-pledge A, 12 Nov). Picked on the session finale, or on the after-dinner
// food log on days without training. Kept means the next morning log's typed asleep time is no later than the pledge
// plus 45 minutes. Only the typed time is read: never the time anything was logged, and never a night copied with
// "Same as yesterday".
import { addDays, weekStart, type DayKey } from './dates';
import type { Day, FoodEntry, TrainingSession } from './types';

export const PLEDGE_GRACE = 45;
/** The evening the night order starts from: 6 pm. A 1:30 bedtime sorts after an 11 pm one. */
const EVENING = 18 * 60;
const night = (m: number) => (((m - EVENING) % 1440) + 1440) % 1440;
const fromNight = (n: number) => (((n + EVENING) % 1440) + 1440) % 1440;

/** What a day's pledge is: a time (minutes after midnight), or null for "Not tonight" (costs nothing). */
export interface Pledge { at: number | null }

/** Asleep no later than the pledge plus 45 minutes; asleep earlier also keeps it. */
export function keptAgainst(asleep: number, pledge: number): boolean {
  return night(asleep) <= night(pledge + PLEDGE_GRACE);
}

export type PledgeOutcome = 'none' | 'not-tonight' | 'waiting' | 'kept' | 'missed';
/** The pledge made on `evening` against the sleep typed into the next morning's log. */
export function pledgeOutcome(evening: Pick<Day, 'pledge'> | undefined, morning: Pick<Day, 'sleep'> | undefined): PledgeOutcome {
  const p = evening?.pledge;
  if (!p) return 'none';
  if (p.at === null) return 'not-tonight';
  const s = morning?.sleep;
  if (!s) return 'waiting';
  if (s.carried) return 'missed';
  return keptAgainst(s.asleep, p.at) ? 'kept' : 'missed';
}

/** The pledge that covers the night whose sleep is stored on `date` (the evening before), if it is a time. */
export function pledgeFor(days: Map<DayKey, Pick<Day, 'pledge'>>, date: DayKey): number | undefined {
  const at = days.get(addDays(date, -1))?.pledge?.at;
  return typeof at === 'number' ? at : undefined;
}

/** The night stored on `date` was a kept pledge. */
export function keptPledgeNight(days: Map<DayKey, Pick<Day, 'pledge' | 'sleep'>>, date: DayKey): boolean {
  return pledgeOutcome(days.get(addDays(date, -1)), days.get(date)) === 'kept';
}

/** The sleepy window: the middle typed asleep time of the last 28 nights, rounded to the half hour. */
export function sleepyWindow(days: Iterable<Pick<Day, 'date' | 'sleep'>>, today: DayKey): number | undefined {
  const from = addDays(today, -28);
  const xs = [...days].filter((d) => d.date > from && d.date <= today && d.sleep && !d.sleep.carried).map((d) => night(d.sleep!.asleep)).sort((a, b) => a - b);
  if (!xs.length) return undefined;
  return fromNight(Math.round(xs[xs.length >> 1] / 30) * 30);
}

/** Three times near the sleepy window, half an hour apart, the window in the middle. Midnight without any nights yet. */
export function pledgeTimes(window: number | undefined): [number, number, number] {
  const mid = window ?? 0;
  return [fromNight(night(mid) - 30), mid, fromNight(night(mid) + 30)];
}

/** The week's strip: each night this week (Monday on) with a pledged time, oldest first, and how many were kept. */
export function weekStrip(days: Map<DayKey, Pick<Day, 'pledge' | 'sleep'>>, today: DayKey): { nights: { date: DayKey; kept: boolean }[]; kept: number } {
  const nights: { date: DayKey; kept: boolean }[] = [];
  for (let d = weekStart(today); d < today; d = addDays(d, 1)) {
    const o = pledgeOutcome(days.get(d), days.get(addDays(d, 1)));
    if (o === 'kept' || o === 'missed') nights.push({ date: d, kept: o === 'kept' });
  }
  return { nights, kept: nights.filter((n) => n.kept).length };
}

/**
 * Where the pledge shows on Food: a day with no session done, no pledge yet, and an after-dinner entry. "After dinner"
 * is read from the day's own entries (the Dinner meal, or a typed eaten-at time from 7 pm), never the time of logging.
 */
export const AFTER_DINNER = 19 * 60;
export function pledgeOnFood(day: Pick<Day, 'pledge'> | undefined, entries: Pick<FoodEntry, 'meal' | 'eatenAt'>[], sessionsToday: Pick<TrainingSession, 'status'>[]): boolean {
  if (day?.pledge) return false;
  if (sessionsToday.some((s) => s.status === 'done')) return false;
  return entries.some((e) => e.meal === 'dinner' || (e.eatenAt !== undefined && minutesOf(e.eatenAt) >= AFTER_DINNER));
}
const minutesOf = (t: number) => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };

/** "Caught the window?": the morning's answer, kept for Reports. It never feeds the match. */
export function caughtShare(days: Iterable<Pick<Day, 'date' | 'caughtWindow'>>, from: DayKey, to: DayKey): { yes: number; answered: number } {
  let yes = 0, answered = 0;
  for (const d of days) {
    if (d.date < from || d.date > to || d.caughtWindow === undefined) continue;
    answered++;
    if (d.caughtWindow) yes++;
  }
  return { yes, answered };
}
