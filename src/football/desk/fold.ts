// The desk's results, folded into the world when a day plays at 4 am (desk spec §2–3). Pure: play.ts hands over the
// pieces of the world, and each day's spends are folded once (days play once, in order). Taps never write the
// engine's tables, so a match playing in the background can't lose a die spent at the same moment.
import { inSentence } from './words';
import type { DayKey } from '../../domain/dates';
import { addDays } from '../../domain/dates';
import type { TreeEngine } from '../tree/types';
import { clubById } from '../data/load';
import { loanById } from '../globe/loans';
import type { LoanStay } from '../globe/types';
import { marketStay } from '../market/market';
import { euros, type Offer } from '../money';
import { spendsOn, unspentResearch } from './rules';
import type { DeskState, Die, Effect } from './types';

export interface FoldWorld {
  eng: TreeEngine;
  squad: { id: string; status: string; growth?: number; name: string }[];
  bundles: Map<string, { id: string; progress: Record<string, number>; done?: DayKey }>;
  /** The needs of every project and ground bundle, by id. */
  needs: (id: string) => { what: string; count: number }[] | undefined;
  news: { id: string; date: DayKey; kind: string; text: string; clubId?: string }[];
  /** Fork 3: the club's money, loans and sponsors, for deals struck in talks. Left out, deals wait. */
  club?: ClubWorld;
}
/** Pieces of the save a deal changes (play.ts copies them back). */
export interface ClubWorld { budget: number; loans: LoanStay[]; offers: Offer[]; sponsors: (Offer & { since: number })[]; season: number; phase: 'season' | 'event' }

/** A club's name, or plain words for one the data doesn't know. */
const clubName = (id: string) => { try { return clubById(id).name; } catch { return 'their club'; } };

/** A loan deal: the fee leaves the budget and the loan arrives the next day, in the market's own slot. No debt. */
function foldDeal(w: FoldWorld, e: Extract<Effect, { kind: 'deal' }>, date: DayKey) {
  const c = w.club, def = loanById(e.loan);
  if (!c || !def) return;
  const stay = marketStay(e, def.unit, def.tier, date);
  if (c.loans.some((x) => x.key === stay.key)) return;
  const from = clubName(e.club);
  if (c.budget < e.fee) {
    w.news.push({ id: `${date}:market-short:${stay.key}`, date, kind: 'club', text: `The deal for ${def.name} falls through: the budget no longer covers ${euros(e.fee)}. Nothing is owed.` });
    return;
  }
  c.budget = Math.round((c.budget - e.fee) * 1000) / 1000;
  c.loans = [...c.loans, stay];
  w.news.push({ id: `${date}:market-in:${stay.key}`, date: stay.from, kind: 'club', clubId: e.club, text: `${def.name} joins on loan from ${from} for ${e.days} days (${euros(e.fee)}). ${def.arrival}` });
}
/** A sponsor deal from talks: signed on the terms reached, the bonus paid now. */
function foldSponsor(w: FoldWorld, e: Extract<Effect, { kind: 'sponsor' }>, date: DayKey) {
  const c = w.club;
  if (!c) return;
  const o = c.offers.find((x) => x.slot === e.slot && x.brand === e.brand);
  if (!o) return;
  const signed = { ...o, perSeason: e.perSeason, seasons: e.seasons as Offer['seasons'], since: c.phase === 'event' ? c.season + 1 : c.season };
  c.sponsors = [...c.sponsors.filter((x) => x.slot !== o.slot || o.slot === 'partner'), signed];
  c.offers = c.offers.filter((x) => x.slot !== o.slot || (o.slot === 'partner' && x !== o && x.brand !== o.brand));
  c.budget = Math.round((c.budget + e.bonus) * 1000) / 1000;
  w.news.push({ id: `${date}:sponsor-talks:${e.slot}:${e.brand}`, date, kind: 'club', text: `${e.brand} signs: ${euros(e.perSeason)} a season for ${e.seasons} ${e.seasons === 1 ? 'season' : 'seasons'}${e.bonus ? `, and ${euros(e.bonus)} on signing` : ''}.` });
}

/** Adds days to a project's least-finished need, capped at the need. Never takes anything away. */
export function pushProject(progress: Record<string, number>, needs: { what: string; count: number }[], n: number): Record<string, number> {
  const open = needs.filter((x) => (progress[x.what] ?? 0) < x.count);
  if (!open.length) return progress;
  const worst = open.reduce((b, x) => ((progress[x.what] ?? 0) / x.count < (progress[b.what] ?? 0) / b.count ? x : b));
  return { ...progress, [worst.what]: Math.min(worst.count, Math.round(((progress[worst.what] ?? 0) + n) * 10) / 10) };
}

function gain(eng: TreeEngine, on: DayKey, n: number, note: string) {
  if (n <= 0) return;
  eng.earned += n;
  eng.gains = [...eng.gains, { on, n, why: 'desk' as const, note }].slice(-60);
}

/** One effect into the world. Kinds read straight from the spend log (watch, course, clock) need nothing here. */
function foldEffect(w: FoldWorld, e: Effect, date: DayKey) {
  switch (e.kind) {
    case 'research': gain(w.eng, date, e.n, 'The desk'); break;
    case 'grow': {
      const i = w.squad.findIndex((y) => y.id === e.youth);
      if (i >= 0 && w.squad[i].status === 'growing') w.squad[i] = { ...w.squad[i], growth: Math.round(((w.squad[i].growth ?? 0) + e.n) * 100) / 100 };
      break;
    }
    case 'project': {
      const needs = w.needs(e.id);
      const cur = w.bundles.get(e.id) ?? { id: e.id, progress: {} };
      if (needs && !cur.done) w.bundles.set(e.id, { ...cur, progress: pushProject(cur.progress, needs, e.n) });
      break;
    }
    case 'column':
      w.news.push({ id: `${addDays(date, 1)}:column:${e.line}`, date: addDays(date, 1), kind: 'press', text: e.to ? `The manager answers ${inSentence(e.to)} in the paper: “${e.text}”` : `From the manager's column: “${e.text}”` });
      break;
    case 'deal': foldDeal(w, e, date); break;
    case 'sponsor': foldSponsor(w, e, date); break;
    case 'watch': case 'course': case 'clock': case 'scout': case 'lead': case 'talk': case 'opinion': break;
  }
}

/** A day plays: its spends go into the world, and its unspent dice turn into a little research. */
export function deskFold(desk: DeskState | undefined, date: DayKey, dice: Die[], w: FoldWorld): void {
  const spent = desk ? spendsOn(desk, date) : [];
  for (const s of spent) for (const e of s.effects) foldEffect(w, e, date);
  const left = dice.filter((d) => !spent.some((s) => s.axis === d.axis)).length;
  gain(w.eng, date, unspentResearch(left), 'Dice left on the desk');
}
