// The loan market and talks (desk-and-world spec §3, §5; decisions 12.4 a and 12.5 a). Pure: no React, no Dexie.
//
// - A scout's 6 can turn up a loan target (Fork 2 keeps it as a `lead` effect in the desk's log). Those targets sit in
//   the market, beside packs.
// - Study a loan target: a desk job on a clock of 2. The first segment uncovers the player's rating and signature
//   move; the second, the club's soft spot (where they will give) and sore spot (where they won't).
// - Talks: three rounds, a die each, over the length of the stay, the fee (club money) and a promise of minutes.
//   Each round you agree (sure) or push on one term, at odds shown before you commit and drawn from the spend's
//   seed (honest dice). A failed push sours their mood; at nothing they walk out. After the third round the deal is
//   done on the terms reached, if the money is there.
// - A market loan has its own slot (12.5 a): packs keep their slot, odds and Icon loans as they are. Once here it
//   follows `globe/loans.ts` like any loan: it plays only when its unit's habit is logged, and the unit's
//   youngsters grow ×1.5 while it stays.
// - Brabo's own players are habits: they are never bought or sold here.
// - Relations (`relations.ts`) change the fee, their mood and the odds of talks. They never touch a match.
import { addDays, type DayKey } from '../../domain/dates';
import { wage } from '../content/money';
import type { LoanTier, Unit } from '../content/types';
import { qualityOf } from '../desk/types';
import { LOAN_RATING, loanById } from '../globe/loans';
import { hashSeed, rng } from '../rng';
import type { Tier } from '../types';

export type LoanPush = 'fee' | 'days' | 'promise';
export type SponsorPush = 'more' | 'longer' | 'bonus';
export type Push = LoanPush | SponsorPush;
export type Reply = 'agree' | Push;
export const LOAN_PUSHES: LoanPush[] = ['fee', 'days', 'promise'];
export const SPONSOR_PUSHES: SponsorPush[] = ['more', 'longer', 'bonus'];

/** Study a loan target: a clock of 2 (spec §3). */
export const STUDY_CLOCK = 2;
/** Known % of a target: the scout's lead, then each study segment. */
export const LEAD_KNOWN = 30;
export const STUDY_KNOWN = 35;
/** Talks: three rounds, a die each. */
export const ROUNDS = 3;
/** Their opening length, and what a push on it adds. */
export const OPEN_DAYS = 7;
export const LONGER_DAYS = 3;
/** A push on the fee takes this share off. */
export const FEE_CUT = 0.7;
/** The fee in wage units at Brabo's division, by the player's tier (content/money.ts `wage`). */
export const FEE_UNITS: Record<LoanTier, number> = { gold: 1, prism: 2, icon: 4 };
/** One market loan at a time, in a slot of its own (12.5 a). */
export const MARKET_SLOTS = 1;
/** After a walk-out, days before they take a call again. */
export const COOL_OFF = 7;
/** Mood: 0 they walk out, 4 keen. Talks start at 2, one up for a club that likes you, one down for one that doesn't. */
export const MOOD_START = 2;
export const MOOD_MAX = 4;
export const MOOD_NAME = ['Walked out', 'Cold', 'Wary', 'Warming', 'Keen'] as const;
/** Odds of a push (in %), before the edges. */
export const PUSH_BASE: Record<Push, number> = { fee: 50, days: 60, promise: 45, more: 50, longer: 60, bonus: 45 };
/** A 5–6 pushes well, a 1–2 badly (spec §3). */
export const DIE_EDGE = { well: 10, does: 0, badly: -10 } as const;
/** Better knowledge gives leverage: each study segment, and the soft and sore spots once known. */
export const STUDY_EDGE = 5;
export const SPOT_EDGE = 15;
/** Each step of mood away from the middle. */
export const MOOD_EDGE = 8;
/** Asking again for what they already refused. */
export const RETRY_COST = 20;
export const ODDS_MIN = 5;
export const ODDS_MAX = 95;
/** A sponsor push: 15% more a season, one season more (up to 3), or a signing bonus of a quarter-season. */
export const MORE_SHARE = 1.15;
export const BONUS_SHARE = 0.25;
export const MAX_SEASONS = 3;

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const clamp = (lo: number, hi: number, x: number) => Math.max(lo, Math.min(hi, x));

