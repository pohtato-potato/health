// The federation congress (desk-and-world spec §6, w-congress A, decision 12.6 a). Pure: no React, no Dexie.
//
// - Before every season the federation votes on 2 or 3 motions, drawn by the season's seed from the writing chat's
//   twenty (`content/desk/motions.ts`). Only motions whose rule twist the game can play are drawn (`WIRED`): a motion
//   that passed and then did nothing would be a lie. The rest join the ballot as their rules are wired.
// - Each club leans by its owner kind and its region's pride (`SEATS`), and a friend or a foe of Brabo is pulled
//   toward or away from Brabo's vote. Brabo starts with 1 vote (`braboVotes`, the seam for the mission tree, step 5).
// - Lobbying (a desk job in the fortnight before a congress) wins one club's vote at a shown risk of annoying another.
// - Motions that pass are that season's rule twists (`twistsOf`). How Brabo votes moves opinions (`voteMoves`, fed to
//   relations as `votes`). Nothing here touches a match's odds through relations.
import type { DayKey } from '../../domain/dates';
import { MOTIONS, SEATS, type Lean, type Motion, type TwistKey } from '../content/desk';
import type { Move } from '../market/relations';
import { hashSeed, rng, shuffle } from '../rng';

/**
 * The twists the game plays today. A motion is drawn for a ballot only when its twist is here.
 * `four-up` is wired (promotion.ts `upDown`) but kept off the ballot: the league rebuild (spec 2026-11-14, eight
 * divisions of 12) rewrites promotion, so it returns once its rule is re-fitted there. Every twist here reads the
 * pyramid as it is (clubs per division, bands), never a fixed size.
 */
export const WIRED: TwistKey[] = ['away-win-four', 'loan-cap', 'solidarity', 'spending-rule'];
export const BALLOT_POOL: Motion[] = MOTIONS.filter((m) => WIRED.includes(m.twist.key));
export const motionById = (id: string): Motion | undefined => MOTIONS.find((m) => m.id === id);

/** Days before a congress when lobbying opens: the last fortnight of the season, and the event days after it. */
export const LOBBY_DAYS = 14;
/** A friend (or a foe) at or beyond this opinion is pulled one step toward (or away from) Brabo's vote. */
export const PULL_AT = 40;
/** Opinion moved by Brabo's vote on clubs that care strongly (a lean of ±2): with them warms, against them cools. */
export const VOTE_MOVE = 3;
/** A lobby that annoys another club costs this much of that club's opinion. */
export const LOBBY_ANNOY = -8;
/** The shown chance a lobby annoys another club, by how well the die does it (5–6, 3–4, 1–2). */
export const LOBBY_RISK = { well: 10, does: 25, badly: 40 } as const;
/** Clubs offered to lobby on one motion: the most persuadable of those voting the other way. */
export const LOBBY_OFFER = 8;
export const OWN_ID = 'bra';

export type Vote = 'for' | 'against' | 'abstain';
/** Brabo's ballot for one congress: a vote per motion. Unvoted motions are abstentions. */
export type Ballot = Record<string, Vote>;

/**
 * Brabo's votes at a congress. 1 at the start; the mission tree (step 5) grows it with the club's standing.
 * THE SEAM: pass the standing in when it exists. Nothing else needs to change.
 */
export const braboVotes = (standing = 0): number => 1 + Math.max(0, Math.floor(standing));

/** The congress before season `next` is held as that season begins; its ballot is drawn by its seed. */
export function ballotFor(next: number): Motion[] {
  const r = rng(hashSeed('congress', String(next)));
  const n = r() < 0.5 ? 2 : 3;
  return shuffle(r, BALLOT_POOL).slice(0, Math.min(n, BALLOT_POOL.length));
}

/** Lobbying is open in the fortnight before a congress: the last 14 days of a season, and the event days after. */
export const lobbyOpen = (phase: 'season' | 'event', day: number, seasonDays: number): boolean =>
  phase === 'event' || day > seasonDays - LOBBY_DAYS;
/** Days left to lobby, while the season still runs (the event days after it add a few more). */
export const lobbyDaysLeft = (phase: 'season' | 'event', day: number, seasonDays: number): number | undefined =>
  phase === 'season' ? Math.max(0, seasonDays - day + 1) : undefined;

