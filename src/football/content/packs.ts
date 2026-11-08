// Packs (spec §10, §16): five items, mostly album cards, plus boosts, research and a chance at a
// loan. Packs never hold players: the card is the player. Odds marked (tune) are first guesses.
import type { Effect, Rarity } from './types';

export const PACK_ITEMS = 5;
/** What each of the five slots can hold, as weights. */
export const PACK_SLOTS: { album: number; boost: number; research: number; loan: number }[] = [
  { album: 1, boost: 0, research: 0, loan: 0 },
  { album: 1, boost: 0, research: 0, loan: 0 },
  { album: 1, boost: 0, research: 0, loan: 0 },
  { album: 0.5, boost: 0.5, research: 0, loan: 0 },
  { album: 0, boost: 0.45, research: 0.4, loan: 0.15 }, // (tune)
];
/** Album card rarity, as weights (tune). */
export const ALBUM_ODDS: Record<Rarity, number> = { bronze: 40, silver: 28, gold: 18, prism: 9, icon: 4, legend: 1 };
/** Research in a research slot. */
export const PACK_RESEARCH = [3, 5, 8];
/** Icon loans: about 2% a pack, rising 0.5% each pack without one, checked before the slots (spec §10). */
export const ICON_LOAN_BASE = 2;
export const ICON_LOAN_STEP = 0.5;
/** A loan from the fifth slot that isn't an Icon (tune). */
export const LOAN_TIER_ODDS = { gold: 75, prism: 25 };
/** Small chance a loan comes back later (spec §10). */
export const LOAN_RETURN_PCT = 5;

/** Where packs come from (spec §10). */
export const PACK_SOURCES = ['week-finished', 'final-won', 'promotion', 'tech', 'bounty', 'track', 'testimonial'] as const;

/** Boosts: a match trait, a kit trim or a one-match captain bonus. Each lasts one match unless it says otherwise. */
export interface BoostDef { id: string; name: string; kind: 'match-trait' | 'kit-trim' | 'captain'; text: string; effect: Effect }
export const BOOSTS: BoostDef[] = [
  { id: 'bo-derby-head', name: 'Derby head', kind: 'match-trait', text: '+2 Shape on defence in your next derby.', effect: { kind: 'axis', axis: 'Shape', d: 2, side: 'def', when: 'derby' } },
  { id: 'bo-cup-run', name: 'Cup run', kind: 'match-trait', text: '+1 Fuel both ways in your next cup match.', effect: { kind: 'axis', axis: 'Fuel', d: 1, side: 'both', when: 'cup' } },
  { id: 'bo-fast-out', name: 'Fast out', kind: 'match-trait', text: '+2 Pace in the first half of the next match.', effect: { kind: 'axis', axis: 'Pace', d: 2, side: 'atk', when: 'first-half' } },
  { id: 'bo-home-crowd', name: 'Home crowd', kind: 'match-trait', text: '+1 Routine on defence in the last 15 of the next home match.', effect: { kind: 'axis', axis: 'Routine', d: 1, side: 'def', when: 'home-late' } },
  { id: 'bo-long-ball', name: 'Long ball', kind: 'match-trait', text: '+2 Power on long shots in the next match.', effect: { kind: 'axis', axis: 'Power', d: 2, side: 'atk', when: 'long' } },
  { id: 'bo-keeper-day', name: 'Keeper’s day', kind: 'match-trait', text: '+2 Rest on defence from 75′ in the next match.', effect: { kind: 'axis', axis: 'Rest', d: 2, side: 'def', when: 'late' } },
  { id: 'bo-second-chance', name: 'Second chance', kind: 'match-trait', text: 'Once in the next match, while level, a missed chance of 30% or more is retaken.', effect: { kind: 'retake', when: 'level' } },
  { id: 'bo-armband', name: 'Armband night', kind: 'captain', text: 'Next match: +1 Routine both ways on its own chance type, for the armband.', effect: { kind: 'axis', axis: 'Routine', d: 1, side: 'both', when: 'own-type' } },
  { id: 'bo-captain-call', name: 'Captain’s call', kind: 'captain', text: 'Next match: chemistry +1 in the captain’s unit.', effect: { kind: 'chemistry', d: 1, when: 'always' } },
  { id: 'bo-trim-river', name: 'River trim', kind: 'kit-trim', text: 'A river-blue trim for the kit maker. Keeps for good.', effect: { kind: 'cosmetic', what: 'trim-river' } },
  { id: 'bo-trim-ember', name: 'Ember trim', kind: 'kit-trim', text: 'An orange glow at the cuffs. Keeps for good.', effect: { kind: 'cosmetic', what: 'trim-ember' } },
  { id: 'bo-trim-violet', name: 'Violet piping', kind: 'kit-trim', text: 'Thin violet piping down the sides. Keeps for good.', effect: { kind: 'cosmetic', what: 'trim-violet' } },
];
