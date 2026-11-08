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

/** A limit break (spec §5). Layer 2 adds the triggers; layer 1 stores an Awakened player's first one. */
export interface LimitBreak { on: DayKey; tier: CardTier; why: 'awakening' | 'rep-scheme' | 'load' | 'band' | 'kit' | 'profile' | string; trait?: string }

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
