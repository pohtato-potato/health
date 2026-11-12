// Shapes for step 4's words and data: the desk, the cast, the fogged world, the congress and the
// coaching course (spec 2026-11-12, sections 3–9). Pure data: no React, no Dexie, no engine logic.
import type { AbilityDef } from '../../data/load';
import type { Axis } from '../../types';
import type { Metric, Trigger } from '../types';

// ---------------------------------------------------------------- the desk

/** The ten desk jobs (spec §3), in the order the desk lists them. */
export type DeskJob = 'scout' | 'study' | 'watch' | 'academy' | 'cast' | 'column' | 'build' | 'negotiate' | 'lobby' | 'course';
export const DESK_JOBS: DeskJob[] = ['scout', 'study', 'watch', 'academy', 'cast', 'column', 'build', 'negotiate', 'lobby', 'course'];

/**
 * Yesterday's value for an axis, by the die it made (decision 12.1 a):
 * `low` is a die of 1–2, `mid` a 3–4, `high` a 5–6.
 */
export type Band = 'low' | 'mid' | 'high';
export const BANDS: Band[] = ['low', 'mid', 'high'];
export const bandOfDie = (die: number): Band => (die <= 2 ? 'low' : die <= 4 ? 'mid' : 'high');

/**
 * Axis voices: what each axis says when you pick up a die for a job. Two axes speak per die.
 * Placeholders: `{value}` is yesterday's real reason for that axis, as the dice tile shows it
 * ("16,400 steps", "four and a half hours", "two sessions"). Voices use no other placeholder.
 */
export type AxisVoices = Record<DeskJob, Record<Axis, Record<Band, string[]>>>;

// ---------------------------------------------------------------- the cast

/** Every cast member. The first four are today's staff (`content/staff.ts`, `cup/events.ts`). */
export type CastId = 'chairman' | 'physio' | 'academy' | 'kitman' | 'scout' | 'cook' | 'watchman';

/**
 * A small lasting perk from a bond rank. None touches a rating or a match's odds.
 * Each key names one rule the coding fork wires up:
 * - `return-ramp-days`: days off the return ramp after a sick or injured stretch (value: days shorter)
 * - `trials-extra-day`: a second trial day each week (value 1)
 * - `research-close`: research added when the day is closed with every checklist slot ticked (value: research)
 * - `clock-head-start`: segments already filled on a new clock of this job (value: segments; `job` names it)
 * - `scout-known`: extra known % from every scout report (value: points)
 * - `watch-both`: watching tonight's opponent shows style and weak side on any die (value 1)
 * - `negotiate-reroll`: once a talk, one round's reply can be taken back (value 1)
 * - `lobby-risk`: the shown risk of annoying a club when lobbying, in points lower (value: points)
 * - `academy-growth`: an academy session grows the youngster one more on a 5 or 6 (value 1)
 * - `column-reach`: a column line also nudges the cast member's bond (value: bond points)
 * - `kit-pick`: one more kit or crest choice in the kit maker (value 1)
 * - `parcel-extra`: the morning parcel carries one more line or item from this member (value 1)
 * - `rest-day-dice`: on a planned rest day kept as rest, the Rest die counts one higher, up to 6 (value 1)
 * - `unspent-research`: unspent dice turn into research one die sooner (value 1); never beyond the day's cap
 * - `meal-card`: a cup-run card of this member's joins the cup pool (value 1)
 * - `heirloom`: an heirloom of this member's joins the cup pool (value 1; `item` names it)
 */
export type PerkKey =
  | 'return-ramp-days' | 'trials-extra-day' | 'research-close' | 'clock-head-start' | 'scout-known' | 'watch-both'
  | 'negotiate-reroll' | 'lobby-risk' | 'academy-growth' | 'column-reach' | 'kit-pick' | 'parcel-extra'
  | 'rest-day-dice' | 'unspent-research' | 'meal-card' | 'heirloom';

export interface CastPerk { key: PerkKey; value: number; text: string; job?: DeskJob; item?: string }

/** One of ten ranks: a short scene (d3-rank), with a perk at some ranks. */
export interface RankScene { rank: number; title: string; scene: string; perk?: CastPerk }

/** Something a cast member sometimes asks of you after desk time; met, it brings bond points. */
export interface CastAsk { text: string; trigger: Trigger; thanks: string }

export interface CastMember {
  id: CastId;
  name: string;
  /** Their job at the club, as the desk labels them. */
  role: string;
  /** Today's staff (true) or a new face (false). */
  existing: boolean;
  /** Who they are, in two or three sentences. Written with no gendered pronouns. */
  who: string;
  /** Which real person or kind of person they are loosely modelled on, for the coding forks only (never shown). */
  modelledOn: string;
  /** The real habit each one cares about. Living up to it raises the bond. */
  cares: { metrics: Metric[]; text: string };
  /** Short lines when you sit down with them; `cool` is for a low opinion and only cools the tone. */
  greet: { warm: string[]; cool: string[] };
  /** A line for the morning parcel (Fork B's seam). */
  parcel: { warm: string[]; cool: string[] };
  asks: CastAsk[];
  /** Exactly ten, ranks 1 to 10 in order. */
  ranks: RankScene[];
}

