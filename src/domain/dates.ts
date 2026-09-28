/** A calendar day in the phone's local time, written 'YYYY-MM-DD'. */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d: Date = new Date()): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
