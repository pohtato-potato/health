// The treatment table (matchday spec §5, d-table, 12 Nov). On a sick day the physio asks one question: better, same
// or worse. Two "better" days in a row and the club announces a return date, the next day, which leads into the
// half-set first session back (already built). The sick-day match rule stays: the rotation squad plays.
import { addDays, type DayKey } from './dates';
import type { Day } from './types';

export type PhysioAnswer = NonNullable<Day['physio']>;
export const PHYSIO_ANSWERS: { id: PhysioAnswer; label: string }[] = [
  { id: 'better', label: 'Better' },
  { id: 'same', label: 'Same' },
  { id: 'worse', label: 'Worse' },
];

/** The physio's question waits on a sick day until it is answered. */
export function physioDue(day: Pick<Day, 'status' | 'physio'> | undefined): boolean {
  return day?.status === 'sick' && day.physio === undefined;
}

/** The return date, when today and the sick day before it were both "better": tomorrow. */
export function returnDate(days: Map<DayKey, Pick<Day, 'status' | 'physio'>>, today: DayKey): DayKey | undefined {
  const t = days.get(today), y = days.get(addDays(today, -1));
  if (t?.status !== 'sick' || y?.status !== 'sick') return undefined;
  return t.physio === 'better' && y.physio === 'better' ? addDays(today, 1) : undefined;
}

/** The physio's line after an answer. */
export function physioLine(a: PhysioAnswer, back?: DayKey): string {
  if (back) return 'Two better days running. The club has you back tomorrow, on a half-set first session.';
  if (a === 'better') return 'Good. One more day like this and we set a return date.';
  if (a === 'same') return 'Rest it is. The rotation squad has tonight covered.';
  return 'Noted. No rush: the rotation squad plays, and nothing is lost for it.';
}
