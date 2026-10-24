import { daysBetween, type DayKey } from '../domain/dates';
import { crossings } from '../domain/walk';
import type { SmallStop, Stretch } from './content/types';

/** The stretch you're on: from its first km up to (not including) its last. */
export function stretchAt(km: number, stretches: Stretch[]): Stretch | undefined {
  return stretches.find((s) => km >= s.fromKm && km < s.toKm);
}

/** The day of the stretch: 1 on the day you entered it, counting calendar days after. */
export function stretchDay(stepsByDay: Map<DayKey, number>, today: DayKey, s: Stretch): number {
  const entered = crossings(stepsByDay, [{ name: s.id, km: s.fromKm }])[0]?.date;
  return entered ? daysBetween(entered, today) + 1 : 1;
}

/** The last small stop reached on this day, if any. */
export function stopToday(stepsByDay: Map<DayKey, number>, today: DayKey, stops: SmallStop[]): SmallStop | undefined {
  const id = crossings(stepsByDay, stops.map((s) => ({ name: s.id, km: s.km })))
    .filter((c) => c.date === today)
    .at(-1)?.name;
  return stops.find((s) => s.id === id);
}

/** Every stretch whose end you've passed, in order. */
export function stretchesEnded(stepsByDay: Map<DayKey, number>, stretches: Stretch[]): Stretch[] {
  const ended = new Set(crossings(stepsByDay, stretches.map((s) => ({ name: s.id, km: s.toKm }))).map((c) => c.name));
  return stretches.filter((s) => ended.has(s.id));
}

/**
 * Which stretch's end to show now, and which ends to mark seen. The latest unseen end shows, and every ended
 * stretch is marked seen the moment it does, so however the sheet is left (a button, Back, another tab) it never
 * comes back, and a long gap never queues several.
 */
export function stretchEndToShow(stepsByDay: Map<DayKey, number>, stretches: Stretch[], seen: Set<string>): { show?: Stretch; next?: Stretch; markSeen: string[] } {
  const ended = stretchesEnded(stepsByDay, stretches);
  const show = ended.filter((s) => !seen.has(`walk-stretch:${s.id}`)).at(-1);
  if (!show) return { markSeen: [] };
  return { show, next: stretches[stretches.indexOf(show) + 1], markSeen: ended.map((s) => `walk-stretch:${s.id}`) };
}