// ---------- targets ----------
/** A loan target the scouts found: `club:loan`. */
export const leadKey = (club: string, loan: string) => `${club}:${loan}`;
export const studyClockId = (key: string) => `study:${key}`;
export interface Lead { key: string; club: string; loan: string; day: DayKey }
/** Every target found, oldest first, once each. */
export function leadsFrom(found: { day: DayKey; club: string; loan: string }[]): Lead[] {
  const out: Lead[] = [];
  for (const f of found) {
    const key = leadKey(f.club, f.loan);
    if (!out.some((l) => l.key === key) && loanById(f.loan)) out.push({ key, club: f.club, loan: f.loan, day: f.day });
  }
  return out;
}

/** Where their club will give, and where it won't: fixed for each target, found by the study's second segment. */
export interface Secrets { soft: LoanPush; sore: LoanPush }
export function secretsOf(key: string): Secrets {
  const r = rng(hashSeed('loan-target', key));
  const soft = LOAN_PUSHES[Math.floor(r() * 3)];
  const rest = LOAN_PUSHES.filter((p) => p !== soft);
  return { soft, sore: rest[Math.floor(r() * 2)] };
}
/** What a target's study has uncovered: 0 nothing, 1 rating and signature move, 2 also the soft and sore spots. */
export const studiedOf = (filled: number) => clamp(0, STUDY_CLOCK, filled);
export const targetKnown = (studied: number) => Math.min(100, LEAD_KNOWN + STUDY_KNOWN * studiedOf(studied));
/** The rating as the market shows it: a range of 7 until studied (it always holds the true rating), then the number. */
export function ratingShown(key: string, tier: LoanTier, studied: number): { lo: number; hi: number } {
  const x = LOAN_RATING[tier];
  if (studied >= 1) return { lo: x, hi: x };
  const below = Math.floor(rng(hashSeed('loan-range', key))() * 7);
  return { lo: x - below, hi: x - below + 6 };
}

// ---------- terms ----------
export interface LoanTerms { kind: 'loan'; days: number; fee: number; promise: boolean }
export interface SponsorTerms { kind: 'sponsor'; perSeason: number; seasons: number; bonus: number }
export type Terms = LoanTerms | SponsorTerms;

/** A friend at +100 asks a fifth less; a club at −100 a fifth more. */
export const feeFactor = (opinion: number) => 1 - clamp(-100, 100, opinion) / 500;
/** Their opening terms: a week, the fee for the player's tier at Brabo's division, and he starts every match. */
export function openingLoan(tier: LoanTier, ownTier: Tier, opinion: number): LoanTerms {
  return { kind: 'loan', days: OPEN_DAYS, fee: r3(wage(FEE_UNITS[tier], ownTier) * feeFactor(opinion)), promise: true };
}
export const openingSponsor = (o: { perSeason: number; seasons: number }): SponsorTerms => ({ kind: 'sponsor', perSeason: o.perSeason, seasons: o.seasons, bonus: 0 });
export const startMood = (opinion: number) => clamp(1, MOOD_MAX, MOOD_START + (opinion >= 25 ? 1 : 0) - (opinion <= -25 ? 1 : 0));

/** The pushes still open: a term already won is off the table. */
export function pushesFor(t: Terms, won: Push[]): Push[] {
  if (t.kind === 'loan') return LOAN_PUSHES.filter((p) => !won.includes(p));
  return SPONSOR_PUSHES.filter((p) => !won.includes(p) && (p !== 'longer' || t.seasons < MAX_SEASONS));
}
/** The terms after a push that came off. */
export function improved(t: Terms, p: Push): Terms {
  if (t.kind === 'loan') {
    if (p === 'fee') return { ...t, fee: r3(t.fee * FEE_CUT) };
    if (p === 'days') return { ...t, days: t.days + LONGER_DAYS };
    if (p === 'promise') return { ...t, promise: false };
    return t;
  }
  if (p === 'more') return { ...t, perSeason: r3(t.perSeason * MORE_SHARE) };
  if (p === 'longer') return { ...t, seasons: Math.min(MAX_SEASONS, t.seasons + 1) };
  if (p === 'bonus') return { ...t, bonus: r3(t.perSeason * BONUS_SHARE) };
  return t;
}
/** What the deal costs the club now (a loan's fee); a sponsor pays, so it costs nothing. */
export const costOf = (t: Terms) => (t.kind === 'loan' ? t.fee : 0);

