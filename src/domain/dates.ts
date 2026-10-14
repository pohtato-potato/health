/** A calendar day in the phone's local time, written 'YYYY-MM-DD'. */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** A day runs from 4 am to 4 am: logging at 1 am still belongs to the evening before. */
export const DAY_STARTS_AT_MIN = 240;

/**
 * The calendar day of a date. With no date it means "today", where today
 * runs from 4 am to 4 am. An explicit date is never shifted.
 */
export function dayKey(d?: Date): DayKey {
  const at = d ?? new Date(Date.now() - DAY_STARTS_AT_MIN * 60_000);
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

/** The day a log made at `now` belongs to: the chosen day if one is picked, else today by the 4 am rule. */
export function dayOfLogging(now: number, chosen?: DayKey): DayKey {
  return chosen ?? dayKey(new Date(now - DAY_STARTS_AT_MIN * 60_000));
}

/** Minutes after midnight moved by `by`, wrapping within the day. */
export function nudgeMinutes(m: number, by: number): number {
  return (((m + by) % 1440) + 1440) % 1440;
}

/** That day at `minutes` after midnight, local time, in ms. */
export function atOn(date: DayKey, minutes: number): number {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60).getTime();
}

export type PartOfDay = 'dawn' | 'day' | 'dusk' | 'night';

/** Lighting for scenes: dawn 5:00–7:30, day to 17:30, dusk to 19:30, then night. */
export function partOfDay(d: Date): PartOfDay {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m >= 300 && m < 450) return 'dawn';
  if (m >= 450 && m < 1050) return 'day';
  if (m >= 1050 && m < 1170) return 'dusk';
  return 'night';
}

/** Noon on that day, which keeps date maths clear of midnight edge cases. */
export function parseDay(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

/** 0 = Monday … 6 = Sunday. */
export function weekday(key: DayKey): number {
  return (parseDay(key).getDay() + 6) % 7;
}

export function weekStart(key: DayKey): DayKey {
  return addDays(key, -weekday(key));
}

/** Every day from `from` to `to`, inclusive. Empty when `to` is before `from`. */
export function dayRange(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export function minutesSinceMidnight(ts: number): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

export function isSameDay(ts: number, key: DayKey): boolean {
  return dayKey(new Date(ts)) === key;
}

/** Minutes into the logging day: 00:00–03:59 count as 24:00–27:59 of the day before. */
export function logMinutes(ts: number): number {
  const m = minutesSinceMidnight(ts);
  return m < DAY_STARTS_AT_MIN ? m + 1440 : m;
}

/** The hour on the logging day: 1 am is 25, so "after 6 pm" still holds at 1 am. */
export function logHour(ts: number): number {
  return Math.floor(logMinutes(ts) / 60);
}

/** The logging day's weekday, 0 = Sunday, so a Sunday-night session after midnight is still Sunday. */
export function logWeekdaySun(ts: number): number {
  return parseDay(dayOfLogging(ts)).getDay();
}
