// Football engine 2, layer 3 (the tree): what the save keeps. Pure shapes, no React, no Dexie.
//
// Two halves, so a match playing in the background never overwrites a tap:
// - `TreeEngine` (save.tree) is written only while days play: research earned, habit counts, the track,
//   packs earned, eurekas, the board's verdicts, wages and leave, the doctor's experience.
// - `TreeUser` (save.treeUser) is written only by taps: techs researched, boons and bounties picked, packs
//   opened, moments seen. play.ts treats it as a user key, so a tap during a play always wins.
import type { DayKey } from '../../domain/dates';
import type { EraId, Metric, Rarity } from '../content/types';

/** One day's real-habit counts (only the metrics that happened). */
export type DayMetrics = Partial<Record<Metric, number>>;

export type ResearchWhy = 'win' | 'draw' | 'loss' | 'logged' | 'board' | 'bounty' | 'pack' | 'duplicate' | 'tour';
export interface ResearchGain { on: DayKey; n: number; why: ResearchWhy; note?: string }

export type PackSource = 'week-finished' | 'final-won' | 'promotion' | 'tech' | 'bounty' | 'track' | 'testimonial';
export interface PackEarned { id: string; on: DayKey; source: PackSource; size: 'normal' | 'big' | 'single'; season: number }

export interface BoardSet { season: number; strength: 'low' | 'mid' | 'high'; ids: string[]; verdicts?: { id: string; met: boolean }[] }

export interface TreeEngine {
  /** Lesson points earned from matches, logged days, board objectives and bounties (packs are added from TreeUser). */
  earned: number;
  /** The last gains, newest last (for the tree's header and the season wrap). Kept short. */
  gains: ResearchGain[];
  /** Real-habit counts by day, newest last; the last 70 days are kept (bounties and eureka windows read them). */
  days: { date: DayKey; m: DayMetrics }[];
  /** Lifetime counts of every metric since the tree started (eurekas without a window read these). */
  total: DayMetrics;
  /** Lifetime counts on the day each era opened, so a eureka counts only what happened since. */
  eurekaBase: Partial<Record<EraId, { on: DayKey; m: DayMetrics }>>;
  /** Techs whose eureka has happened (their cost is halved), and when. */
  eurekas: { id: string; on: DayKey }[];
  /** The season track: days logged this season (steps), and catch-ups from bounties. */
  track: { season: number; steps: DayKey[]; catchups: number };
  /** Track rewards already paid, as `${season}:${step}`. */
  trackPaid: string[];
  packs: PackEarned[];
  /** Kit pieces and themes won on the track (cosmetic records). */
  kitPieces: string[];
  themes: string[];
  /** Icon loan odds added by the track (layer 4 reads it). */
  iconOdds: number;
  board: BoardSet[];
  /** Bounties met, as `${week}:${id}`, and the reward paid. */
  bountiesDone: string[];
  /** Staff on leave because the last wage bill couldn't be covered. */
  leave: string[];
  /** Wages paid at the last season end (millions), for the Money page. */
  wages?: { season: number; paid: number; staff: { id: string; amount: number; paid: boolean }[] };
  /** Days every medicine was kept since the club doctor was hired. */
  doctorXp: number;
  /** Extra boon picks won this season (the track's day 14, some bounties), by season. */
  boonExtra?: Record<number, number>;
  /** One-match boosts already used, by opened-pack item key. */
  boostsUsed: string[];
}

export interface PackItem {
  kind: 'album' | 'boost' | 'research' | 'loan';
  /** album: card id; boost: boost id; loan: layer 4. */
  id?: string;
  rarity?: Rarity;
  n?: number;
  /** An album card already in the album: it turned into research. */
  duplicate?: boolean;
}
export interface PackOpened { id: string; on: DayKey; items: PackItem[] }

export interface TreeUser {
  /** Techs researched, in order, with what they cost (eureka-halved where it applied). */
  researched: { id: string; on: DayKey; cost: number }[];
  /** The tech the bank is saving for: it completes by itself once the bank covers it. */
  target?: string;
  /** Boons picked: `pick` is 1–3 for the day-1, 15 and 29 picks, 4+ for extra picks from the track. */
  boons: { season: number; pick: number; id: string }[];
  /** Bounties picked for a week (Monday's date). */
  bounties: { week: DayKey; ids: string[] }[];
  opened: PackOpened[];
  /** Moments seen: eras entered, eurekas, the running-low notice per pool size. */
  seenEras: EraId[];
  seenEurekas: string[];
  lowShown: Partial<Record<'loans' | 'album' | 'boons' | 'bounties', number>>;
}

export const emptyEngine = (): TreeEngine => ({
  earned: 0, gains: [], days: [], total: {}, eurekaBase: {}, eurekas: [], track: { season: 0, steps: [], catchups: 0 }, trackPaid: [],
  packs: [], kitPieces: [], themes: [], iconOdds: 0, board: [], bountiesDone: [], leave: [], doctorXp: 0, boostsUsed: [],
});
export const emptyUser = (): TreeUser => ({ researched: [], boons: [], bounties: [], opened: [], seenEras: ['sunday'], seenEurekas: [], lowShown: {} });
