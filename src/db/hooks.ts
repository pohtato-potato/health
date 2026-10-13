import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { dayKey, type DayKey } from '../domain/dates';
import type { Day, Food, FoodEntry, Measurement, SetEntry, Settings, TrainingSession } from '../domain/types';
import { defaultSettings } from './actions';
import { db } from './db';
import { realSets } from '../domain/plan';

/** Undefined while loading, then the settings (defaults if none saved yet). */
export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => (await db.settings.get('app')) ?? defaultSettings(), []);
}

export function useDay(date: DayKey): Day | undefined | null {
  return useLiveQuery(async () => (await db.days.get(date)) ?? null, [date]);
}

export function useDays(from: DayKey, to: DayKey): Day[] | undefined {
  return useLiveQuery(() => db.days.where('date').between(from, to, true, true).toArray(), [from, to]);
}

export function useAllDays(): Day[] | undefined {
  return useLiveQuery(() => db.days.toArray(), []);
}

export function useEntries(date: DayKey): FoodEntry[] | undefined {
  return useLiveQuery(async () => (await db.entries.where('date').equals(date).toArray()).sort((a, b) => a.at - b.at), [date]);
}

export function useEntriesBetween(from: DayKey, to: DayKey): FoodEntry[] | undefined {
  return useLiveQuery(() => db.entries.where('date').between(from, to, true, true).toArray(), [from, to]);
}

export function useAllEntries(): FoodEntry[] | undefined {
  return useLiveQuery(() => db.entries.toArray(), []);
}

export function useFoods(): Food[] | undefined {
  return useLiveQuery(async () => (await db.foods.toArray()).sort((a, b) => a.name.localeCompare(b.name)), []);
}

export function useSessions(): TrainingSession[] | undefined {
  return useLiveQuery(async () => (await db.sessions.toArray()).sort((a, b) => a.startedAt - b.startedAt), []);
}

export function useActiveSession(): TrainingSession | undefined | null {
  return useLiveQuery(async () => (await db.sessions.where('status').equals('active').first()) ?? null, []);
}

/** Every set that was done. Skipped sets are left out of every stat. */
export function useAllSets(): SetEntry[] | undefined {
  return useLiveQuery(async () => realSets(await db.sets.toArray()).sort((a, b) => a.at - b.at), []);
}

/** Every set including skipped ones, for the session screen's own flow. */
export function useAllSetsWithSkips(): SetEntry[] | undefined {
  return useLiveQuery(async () => (await db.sets.toArray()).sort((a, b) => a.at - b.at), []);
}

export function useMeasurements(): Measurement[] | undefined {
  return useLiveQuery(async () => (await db.measurements.toArray()).sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at), []);
}

/** Today's date, which rolls over at midnight while the app is open. */
export function useToday(): DayKey {
  const [today, setToday] = useState(dayKey());
  useEffect(() => {
    const tick = () => setToday(dayKey());
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}

/** The current time, refreshed every `ms`. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
