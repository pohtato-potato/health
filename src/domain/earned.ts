import type { Sighting } from './creatures';
import type { DayKey } from './dates';
import { fmtInt } from './format';
import type { Day, SetEntry, TrainingSession } from './types';
import { kmFromSteps, setStride } from './walk';

export interface Odometer { id: string; value: string; label: string }
export interface Dated { id: string; date: DayKey; text: string }
export interface Moment { id: string; at: number; kind: string; date: DayKey; payload: { text: string } }
export interface Shelf { month: string; items: Dated[] }
export interface Stretch { region: string; here: boolean; visitors: { id: string; visits: number; stage: number }[] }

const DONE = (s: TrainingSession) => s.status === 'done';
const STEP_FIRST = 10000;
const KM_MARKS = [100, 500, 1000, 2000];
const SESSION_MARKS = [10, 50, 100, 250];

/** Lifetime totals. Skipped sets count for nothing. */
export function odometers(i: { days: Day[]; sessions: TrainingSession[]; sets: SetEntry[] }): Odometer[] {
  const steps = i.days.reduce((n, d) => n + (d.steps ?? 0), 0);
  const sessions = i.sessions.filter(DONE).length;
  const moved = i.sets.filter((s) => !s.skipped).reduce((n, s) => n + (s.loadKg ?? 0) * (s.reps ?? 0), 0);
  const nights = i.days.filter((d) => d.sleep).length;
  const out: Odometer[] = [];
  if (steps) out.push({ id: 'steps', value: fmtInt(steps), label: 'steps walked' });
  if (sessions) out.push({ id: 'sessions', value: fmtInt(sessions), label: 'sessions finished' });
  if (moved) out.push({ id: 'moved', value: fmtInt(moved), label: 'kg moved' });
  if (nights) out.push({ id: 'nights', value: fmtInt(nights), label: 'nights logged' });
  return out;
}

function earliest<T>(xs: T[], date: (x: T) => DayKey): T | undefined {
  return xs.length ? xs.reduce((a, b) => (date(b) < date(a) ? b : a)) : undefined;
}

/** Each first, oldest first. */
export function firsts(i: { days: Day[]; sessions: TrainingSession[]; sets: SetEntry[]; sightings: Sighting[] }): Dated[] {
  const out: Dated[] = [];
  const steps = earliest(i.days.filter((d) => (d.steps ?? 0) >= STEP_FIRST), (d) => d.date);
  if (steps) out.push({ id: 'steps', date: steps.date, text: `First ${fmtInt(STEP_FIRST)}-step day` });
  const session = earliest(i.sessions.filter(DONE), (s) => s.date);
  if (session) out.push({ id: 'session', date: session.date, text: 'First session' });
  const record = earliest(i.sets.filter((s) => s.mark === '!!' && !s.skipped), (s) => s.date);
  if (record) out.push({ id: 'record', date: record.date, text: 'First record' });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Named marks, each dated on the day it was crossed. */
export function milestones(i: { days: Day[]; sessions: TrainingSession[]; stride?: number }): Dated[] {
  const out: Dated[] = [];
  const sessions = i.sessions.filter(DONE).sort((a, b) => a.date.localeCompare(b.date));
  for (const m of SESSION_MARKS) if (sessions.length >= m) out.push({ id: `s${m}`, date: sessions[m - 1].date, text: `${m} sessions` });
  if (i.stride !== undefined) setStride(i.stride);
  let steps = 0;
  const marks = [...KM_MARKS];
  for (const d of [...i.days].sort((a, b) => a.date.localeCompare(b.date))) {
    steps += d.steps ?? 0;
    while (marks.length && kmFromSteps(steps) >= marks[0]) {
      const m = marks.shift()!;
      out.push({ id: `km${m}`, date: d.date, text: `${fmtInt(m)} km on the road` });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** The month's moments, newest month first. Records and achievements fill back the months before any moment was kept. */
export function shelves(i: { moments: Moment[]; achievements: { id: string; date: DayKey; name?: string }[]; sets: SetEntry[] }): Shelf[] {
  const items: Dated[] = [
    ...i.moments.map((m) => ({ id: m.id, date: m.date, text: m.payload.text })),
    ...i.achievements.map((a) => ({ id: `ach:${a.id}`, date: a.date, text: a.name ?? 'An achievement' })),
    ...i.sets.filter((s) => s.mark === '!!' && !s.skipped).map((s) => ({ id: `rec:${s.id}`, date: s.date, text: `Record: ${s.exercise}` })),
  ];
  const months = new Map<string, Dated[]>();
  for (const x of items) months.set(x.date.slice(0, 7), [...(months.get(x.date.slice(0, 7)) ?? []), x]);
  return [...months.keys()].sort().reverse().map((month) => ({
    month,
    items: months.get(month)!.sort((a, b) => b.date.localeCompare(a.date)),
  }));
}
