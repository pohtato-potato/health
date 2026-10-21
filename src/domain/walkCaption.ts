import type { DayKey } from './dates';
import { fmtDayShort, fmtInt } from './format';
import type { Status } from './types';

const STATUS_WORD: Record<Status, string> = { sick: 'sick', injured: 'injured', travelling: 'travelling', break: 'on a break', occasion: 'occasion' };

/** The walk's caption on Today: the date, place and status; where you are; and how far to the next landmark. */
export function walkCaption(i: { date: DayKey; place?: string; status?: Status; near: string; dayN: number; kmToNext: number; landmark: string }): [string, string, string] {
  const first = [fmtDayShort(i.date), i.place, i.status && STATUS_WORD[i.status]].filter(Boolean).join(' · ');
  return [first, `Near ${i.near}`, `Day ${i.dayN} · ${fmtInt(Math.round(i.kmToNext))} km to ${i.landmark}`];
}
