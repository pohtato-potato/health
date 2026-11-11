// The season run (spec §12, §16): boons, bounties, the season track and the board's objectives. Pure.
import { addDays, weekStart, type DayKey } from '../../domain/dates';
import { BOARD, BOARD_PER_SEASON, BOON_CHOICES, BOON_DAYS, BOONS, BOUNTIES, BOUNTIES_OFFERED, BOUNTIES_PICKED, TRACK } from '../content/season';
import type { BoardObjective, BoonDef, BountyDef, Strength, TrackStep } from '../content/types';
import { hashSeed, rng, shuffle } from '../rng';
import { countIn } from './metrics';
import type { TreeEngine, TreeUser } from './types';

// ---------------- boons ----------------

/** The picks due this season by `day` (1–42): the day-1, 15 and 29 picks, plus any extra picks the track gave. */
export function boonPicksDue(day: number, extra: number): number[] {
  const base = BOON_DAYS.map((d, i) => (day >= d ? i + 1 : 0)).filter(Boolean);
  return [...base, ...Array.from({ length: extra }, (_, i) => BOON_DAYS.length + 1 + i)];
}
/** The next pick not yet made this season, if any. */
export function boonPickOpen(user: TreeUser, season: number, day: number, extra: number): number | undefined {
  const made = new Set(user.boons.filter((b) => b.season === season).map((b) => b.pick));
  return boonPicksDue(day, extra).find((p) => !made.has(p));
}
/** The boons offered at a pick: seeded, never one already held this season. */
export function boonOffer(user: TreeUser, season: number, pick: number, choices = BOON_CHOICES): BoonDef[] {
  const held = new Set(user.boons.filter((b) => b.season === season).map((b) => b.id));
  return shuffle(rng(hashSeed('boon', String(season), String(pick))), BOONS.filter((b) => !held.has(b.id))).slice(0, choices);
}
/** Boons that count this season. They're the one thing a new season resets. */
export const boonsThisSeason = (user: TreeUser, season: number) => user.boons.filter((b) => b.season === season).map((b) => b.id);

// ---------------- bounties ----------------

/** Training jobs: sessions, clean form, a kept rest day. Train has no list of its own; they sit in this one. */
export const isTrainingBounty = (b: BountyDef) => b.target.what === 'training' || b.target.what === 'form-ok' || b.target.what === 'rest-day';
/** The six offered for a week (Monday's date), seeded. At least one is a training job: if none was drawn, the first training job in the shuffle takes the last slot. */
export function bountyOffer(week: DayKey): BountyDef[] {
  const all = shuffle(rng(hashSeed('bounty', week)), BOUNTIES);
  const offer = all.slice(0, BOUNTIES_OFFERED);
  if (!offer.some(isTrainingBounty)) offer[offer.length - 1] = all.find(isTrainingBounty)!;
  return offer;
}
export const bountiesPicked = (user: TreeUser, week: DayKey) => user.bounties.find((b) => b.week === week)?.ids ?? [];
export const canPickBounties = (user: TreeUser, week: DayKey) => bountiesPicked(user, week).length < BOUNTIES_PICKED;
/** Progress on a bounty in its week: the metric summed over Monday to `date` (at most Sunday). */
export function bountyProgress(eng: TreeEngine, b: BountyDef, week: DayKey, date: DayKey): number {
  const end = addDays(week, (b.target.withinDays ?? 7) - 1);
  return countIn(eng.days, b.target.what, week, date < end ? date : end);
}
export const weekOf = weekStart;

// ---------------- the season track ----------------

/** Steps reached this season: one a day with anything logged, plus catch-ups, at most 42. */
export const trackSteps = (eng: TreeEngine, season: number) =>
  eng.track.season === season ? Math.min(TRACK.length, eng.track.steps.length + eng.track.catchups) : 0;
/** Rewards on the track reached but not yet paid. */
export function trackDue(eng: TreeEngine, season: number): TrackStep[] {
  const n = trackSteps(eng, season);
  return TRACK.filter((s) => s.step <= n && s.reward && !eng.trackPaid.includes(`${season}:${s.step}`));
}

// ---------------- the board ----------------

