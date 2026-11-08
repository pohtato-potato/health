// Football engine 2, layer 1: players (spec §2–4, §7, §8, §16). Pure shapes, no React, no Dexie.
import type { DayKey } from '../../domain/dates';
import type { Unit } from '../content/types';

export type { Unit };

/** What a player is: the real thing logged. The id says it too (`ex:rdl`, `habit:<item id>`, `fuel:lunch`). */
export type PlayerKind =
  | 'exercise'
  | 'steps' | 'big-days' | 'commuter' | 'long-walk' | 'route-walker'
  | 'calories' | 'protein' | 'meal'
  | 'habit'
  | 'weigh-in' | 'waist' | 'trend'
  | 'hours' | 'bedtime' | 'rested';

export interface PlayerDef {
  id: string;
  unit: Unit;
  kind: PlayerKind;
  /** The exercise id, checklist item id or meal. */
  ref?: string;
  name: string;
  /** The drawing on the card. */
  art: string;
  /** The first day with data; a player signs then. */
  signed: DayKey;
  /** Still logged: in the coach's plan, an active checklist item, and so on. */
  active: boolean;
  /**
   * Exercises only: every exercise id this player has been, oldest first. A plan entry that `replaces` or is a
   * `progressionOf` an earlier one is the same player on new kit or a new profile (calibration §12, §13.2).
   */
  refs?: string[];
  /** The days the player moved to a new exercise id in its chain, and why: new kit, or the coach's next step. */
  switches?: { on: DayKey; id: string; why: 'kit' | 'profile' }[];
}

export interface Attribute {
  id: string;
  label: string;
  /** 1–100. */
  value: number;
  weight: number;
  kind: 'growth' | 'rate';
  /** The real numbers behind it, in plain words. */
  note: string;
}

export interface Rating {
  overall: number;
  attrs: Attribute[];
}

/** Card frames (spec §4, §16). */
export type CardTier = 'bronze' | 'silver' | 'gold' | 'prism' | 'icon' | 'legend';
export const CARD_TIERS: CardTier[] = ['bronze', 'silver', 'gold', 'prism', 'icon', 'legend'];
export interface CardStep { tier: CardTier; step: number }
export interface CardVersion extends CardStep { on: DayKey; overall: number }
export interface CardMoment extends CardStep { on: DayKey; kind: 'step' | 'tier'; from: CardStep; overall: number; seen?: boolean }

/** Why a player limit broke (spec §5, calibration §12). */
export type BreakWhy = 'awakening' | 'rep-scheme' | 'load' | 'band' | 'distance' | 'bedtime' | 'protein' | 'calories' | 'habit' | 'waist' | 'kit' | 'profile';
/**
 * A limit break (spec §5). The growth baseline resets to `on`, the player keeps its overall plus 3 (`carry` is what the
 * new baseline needs added to get there), the attribute weights may shift, and it may gain a trait.
 */
export interface LimitBreak {
  on: DayKey; tier: CardTier; why: BreakWhy | string; trait?: string;
  /** The overall before and after (after = before + 3). */
  from?: number; to?: number;
  /** Added to the rating worked out from the new baseline. */
  carry?: number;
  /** Plain words for what changed, e.g. "10 × 10 held for four weeks, after 5 × 20". */
  what?: string;
  /** Attribute weights that moved: [attribute id, before, after]. */
  shift?: [string, number, number][];
  /** The cracked-card moment has been seen (it waits for a tap; quiet in the rebuild). */
  seen?: boolean;
}

/** One player as the save keeps it. Ratings are worked out from the logs; the card is the best ever reached. */
export interface FbPlayer {
  id: string;
  unit: Unit;
  kind: PlayerKind;
  ref?: string;
  name: string;
  art: string;
  signed: DayKey;
  /** squad: in the first team. academy: its habit belongs to a youngster still growing. left: no longer logged (layer 2 makes it a free agent). */
  status: 'squad' | 'academy' | 'left';
  leftOn?: DayKey;
  /** The overall on the last day worked out (it can drop with ageing; the card never does). */
  overall: number;
  /** The last day the ratings were worked out. */
  on: DayKey;
  best: number;
  bestOn: DayKey;
  card: CardStep;
  versions: CardVersion[];
  moments: CardMoment[];
  apps: number;
  goals: number;
  saves: number;
  /** Save seasons it played in. */
  seasons: number[];
  /** Holder of its unit's best-ever overall since this day (Club legend after 26 weeks). */
  recordSince?: DayKey;
  clubLegend?: { on: DayKey; why: 'apps' | 'record' | 'seasons' };
  limitBreaks: LimitBreak[];
  // ---- Layer 2: rotation (spec §3.2, §3.3, §6) ----
  /** Freshness tonight, 60–100 (%); only exercises tire. */
  fresh?: number;
  /** Form, −3 to +3: the four-week trend of the overall. */
  form?: number;
  /** The overall on recent days (not sick days), oldest first, for the form line: [day, overall]. */
  trail?: [DayKey, number][];
  /** Attribute weights after limit breaks (by attribute id); unset: the spec's weights. */
  weights?: Record<string, number>;
  /** Growth attributes measure from here: the last limit break, else the signing. */
  base?: DayKey;
  /** Ageing (exercises and walks): the best growth so far since the base, and the day it was reached. */
  peakGrowth?: number;
  grewOn?: DayKey;
  /** Past his best since this day: the overall slips 1 every 2 weeks toward its peak minus 8. */
  pastBest?: DayKey;
  /** A free agent: the club it signed for, and the day. Re-added and paid for, it comes home. */
  freeAgent?: { club: string; on: DayKey; readded?: boolean };
  /** Exercises: every exercise id this player has been (see PlayerDef.refs). */
  refs?: string[];
  // ---- Layer 4: the world (spec §9.4) ----
  /** Back from international duty: a trait, or +2 to one attribute (added to what the logs give). */
  duty?: { on: DayKey; nation: string; trait?: string; attr?: string; d?: number }[];
}

/** A named goal or save in a stored match (spec §8). */
export interface Credit {
  /** Index into the match's chances. */
  i: number;
  kind: 'goal' | 'save';
  player: string;
  name: string;
  unit: Unit;
  line: string;
}
/** One place in the eleven on a match night. */
export interface XiPlace { player: string; unit: Unit; place: string; name: string; rating: number }
