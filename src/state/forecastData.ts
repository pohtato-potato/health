import { addDays, weekday, type DayKey } from '../domain/dates';
import { forecasts, pickForecast, type Forecast } from '../domain/forecast';
import { findSession } from '../domain/plan';
import { beatChance, type Readiness } from '../domain/readiness';
import { readinessFor } from './readinessFor';
import { sleepMinutes } from '../domain/rings';
import { weightTrend } from '../domain/streaks';
import type { Day, FoodEntry, SetEntry, Settings, TrainingSession } from '../domain/types';
import { kmFromSteps, positionAt } from '../domain/walk';
import { doneSessions, flagEvents, nextUp, targetsFor, weeksFor } from './derived';

export interface ForecastData {
  readiness: Readiness;
  beat: { pct: number; learned: boolean };
  list: Forecast[];
  pick?: Forecast;
  sessionDue: boolean;
  records: string[];
}

export function forecastData(settings: Settings, today: DayKey, days: Day[], _entries: FoodEntry[], sessions: TrainingSession[], sets: SetEntry[], saved?: number): ForecastData {
  const day = days.find((d) => d.date === today);
  const events = flagEvents(settings.plan, sessions, days);
  const r = readinessFor(settings, today, days, sessions, sets, events.map((e) => e.date));
  const beat = beatChance(r.score, sessions, sets);
  const done = doneSessions(sessions);
  const weeks = weeksFor(settings, sessions, today);
  const up = nextUp(settings, sessions, sets, days);
  const trainedToday = done.some((s) => s.date === today);
  const active = sessions.some((s) => s.status === 'active');
  const sessionDue = !!up && !trainedToday && !active && weeks.thisWeek < weeks.perWeek;
  const records = up?.exercises.filter((e) => e.status.advice && e.status.advice.kind !== 'maxed').map((e) => e.status.name) ?? [];
  const t = targetsFor(settings, today);

  const sameWeekday = days.filter((d) => d.date < today && d.date >= addDays(today, -56) && weekday(d.date) === weekday(today) && d.steps !== undefined).map((d) => d.steps!);
  const lastFlag = events[events.length - 1];
  const steps = new Map(days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
  const km = kmFromSteps([...steps.values()].reduce((a, b) => a + b, 0));
  const pos = positionAt(km);
  const pace = kmFromSteps(Array.from({ length: 7 }, (_, i) => steps.get(addDays(today, -i)) ?? 0).reduce((a, b) => a + b, 0)) / 7;
  const trend = weightTrend(days.filter((d) => d.weightKg !== undefined && d.date >= addDays(today, -14)).map((d) => ({ date: d.date, kg: d.weightKg! })));

  const list = forecasts({
    today,
    hour: new Date().getHours(),
    readiness: r,
    beatPct: beat.pct,
    sessionDue,
    sessionName: up && settings.plan ? findSession(settings.plan, up.sessionId)?.name : undefined,
    sleepMin: day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : undefined,
    stepsTarget: t.steps,
    stepsToday: day?.steps,
    sameWeekday,
    readyToGoHeavier: records,
    sessionsLast5: done.filter((s) => s.date >= addDays(today, -4)).length,
    cleanSessions: lastFlag ? done.filter((s) => s.startedAt > lastFlag.at).length : undefined,
    flagGroup: lastFlag?.flag.group,
    nextStop: pos.to && pace > 0.1 ? { name: pos.to.name, days: Math.ceil((pos.to.km - km) / pace) } : undefined,
    flatWeeks: trend.length >= 10 && Math.abs(trend[trend.length - 1].trend - trend[0].trend) < 0.2 ? 2 : undefined,
    savedKcal: saved,
  });
  return { readiness: r, beat, list, pick: pickForecast(list, today), sessionDue, records };
}