// ---------------------------------------------------------------- the world in fog

/** What a scout or a watch turned up (p3-scout). */
export type Finding = 'rating' | 'style' | 'weak-side' | 'manager' | 'hidden' | 'history' | 'kit' | 'loan-target' | 'nothing-new';

/**
 * Placeholders in scout lines: `{club}` the club, `{found}` what was found, `{division}` a division
 * or country, `{before}` and `{after}` known %, `{manager}` the manager's name, `{player}` a loan target.
 */
export type ScoutLines = Record<Finding, string[]>;

export interface Manager { name: string; nation: string; line: string }

export interface ClubLore {
  manager: Manager;
  /** A short history for the fogged club page, two or three sentences. */
  history: string;
  /** What a scout says before the hidden ability is known (one line; no mechanics). */
  hiddenTease: string;
  /**
   * A new hidden ability, only for clubs whose league or continental data has none
   * (real clubs and every club abroad). Same shape as `ClubDef.hidden`; `fx.when` uses only
   * `when` values the engine already reads in league.json.
   */
  hiddenNew?: AbilityDef;
}

// ---------------------------------------------------------------- owners, regions, the congress

export type OwnerKind =
  | 'fan-owned' | 'state-fund' | 'old-family' | 'data-company' | 'billionaire' | 'investment-fund'
  | 'works-team' | 'celebrity' | 'municipal' | 'old-self';

export interface OwnerKindDef { id: OwnerKind; name: string; text: string; cares: string }

export type RegionId =
  | 'flanders' | 'netherlands' | 'london' | 'north-england' | 'south-england' | 'wales'
  | 'castile' | 'catalonia' | 'basque' | 'andalusia' | 'spain-east' | 'spain-north' | 'canaries'
  | 'bavaria' | 'rhine-ruhr' | 'germany-north' | 'germany-east' | 'germany-south-west'
  | 'italy-north' | 'italy-centre-south' | 'paris' | 'france-south' | 'france-north' | 'rhone-alps'
  | 'alps-danube' | 'nordic' | 'portugal' | 'memory';

export interface RegionDef { id: RegionId; name: string; country: string; pride: string }

export interface ClubSeat { owner: OwnerKind; region: RegionId }

/** How a seat leans on a motion: −2 strongly against … +2 strongly for. */
export type Lean = -2 | -1 | 0 | 1 | 2;

/**
 * A congress motion's rule twist, as one keyed knob for the congress fork (spec §6).
 * The `plays` text on the motion says exactly what the knob does to a season; nothing changes a
 * match's odds through relations.
 */
export type TwistKey =
  | 'rating-cap' | 'subs' | 'breakaway-cup' | 'winter-break' | 'members-rule' | 'homegrown' | 'away-tickets'
  | 'terraces' | 'night-kickoffs' | 'loan-cap' | 'play-offs' | 'four-up' | 'spending-rule' | 'heritage-kits'
  | 'ground-rule' | 'solidarity' | 'regional-six' | 'away-win-four' | 'effective-time' | 'shootout-draws';

export interface Motion {
  id: string;
  name: string;
  /** What the federation is asked to vote on, one sentence. */
  text: string;
  /** How it plays as this season's rule twist, for the owner. */
  plays: string;
  twist: { key: TwistKey; value: number };
  /** How each owner kind leans; missing kinds lean 0. */
  leans: Partial<Record<OwnerKind, Lean>>;
  /** Regions whose pride pulls them one way on this motion. */
  regions?: Partial<Record<RegionId, Lean>>;
  /** The back page if it passes, and if it falls. */
  passed: string;
  fell: string;
}

// ---------------------------------------------------------------- the paper

/** What a column line is for (spec §3: "nudges morale, or needles a rival"). */
export type ColumnAim = 'morale' | 'needle' | 'fans' | 'ambition' | 'after-loss' | 'congress';
/** Placeholders: `{club}` Brabo United, `{opp}` a rival or opponent, `{player}` one of ours, `{motion}` a motion. */
export interface ColumnLine { aim: ColumnAim; line: string; headline: string }

export interface FanLetter { id: string; from: string; letter: string; replies: string[] }

// ---------------------------------------------------------------- the coaching course

export type CatSection = 'quant' | 'verbal' | 'lr' | 'di';
export type CatFormat = 'mcq' | 'tita';

/** A shared stimulus: a reading passage, a table or a puzzle setup several questions use. */
export interface CatSet { id: string; section: CatSection; title: string; text: string }

export interface CatQuestion {
  id: string;
  section: CatSection;
  /** The topic, as a CAT syllabus would name it ("Time, speed and distance", "Para jumble"). */
  topic: string;
  format: CatFormat;
  /** 1 easy, 2 moderate, 3 hard, against past papers. */
  difficulty: 1 | 2 | 3;
  /** The shared stimulus, when there is one. */
  set?: string;
  prompt: string;
  /** Four options for `mcq`; none for `tita`. */
  options?: string[];
  /** `mcq`: the index of the right option (0–3). `tita`: the exact text to type (digits, or a sequence like '3142'). */
  answer: number | string;
  /** A worked explanation, step by step. */
  explain: string;
}