const clampLean = (x: number): Lean => Math.max(-2, Math.min(2, Math.round(x))) as Lean;
/**
 * How a club's seat leans on a motion: its owner kind plus its region's pride, −2 to 2. Old selves sit neutral, and so
 * does a club with no seat yet (a new real club before the writing chat gives it one): it still votes, pulled only by
 * its opinion of Brabo or a lobby. Owners are never made up for a real club.
 */
export function seatLean(m: Motion, club: string): Lean {
  const seat = SEATS[club];
  if (!seat || seat.owner === 'old-self') return 0;
  return clampLean((m.leans[seat.owner] ?? 0) + (m.regions?.[seat.region] ?? 0));
}
const dir = (v: Vote) => (v === 'for' ? 1 : v === 'against' ? -1 : 0);
const voteOf = (lean: number): Vote => (lean > 0 ? 'for' : lean < 0 ? 'against' : 'abstain');

export interface Lobbied { club: string; motion: string; side: 'for' | 'against' }
export type WhyVote = 'seat' | 'friend' | 'foe' | 'lobby';
/** One club's vote: its seat, pulled by its opinion of Brabo when Brabo has voted, or won by a lobby. */
export function clubVote(m: Motion, club: string, opinion: number, brabo: Vote, lobbied?: Lobbied): { vote: Vote; why: WhyVote } {
  if (lobbied && lobbied.motion === m.id && lobbied.club === club) return { vote: lobbied.side, why: 'lobby' };
  let lean: number = seatLean(m, club);
  let why: WhyVote = 'seat';
  const d = dir(brabo);
  if (d && opinion >= PULL_AT && Math.sign(lean) !== d) { lean += d; why = 'friend'; }
  else if (d && opinion <= -PULL_AT && Math.sign(lean) !== -d) { lean -= d; why = 'foe'; }
  return { vote: voteOf(lean), why };
}

export interface MotionResult {
  id: string;
  for: number; against: number; abstain: number;
  passed: boolean;
  /** Brabo's own vote, counted `votes` times. */
  brabo: Vote; votes: number;
  /** Clubs won by a lobby, and friends or foes pulled by their opinion of Brabo. */
  lobbied: string[]; pulled: string[];
}
/** The count on one motion. It passes on more seats for than against. */
export function tally(m: Motion, clubs: string[], opinion: (club: string) => number, brabo: Vote, lobbies: Lobbied[], votes = braboVotes()): MotionResult {
  const out: MotionResult = { id: m.id, for: 0, against: 0, abstain: 0, passed: false, brabo, votes, lobbied: [], pulled: [] };
  for (const c of clubs) {
    if (c === OWN_ID) continue;
    const v = clubVote(m, c, opinion(c), brabo, lobbies.find((l) => l.motion === m.id && l.club === c));
    out[v.vote]++;
    if (v.why === 'lobby') out.lobbied.push(c);
    else if (v.why !== 'seat') out.pulled.push(c);
  }
  out[brabo] += brabo === 'abstain' ? 1 : votes;
  out.passed = out.for > out.against;
  return out;
}

/** A congress as it sat: stored in the save (engine side), read by the season's rules and by relations. */
export interface CongressRecord {
  /** The season it set the twists for. */
  season: number;
  /** The day it sat (the new season's first day). */
  on: DayKey;
  motions: MotionResult[];
  /** Opinion moves from how Brabo voted: clubs who cared strongly, with Brabo (+) or against (−). */
  moves: { club: string; d: number; motion: string }[];
}

/** The congress sits: every motion counted, and Brabo's votes turned into opinion moves. */
export function sitCongress(season: number, on: DayKey, clubs: string[], opinion: (club: string) => number, ballot: Ballot, lobbies: Lobbied[], votes = braboVotes()): CongressRecord {
  const motions = ballotFor(season);
  const results = motions.map((m) => tally(m, clubs, opinion, ballot[m.id] ?? 'abstain', lobbies, votes));
  const moves: CongressRecord['moves'] = [];
  for (const m of motions) {
    const d = dir(ballot[m.id] ?? 'abstain');
    if (!d) continue;
    for (const c of clubs) {
      if (c === OWN_ID) continue;
      const lean = seatLean(m, c);
      if (Math.abs(lean) === 2) moves.push({ club: c, d: Math.sign(lean) === d ? VOTE_MOVE : -VOTE_MOVE, motion: m.id });
    }
  }
  return { season, on, motions: results, moves };
}

