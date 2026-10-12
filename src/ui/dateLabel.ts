import { addDays, type DayKey } from '../domain/dates';
import { fmtDayShort } from '../domain/format';

/** "Today", "Yesterday", or "Sat 10 Oct". */
export function dateChipLabel(value: DayKey, today: DayKey): string {
  if (value === today) return 'Today';
  if (value === addDays(today, -1)) return 'Yesterday';
  return fmtDayShort(value);
}