// ---------- odds ----------
export interface OddsCtx { die: number; studied: number; secrets?: Secrets; opinion: number; mood: number; fails: number }
/** One edge on the odds of a push, for the screen's "why". */
export interface Edge { why: string; d: number }
/** The odds of a push, with each edge. The number shown is the number drawn against. */
export function pushOdds(p: Push, c: OddsCtx): { pct: number; edges: Edge[] } {
  const edges: Edge[] = [];
  const add = (why: string, d: number) => { if (d) edges.push({ why, d }); };
  add('Your die', DIE_EDGE[qualityOf(c.die)]);
  add('What you studied', STUDY_EDGE * studiedOf(c.studied));
  if (c.secrets && c.studied >= STUDY_CLOCK) {
    if (c.secrets.soft === p) add('Their soft spot', SPOT_EDGE);
    if (c.secrets.sore === p) add('Their sore spot', -SPOT_EDGE);
  }
  add('What they think of you', Math.round(clamp(-100, 100, c.opinion) / 5));
  add('Their mood', (c.mood - MOOD_START) * MOOD_EDGE);
  add('Asked before', -RETRY_COST * c.fails);
  const pct = clamp(ODDS_MIN, ODDS_MAX, PUSH_BASE[p] + edges.reduce((t, e) => t + e.d, 0));
  return { pct, edges };
}

// ---------- talks ----------
/** One round of talks, kept in the desk's log. `terms` and `mood` are after the round. */
export interface TalkRound {
  kind: 'talk';
  /** A target's `club:loan`, or a sponsor's `sp:slot:brand`. */
  talk: string;
  /** Talks with the same target are numbered: a walk-out ends one, and a later call starts the next. */
  n: number;
  round: number;
  reply: Reply;
  /** The odds shown (100 for agree) and whether the push came off. */
  pct: number;
  hit: boolean;
  terms: Terms;
  mood: number;
  end?: 'deal' | 'walked' | 'short';
}
export interface TalkRow { day: DayKey; e: TalkRound }

export interface TalkState {
  talk: string;
  n: number;
  /** The round to play next (1–3). */
  round: number;
  terms: Terms;
  mood: number;
  won: Push[];
  fails: Partial<Record<Push, number>>;
  /** The last talk's end, if it has ended. */
  ended?: { how: 'deal' | 'walked' | 'short'; day: DayKey };
  /** True while rounds have been played and the talk hasn't ended. */
  live: boolean;
}

/** Where a talk stands, from the log. A talk that ended starts afresh (n + 1) with the opening terms. */
export function talkState(log: TalkRow[], talk: string, opening: Terms, mood: number): TalkState {
  const mine = log.filter((x) => x.e.talk === talk);
  const n = mine.reduce((m, x) => Math.max(m, x.e.n), 0);
  const cur = mine.filter((x) => x.e.n === n);
  const last = cur[cur.length - 1];
  if (!last) return { talk, n: 1, round: 1, terms: opening, mood, won: [], fails: {}, live: false };
  if (last.e.end) return { talk, n: n + 1, round: 1, terms: opening, mood, won: [], fails: {}, ended: { how: last.e.end, day: last.day }, live: false };
  const won: Push[] = [], fails: Partial<Record<Push, number>> = {};
  for (const x of cur) {
    if (x.e.reply === 'agree') continue;
    if (x.e.hit) won.push(x.e.reply);
    else fails[x.e.reply] = (fails[x.e.reply] ?? 0) + 1;
  }
  return { talk, n, round: cur.length + 1, terms: last.e.terms, mood: last.e.mood, won, fails, live: true };
}

