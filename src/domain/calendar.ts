import type { RegionId } from '../ui/light';
import { CALENDAR_DATA, type CalendarEntry } from './calendar-data';
import type { DayKey } from './dates';

export const CALENDAR = CALENDAR_DATA;
export type { CalendarEntry };

const BIRTHDAY: Omit<CalendarEntry, 'id' | 'from' | 'to'> = {
  name: 'Your birthday',
  kind: 'personal',
  why: 'Another lap around the sun. The rings wear candles today.',
  ring: 'candles',
  palette: ['#f2c46d', '#e79a9a'],
};

/** Which kinds win a clash, first to last. */
const ORDER = ['personal', 'festival', 'world', 'nature', 'sky', 'nerdy'];

/**
 * The theme for a day, shown only on the day itself (never announced). The birthday wins;
 * then a festival of the region the walk is in; then by kind.
 */
export function themeDayOn(date: DayKey, walkRegion: RegionId, personal: { birthday?: string }, calendar: CalendarEntry[] = CALENDAR): CalendarEntry | undefined {
  if (personal.birthday && date.slice(5) === personal.birthday) return { ...BIRTHDAY, id: `birthday-${date.slice(0, 4)}`, from: date, to: date };
  const today = calendar.filter((e) => date >= e.from && date <= e.to);
  if (!today.length) return undefined;
  const local = today.find((e) => e.region === walkRegion);
  if (local) return local;
  return [...today].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || (a.region ? 1 : 0) - (b.region ? 1 : 0))[0];
}
