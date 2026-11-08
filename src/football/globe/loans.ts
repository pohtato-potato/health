// Loans from packs (spec §10, §16). Pure.
// - A pack's fifth slot can hold a loan; Icon loans are checked before the slots: about 2%, +0.5% a pack without one,
//   plus the season track's odds and the Abroad loans tech. Icon loans are retired greats.
// - A loan opened in a pack joins its unit on the next day played, for 7 days (Loan manager 10, Loan window 9).
//   One at a time (Squad depth: two, in different units); a loan that can't start yet waits its turn.
// - It plays only on days its unit's habit is logged, taking the lowest starter's place; that player sits out and rests.
// - While it's here, that unit's youngsters grow ×1.5. Then it goes home, with a small chance of coming back later.
import { addDays, type DayKey } from '../../domain/dates';
import { LOANS } from '../content/loans';
import { ICON_LOAN_BASE, ICON_LOAN_STEP, LOAN_RETURN_PCT, LOAN_TIER_ODDS } from '../content/packs';
import type { LoanDef, LoanTier, Unit } from '../content/types';
import type { XiPlace } from '../players/types';
import type { PackItem, PackOpened } from '../tree/types';
import type { LoanStay } from './types';

export const LOAN_DAYS = 7;
export const LOAN_SLOTS = 1;
/** A loan's match rating by tier (tune): Gold and Prism current players, Icons retired greats. */
export const LOAN_RATING: Record<LoanTier, number> = { gold: 76, prism: 85, icon: 93 };
/** Youngsters in a loan's unit grow half as fast again while it's here. */
export const LOAN_MENTOR = 1.5;

export const loanById = (id: string): LoanDef | undefined => LOANS.find((l) => l.id === id);
export const LOAN_TIER_NAME: Record<LoanTier, string> = { gold: 'Gold loan', prism: 'Prism loan', icon: 'Icon loan' };

/** Packs opened since the last Icon loan (the odds rise 0.5% for each). */
export function packsSinceIcon(opened: PackOpened[]): number {
  let n = 0;
  for (let i = opened.length - 1; i >= 0; i--) {
    if (opened[i].items.some((x) => x.kind === 'loan' && x.rarity === 'icon')) break;
    if (opened[i].items.length > 1) n++;
  }
  return n;
}
/** This pack's Icon loan odds, in %: the base, the rise, the track's odds and the tree's (spec §10). */
export const iconOdds = (opened: PackOpened[], extra = 0) => ICON_LOAN_BASE + ICON_LOAN_STEP * packsSinceIcon(opened) + extra;

/**
 * One loan of a tier: one not met yet when there is one; a loan already met only comes back now and then
 * (LOAN_RETURN_PCT), or when the tier's pool is all met.
 */
export function pickLoan(r: () => number, tier: LoanTier, met: string[]): LoanDef {
  const all = LOANS.filter((l) => l.tier === tier);
  const fresh = all.filter((l) => !met.includes(l.id));
  const back = all.filter((l) => met.includes(l.id));
  const comeBack = back.length > 0 && (fresh.length === 0 || r() * 100 < LOAN_RETURN_PCT);
  const pool = comeBack ? back : fresh.length ? fresh : all;
  return pool[Math.floor(r() * pool.length)];
}
/** A pack item for a loan: Icon when the Icon check came up, else Gold or Prism by the slot odds. */
export function loanItem(r: () => number, icon: boolean, met: string[]): PackItem {
  const tier: LoanTier = icon ? 'icon' : r() * (LOAN_TIER_ODDS.gold + LOAN_TIER_ODDS.prism) < LOAN_TIER_ODDS.gold ? 'gold' : 'prism';
  const l = pickLoan(r, tier, met);
  return { kind: 'loan', id: l.id, rarity: tier };
}

/** Every loan opened in a pack, oldest first, with the day it was opened. */
export function loansOpened(opened: PackOpened[]): { key: string; loan: string; on: DayKey }[] {
  return opened.flatMap((p) => p.items.flatMap((it, i) => (it.kind === 'loan' && it.id ? [{ key: `${p.id}:${i}`, loan: it.id, on: p.on }] : [])));
}
export const atClub = (stays: LoanStay[], date: DayKey) => stays.filter((s) => s.from <= date && date <= s.until);

export interface LoanRules { days: number; slots: number }
/**
 * The loans that start on `date`: each opened loan not yet at the club, oldest first, while a slot is free and its
 * unit has no loan already. A loan waits for its turn; nothing is ever lost.
 */
export function startLoans(stays: LoanStay[], opened: PackOpened[], met: string[], date: DayKey, rules: LoanRules): LoanStay[] {
  const out: LoanStay[] = [];
  const here = atClub(stays, date);
  for (const q of loansOpened(opened)) {
    if (q.on > date || stays.some((s) => s.key === q.key)) continue;
    const def = loanById(q.loan);
    if (!def) continue;
    const now = [...here, ...out];
    if (now.length >= rules.slots || now.some((s) => s.unit === def.unit)) continue;
    out.push({ key: q.key, loan: def.id, unit: def.unit, tier: def.tier, from: date, until: addDays(date, rules.days - 1), apps: [], goals: 0, ...(met.includes(def.id) ? { back: true } : {}) });
  }
  return out;
}
/** Loans still waiting for a slot (opened, not yet at the club). */
export const loansWaiting = (stays: LoanStay[], opened: PackOpened[]) => loansOpened(opened).filter((q) => !stays.some((s) => s.key === q.key));

/** The loan's place in tonight's eleven. */
export const loanPlayerId = (s: Pick<LoanStay, 'loan'>) => `loan:${s.loan}`;

/**
 * Tonight's eleven with the loans in it (spec §16): a loan whose unit was logged today takes the place of the lowest
 * starter in its unit, who sits out and rests. A loan on a day its habit wasn't logged doesn't play.
 */
export function withLoans(xi: XiPlace[], stays: LoanStay[], logged: (u: Unit) => boolean): { xi: XiPlace[]; played: string[]; rested: string[] } {
  let out = xi;
  const played: string[] = [], rested: string[] = [];
  for (const s of stays) {
    const def = loanById(s.loan);
    if (!def || !logged(def.unit)) continue;
    const mine = out.map((x, i) => ({ x, i })).filter(({ x }) => x.unit === def.unit && !x.player.startsWith('loan:'));
    if (!mine.length) continue;
    const low = mine.reduce((a, b) => (b.x.rating < a.x.rating ? b : a));
    const place: XiPlace = { player: loanPlayerId(s), unit: def.unit, place: low.x.place, name: def.name, rating: LOAN_RATING[def.tier] };
    // A short unit's best covers two places; the loan takes one of them and the player still starts in the other.
    const stillIn = out.some((x, i) => i !== low.i && x.player === low.x.player);
    out = out.map((x, i) => (i === low.i ? place : x));
    played.push(s.key);
    if (!stillIn) rested.push(low.x.player);
  }
  return { xi: out, played, rested };
}

/** Growth multiplier for a youngster in this unit: ×1.5 while a loan is at the club. */
export const mentorFor = (stays: LoanStay[], date: DayKey, unit: Unit) => (atClub(stays, date).some((s) => s.unit === unit) ? LOAN_MENTOR : 1);

/** Loans whose last day was yesterday: they go home today with their farewell line. */
export const leavingOn = (stays: LoanStay[], date: DayKey) => stays.filter((s) => s.until === addDays(date, -1));
/** Days left at the club, today included. */
export const daysLeft = (s: LoanStay, date: DayKey) => Math.max(0, Math.round((Date.parse(`${s.until}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 86400000) + 1);
