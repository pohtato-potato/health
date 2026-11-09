// Football engine 2, layer 4 (the world): what the save keeps. Pure shapes, no React, no Dexie.
//
// Like the tree, two halves, so a match playing in the background never overwrites a tap:
// - `GlobeEngine` (save.globe) is written only while days play: loans at the club, nations, breaks, duty, trials run.
// - `GlobeUser` (save.globeUser) is written only by taps: moments seen. play.ts treats it as a user key.
import type { DayKey } from '../../domain/dates';
import type { LoanTier, Unit } from '../content/types';

/** One loan's stay at the club (spec §10, §16). `key` is the pack item it came from (`<pack id>:<index>`). */
export interface LoanStay {
  key: string;
  loan: string;
  unit: Unit;
  tier: LoanTier;
  /** First and last day at the club. */
  from: DayKey;
  until: DayKey;
  /** Days it played (its unit's habit was logged), and its goals. */
  apps: DayKey[];
  goals: number;
  /** A loan already met: it came back. */
  back?: boolean;
}

/** One international break this season (spec §9.4): three days with no league matches. */
export interface BreakPlayed { season: number; n: 1 | 2; days: DayKey[] }

/** A player called up for a break, and the days its habit was logged while away. */
export interface DutyRow { season: number; n: 1 | 2; player: string; name: string; nation: string; days: DayKey[]; settled?: 'trait' | 'attr' | 'quiet' }

export type SleepStyle = 'early' | 'long' | 'short' | 'mixed';

export interface GlobeEngine {
  /** Every loan stay, oldest first. */
  loans: LoanStay[];
  /** Loan ids met at least once (the running-low notice counts these). */
  met: string[];
  /** Player id → nation code, given once and for good (spec §9.4). */
  nations: Record<string, string>;
  breaks: BreakPlayed[];
  /** Call-ups of the latest breaks (the last few are kept). */
  duty: DutyRow[];
  /** Trial days already held. */
  trials: { on: DayKey; style: SleepStyle; came: string[] }[];
}
export interface GlobeUser {
  /** Loan arrivals whose moment has been seen (stay keys). */
  seenLoans: string[];
  /** The last trial day whose reveal was seen. */
  seenTrials?: DayKey;
}

export const emptyGlobe = (): GlobeEngine => ({ loans: [], met: [], nations: {}, breaks: [], duty: [], trials: [] });
export const emptyGlobeUser = (): GlobeUser => ({ seenLoans: [] });
