import { addDays, daysBetween, type DayKey } from './dates';

export type ClockPhase = 'night' | 'dawn' | 'day' | 'dusk';

/** How far through the journey a date sits, from 0 at the start to 1 on reveal day. */
export function rimFraction(start: DayKey, end: DayKey, date: DayKey): number {
  return Math.min(1, Math.max(0, daysBetween(start, date) / Math.max(1, daysBetween(start, end))));
}

/** The whole journey as one day: the start at midnight, reveal day at the next midnight. */
export function clockAt(start: DayKey, end: DayKey, today: DayKey) {
  const fraction = rimFraction(start, end, today);
  const minutes = Math.round(fraction * 1440);
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const label = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  const phase: ClockPhase = h < 5 ? 'night' : h < 8 ? 'dawn' : h < 17 ? 'day' : h < 20 ? 'dusk' : 'night';
  return { fraction, minutes, label, phase, day: daysBetween(start, today) + 1, total: daysBetween(start, end) + 1 };
}

const AGO: { ago: string; date: (today: DayKey) => DayKey }[] = [
  { ago: '2 weeks ago', date: (t) => addDays(t, -14) },
  { ago: 'A month ago', date: (t) => monthsBack(t, 1) },
  { ago: '3 months ago', date: (t) => monthsBack(t, 3) },
  { ago: '6 months ago', date: (t) => monthsBack(t, 6) },
  { ago: 'A year ago', date: (t) => monthsBack(t, 12) },
];

function monthsBack(day: DayKey, n: number): DayKey {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1 - n, d, 12);
  // 31 March minus a month has no 31 February: no "on this day" then.
  if (dt.getDate() !== d) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Things that happened exactly 2 weeks, a month, 3 or 6 months, or a year ago. */
export function onThisDay(today: DayKey, events: { date: DayKey; text: string }[]): { ago: string; date: DayKey; text: string }[] {
  return AGO.flatMap((a) => {
    const date = a.date(today);
    const e = date ? events.find((x) => x.date === date) : undefined;
    return e ? [{ ago: a.ago, date, text: e.text }] : [];
  });
}
