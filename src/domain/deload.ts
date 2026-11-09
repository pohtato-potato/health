import { addDays, daysBetween, type DayKey } from './dates';
import { sleepMinutes } from './rings';
import type { BodyEntry, Day, HalfWhy, Occasion, SetEntry, Settings, TrainingSession } from './types';

/** Weeks of training before a lighter week is offered. */
export const LIGHTER_EVERY_WEEKS = 6;
/** Average sleep under this, over the last 7 days, counts toward a lighter week. */
export const SHORT_SLEEP_H = 6.5;
/** A gap this long between sessions is a break (a once-a-week rhythm isn't one). */
export const BREAK_DAYS = 10;

type Sess = Pick<TrainingSession, 'id' | 'date' | 'status' | 'exercises' | 'flags'>;

export interface LighterInput {
  sessions: Sess[];
  sets: Pick<SetEntry, 'sessionId' | 'exerciseId' | 'date' | 'discomfort'>[];
  days: Pick<Day, 'date' | 'status' | 'sleep'>[];
  body?: Pick<BodyEntry, 'date' | 'kind'>[];
  occasions?: Pick<Occasion, 'kind' | 'from' | 'to'>[];
  lighterWeek?: Settings['lighterWeek'];
}

const done = (xs: Sess[], today: DayKey) => xs.filter((s) => s.status === 'done' && s.date <= today).sort((a, b) => a.date.localeCompare(b.date));

/** A session that ended before reaching every exercise: one with no set at all, not even a skip. */
export function cutShort(s: Pick<TrainingSession, 'id' | 'exercises'>, sets: Pick<SetEntry, 'sessionId' | 'exerciseId'>[]): boolean {
  const mine = sets.filter((x) => x.sessionId === s.id);
  return mine.length > 0 && s.exercises.some((id) => !mine.some((x) => x.exerciseId === id));
}

/** A day marked sick: its status, or a sick occasion over it. */
export function sickOn(date: DayKey, days: Pick<Day, 'date' | 'status'>[], occasions: Pick<Occasion, 'kind' | 'from' | 'to'>[] = []): boolean {
  return days.some((d) => d.date === date && d.status === 'sick') || occasions.some((o) => o.kind === 'sick' && o.from <= date && o.to >= date);
}

/** The end of the last break before today: a gap of 10+ days between sessions, or a break or trip of 3+ days. */
export function lastBreakEnd(input: Pick<LighterInput, 'sessions' | 'occasions'>, today: DayKey): DayKey | undefined {
  const ds = done(input.sessions, today).map((s) => s.date);
  let end: DayKey | undefined;
  for (let i = 1; i < ds.length; i++) if (daysBetween(ds[i - 1], ds[i]) >= BREAK_DAYS) end = addDays(ds[i], -1);
  for (const o of input.occasions ?? []) {
    if ((o.kind === 'break' || o.kind === 'travel' || o.kind === 'injured') && daysBetween(o.from, o.to) >= 2 && o.to < today && (!end || o.to > end)) end = o.to;
  }
  return end;
}

/**
 * The case for a lighter week (coach reply 8 Nov §3): suggested when any 2 of the 5 rules hold. Evidence first; the owner decides.
 * 1. 6 weeks or more since the last lighter week or break (or the first session).
 * 2. 2 sessions cut short within 7 days.
 * 3. A pain flag twice within 14 days.
 * 4. Average sleep over the last 7 days under 6.5 h.
 * 5. Marked sick on 2 or more days within 7 days.
 */
export function lighterCase(input: LighterInput, today: DayKey): { due: boolean; evidence: string[]; rules: number } {
  const evidence: string[] = [];
  const all = done(input.sessions, today);
  const lastLighter = input.lighterWeek && input.lighterWeek.to < today ? input.lighterWeek.to : undefined;
  const brk = lastBreakEnd(input, today);
  const since = [lastLighter, brk].filter((x): x is DayKey => !!x).sort().pop();
  const counted = all.filter((s) => !since || s.date > since);
  if (counted.length) {
    const weeks = Math.floor(daysBetween(counted[0].date, today) / 7);
    if (weeks >= LIGHTER_EVERY_WEEKS) evidence.push(`${weeks} weeks of training since ${since ? (since === lastLighter ? 'the last lighter week' : 'the last break') : 'you started'}.`);
  }
  const week = addDays(today, -6);
  const short = all.filter((s) => s.date >= week && cutShort(s, input.sets));
  if (short.length >= 2) evidence.push(`${short.length} sessions ended early in the last 7 days.`);
  const fortnight = addDays(today, -13);
  const pains = new Set<string>();
  for (const b of input.body ?? []) if ((b.kind === 'pain' || b.kind === 'strain') && b.date >= fortnight && b.date <= today) pains.add(`b:${b.date}`);
  for (const s of input.sets) if (s.discomfort && s.date >= fortnight && s.date <= today) pains.add(`s:${s.sessionId}`);
  for (const s of all) if (s.date >= fortnight && s.flags?.length) pains.add(`f:${s.id}`);
  if (pains.size >= 2) evidence.push(`Pain came up ${pains.size} times in the last 14 days.`);
  const nights = input.days.filter((d) => d.date >= week && d.date <= today && d.sleep).map((d) => sleepMinutes(d.sleep!.asleep, d.sleep!.woke));
  if (nights.length >= 3) {
    const avg = nights.reduce((a, b) => a + b, 0) / nights.length / 60;
    if (avg < SHORT_SLEEP_H) evidence.push(`Sleep averaged ${Math.floor(avg)} h ${Math.round((avg % 1) * 60)} min over the last ${nights.length} nights.`);
  }
  let sick = 0;
  for (let d = week; d <= today; d = addDays(d, 1)) if (sickOn(d, input.days, input.occasions)) sick++;
  if (sick >= 2) evidence.push(`Marked sick on ${sick} days this week.`);
  return { due: evidence.length >= 2, evidence, rules: evidence.length };
}

/** A lighter week the owner accepted, running today. */
export function lighterOn(lw: Settings['lighterWeek'], today: DayKey): boolean {
  return !!lw && today >= lw.from && today <= lw.to;
}

/**
 * Why tonight is at half sets, if it is: a lighter week; the first session after a lighter week, a break,
 * or 2+ sick days ("back"). A sick day itself is only offered (see `sickOn`), never imposed.
 */
export function halfWhy(input: LighterInput, today: DayKey): HalfWhy | undefined {
  if (lighterOn(input.lighterWeek, today)) return 'lighter-week';
  const all = done(input.sessions, today);
  const last = all[all.length - 1];
  if (!last) return undefined;
  if (last.date === today) return undefined;
  const lw = input.lighterWeek;
  if (lw && lw.to < today && last.date <= lw.to) return 'back';
  if (daysBetween(last.date, today) >= BREAK_DAYS) return 'back';
  const brk = lastBreakEnd(input, today);
  if (brk && brk > last.date) return 'back';
  let sick = 0;
  for (let d = addDays(last.date, 1); d < today; d = addDays(d, 1)) if (sickOn(d, input.days, input.occasions)) sick++;
  return sick >= 2 ? 'back' : undefined;
}

/** Half the sets, never fewer than one. */
export const halfSets = (sets: number) => Math.max(1, Math.ceil(sets / 2));

export const HALF_TEXT: Record<HalfWhy, string> = {
  'lighter-week': 'Lighter week',
  back: 'First session back',
  sick: 'Sick-day version',
};

/** What a half-set night asks, in one line. */
export const HALF_RULES = 'Half the sets, stop 3 reps short, no record chasing.';
