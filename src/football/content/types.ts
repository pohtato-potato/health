// Shared types for Football engine 2's game content (spec §16, "Content scope: all of it").
// Pure data: no React, no Dexie, no engine logic. Engine layers 1–4 read these shapes.
import type { Place } from '../ground';
import type { Axis, Tier } from '../types';

/** The six units are the six axes (spec §2). */
export type Unit = Axis;

/** Card frames, also used for album rarity (spec §16: the five player frames plus Legend). */
export type Rarity = 'bronze' | 'silver' | 'gold' | 'prism' | 'icon' | 'legend';
export const RARITIES: Rarity[] = ['bronze', 'silver', 'gold', 'prism', 'icon', 'legend'];

/** Loans are Gold or Prism (current players) or Icon (retired greats). */
export type LoanTier = 'gold' | 'prism' | 'icon';

/** The six eras of the tree (round eight, ERAS9). */
export type EraId = 'sunday' | 'semipro' | 'pro' | 'topflight' | 'renowned' | 'continental';
export const ERA_IDS: EraId[] = ['sunday', 'semipro', 'pro', 'topflight', 'renowned', 'continental'];

/**
 * One situation a small effect is limited to. The first eleven match the shipped
 * `BraboAbility['when']`; the rest are new and need engine support in the layer that uses them.
 */
export type When =
  | 'always' | 'long' | 'late' | 'home' | 'away' | 'first-half' | 'after-concede' | 'level' | 'own-type' | 'home-late'
  | 'second-half' | 'behind' | 'ahead' | 'set-piece' | 'derby' | 'cup' | 'final' | 'continental' | 'continental-home'
  | 'continental-away' | 'auto' | 'first-chance' | 'after-goal' | 'after-save' | 'vs-higher' | 'international';

/**
 * Real-habit counts. The names shared with ground.ts `Need` mean exactly what `dayCounts` means by them;
 * the rest are new and read only values Health already logs (never the time a log was made).
 */
export type Metric =
  // shared with ground.ts Need
  | 'steps' // a day at the step goal
  | 'training' // a training session finished
  | 'sleep' // a night at the sleep target
  | 'protein' // a day at the protein target
  | 'kcal' // a day inside the calorie range (never under it)
  | 'bedtime' // a night with bedtime kept (asleep by the target plus 45 minutes, or earlier)
  | 'meds' // a day every medicine was kept
  | 'youth' // a session logged for an academy-linked habit
  // new
  | 'logged' // a day with anything logged
  | 'closed' // a day closed with Close the day
  | 'big-day' // a day of 18,000+ steps
  | 'long-walk' // a single Walk log of 5 km or more
  | 'km' // a kilometre walked (steps turned into km, as Walk does)
  | 'route-leg' // a Walk route leg finished
  | 'commute' // an office or away day at the eased step goal
  | 'weigh-in' // a weigh-in
  | 'waist' // a standing-protocol waist measurement
  | 'checklist-full' // a day with every checklist slot ticked (medicines left out)
  | 'habit-kept' // a day one checklist habit was kept (the engine names which)
  | 'rested' // a night rated rested 4 or 5
  | 'rest-day' // a planned rest day kept as rest
  | 'breakfast' | 'lunch' | 'dinner' // a day that meal was logged
  | 'three-meals' // a day with breakfast, lunch and dinner logged
  | 'session-week' // a week (Monday to Sunday) with 3 or more sessions
  | 'form-ok' // a session with every form check marked ok
  | 'all-units' // a day with something logged for every unit
  | 'gym-session'; // a session on gym kit (the first one opens the move)

/** A real-habit target: `count` of a metric, optionally within a window of days. */
export interface Trigger { what: Metric; count: number; withinDays?: number; text: string }

