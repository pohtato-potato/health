// Relations (desk-and-world spec §5, w-relations, decision 12.4 a). Pure: no React, no Dexie.
//
// Each club has an opinion of Brabo from −100 to 100. Like the fog, it is never stored as a running total: it is
// worked out from what already happened.
// - Named rivals (`rivals.ts`) start cold; the rest start at 0 and form by accident.
// - Deals: a fair one (their fee paid) warms them; a hard bargain, or talks that broke down, cools them.
// - Poaching: taking a player from a club in your own division.
// - A promise of minutes: kept warms them; each day it was broken cools them a little.
// - Cup ties: knocking a club out stings; being knocked out by them leaves them generous.
// - Congress votes and lobbying (Fork 4): pass them in as `votes`, or emit `opinion` effects from a desk job.
//
// What it changes: the fee and mood of loan talks and the odds of a push (`market.ts`), and later votes and words.
// It NEVER changes a match's odds: nothing in the match engine reads this file (a test checks). The rival twist in
// `rivals.ts` is the only rivalry that plays on the pitch, as before.
import type { DayKey } from '../../domain/dates';
import type { DeskState } from '../desk/types';
import type { Fact } from '../fog/fog';
import type { Comp, Result } from '../types';

export const OPINION_MIN = -100;
export const OPINION_MAX = 100;
/** Where a named rival starts. */
export const RIVAL_START = -40;
/** Moves, in opinion points. */
export const MOVE = {
  fair: 8, sharp: -4, walked: -5, poach: -6,
  promiseKept: 10, promiseDay: -3, promiseFloor: -15,
  cupWin: -6, cupDraw: -2, cupLoss: 2,
} as const;
/** The cups whose ties count (a league match never moves an opinion). */
export const CUP_COMPS: Comp[] = ['bigcup', 'tiercup', 'continental', 'clubworld'];

export type MoveKind = 'rival' | 'deal' | 'talks' | 'poach' | 'promise' | 'cup' | 'vote' | 'lobby';
export interface Move { club: string; d: number; why: string; day?: DayKey; kind: MoveKind }

/** A market loan's stay, as relations read it (globe/types.ts `LoanStay`). */
export interface StayForRelations { club?: string; market?: boolean; promise?: boolean; missed?: number; until: DayKey; loan: string }
export interface CupTie { opp: string; date: DayKey; result: Result; comp: Comp }
export interface RelationSource {
  /** Named rivals' club ids (`save.rivals`). */
  rivals: string[];
  /** The desk's log: `opinion` effects (deals, talks, poaching; Fork 4's lobbying). */
  desk?: DeskState;
  /** Brabo's stored matches; only cup ties count. */
  ties: CupTie[];
  stays: StayForRelations[];
  /** FORK 4 HOOK: congress votes, already turned into moves (how Brabo voted against a club's lean, and so on). */
  votes?: Move[];
}

/** Every move on one club's opinion, oldest first (a rival's start first). */
export function movesOf(src: RelationSource, club: string): Move[] {
  const out: Move[] = [];
  if (src.rivals.includes(club)) out.push({ club, d: RIVAL_START, why: 'A named rival', kind: 'rival' });
  const dated: Move[] = [];
  for (const s of src.desk?.spends ?? []) {
    for (const e of s.effects) if (e.kind === 'opinion' && e.club === club) dated.push({ club, d: e.d, why: e.why, day: s.day, kind: e.move });
  }
  for (const t of src.ties) {
    if (t.opp !== club || !CUP_COMPS.includes(t.comp)) continue;
    const d = t.result === 'W' ? MOVE.cupWin : t.result === 'L' ? MOVE.cupLoss : MOVE.cupDraw;
    dated.push({ club, d, why: t.result === 'W' ? 'You beat them in a cup tie' : t.result === 'L' ? 'They beat you in a cup tie, and feel generous' : 'A cup tie, level', day: t.date, kind: 'cup' });
  }
  for (const s of src.stays) {
    if (!s.market || s.club !== club || !s.promise || s.missed === undefined) continue;
    dated.push(s.missed === 0
      ? { club, d: MOVE.promiseKept, why: 'The promise of minutes was kept', day: s.until, kind: 'promise' }
      : { club, d: Math.max(MOVE.promiseFloor, MOVE.promiseDay * s.missed), why: `The promise of minutes broke on ${s.missed} ${s.missed === 1 ? 'day' : 'days'}`, day: s.until, kind: 'promise' });
  }
  for (const v of src.votes ?? []) if (v.club === club) dated.push(v);
  dated.sort((a, b) => (a.day ?? '').localeCompare(b.day ?? ''));
  return [...out, ...dated];
}

const clamp = (x: number) => Math.max(OPINION_MIN, Math.min(OPINION_MAX, x));
/** A club's opinion of Brabo: the sum of its moves, held within −100 to 100 at every step. */
export function opinionOf(src: RelationSource, club: string): number {
  return movesOf(src, club).reduce((t, m) => clamp(t + m.d), 0);
}

export type OpinionWord = 'Friends' | 'Warm' | 'Neutral' | 'Cool' | 'Hostile';
export function opinionWord(n: number): OpinionWord {
  return n >= 50 ? 'Friends' : n >= 15 ? 'Warm' : n > -15 ? 'Neutral' : n > -50 ? 'Cool' : 'Hostile';
}
/** Its colour on the five-step value scale. */
export const OPINION_INK: Record<OpinionWord, string> = { Friends: '#8fdcb6', Warm: '#b9e08a', Neutral: '#f2c46d', Cool: '#ffad6b', Hostile: '#ff7a76' };

/**
 * Fog: a club's opinion shows once you know their manager, once you have dealt with them (any move), or when they
 * are a named rival. Until then it is hatched like any fogged fact.
 */
export const opinionKnown = (facts: Set<Fact>, moves: Move[]) => facts.has('manager') || moves.length > 0;
