// Rows in the fb* tables. Football writes only to these.
import type { DayKey } from '../../domain/dates';
import type { Bracket } from '../cups';
import type { EventId, EventState } from '../events';
import type { OldSelf } from '../oldSelves';
import type { Rival } from '../rivals';
import type { Contract } from '../contracts';
import type { Offer } from '../money';
import type { HabitId } from '../squad';
import type { Played, Row } from '../table';
import type { Axis, AxisFlags, AxisValues, Comp, MatchEvents, Result, Tier } from '../types';

export type CrestOpt = 'a' | 'b' | 'c' | 'd' | 'e';
export interface FbSave {
  id: 'save';
  founded: DayKey;
  season: number;
  phase: 'season' | 'event';
  /** Next season day to play (1–42), or next event day (1–n). */
  day: number;
  event?: { id: EventId; days: number };
  eventState: EventState;
  lastPlayed?: DayKey;
  captain?: Axis;
  /** The captain each week, oldest first. */
  captains: Axis[];
  harmonyAt?: number;
  /** Ability ids equipped (up to 3), and every ability earned. */
  slots: string[];
  earned: { id: string; date: DayKey }[];
  budget: number;
  buzz: boolean;
  wcCountry?: string;
  ownSponsor?: { name: string; slot: string };
  crest: { step: 1 | 2 | 3 | 4 | 5; opt: CrestOpt };
  shirt: string;
  rivals: Rival[];
  met: string[];
  physioRoom: boolean;
  awakenings: Partial<Record<Axis, number[]>>;
  firstRunDone: boolean;
  /** Old Selves retired at a season's end: they play on in the Old Selves Cup. */
  retired?: OldSelf[];
  /** The last season whose end screens were seen. */
  seenSeasonEnd?: number;
  /** Every awakening, oldest first, and how many of them have been shown. */
  awakeLog?: { axis: Axis; band: 11 | 16 | 18; date: DayKey }[];
  awakeSeen?: number;
  /** One contract per squad member still at the club. */
  contracts?: Contract[];
  /** Habits sold: Football stops tracking them; Health never does. */
  sold?: HabitId[];
  sponsors?: (Offer & { since: number })[];
  /** Offers waiting between seasons. */
  offers?: Offer[];
  youthSlots?: number;
  staff?: string[];
  /** Last season's income, line by line (millions). */
  income?: { season: number; lines: { name: string; amount: number }[] };
}
export interface FbClub { id: string; tier: Tier; rating: number; style: string; old?: OldSelf; folded?: boolean }
export interface FbSeason {
  id: number;
  start: DayKey;
  /** tier -> 34 rounds of [home, away] */
  fixtures: Record<Tier, [string, string][][]>;
  results: Record<Tier, Played[]>;
  tierOf: Record<string, Tier>;
  deductions: Record<string, number>;
  bigcup: Bracket;
  tiercups: Record<string, Bracket>;
  playoffs: Partial<Record<Tier, { semis: [string, string][]; semiWinners?: string[]; final?: [string, string]; winner?: string }>>;
  final?: { tables: Record<Tier, Row[]>; up: Partial<Record<Tier, string[]>>; down: Partial<Record<Tier, string[]>> };
  dates: Record<number, DayKey>;
  /** Points deductions decided at this season's end, applied to the next. */
  nextDeductions?: Record<string, number>;
}
export interface StoredMatch {
  id: string;
  date: DayKey;
  season: number;
  day: number;
  comp: Comp;
  round?: string;
  home: string;
  away: string;
  /** The other side: a club id, or a nation id in the World Cup. */
  opp: string;
  braboHome: boolean;
  values: AxisValues;
  flags: AxisFlags;
  events: MatchEvents;
  score: [number, number];
  result: Result;
  pens?: [number, number];
  watched: boolean;
  rotation: boolean;
  auto: boolean;
  /** 1 or 2 on a double-header night. */
  leg?: 1 | 2;
  derby?: boolean;
  big?: boolean;
}
export interface FbSquadRow { id: string; kind: 'youth'; name: string; axis: Axis; potential: 3 | 4 | 5; what: string; exercise: boolean; season: number; logged: DayKey[]; status: 'growing' | 'promoted' | 'left' }
export interface FbNews { id: string; date: DayKey; kind: 'back' | 'world' | 'roundup' | 'club' | 'press' | 'studio'; text: string; clubId?: string; lineId?: string; matchId?: string; answered?: number }
export interface FbBundle { id: string; progress: number; done?: DayKey }
