// Cup runs (ledger O28, spec 2026-11-10): the shapes the rules share. Pure data, no React, no Dexie.
import type { Axis } from '../types';

export type Level = 'basic' | 'good' | 'great';
export const LEVELS: Level[] = ['basic', 'good', 'great'];

/** The starting cards of spec §4.5, plus the loan player's own card. */
export type CardKind =
  | 'one-two' | 'overlap' | 'strike' | 'header' | 'thunderbolt' | 'second-wind' | 'fuelled'
  | 'hold' | 'fresh-legs' | 'drilled' | 'system' | 'total' | 'punt' | 'loan';

/** Any card: a starting card or one from the pool (pool.ts, by id). */
export type AnyKind = CardKind | (string & {});

export interface Card {
  /** Unique within a deck; temporary cards made in a match take `t<n>`. */
  id: string;
  kind: AnyKind;
  level: Level;
  /** The axis whose ink it wears; null for hopeful punts and the wild card. */
  axis: Axis | null;
  /** A rare finish's exercise, or a loan player's name. Taken from the owner's data at run time, never stored in code. */
  name?: string;
  /** Made during a match (a good One-two's extra pass); gone once played or discarded. */
  temp?: boolean;
  /** A loan card plays as the great version of this card. */
  loanAs?: CardKind;
}

/** The six cup styles (spec §5.1). */
export type CupStyle = 'deep' | 'press' | 'keep' | 'direct' | 'wide' | 'setpiece';

/** The eight elite signature moves (spec §5.2). */
export type Signature = 'bus' | 'rondo' | 'metal' | 'machine' | 'murderball' | 'comeback' | 'control' | 'oldlady';

export type Side = 'left' | 'centre' | 'right';
export const SIDES: Side[] = ['left', 'centre', 'right'];
