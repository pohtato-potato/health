import type { Correction } from '../domain/corrections';
import type { Moment } from '../domain/earned';
import type { Sighting } from '../domain/creatures';
import Dexie, { type EntityTable } from 'dexie';
import type { Snapshot } from './snapshots';
import type { FbBundle, FbClub, FbNews, FbSave, FbSeason, FbSquadRow, StoredMatch } from '../football/store/tables';
import type { FbPlayer } from '../football/players/types';
import type { CupDone, CupRun } from '../football/cup/store';
import type { CupBook } from '../football/cup/book';
import type { Question } from '../football/desk/content';
import type {
  BodyEntry,
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
  UsageEvent,
  EditRecord,
  AuditNote,
  ForecastRecord,
  ChartMarker,
  WalkRecord,
  RouteRun,
  SongRecord,
  Seen as ThemeSeen,
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
  usage!: EntityTable<UsageEvent, 'id'>;
  edits!: EntityTable<EditRecord, 'id'>;
  auditNotes!: EntityTable<AuditNote, 'id'>;
  forecasts!: EntityTable<ForecastRecord, 'id'>;
  markers!: EntityTable<ChartMarker, 'id'>;
  walk!: EntityTable<WalkRecord, 'id'>;
  routes!: EntityTable<RouteRun, 'id'>;
  themesSeen!: EntityTable<ThemeSeen, 'id'>;
  songs!: EntityTable<SongRecord, 'id'>;
  useful!: EntityTable<Seen, 'id'>;
  sightings!: EntityTable<Sighting, 'id'>;
  moments!: EntityTable<Moment, 'id'>;
  corrections!: EntityTable<Correction, 'id'>;
  snapshots!: EntityTable<Snapshot, 'id'>;
  fbSave!: EntityTable<FbSave, 'id'>;
  fbClubs!: EntityTable<FbClub, 'id'>;
  fbMatches!: EntityTable<StoredMatch, 'id'>;
  fbSeasons!: EntityTable<FbSeason, 'id'>;
  fbSquad!: EntityTable<FbSquadRow, 'id'>;
  fbNews!: EntityTable<FbNews, 'id'>;
  fbBundles!: EntityTable<FbBundle, 'id'>;
  fbPlayers!: EntityTable<FbPlayer, 'id'>;
  body!: EntityTable<BodyEntry, 'id'>;
  cupRuns!: EntityTable<CupRun, 'id'>;
  cupBook!: EntityTable<CupBook, 'id'>;
  cupDone!: EntityTable<CupDone, 'n'>;
  deskQuestions!: EntityTable<Question, 'id'>;

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
    this.version(3).stores({
      usage: '++id, at, kind',
      edits: '++id, at, table, rowId',
      auditNotes: '++id, at',
      forecasts: 'id, kind, madeAt, targetDate',
      markers: 'id, date',
      walk: 'id, kind, date',
      themesSeen: 'id',
      songs: 'id, at',
      useful: 'id',
    });
    this.version(4).stores({
      routes: 'id',
    });
    this.version(5).stores({
      sightings: 'id, date, creatureId',
    });
    this.version(6).stores({
      moments: 'id, at, date, kind',
    });
    this.version(7).stores({
      corrections: 'id, date, at',
    });
    this.version(8).stores({
      snapshots: 'id, at, kind',
    });
    this.version(9).stores({
      fbSave: 'id',
      fbClubs: 'id, tier',
      fbMatches: 'id, date, season, comp',
      fbSeasons: 'id',
      fbSquad: 'id',
      fbNews: 'id, date, kind',
      fbBundles: 'id',
    });
    this.version(10).stores({
      fbPlayers: 'id, unit, status',
    });
    // The body log: pain, strain, soreness and tightness, by part (the coach reads it in the export).
    this.version(11).stores({
      body: 'id, date, at',
    });
    // Cup runs (ledger O28): the run or try match in progress, saved after every card.
    this.version(12).stores({
      cupRuns: 'id',
    });
    // Cup runs, layers 3 and 4: the record book, and finished runs (summary only).
    this.version(13).stores({
      cupBook: 'id',
      cupDone: '++n, date',
    });
    // The desk (step 4): the owner's own coaching-course questions, imported on the phone and kept only here.
    this.version(14).stores({
      deskQuestions: 'id',
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
  'usage',
  'edits',
  'auditNotes',
  'forecasts',
  'markers',
  'walk',
  'routes',
  'themesSeen',
  'songs',
  'useful',
  'sightings',
  'moments',
  'corrections',
  'fbSave',
  'fbClubs',
  'fbMatches',
  'fbSeasons',
  'fbSquad',
  'fbNews',
  'fbBundles',
  'fbPlayers',
  'body',
  'cupRuns',
  'cupBook',
  'cupDone',
  'deskQuestions',
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
