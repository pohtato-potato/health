// Shared Football types. Pure data: no React, no Dexie.
import type { DayKey } from '../domain/dates';

export type Axis = 'Pace' | 'Power' | 'Fuel' | 'Rest' | 'Routine' | 'Shape';
export const AXES: Axis[] = ['Pace', 'Power', 'Fuel', 'Rest', 'Routine', 'Shape'];
export type Side = 'atk' | 'def';
/** Each axis 1–20. */
export type AxisValues = Record<Axis, number>;
export type AxisFlags = Partial<Record<Axis, 'no-data' | 'not-logged'>>;
/** 1 = Crown League … 6 = Division Six. */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6;
export const TIERS: Tier[] = [1, 2, 3, 4, 5, 6];
export type Comp = 'league' | 'bigcup' | 'tiercup' | 'playoff' | 'event' | 'worldcup' | 'continental' | 'clubworld' | 'friendly';
export type Result = 'W' | 'D' | 'L';
export type ModKind = 'type' | 'captain' | 'sub' | 'opp' | 'hidden' | 'rival' | 'tired' | 'stack' | 'knock' | 'card' | 'ability' | 'fog' | 'home' | 'range' | 'plan' | 'call';
export interface Mod { axis: Axis; d: number; why: string; kind: ModKind }
export type Tag = 'SCREAMER' | 'HEARTBREAK' | 'WONDER SAVE';
export interface ChanceEvent {
  minute: number;
  side: Side;
  type: string;
  mods: Mod[];
  /** Values after every modifier, the shape the ball meets. */
  values: AxisValues;
  /** Radius of the landing hexagon: the keeper's reach on attack, the shooter's on defence. */
  reach: number;
  /** 0–100, whole percent. */
  pct: number;
  land: [number, number];
  ok: boolean;
  retake?: { land: [number, number]; ok: boolean; why: string };
  /** Distance from the landing spot to the shape edge, when close enough for a goal-line check. */
  glDist: number | null;
  tag?: Tag;
  /** A call's "keep the ball": no chance was taken in this slot (matchday spec §2.3). Never a shot, never in xG. */
  kept?: boolean;
}
/** The owner's three options at a call (matchday spec §2.3). */
export type CallPick = 'take' | 'shoot' | 'keep';
/** One call in a match: where it came, the odds shown (exactly the odds used), what was picked and by whom. */
export interface CallRecord {
  /** Index of the chance slot it decided. */
  slot: number;
  minute: number;
  /** Call n of `of`. */
  n: number;
  of: number;
  /** Brabo first, at the moment of the call. */
  score: [number, number];
  pick: CallPick;
  by: 'you' | 'assistant';
  /** Whole percent: take it on and shoot on sight to score; keep the ball, the points it adds to stopping their next attack (absent with no attack of theirs left). */
  odds: { take: number; shoot: number; keep?: number };
  /** The axis and the kind of chance "take it on" goes to. */
  takeAxis: Axis;
  takeType: string;
}
export interface MatchEvents {
  seed: number;
  chances: ChanceEvent[];
  score: [number, number];
  xg: [number, number];
  moments: string[];
  /** League nights (matchday spec §2.3): the calls, in order. Absent for matches without calls. */
  calls?: CallRecord[];
  /** Name of the hidden ability found out at full time, if any. */
  revealed?: string;
}
export const axisIndex = (a: Axis) => AXES.indexOf(a);
export const allAxes = (n: number): AxisValues => ({ Pace: n, Power: n, Fuel: n, Rest: n, Routine: n, Shape: n });
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export type { DayKey };

/** A rival's twist on a match (built in rivals.ts). */
export interface RivalTwist { id: string; name: string; text: string; mods: (minute: number, side: Side, autoPlayed: boolean) => Mod[] }
/** One of Brabo's equipped abilities, from the catalogue. */
export type BraboWhen =
  | 'always' | 'long' | 'late' | 'home' | 'away' | 'first-half' | 'after-concede' | 'level' | 'own-type' | 'home-late'
  // engine 2: layer 2 traits and layer 3 (the tree, boons and boosts)
  | 'second-half' | 'behind' | 'ahead' | 'set-piece' | 'derby' | 'cup' | 'final' | 'continental' | 'continental-home'
  | 'continental-away' | 'auto' | 'first-chance' | 'after-goal' | 'after-save' | 'vs-higher' | 'international';
/**
 * One of Brabo's equipped abilities, from the catalogue. Layer 2's traits and layer 3's tree bonuses are abilities too:
 * `side` limits one to attack or defence (unset or 'both': either), `tree` puts it under the ±3-per-axis cap (spec §1),
 * and `retake` makes it a once-a-match retake of a missed chance of 30% or more in its situation.
 */
export interface BraboAbility { id: string; name: string; axis?: Axis; d?: number; when?: BraboWhen; side?: Side | 'both'; tree?: boolean; retake?: boolean }