/** Can talks start (or go on) today? A walk-out keeps the phone off the hook for a week. */
export const coolingUntil = (s: TalkState): DayKey | undefined => (s.ended?.how === 'walked' ? addDays(s.ended.day, COOL_OFF) : undefined);

/** One reply in a round, as the screen shows it. */
export interface ReplyOption { reply: Reply; pct: number; edges: Edge[]; terms: Terms; ok: boolean; why?: string }
/** The replies open this round: agree (sure, if the money is there) and each push still open, with its odds. */
export function replies(s: TalkState, c: Omit<OddsCtx, 'mood' | 'fails'>, budget: number): ReplyOption[] {
  const cost = costOf(s.terms);
  const out: ReplyOption[] = [{ reply: 'agree', pct: 100, edges: [], terms: s.terms, ok: cost <= budget, ...(cost > budget ? { why: 'The budget doesn’t cover the fee' } : {}) }];
  for (const p of pushesFor(s.terms, s.won)) {
    const o = pushOdds(p, { ...c, mood: s.mood, fails: s.fails[p] ?? 0 });
    out.push({ reply: p, pct: o.pct, edges: o.edges, terms: improved(s.terms, p), ok: true });
  }
  return out;
}

/** A round played: the reply, whether it came off, and where the talk ends up. */
export function playRound(s: TalkState, reply: Reply, pct: number, hit: boolean, budget: number): TalkRound {
  const base = { kind: 'talk' as const, talk: s.talk, n: s.n, round: s.round, reply, pct };
  if (reply === 'agree') return { ...base, pct: 100, hit: true, terms: s.terms, mood: s.mood, end: 'deal' };
  const terms = hit ? improved(s.terms, reply) : s.terms;
  const mood = hit ? s.mood : s.mood - 1;
  if (mood <= 0) return { ...base, hit, terms, mood: 0, end: 'walked' };
  if (s.round >= ROUNDS) return { ...base, hit, terms, mood, end: costOf(terms) <= budget ? 'deal' : 'short' };
  return { ...base, hit, terms, mood };
}

// ---------- the market slot ----------
/** A market loan at the club or on its way (a deal not yet folded in). One at a time, in its own slot. */
export interface SlotBusy { name: string; until: DayKey }
export interface MarketStay { loan: string; until: DayKey; market?: boolean }
export function marketSlot(stays: MarketStay[], pending: { loan: string; days: number; day: DayKey }[], date: DayKey): SlotBusy | undefined {
  const here = stays.filter((s) => s.market && s.until >= date);
  const all = [...here.map((s) => ({ loan: s.loan, until: s.until })), ...pending.map((p) => ({ loan: p.loan, until: addDays(p.day, p.days) }))];
  if (all.length < MARKET_SLOTS) return undefined;
  const first = all.reduce((a, b) => (b.until < a.until ? b : a));
  return { name: loanById(first.loan)?.name ?? 'A loan', until: first.until };
}
/** The stay a deal makes: from the day after the deal's day plays, for the days agreed. */
export function marketStay(deal: { talk: string; n: number; club: string; loan: string; days: number; fee: number; promise: boolean }, unit: Unit, tier: LoanTier, dealDay: DayKey) {
  const from = addDays(dealDay, 1);
  return { key: `market:${deal.talk}:${deal.n}`, loan: deal.loan, unit, tier, from, until: addDays(from, deal.days - 1), apps: [] as DayKey[], goals: 0, market: true as const, club: deal.club, fee: deal.fee, ...(deal.promise ? { promise: true as const } : {}) };
}
/** Days of a stay its unit's habit went unlogged, leaving out sick, injured and travel days: a promise of minutes broken. */
export function missedDays(from: DayKey, until: DayKey, unlogged: (d: DayKey) => boolean, excused: (d: DayKey) => boolean): number {
  let n = 0;
  for (let d = from; d <= until; d = addDays(d, 1)) if (!excused(d) && unlogged(d)) n++;
  return n;
}
