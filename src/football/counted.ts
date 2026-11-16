// Buildings say what counted (finding 12, O42): when a building began counting and the latest days that counted.
import type { DayKey } from '../domain/dates';

export const COUNTED_KEEP = 12;
export interface Counting { from?: DayKey; counted?: DayKey[] }
/** The record after a day: `from` set on its first day, the day added when anything counted. */
export function noteDay<S extends Counting>(s: S, date: DayKey, any: boolean): S {
  const from = s.from ?? date;
  if (!any) return s.from ? s : { ...s, from };
  const counted = [...(s.counted ?? []).filter((d) => d !== date), date].slice(-COUNTED_KEEP);
  return { ...s, from, counted };
}