/** Rule knobs the engine reads. Every one changes a rule, an option or a slot, never a rating. */
export type RuleKey =
  | 'trials-extra-day' // a second trial day each week
  | 'trials-size' // youngsters per trial day
  | 'trials-hold-days' // days a trialist waits for a habit link
  | 'trials-rarity' // steps of extra rarity luck at trials
  | 'trials-abroad' // trialists from every nation in the continental data
  | 'academy-promote-sessions' // sessions a youngster needs to promote
  | 'youth-growth-bedtime' // extra growth on a kept-bedtime night
  | 'youth-potential' // extra potential stars on arrival
  | 'chemistry-days' // days of the same starters for chemistry +1
  | 'chemistry-changes' // starters that must change before chemistry drops
  | 'freshness-floor' // lowest freshness, %
  | 'freshness-return' // freshness back per day off, %
  | 'freshness-cost' // freshness lost per back-to-back day, %
  | 'knock-days' // days a knock lasts (negative shortens)
  | 'fuel-break-days' // days of 30 a Fuel limit break needs
  | 'loan-days' // days a loan stays
  | 'loan-slots' // loans at a time
  | 'icon-odds' // % added to Icon loan odds
  | 'lesson-loss' // extra lesson points for a loss
  | 'lesson-draw' // extra lesson points for a draw
  | 'research-tour' // research per logged day on the pre-season tour
  | 'research-duty' // research per player logged on international duty
  | 'morale-captain-up' // the captain's unit gets its morale +1 at Up, not only High
  | 'scout-line' // the scout line the night before
  | 'scout-weak' // the morning also names the rival's weakest unit
  | 'expected-points' // the habit line shows the nearest band step
  | 'press-answers' // choose the press line after big nights
  | 'testimonial' // a Club legend's testimonial night (a pack)
  | 'trialist-wait' // a trialist can be held a week
  | 'false-nine' // a Fuel player can take Power's place
  | 'rotation-two-fronts' // a player rested for the league is fresh for a continental night
  | 'boon-choices' // boons offered per pick
  | 'packs-items' // items per pack
  | 'museum-research'; // research per finished album set each week

/** Options and screens a tech unlocks. */
export type UnlockKey =
  | 'formation-442' | 'formation-4231' | 'formation-352' | 'formation-433-attack'
  | 'unit-captains' | 'philosophy' | 'programme' | 'kit-third' | 'kit-classic' | 'scarf' | 'press-office' | 'tour';

/** Places the club can add. */
export type SlotKey = 'sponsor-kit' | 'sponsor-sleeve' | 'sponsor-partner' | 'sponsor-abroad' | 'academy' | 'pace-places' | 'power-places' | 'shape-places' | 'fuel-places' | 'rest-places';

/** Money multipliers, as a share added (0.05 is +5%). */
export type MoneyKey = 'gate' | 'tv' | 'shop' | 'sponsors' | 'continental-gate';

/**
 * What a tech, staff member, boon, trait, project or reward does. There is deliberately no
 * "rating" kind: nothing here adds flat rating points (spec §16). `axis` effects are +1 or +2 in
 * one named situation, and never `always`.
 */
export type Effect =
  | { kind: 'axis'; axis: Axis; d: 1 | 2; side: 'atk' | 'def' | 'both'; when: Exclude<When, 'always'> }
  | { kind: 'retake'; when: When } // once a match, a missed chance of 30%+ in that situation is retaken
  | { kind: 'extra-chance'; when: When; unit?: Unit } // one extra chance in that situation
  | { kind: 'chemistry'; d: 1; when: When } // chemistry +1 in that situation
  | { kind: 'rule'; rule: RuleKey; value: number }
  | { kind: 'unlock'; what: UnlockKey }
  | { kind: 'slot'; slot: SlotKey; add: 1 }
  | { kind: 'money'; what: MoneyKey; share: number }
  | { kind: 'project'; project: string } // adds a project to the list
  | { kind: 'staff'; staff: string } // hires a staff member
  | { kind: 'cosmetic'; what: string };

/** What a reward gives. */
export type Reward =
  | { kind: 'pack'; size?: 'normal' | 'big' }
  | { kind: 'research'; n: number }
  | { kind: 'boon-pick' }
  | { kind: 'kit-piece'; id: string }
  | { kind: 'theme'; id: string }
  | { kind: 'album-card'; rarity?: Rarity }
  | { kind: 'icon-odds'; pct: number }
  | { kind: 'money'; wageUnits: number }
  | { kind: 'track-catchup' }
  | { kind: 'boost'; id: string };

// ---------- loans ----------
export interface DrawingBrief {
  /** The signature pose, readable at card size. */
  pose: string;
  /** Kit colours as plain colours: no club logos, crests or sponsor marks. */
  kit: string;
  number: number;
  /** Always the same rule: the face is line-art shading only, never a portrait. */
  face: 'line-art shading only';
}
export interface LoanDef {
  id: string;
  name: string;
  /** Nation code, from nations.ts. */
  nation: string;
  unit: Unit;
  tier: LoanTier;
  /** Playing style in a few words, the only thing we say about the real person. */
  style: string;
  /** The signature move, as a trait the loan carries while at the club. */
  trait: TraitDef;
  arrival: string;
  farewell: string;
  drawing: DrawingBrief;
}

