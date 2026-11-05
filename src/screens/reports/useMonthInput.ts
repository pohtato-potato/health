import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAllDays, useAllEntries, useAllSets, useSessions, useSettings, useSightings, useToday } from '../../db/hooks';
import type { MonthInput } from '../../domain/monthReport';

/** Everything a month's report or film reads. */
export function useMonthInput(): MonthInput | undefined {
  const today = useToday();
  const settings = useSettings();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const sets = useAllSets();
  const sightings = useSightings();
  const songs = useLiveQuery(() => db.songs.toArray(), []);
  if (!settings || !days || !entries || !sessions || !sets || !sightings || !songs) return undefined;
  return { today, settings, days, entries, sessions, sets, sightings, songs };
}
