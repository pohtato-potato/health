import type { DayKey } from './dates';

/** A number put right after the fact, with why. It shows wherever that number does. */
export interface Correction { id: string; at: number; date: DayKey; what: string; was: string; now: string; note: string }

export const correctionsIn = (from: DayKey, to: DayKey, list: Correction[]): Correction[] =>
  list.filter((c) => c.date >= from && c.date <= to).sort((a, b) => a.date.localeCompare(b.date));
