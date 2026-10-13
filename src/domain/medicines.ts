import { slotTime } from './checklist';
import { addDays, atOn, type DayKey } from './dates';
import type { ChecklistItem, Day, MedRewards, Settings } from './types';

/** On time means ticked within an hour either side of the planned time. */
export const ON_TIME_MIN = 60;

export const DEFAULT_MED_REWARDS: MedRewards = { lantern: true, keptWeek: true, perfectDay: false, keptCount: true };

export function onTime(tick: number, planned: number): boolean {
  return Math.abs(tick - planned) <= ON_TIME_MIN * 60_000;
}

/** The slots an item has on a date: the latest course that has started, else its own slots. */
export function courseOn(date: DayKey, item: Pick<ChecklistItem, 'slots' | 'med'>): string[] {
  const started = (item.med?.courses ?? []).filter((c) => c.from <= date).sort((a, b) => a.from.localeCompare(b.from));
  return started.length ? started[started.length - 1].slots : item.slots;
}

/** The slots of an item on a date, or one "Daily" slot when it has none set. */
function slotsOn(date: DayKey, item: ChecklistItem): string[] {
  const s = courseOn(date, item);
  return s.length || item.med?.courses?.some((c) => c.from <= date) ? s : ['Daily'];
}

export interface Dose {
  key: string;
  itemId: string;
  name: string;
  slot: string;
  /** Planned time. */
  at: number;
}

type DayLike = Pick<Day, 'date'> & Partial<Pick<Day, 'ticks' | 'missed' | 'place' | 'placeChanges'>>;

/** Every planned dose of a date, in time order. */
export function doseSchedule(items: ChecklistItem[], date: DayKey, settings: Pick<Settings, 'places'>, day: DayLike | undefined): Dose[] {
  return items
    .filter((i) => i.active)
    .flatMap((i) => slotsOn(date, i).map((slot, n) => ({ key: `${i.id}:${n}`, itemId: i.id, name: i.name, slot, at: atOn(date, slotTime(slot, settings, day)) })))
    .sort((a, b) => a.at - b.at);
}

/** The next untaken dose, counting one up to an hour overdue. */
export function nextDose(now: number, schedule: Dose[], ticks: Record<string, number> | undefined, missed?: Record<string, true>): Dose | undefined {
  return schedule.find((d) => ticks?.[d.key] === undefined && !missed?.[d.key] && d.at >= now - ON_TIME_MIN * 60_000);
}

/** The day the last dose in stock is taken: refill by then. */
export function refillBy(stock: { left: number; perDose: number }, item: ChecklistItem, from: DayKey): DayKey {
  let left = stock.left;
  const per = Math.max(stock.perDose, 0.0001);
  for (let i = 0; i < 400; i++) {
    const date = addDays(from, i);
    for (let n = 0; n < slotsOn(date, item).length; n++) {
      if (left < per) return date;
      left -= per;
      if (left < per) return date;
    }
  }
  return addDays(from, 400);
}

type Verdict = 'on-time' | 'late' | 'missed' | 'pending';

function verdicts(item: ChecklistItem, day: DayLike, settings: Pick<Settings, 'places'>, now: number): Verdict[] {
  return doseSchedule([item], day.date, settings, day).map((d) => {
    const t = day.ticks?.[d.key];
    if (t !== undefined) return onTime(t, d.at) ? 'on-time' : 'late';
    if (day.missed?.[d.key] || d.at + ON_TIME_MIN * 60_000 < now) return 'missed';
    return 'pending';
  });
}

/** A day's doses: on time, late, and missed (marked, or untaken an hour after their time). */
export function dayDoses(items: ChecklistItem[], day: DayLike, settings: Pick<Settings, 'places'>, now = Date.now()) {
  const v = items.filter((i) => i.active).flatMap((i) => verdicts(i, day, settings, now));
  return { planned: v.length, onTime: v.filter((x) => x === 'on-time').length, late: v.filter((x) => x === 'late').length, missed: v.filter((x) => x === 'missed').length };
}

/** On-time doses before today. A miss pauses the count instead of wiping it. */
export function keptCount(item: ChecklistItem, days: DayLike[], settings: Pick<Settings, 'places'>, today: DayKey): { count: number; paused: boolean } {
  let count = 0;
  let paused = false;
  for (const d of [...days].filter((x) => x.date < today).sort((a, b) => a.date.localeCompare(b.date))) {
    for (const v of verdicts(item, d, settings, Infinity)) {
      if (v === 'on-time') {
        count++;
        paused = false;
      } else paused = true;
    }
  }
  return { count, paused };
}

/** Every dose of the seven days from weekStart was on time. */
export function keptWeek(items: ChecklistItem[], days: DayLike[], settings: Pick<Settings, 'places'>, weekStart: DayKey): boolean {
  const meds = items.filter((i) => i.active && i.med);
  if (!meds.length) return false;
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const day = days.find((d) => d.date === date) ?? { date };
    const s = dayDoses(meds, day, settings, Infinity);
    if (s.onTime !== s.planned) return false;
  }
  return true;
}

/** The colour of a day in the last-week strip. */
export function dayTone(s: ReturnType<typeof dayDoses>): 'none' | 'on-time' | 'late' | 'missed' {
  if (!s.planned) return 'none';
  if (s.missed) return 'missed';
  if (s.late) return 'late';
  return 'on-time';
}

/** Every planned dose of the day was on time (and there was at least one). */
export function allOnTime(items: ChecklistItem[], day: DayLike, settings: Pick<Settings, 'places'>): boolean {
  const meds = items.filter((i) => i.active && i.med);
  if (!meds.length) return false;
  const s = dayDoses(meds, day, settings, Infinity);
  return s.planned > 0 && s.onTime === s.planned;
}

/** A lantern at that night's camp: the reward is on and every dose was on time. */
export function lanternOn(settings: Pick<Settings, 'places' | 'checklist' | 'medRewards'>, day: DayLike | undefined): boolean {
  return !!day && (settings.medRewards ?? DEFAULT_MED_REWARDS).lantern && allOnTime(settings.checklist, day, settings);
}

/** With the perfect-day reward on, a perfect day also needs every dose on time. */
export function dosesAllowPerfect(settings: Pick<Settings, 'places' | 'checklist' | 'medRewards'>, day: DayLike): boolean {
  if (!(settings.medRewards ?? DEFAULT_MED_REWARDS).perfectDay) return true;
  if (!settings.checklist.some((i) => i.active && i.med)) return true;
  return allOnTime(settings.checklist, day, settings);
}
