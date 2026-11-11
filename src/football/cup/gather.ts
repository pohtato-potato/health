// Reads the owner's last seven days for the deck dealer. Pure over a loaded Health: the league's own nightly axis
// values (nightFor), the day's status, and day totals only, never the time anything was logged.
import { addDays, type DayKey } from '../../domain/dates';
import { ringsFor } from '../../domain/rings';
import { sleepMinutes } from '../../domain/rings';
import { targetsFor } from '../../state/derived';
import { nightFor, type Health } from '../store/gather';
import { AXES, type Axis } from '../types';
import type { DealDay, DealInput } from './deck';

const AWAY = ['sick', 'injured', 'travelling'];
/** Days with nothing logged before the window that make the first week after them count as a fresh start. */
export const LONG_GAP = 14;

function anything(h: Health, d: DayKey): boolean {
  const day = h.days.get(d);
  const food = (h.kcal.get(d)?.n ?? 0) > 0 || !!day?.foodDone;
  const ticks = !!day?.ticks && Object.keys(day.ticks).length > 0;
  return food || ticks || day?.steps != null || !!day?.sleep || day?.weightKg != null || h.sessions.some((s) => s.date === d);
}

function perfectOn(h: Health, d: DayKey): boolean {
  const day = h.days.get(d);
  const k = h.kcal.get(d);
  if (!day && !k) return false;
  const sleep = day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : undefined;
  const totals = { kcal: k?.kcal ?? 0, protein: k?.protein ?? 0, steps: day?.steps ?? 0, waterMl: day?.waterMl ?? 0, freeMeal: false, entries: k?.n ?? 0, eased: day?.eased, sleep, fourRings: true };
  return ringsFor(totals, targetsFor(h.settings, d)).perfect;
}

export function dealDayFor(h: Health, d: DayKey): DealDay {
  const n = nightFor(h, d);
  const day = h.days.get(d);
  const records = [...new Set(h.sets.filter((x) => x.date === d && x.mark === '!!').map((x) => x.exercise))];
  return { date: d, values: n.values, flags: n.flags, status: day?.status, empty: !anything(h, d), perfect: perfectOn(h, d), records };
}

/** Each axis's average over its logged nights in the 28 days before today, leaving out sick and travelling days. */
export function form28(h: Health, today: DayKey): Partial<Record<Axis, number>> {
  const sum: Partial<Record<Axis, [number, number]>> = {};
  for (let i = 1; i <= 28; i++) {
    const d = addDays(today, -i);
    const st = h.days.get(d)?.status;
    if (st && AWAY.includes(st)) continue;
    const n = nightFor(h, d);
    for (const a of AXES) {
      if (n.flags[a]) continue;
      const x = sum[a] ?? [0, 0];
      sum[a] = [x[0] + n.values[a], x[1] + 1];
    }
  }
  const out: Partial<Record<Axis, number>> = {};
  for (const a of AXES) if (sum[a]) out[a] = sum[a]![0] / sum[a]![1];
  return out;
}

/** The first week of the app, or the first after a long gap (spec §12). */
export function firstWeek(h: Health, today: DayKey): boolean {
  const start = addDays(today, -7);
  for (let i = 1; i <= LONG_GAP; i++) if (anything(h, addDays(start, -i))) return false;
  return true;
}

export function dealInputFor(h: Health, today: DayKey, loans: DealInput['loans'] = []): DealInput {
  const days = Array.from({ length: 7 }, (_, i) => dealDayFor(h, addDays(today, i - 7)));
  return { days, form28: form28(h, today), firstWeek: firstWeek(h, today), loans };
}