// ---------- album ----------
export interface AlbumCard { id: string; title: string; fact: string; rarity: Rarity }
export interface AlbumSet {
  id: string;
  title: string;
  /** One line under the set's title. */
  blurb: string;
  reward: { kind: 'kit-trim' | 'stadium-detail' | 'museum-piece'; id: string; name: string; text: string };
  cards: AlbumCard[];
}

// ---------- the tree ----------
export interface EraDef { id: EraId; name: string; cost: number; colour: string; intro: string; feel: string }
export interface TechDef {
  id: string;
  name: string;
  era: EraId;
  cost: number;
  /** Tech ids. An era itself is entered after 6 techs of the era before (spec §16). */
  prereqs: string[];
  /** One plain sentence for the tree. */
  text: string;
  effects: Effect[];
  eureka: Trigger;
}

// ---------- staff ----------
export interface StaffDef {
  id: string;
  name: string;
  /** The tech that hires them. */
  tech: string;
  /** Wage in wage units a season; money.ts turns units into euros by division. */
  wageUnits: number;
  text: string;
  effects: Effect[];
  /** Staff who level up (the club doctor). */
  levels?: { xp: Metric; at: number[]; perLevel: Effect[]; text: string };
}

// ---------- projects ----------
export interface ProjectDef {
  id: string;
  name: string;
  /** On the Kaai skyline; null for projects that aren't buildings. */
  place: Place | null;
  /**
   * 'ground' is a shipped ground.ts bundle: its needs, money, gating and effect are read from BUNDLES.
   * 'stage' is a new building stage, BundleDef-shaped. 'journey' is not a building.
   */
  source: 'ground' | 'stage' | 'journey';
  /** Order along its building, 1 first. Journeys are 0. */
  stage: number;
  needs: { what: Metric; count: number }[];
  /** Millions, as ground.ts. */
  money: number;
  after?: string[];
  tier?: Tier;
  moved?: boolean;
  /** The tech that adds it to the list, for new stages and journeys. */
  tech?: string;
  reward: string;
  effects: Effect[];
  tease: string;
  capacity?: number;
  downtime?: number;
}

// ---------- the season run ----------
export interface BoonDef { id: string; name: string; text: string; effects: Effect[] }
export interface BountyDef { id: string; name: string; text: string; target: Trigger; reward: Reward }
export type Strength = 'low' | 'mid' | 'high';
export interface BoardObjective {
  id: string;
  text: string;
  /** Which squads it's set for, by squad strength against the division. */
  for: Strength[];
  goal:
    | { kind: 'position'; atBest: number }
    | { kind: 'playoffs' }
    | { kind: 'promotion' }
    | { kind: 'cup-round'; cup: 'bigcup' | 'tiercup'; round: 'r3' | 'qf' | 'sf' | 'final' | 'win' }
    | { kind: 'continental'; round: 'group' | 'r16' | 'qf' | 'sf' | 'final' }
    | { kind: 'goals'; n: number }
    | { kind: 'clean-sheets'; n: number }
    | { kind: 'derby'; wins: number }
    | { kind: 'home-unbeaten'; matches: number }
    | { kind: 'above-rival' };
  met: string;
  missed: string;
}
export interface TrackStep { step: number; reward: Reward | null; label: string }

// ---------- traits ----------
export type TraitSource = 'limit-break' | 'duty' | 'pack' | 'loan' | 'gym' | 'awakening';
export interface TraitDef {
  id: string;
  name: string;
  text: string;
  /** The unit it suits, or any. */
  unit: Unit | 'any';
  from: TraitSource[];
  effect: Effect;
}
export interface SignatureMove {
  unit: Unit;
  /** The named goal type it adds to the commentary. */
  name: string;
  text: string;
  effect: Effect;
  /** {player} {minute} {opp} placeholders. */
  lines: string[];
}

// ---------- nations ----------
export interface Nation { code: string; name: string }
export interface NationWord { word: RegExp; nation: string }

// ---------- running low ----------
export interface PoolSize { pool: 'loans' | 'album' | 'boons' | 'bounties'; size: number; unit: string }
