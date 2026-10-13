import { atOn, type DayKey } from './dates';
import { mealTimesFor } from './foods';
import { placeFor } from './places';
import type { Day, Settings } from './types';

/** A tick this long after the planned time asks when it was really taken. */
export const LATE_TICK_MIN = 120;

/** The planned time of a checklist slot, in minutes after midnight. */
export function slotTime(slot: string, settings: Pick<Settings, 'places'>, day: Pick<Day, 'place' | 'placeChanges'> | undefined): number {
  const s = slot.trim().toLowerCase();
  if (s === 'morning') return mealTimesFor(settings, placeFor(day, settings)).breakfast;
  if (s === 'night') return 1380;
  const twelve = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (twelve) {
    const h = Number(twelve[1]) % 12;
    return (h + (twelve[3] === 'pm' ? 12 : 0)) * 60 + Number(twelve[2] ?? 0);
  }
  const clock = s.match(/^(\d{1,2}):(\d{2})$/);
  if (clock && Number(clock[1]) < 24) return Number(clock[1]) * 60 + Number(clock[2]);
  return 720;
}

/** True when a tick made now would be more than two hours after the slot on its date. */
export function isLateTick(date: DayKey, slotMin: number, now: number): boolean {
  return now - atOn(date, slotMin) > LATE_TICK_MIN * 60_000;
}

export type SlotStatus = { kind: 'taken'; at: number } | { kind: 'missed' } | { kind: 'not-logged' };

export function slotStatus(day: Pick<Day, 'ticks' | 'missed'> | undefined, key: string): SlotStatus {
  const at = day?.ticks?.[key];
  if (at !== undefined) return { kind: 'taken', at };
  if (day?.missed?.[key]) return { kind: 'missed' };
  return { kind: 'not-logged' };
}
