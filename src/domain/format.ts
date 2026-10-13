import { parseDay, type DayKey } from './dates';

// Indian digit grouping: 1,09,300 and 1,00,00,000.
const inr = new Intl.NumberFormat('en-IN');

export const fmtInt = (n: number) => inr.format(Math.round(n));

export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sun 27 Sep" */
export function fmtDayShort(key: DayKey): string {
  const d = parseDay(key);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Sunday · 27 Sep" */
export function fmtDayLong(key: DayKey): string {
  const d = parseDay(key);
  return `${WEEKDAYS[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "27 Sep" */
export function fmtDayMonth(key: DayKey): string {
  const d = parseDay(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "2 Nov", or "18 Oct 2027" when it falls in another year than `today`. */
export function fmtDayMonthFrom(key: DayKey, today: DayKey): string {
  return key.slice(0, 4) === today.slice(0, 4) ? fmtDayMonth(key) : `${fmtDayMonth(key)} ${key.slice(0, 4)}`;
}

export function weekdayName(key: DayKey): string {
  return WEEKDAYS[parseDay(key).getDay()];
}

/** "7:55 am" */
export function fmtTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h < 12 ? 'am' : 'pm';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

/** Minutes after midnight to "12:40 am". */
export function fmtClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  let h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const ap = h < 12 ? 'am' : 'pm';
  h = h % 12 || 12;
  return `${h}:${mm} ${ap}`;
}

/** 440 → "7 h 20 m" */
export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} m`;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}

/** 1750 → "1.75" */
export function fmtLitres(ml: number): string {
  const l = ml / 1000;
  return Number.isInteger(l) ? String(l) : l.toFixed(2).replace(/0$/, '');
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${fmtInt(n)} ${n === 1 ? one : many}`;
}

const PROPER = new Set(['Romanian', 'Bulgarian', 'Arnold', 'Russian', 'Turkish', 'Zercher', 'Jefferson', 'Pallof', 'Copenhagen', 'Nordic', 'Spider', 'Scott']);

/** Lowercases a name for use mid-sentence, keeping proper nouns and acronyms: "Romanian deadlift", "RDL". */
export function lowerFirst(name: string): string {
  const first = name.split(/[\s-]/)[0];
  if (PROPER.has(first) || (first.length > 1 && first === first.toUpperCase())) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}
