import Dexie, { type EntityTable } from 'dexie';
import type {
  CheckIn,
  Clip,
  Counter,
  Day,
  Food,
  FoodEntry,
  Measurement,
  Occasion,
  Photo,
  Seen,
  SetEntry,
  Settings,
  TrackValue,
  TrainingSession,
  Unlock,
  WeekNote,
  Win,
} from '../domain/types';

export class HealthDB extends Dexie {
  settings!: EntityTable<Settings, 'id'>;
  days!: EntityTable<Day, 'date'>;
  foods!: EntityTable<Food, 'id'>;
  entries!: EntityTable<FoodEntry, 'id'>;
  sessions!: EntityTable<TrainingSession, 'id'>;
  sets!: EntityTable<SetEntry, 'id'>;
  measurements!: EntityTable<Measurement, 'id'>;
  seen!: EntityTable<Seen, 'id'>;
  achievements!: EntityTable<Unlock, 'id'>;
  wins!: EntityTable<Win, 'id'>;
  checkins!: EntityTable<CheckIn, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  clips!: EntityTable<Clip, 'id'>;
  occasions!: EntityTable<Occasion, 'id'>;
  weeks!: EntityTable<WeekNote, 'id'>;
  trackValues!: EntityTable<TrackValue, 'id'>;
  counters!: EntityTable<Counter, 'id'>;

  constructor(name = 'health') {
    super(name);
    this.version(1).stores({
      settings: 'id',
      days: 'date',
      foods: 'id, name',
      entries: 'id, date, at, foodId',
      sessions: 'id, date, status, startedAt',
      sets: 'id, sessionId, exerciseId, date, at',
      measurements: 'id, date',
    });
    this.version(2).stores({
      seen: 'id',
      achievements: 'id, date',
      wins: 'id, date',
      checkins: 'id, date',
      photos: 'id, checkinId, date',
      clips: 'id, sessionId, exerciseId, date',
      occasions: 'id, from, to',
      weeks: 'id',
      trackValues: 'id, trackId, date, [trackId+date]',
      counters: 'id',
    });
  }
}

/** Everything in a quick backup: all the numbers, none of the photos or videos. */
export const TABLES = [
  'settings',
  'days',
  'foods',
  'entries',
  'sessions',
  'sets',
  'measurements',
  'seen',
  'achievements',
  'wins',
  'checkins',
  'occasions',
  'weeks',
  'trackValues',
  'counters',
] as const;
export type TableName = (typeof TABLES)[number];

/** Tables that hold pictures and video, saved only in a full backup. */
export const MEDIA_TABLES = ['photos', 'clips'] as const;
export type MediaTable = (typeof MEDIA_TABLES)[number];

export let db = new HealthDB();

/** Tests swap in a fresh database. */
export function setDatabase(next: HealthDB) {
  db = next;
}

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