export interface SeasonFacts {
  /** League position now (or at the end), 1 is top. */
  position: number;
  divisionSize: number;
  promoted: boolean;
  playoffs: boolean;
  goals: number;
  cleanSheets: number;
  derbyWins: number;
  /** Longest run of home league matches without a loss. */
  homeUnbeaten: number;
  /** Antigoon in the same division and below us, or in a lower division. */
  aboveRival: boolean | undefined;
  /** Rounds reached in each cup, by name ('Last 32', 'Quarter-final', … and 'win'). */
  bigcup: string[];
  tiercup: string[];
  continental?: 'group' | 'r16' | 'qf' | 'sf' | 'final';
  inContinental: boolean;
  /** Antigoon in the same division (the derby is possible). */
  derbyOn: boolean;
}
const ROUND: Record<string, string[]> = { r3: ['Last 32'], qf: ['Quarter-final'], sf: ['Semi-final'], final: ['Final'], win: ['win'] };
const CONT = ['group', 'r16', 'qf', 'sf', 'final'];

/** Squad strength against the division: our rating against the division's spread. */
export function strengthOf(own: number, division: number[]): Strength {
  const sorted = [...division].sort((a, b) => a - b);
  const below = sorted.filter((x) => x < own).length / Math.max(1, sorted.length);
  return below >= 0.7 ? 'high' : below >= 0.35 ? 'mid' : 'low';
}
/** Two objectives for the season, seeded, from those set for this strength that can be met this season. */
export function boardFor(season: number, strength: Strength, f: Pick<SeasonFacts, 'inContinental' | 'derbyOn' | 'divisionSize'> & { topTier: boolean }): BoardObjective[] {
  const fits = BOARD.filter((o) => o.for.includes(strength)).filter((o) => {
    const g = o.goal;
    if (g.kind === 'continental') return f.inContinental;
    if (g.kind === 'derby' || g.kind === 'above-rival') return f.derbyOn;
    if ((g.kind === 'promotion' || g.kind === 'playoffs') && f.topTier) return false;
    return true;
  });
  const r = rng(hashSeed('board', String(season)));
  // One league goal and one other where possible, so the two never ask the same thing twice.
  const league = shuffle(r, fits.filter((o) => ['position', 'playoffs', 'promotion'].includes(o.goal.kind)));
  const other = shuffle(r, fits.filter((o) => !['position', 'playoffs', 'promotion'].includes(o.goal.kind)));
  return [...league.slice(0, 1), ...other.slice(0, 1), ...league.slice(1), ...other.slice(1)].slice(0, BOARD_PER_SEASON);
}
/** Met or not (at the season's end), or on track (during it). */
export function objectiveMet(o: BoardObjective, f: SeasonFacts): boolean {
  const g = o.goal;
  switch (g.kind) {
    case 'position': return f.position <= g.atBest;
    case 'playoffs': return f.playoffs || f.promoted;
    case 'promotion': return f.promoted;
    case 'cup-round': return (g.cup === 'bigcup' ? f.bigcup : f.tiercup).some((x) => ROUND[g.round].includes(x)) || (g.round !== 'win' && reachedBeyond(g.cup === 'bigcup' ? f.bigcup : f.tiercup, g.round));
    case 'continental': return Boolean(f.continental) && CONT.indexOf(f.continental!) >= CONT.indexOf(g.round);
    case 'goals': return f.goals >= g.n;
    case 'clean-sheets': return f.cleanSheets >= g.n;
    case 'derby': return f.derbyWins >= g.wins;
    case 'home-unbeaten': return f.homeUnbeaten >= g.matches;
    case 'above-rival': return f.aboveRival === true;
  }
}
const ORDER = ['Last 128', 'Last 64', 'Last 32', 'Last 16', 'Quarter-final', 'Semi-final', 'Final', 'win'];
function reachedBeyond(reached: string[], round: string): boolean {
  const want = ORDER.indexOf(ROUND[round][0]);
  return reached.some((x) => ORDER.indexOf(x) >= want);
}
/** A plain progress line for an objective during the season: never a scold. */
export function objectiveLine(o: BoardObjective, f: SeasonFacts): string {
  const g = o.goal;
  const ok = objectiveMet(o, f);
  switch (g.kind) {
    case 'position': case 'playoffs': case 'promotion': return `${ordinal(f.position)} now · ${ok ? 'on track' : 'still to play for'}`;
    case 'goals': return `${f.goals} of ${g.n} goals`;
    case 'clean-sheets': return `${f.cleanSheets} of ${g.n} clean sheets`;
    case 'derby': return f.derbyWins ? 'Done' : 'Still to play for';
    case 'home-unbeaten': return `Best run ${f.homeUnbeaten} of ${g.matches}`;
    case 'above-rival': return f.aboveRival === undefined ? 'Still to play for' : ok ? 'Above them now' : 'Below them now';
    case 'cup-round': case 'continental': return ok ? 'Done' : 'Still to play for';
  }
}
export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
