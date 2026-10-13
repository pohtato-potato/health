import { daysBetween, addDays, type DayKey } from '../domain/dates';
import { placeFor } from '../domain/places';
import { realSets } from '../domain/plan';
import { bandFor, DEFAULT_WEIGHTS, readinessScore, type Readiness, type ReadinessInputs } from '../domain/readiness';
import { sleepMinutes, stepsGoal } from '../domain/rings';
import type { Day, SetEntry, Settings, TrainingSession } from '../domain/types';
import { doneSessions, targetsFor } from './derived';

/** Gathers the eleven readiness inputs for a day from what has been logged. */
export function readinessInputsFor(settings: Settings, today: DayKey, days: Day[], sessions: TrainingSession[], sets: SetEntry[], flagDates: DayKey[], now = new Date()): ReadinessInputs {
  const day = days.find((d) => d.date === today);
  const yesterday = days.find((d) => d.date === addDays(today, -1));
  const t = targetsFor(settings, today);
  const done = doneSessions(sessions).filter((s) => s.date < today);
  const last = done[done.length - 1];
  const lastFlag = [...flagDates].sort().pop();
  const lastSets = last ? realSets(sets).filter((x) => x.sessionId === last.id && x.rir !== undefined) : [];
  return {
    sleepNeed: t.sleepMin,
    sleepMin: day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : undefined,
    rested: day?.sleep?.rested,
    office: day ? placeFor(day, settings).kind === 'office' : undefined,
    stomach: day?.stomach,
    soreness: day?.soreness,
    sessionsSinceFlag: lastFlag ? done.filter((s) => s.date > lastFlag).length : undefined,
    energy: day?.energy,
    lastRir: lastSets.length ? lastSets.reduce((n, x) => n + (x.rir ?? 0), 0) / lastSets.length : undefined,
    restDays: last ? Math.max(0, daysBetween(last.date, today) - 1) : undefined,
    stepsYesterday: yesterday?.steps,
    stepsGoal: stepsGoal(t, false),
    hour: now.getHours(),
  };
}

/** Today's readiness with its reasons, using the refitted weights when there are any. */
export function readinessFor(settings: Settings, today: DayKey, days: Day[], sessions: TrainingSession[], sets: SetEntry[], flagDates: DayKey[], now = new Date()): Readiness {
  const r = readinessScore(readinessInputsFor(settings, today, days, sessions, sets, flagDates, now), settings.readinessWeights?.weights ?? DEFAULT_WEIGHTS);
  return { ...r, ...bandFor(r.score) };
}
