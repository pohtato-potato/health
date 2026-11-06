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
export type Comp = 'league' | 'bigcup' | 'tiercup' | 'playoff' | 'event' | 'worldcup' | 'friendly';
export type Result = 'W' | 'D' | 'L';
export type ModKind = 'type' | 'captain' | 'sub' | 'opp' | 'hidden' | 'rival' | 'tired' | 'stack' | 'knock' | 'card' | 'ability';
export interface Mod { axis: Axis; d: number; why: string; kind: ModKind }
export type Tag = 'SCREAMER' | 'HEARTBREAK' | 'WONDER SAVE';
export interface ChanceEvent {
  minute: number;
  side: Side;
  type: string;
  mods: Mod[];
  /** Values after every modifier, the shape the ball meets. */
  values: AxisValues;
  /** Opponent reach on defence; null on attack. */
  reach: number | null;
  /** 0–100, whole percent. */
  pct: number;
  land: [number, number];
  ok: boolean;
  retake?: { land: [number, number]; ok: boolean; why: string };
  /** Distance from the landing spot to the shape edge, when close enough for a goal-line check. */
  glDist: number | null;
  tag?: Tag;
}
export interface MatchEvents {
  seed: number;
  chances: ChanceEvent[];
  score: [number, number];
  xg: [number, number];
  moments: string[];
  /** Name of the hidden ability found out at full time, if any. */
  revealed?: string;
}
export const axisIndex = (a: Axis) => AXES.indexOf(a);
export const allAxes = (n: number): AxisValues => ({ Pace: n, Power: n, Fuel: n, Rest: n, Routine: n, Shape: n });
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export type { DayKey };
