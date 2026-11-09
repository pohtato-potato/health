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
import type { Continental } from '../continental';
import type { Credit, XiPlace } from '../players/types';
import type { YouthLink } from '../players/youth';
import type { TreeEngine, TreeUser } from '../tree/types';
import type { GlobeEngine, GlobeUser } from '../globe/types';
import type { Chemistry, Morale, Tactic, TeamSheet } from '../rotation/night';

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
  /** Monday of the week the armband was last picked (Harmony counts weeks, not taps). */
  captainWeek?: DayKey;
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
  /** Kits picked on launch day, by season and slot. */
  kits?: { season: number; slot: 'home' | 'away' | 'third'; id: string }[];
  sponsorStyle?: 'A' | 'B' | 'C' | 'R';
  /** A crest step earned by promotion, waiting for its level-up moment. */
  crestPending?: 1 | 2 | 3 | 4 | 5;
  crestHistory?: { step: 1 | 2 | 3 | 4 | 5; opt: CrestOpt | 'keep'; season: number }[];
  /** Playing at Kaai 42 (moving day done), and whether the move is booked for the next break. */
  moved?: boolean;
  moveAtBreak?: boolean;
  /** Buildings finished but not yet shown on their opening night. */
  openings?: string[];
  /** Seasons in which the landlords locked us out once, and the rent rise. */
  lockedOut?: number[];
  rentRaised?: boolean;
  /** Rivals born and not yet shown as a moment. */
  rivalMoments?: string[];
  /** Football engine 2: set once the save has been rebuilt from the logs (players, ratings and cards). */
  engine?: 2;
  /** Bedtime target, minutes after midnight (kept = asleep by it plus 45 minutes). Unset: your usual bedtime. */
  bedtime?: number;
  /** Engine 2, layer 3: the tree as the days played it (research earned, habit counts, track, packs, board, wages). */
  tree?: TreeEngine;
  /** Engine 2, layer 3: the tree as you tapped it (techs, boons, bounties, packs opened, moments seen). */
  treeUser?: TreeUser;
  /** Engine 2, layer 4: the world as the days played it (loans at the club, nations, breaks, duty, trials). */
  globe?: GlobeEngine;
  /** Engine 2, layer 4: the world as you tapped it (moments seen). */
  globeUser?: GlobeUser;
  // ---- Engine 2, layer 2: rotation ----
  /** The team sheet: starters, unit captains, the set-piece taker (spec §9.1, §16). */
  sheet?: TeamSheet;
  /** The morning tactic, by the day whose match it is for. A day without one is left to the assistant. */
  tactics?: Record<DayKey, Tactic>;
  /** Chemistry by unit, and the last match day it counted. */
  chem?: Chemistry;
  chemOn?: DayKey;
  /** 0 Settled, 1 Up, 2 High. */
  morale?: Morale;
  /** Release 1 (R3 b-lowlog): this week's low-log week, Monday's date and the one habit's axis that still counts. */
  lowLog?: { week: DayKey; axis: Axis };
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
  /** The Continental Cup this season (every season; Brabo play only when in the field). */
  continental?: Continental;
  /** The Club World Cup, played in the event days after this season, when Brabo won the Continental Cup. */
  clubworld?: Bracket;
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
  /** Engine 2: who played, and who scored and saved. */
  xi?: XiPlace[];
  credits?: Credit[];
  /** Layer 2: the tactic it played (and whether the assistant chose it), and the nudges on each axis. */
  tactic?: { pick: Tactic; by: 'you' | 'assistant' };
  nudges?: { axis: Axis; d: number; why: string }[];
}
export interface FbSquadRow {
  id: string; kind: 'youth'; name: string; axis: Axis; potential: 3 | 4 | 5; what: string; exercise: boolean; season: number;
  /** Days its habit was logged (engine 2: the same as sessions). */
  logged: DayKey[];
  /** trial (layer 4): came to the trials and waits to be tied to a habit until `trialUntil`. */
  status: 'trial' | 'growing' | 'promoted' | 'left';
  /** Layer 4: a trialist's last day to be tied to a habit, the week's sleep style that brought it, and a nation from abroad. */
  trialUntil?: DayKey;
  style?: 'early' | 'long' | 'short' | 'mixed';
  nation?: string;
  /** Layer 4: the last night it grew, and by how much (the morning reveal). */
  lastGrow?: { on: DayKey; n: number };
  leftOn?: DayKey;
  /** Engine 2 (spec §9.2): the real habit it is tied to; without one it is never counted. */
  link?: YouthLink;
  sessions?: DayKey[];
  growth?: number;
  /** Nights that added growth. */
  grown?: DayKey[];
}
export interface FbNews { id: string; date: DayKey; kind: 'back' | 'world' | 'roundup' | 'club' | 'press' | 'studio'; text: string; clubId?: string; lineId?: string; matchId?: string; answered?: number }
export interface FbBundle { id: string; progress: Record<string, number>; done?: DayKey }
