// Today's dice (desk spec §2, decision 12.1 a). Pure. One die per axis from yesterday's 1–20 score by fixed bands,
// so the die is an honest picture of the day. No roll: the die shows what the axis scored. Nothing here reads the
// time a log was made, only the day's totals.
import { checklistShare, sleepHours, type AxisInput } from '../axes';
import { AXES, type Axis, type AxisFlags, type AxisValues } from '../types';
import type { Die, DieValue } from './types';

/** 1–3 is a 1, 4–6 a 2, 7–9 a 3, 10–12 a 4, 13–16 a 5, 17–20 a 6. */
export function dieFromScore(score: number): DieValue {
  const s = Math.round(score);
  return s <= 3 ? 1 : s <= 6 ? 2 : s <= 9 ? 3 : s <= 12 ? 4 : s <= 16 ? 5 : 6;
}

/** A day that gives every axis its 28-day form instead of the day. */
export const FORM_STATUSES = ['sick', 'injured', 'travelling'] as const;
export const formDay = (status?: string) => (FORM_STATUSES as readonly string[]).includes(status ?? '');
/** Days the form looks back over. */
export const FORM_DAYS = 28;

/** The 28-day form on one axis: the median of the days it really scored. Undefined: nothing to go on. */
export function formOf(scores: number[]): number | undefined {
  if (!scores.length) return undefined;
  const xs = [...scores].sort((a, b) => a - b), mid = xs.length >> 1;
  return Math.round(xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2);
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const word = (n: number, cap = true) => { const w = WORDS[n] ?? String(n); return cap ? w : w.toLowerCase(); };
/** "Four and a half hours", "Seven hours", "Twelve hours". */
export function hoursInWords(h: number): string {
  const half = Math.round(h * 2) / 2, whole = Math.floor(half);
  if (half < 1) return 'Under an hour';
  return `${word(whole)}${half > whole ? ' and a half' : ''} ${whole === 1 && half === whole ? 'hour' : 'hours'}`;
}

/** The reason under each die (p3-dice): what yesterday held, in plain words. */
export function reasonFor(axis: Axis, i: AxisInput): string {
  const d = i.day, t = i.targets;
  switch (axis) {
    case 'Pace': return `${(d?.steps ?? 0).toLocaleString('en-GB')} steps`;
    case 'Power': {
      const done = i.sessionsToday.filter((s) => s.status === 'done');
      if (done.length >= 2) return 'Trained twice';
      if (done.length) return done.some((s) => !s.short) ? 'A session done' : 'A short session';
      const kept = (i.daysSinceLast !== undefined && i.daysSinceLast <= 2) || t.sessionsPerWeek - i.weekDoneBefore <= 7 - i.weekdayMon1;
      return kept ? 'A rest day, kept' : 'A rest day, missed';
    }
    case 'Fuel': {
      const prot = i.protein >= t.proteinG ? 'Protein in' : 'Protein short';
      const cal = i.kcal >= t.kcalMin && i.kcal <= t.kcalMax ? 'calories in range' : i.kcal < t.kcalMin ? 'calories under' : 'calories over';
      return `${prot}, ${cal}`;
    }
    case 'Rest': return d?.sleep ? hoursInWords(sleepHours(d.sleep)) : 'No sleep logged';
    case 'Routine': {
      const keys = i.checklist.filter((c) => c.active && !c.med).flatMap((c) => c.slots.map((_, k) => `${c.id}:${k}`));
      const ticked = keys.filter((k) => d?.ticks?.[k] != null).length;
      return `${word(ticked)} of ${word(keys.length, false)} ticked`;
    }
    case 'Shape': return `Weighed in ${word(Math.min(7, i.weighIns7), false)} ${i.weighIns7 === 1 ? 'day' : 'days'} of seven`;
  }
}

const FORM_WHY: Record<string, string> = { sick: 'A sick day', injured: 'Injured', travelling: 'Travelling' };

export interface DiceInput {
  /** Yesterday's sealed values and flags (the night the match used), and the input behind them. */
  values: AxisValues;
  flags: AxisFlags;
  input: AxisInput;
  /** Yesterday's status. */
  status?: string;
  /** Each axis's real scores over the 28 days before yesterday (days it was logged). */
  history: Partial<Record<Axis, number[]>>;
}

/**
 * The day's dice. An axis with nothing logged gives no die. A sick, injured or travel day gives every axis its
 * 28-day form instead (an axis with no form gives no die).
 */
export function diceFor(o: DiceInput): Die[] {
  const out: Die[] = [];
  if (formDay(o.status)) {
    for (const axis of AXES) {
      const f = formOf(o.history[axis] ?? []);
      if (f !== undefined) out.push({ axis, value: dieFromScore(f), score: f, reason: `${FORM_WHY[o.status!]}: your 28-day form`, form: true });
    }
    return out;
  }
  for (const axis of AXES) {
    if (o.flags[axis]) continue; // not logged, or no data: no die
    if (axis === 'Routine' && checklistShare(o.input.checklist, o.input.day) === 'none') continue;
    out.push({ axis, value: dieFromScore(o.values[axis]), score: o.values[axis], reason: reasonFor(axis, o.input) });
  }
  return out;
}
