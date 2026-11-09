// The status chip at the top of Today (R4 3, R3 j-tour): travelling or sick, with dates that can be set ahead.
import { addDays, type DayKey } from './dates';
import type { Day, Status } from './types';

export interface StatusWindow { status: Status; from: DayKey; to: DayKey }

/** The chip's statuses: the two the owner plans ahead for, plus the ones already in the app. */
export const CHIP_STATUSES: { id: Status; label: string }[] = [
  { id: 'travelling', label: 'Travelling' },
  { id: 'sick', label: 'Sick' },
  { id: 'injured', label: 'Injured' },
  { id: 'break', label: 'Break' },
];

/** Runs of the same status from `from` onward, in date order. */
export function statusWindows(days: Pick<Day, 'date' | 'status'>[], from: DayKey): StatusWindow[] {
  const marked = days.filter((d) => d.date >= from && d.status && d.status !== 'occasion').sort((a, b) => a.date.localeCompare(b.date));
  const out: StatusWindow[] = [];
  for (const d of marked) {
    const last = out[out.length - 1];
    if (last && last.status === d.status && addDays(last.to, 1) === d.date) last.to = d.date;
    else out.push({ status: d.status!, from: d.date, to: d.date });
  }
  return out;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dm = (d: DayKey) => ({ day: Number(d.slice(8, 10)), mon: MON[Number(d.slice(5, 7)) - 1] });

/** "12–14 Nov", "30 Nov – 2 Dec", "12 Nov". */
export function rangeWords(from: DayKey, to: DayKey): string {
  const a = dm(from), b = dm(to);
  if (from === to) return `${a.day} ${a.mon}`;
  if (a.mon === b.mon) return `${a.day}–${b.day} ${a.mon}`;
  return `${a.day} ${a.mon} – ${b.day} ${b.mon}`;
}

const WORD: Record<Status, string> = { travelling: 'Travelling', sick: 'Sick', injured: 'Injured', break: 'Break', occasion: 'Occasion' };

/** What the chip says: the status today, else the next one planned within three weeks. */
export function chipFor(days: Pick<Day, 'date' | 'status'>[], today: DayKey): { text: string; now: boolean; window?: StatusWindow } {
  const w = statusWindows(days, addDays(today, -40)).find((x) => x.to >= today && x.from <= addDays(today, 21));
  if (!w) return { text: 'Status', now: false };
  const now = w.from <= today;
  return { text: `${WORD[w.status]} ${now ? `until ${rangeWords(w.to, w.to)}` : rangeWords(w.from, w.to)}`, now, window: w };
}
