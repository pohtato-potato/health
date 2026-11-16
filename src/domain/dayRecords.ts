// O41 9 (O42 finding 33): a closed day that beats every earlier day gets its own moment. Pure.
// Steps, sleep and protein are the day's own totals; training is a set marked as a record that day. Nothing here
// rewards eating less: protein counts up only, and calories never enter.
import type { DayKey } from './dates';
import { fmtDayMonth, fmtInt } from './format';
import { sleepMinutes } from './rings';
import type { Day, FoodEntry, SetEntry } from './types';

export type RecordKind = 'steps' | 'sleep' | 'protein' | 'training';
/** `value` is the big figure, `sub` the words under it, `line` the two as one sentence. */
export interface DayRecord { kind: RecordKind; value: string; sub: string; line: string; was?: string; wasOn?: DayKey }

const hm = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;

/** The best earlier day for a measure: its value and date. */
function bestBefore(date: DayKey, rows: { date: DayKey; v: number }[]): { v: number; date: DayKey } | undefined {
  let best: { v: number; date: DayKey } | undefined;
  for (const r of rows) if (r.date < date && (!best || r.v > best.v)) best = r;
  return best;
}

export function dayRecords(date: DayKey, days: Day[], entries: FoodEntry[], sets: SetEntry[]): DayRecord[] {
  const out: DayRecord[] = [];
  const check = (kind: RecordKind, rows: { date: DayKey; v: number }[], fmt: (v: number) => string, what: string) => {
    const now = rows.find((r) => r.date === date);
    const was = bestBefore(date, rows);
    if (!now || !was || now.v <= was.v) return; // a first day is not a record: there is nothing to beat
    const sub = `${what}, past your best of ${fmt(was.v)} on ${fmtDayMonth(was.date)}.`;
    out.push({ kind, value: fmt(now.v), sub, line: `${fmt(now.v)} ${sub}`, was: fmt(was.v), wasOn: was.date });
  };
  check('steps', days.filter((d) => d.steps !== undefined).map((d) => ({ date: d.date, v: d.steps! })), fmtInt, 'steps');
  check('sleep', days.filter((d) => d.sleep).map((d) => ({ date: d.date, v: sleepMinutes(d.sleep!.asleep, d.sleep!.woke) })), hm, 'asleep');
  const protein = new Map<DayKey, number>();
  for (const e of entries) protein.set(e.date, (protein.get(e.date) ?? 0) + e.protein);
  check('protein', [...protein].map(([d, v]) => ({ date: d, v: Math.round(v) })), (v) => `${v} g`, 'of protein');
  const best = sets.filter((s) => s.date === date && s.mark === '!!' && !s.skipped);
  if (best.length) {
    const names = [...new Set(best.map((s) => s.exercise))];
    const value = best.length === 1 ? 'A new best' : `${best.length} new bests`;
    out.push({ kind: 'training', value, sub: `${names.join(', ')}.`, line: `${value}: ${names.join(', ')}.` });
  }
  return out;
}