/** The relations hook (Fork 3's `votes`): every congress's moves, dated the day it sat. */
export function voteMoves(records: CongressRecord[] | undefined): Move[] {
  return (records ?? []).flatMap((r) => r.moves.map((x) => ({
    club: x.club, d: x.d, day: r.on, kind: 'vote' as const,
    why: `${x.d > 0 ? 'You voted with them' : 'You voted against them'} on ${motionById(x.motion)?.name.toLowerCase() ?? 'a motion'}`,
  })));
}

/** The rule twists in force in a season: the motions that passed at the congress before it. */
export function twistsOf(records: CongressRecord[] | undefined, season: number): Map<TwistKey, number> {
  const out = new Map<TwistKey, number>();
  const rec = records?.find((r) => r.season === season);
  for (const res of rec?.motions ?? []) {
    const m = res.passed ? motionById(res.id) : undefined;
    if (m) out.set(m.twist.key, m.twist.value);
  }
  return out;
}

// ---------------------------------------------------------------- lobbying

/** The shown chance a lobby annoys another club, less any perk (never below 0). */
export const lobbyRisk = (die: number, cut = 0): number =>
  Math.max(0, (die >= 5 ? LOBBY_RISK.well : die >= 3 ? LOBBY_RISK.does : LOBBY_RISK.badly) - cut);

/**
 * Who a lobby would annoy: the club that leans hardest the other way, among those not lobbied; a club from the
 * lobbied club's region first (rivals of the same pride notice), then by name. Shown before you commit.
 */
export function annoyedBy(m: Motion, lobbied: string, side: 'for' | 'against', clubs: string[], taken: string[] = []): string | undefined {
  const d = side === 'for' ? 1 : -1;
  const region = SEATS[lobbied]?.region;
  const pool = clubs.filter((c) => c !== OWN_ID && c !== lobbied && !taken.includes(c) && Math.sign(seatLean(m, c)) === -d);
  pool.sort((a, b) => Math.abs(seatLean(m, b)) - Math.abs(seatLean(m, a))
    || Number(SEATS[b]?.region === region) - Number(SEATS[a]?.region === region) || a.localeCompare(b));
  return pool[0];
}

/** The clubs worth lobbying on a motion: those not voting Brabo's way, the most persuadable (weakest lean) first. */
export function swingClubs(m: Motion, side: 'for' | 'against', clubs: string[], opinion: (club: string) => number, lobbies: Lobbied[]): string[] {
  return clubs
    .filter((c) => c !== OWN_ID && !lobbies.some((l) => l.motion === m.id && l.club === c))
    .filter((c) => clubVote(m, c, opinion(c), side).vote !== side)
    .sort((a, b) => Math.abs(seatLean(m, a)) - Math.abs(seatLean(m, b)) || opinion(b) - opinion(a) || a.localeCompare(b))
    .slice(0, LOBBY_OFFER);
}

/** A lobby target, as the desk passes it: motion, side and club. */
export const lobbyKey = (l: Lobbied) => `${l.motion}|${l.side}|${l.club}`;
export function parseLobby(key: string): Lobbied | undefined {
  const [motion, side, club] = key.split('|');
  return motion && club && (side === 'for' || side === 'against') ? { motion, side, club } : undefined;
}

/** The season's rules as the game reads them, from the twists in force. Without a congress: the usual rules. */
export interface SeasonRules {
  /** Points for an away win (3, or 4 under `away-win-four`). */
  awayWin: number;
  /** Clubs up and down at each boundary (3, or 4 under `four-up`). */
  upDown: 3 | 4;
  /** Loan-market fees, as a share (1, or 0.8 under `loan-cap`). */
  loanFee: number;
  /** Share of Crown League TV money passed down the pyramid, % (0, or 10 under `solidarity`). */
  solidarity: number;
  /** How much likelier "financial trouble" is for a club above its division's band (1, or 2 under `spending-rule`). */
  trouble: number;
}
export const USUAL_RULES: SeasonRules = { awayWin: 3, upDown: 3, loanFee: 1, solidarity: 0, trouble: 1 };
export function seasonRules(records: CongressRecord[] | undefined, season: number): SeasonRules {
  const t = twistsOf(records, season);
  return {
    awayWin: t.has('away-win-four') ? t.get('away-win-four')! : 3,
    upDown: t.has('four-up') ? 4 : 3,
    loanFee: t.has('loan-cap') ? 0.8 : 1,
    solidarity: t.get('solidarity') ?? 0,
    trouble: t.has('spending-rule') ? t.get('spending-rule')! : 1,
  };
}
