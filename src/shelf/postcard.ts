import { addDays, dayKey } from '../domain/dates';
import type { CheckIn, Day, TargetsRecord, TrainingSession } from '../domain/types';
import { targetsOn } from '../domain/rings';
import { positionAt } from '../domain/walk';
import type { Card, HealthDay } from './shelf';

/* Health's day for Logbook: one small summary per finished day, left on the shared shelf (version 2) as a health.day v2 card.
   Health only writes it; Logbook only reads it. The shape is the suite's contract (src/shelf/shelf.ts, a byte-identical copy),
   pinned by tests/fixtures/shelf/health.day-v2.json. Version 1 never shipped. */
export type DayCard = Card<'health.day', HealthDay>;
const hm = (m: number) => `${Math.floor(m / 60)} h ${m % 60} m`;
export function buildDayCard(date: string, day: Pick<Day, 'date' | 'steps' | 'sleep'> | undefined, sessions: TrainingSession[], checkins: CheckIn[], targets: TargetsRecord[], kmToDate: number, now = Date.now()): DayCard {
  const t = targetsOn(targets, date), steps = day?.steps ?? null;
  const sleepMin = day?.sleep ? (day.sleep.woke - day.sleep.asleep + 1440) % 1440 : null;
  const done = sessions.filter(s => s.date === date && s.status === 'done' && s.endedAt);
  const workout = done.length ? { name: done[0].session || done[0].planName, minutes: Math.round(done.reduce((a, s) => a + (s.endedAt! - s.startedAt), 0) / 60_000) } : null;
  const ci = checkins.filter(c => c.date === date).sort((a, b) => a.at - b.at)[0];
  const pos = kmToDate > 0 ? positionAt(kmToDate) : null;
  const ring = (v: number | null, goal?: number) => (v == null || !goal ? 0 : Math.min(1, Math.round((v / goal) * 1000) / 1000));
  const parts = [steps != null && `${steps.toLocaleString('en-GB')} steps`, sleepMin != null && `${hm(sleepMin)} of sleep`, workout ? `${workout.name.toLowerCase()} for ${workout.minutes} minutes` : (steps != null || sleepMin != null) && 'a rest day'].filter(Boolean) as string[];
  const data: HealthDay = {
    day: date, steps, sleepMin, workout, checkin: ci ? { at: ci.at } : null,
    walk: pos ? { km: Math.round(pos.km * 10) / 10, place: pos.from.name, ...(pos.to ? { next: pos.to.name } : {}) } : null,
    rings: { workout: workout ? 1 : 0, sleep: ring(sleepMin, t?.sleepMin), steps: ring(steps, t?.steps) },
    line: parts.length ? `${parts.join(', ').replace(/^./, c => c.toUpperCase())}.` : 'Nothing logged that day.',
  };
  return { id: `health.day:${date}`, format: 'health.day', version: 2, from: 'health', to: 'logbook', about: { day: date }, writtenAt: now, data };
}
/* The finished days to send: the last week, and yesterday only from noon on (so late entries are in). */
export function daysToSend(now: Date): string[] {
  const today = dayKey(now), out: string[] = [];
  for (let k = 1; k <= 7; k++) out.push(addDays(today, -k));
  return now.getHours() >= 12 ? out : out.slice(1);
}
