import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAllDays, useAllEntries, useAllSets, useMeasurements, useSessions, useSettings, useToday } from '../../db/hooks';
import { addDays, dayRange, type DayKey } from '../../domain/dates';
import { fmtDayMonth, fmtDayShort } from '../../domain/format';
import { homePlace, placeFor } from '../../domain/places';
import type { PlaceMarkKind } from '../../ui/PlaceIcon';
import type { CheckIn, Day, FoodEntry, Measurement, SetEntry, Settings, TrainingSession } from '../../domain/types';

export interface TrackData {
  settings: Settings;
  today: DayKey;
  days: Map<DayKey, Day>;
  entries: FoodEntry[];
  sessions: TrainingSession[];
  measurements: Measurement[];
  sets: SetEntry[];
  checkins: CheckIn[];
}

export function useTrackData(): TrackData | undefined {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const measurements = useMeasurements();
  const sets = useAllSets();
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);
  if (!settings || !days || !entries || !sessions || !measurements || !sets || !checkins) return undefined;
  return { settings, today, days: new Map(days.map((d) => [d.date, d])), entries, sessions, measurements, sets, checkins };
}

export function foodByDay(entries: FoodEntry[]) {
  const m = new Map<DayKey, { kcal: number; protein: number; drinks: number }>();
  for (const e of entries) {
    const cur = m.get(e.date) ?? { kcal: 0, protein: 0, drinks: 0 };
    cur.kcal += e.kcal;
    cur.protein += e.protein;
    if (e.kind === 'drink') cur.drinks += e.drink?.count ?? 1;
    m.set(e.date, cur);
  }
  return m;
}

export type Span = '7' | '30' | '90';

export function spanDays(today: DayKey, span: Span | string): DayKey[] {
  return dayRange(addDays(today, -(Number(span) - 1)), today);
}

export const dayLabel = (n: number) => (d: DayKey) => (n <= 7 ? fmtDayShort(d).slice(0, 1) : fmtDayMonth(d));

/** Which kind of place a day was, with a second home told apart from the first (a family home, say). */
export type PlaceMark = Exclude<PlaceMarkKind, 'night'>;

export function placeMarkOn(data: Pick<TrackData, 'settings' | 'days'>, date: DayKey): PlaceMark {
  const p = placeFor(data.days.get(date), data.settings);
  if (p.kind === 'home' && p.id !== homePlace(data.settings).id) return 'home2';
  return p.kind;
}

export const kindOn = (data: Pick<TrackData, 'settings' | 'days'>) => (date: DayKey) => placeFor(data.days.get(date), data.settings).kind;
