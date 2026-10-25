import type { RegionKey } from '../geo';

/** Shelf groups. */
export type Group = 'india' | 'world' | 'books' | 'wild';

/** What the record of the original journey can tell us. */
export type RecordKind = 'dated' | 'place' | 'story' | 'estimated' | 'none';

/** The small drawn mark a route's collection is made of. */
export type Mark = 'seal' | 'crystal' | 'minar' | 'station' | 'milecastle' | 'postcard' | 'elephant' | 'walker' | 'island' | 'moon' | 'shield' | 'house' | 'stage' | 'chapter' | 'stone';

export const MARKS: Mark[] = ['seal', 'crystal', 'minar', 'station', 'milecastle', 'postcard', 'elephant', 'walker', 'island', 'moon', 'shield', 'house', 'stage', 'chapter', 'stone'];

/** A place along a route: km from its start, and its index in the drawn line. */
export interface RoutePlace {
  name: string;
  km: number;
  at: number;
  /** Written on the route map. */
  label?: boolean;
}

/** The thing you collect on this road and nowhere else. */
export interface RouteSignature {
  title: string;
  note: string;
  mark: Mark;
  marks: { km: number; name?: string }[];
}

export interface RoutePage {
  /** Shown from this km until the next page's. */
  km: number;
  title: string;
  line: string;
  page: string[];
  deeper?: { title: string; text: string };
}

/** One route on the shelf. Up to 1,500 km it's a challenge; longer, an expedition. */
export interface RouteDef {
  id: string;
  name: string;
  era: string;
  hook: string;
  group: Group;
  km: number;
  record: RecordKind;
  region: RegionKey;
  /** The route's own ink. Never gold: gold is for what you earned. */
  ink: string;
  places: RoutePlace[];
  /** Where an out-and-home route turns back, in km. */
  turn?: number;
  signature?: RouteSignature;
  book?: { by: string; synopsis: string; fullSynopsis: string; chapters: { km: number; text: string }[] };
  /** Only where a record exists. */
  then?: { who: string; totalDays: number; places: { name: string; theirDay: number }[]; source: string };
  years?: { theirs: number; note: string };
  pages: RoutePage[];
  chronicle?: { when: string; place: string; text: string }[];
  /** A story told alongside the history (a novel or film). */
  layer?: string;
  sources: { title: string; url?: string }[];
  /** False until its writing is done and checked; only ready routes appear on the shelf. */
  ready: boolean;
}

export const GROUP_NAMES: Record<Group, string> = { india: 'Indian history', world: 'World history', books: 'Books and films', wild: 'Strange and wild' };

export const RECORD_NAMES: Record<RecordKind, string> = {
  dated: 'Dated day by day',
  place: 'Recorded place by place',
  story: 'Dated by the story',
  estimated: 'Estimated by historians',
  none: 'No record of the walk',
};
