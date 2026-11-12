// Negotiate (desk spec §3, §5, Fork 3; w3-haggle): loan talks in three rounds, a die a round, over the length of the
// stay, the fee and a promise of minutes. A sponsor talk uses the same rounds over the money a season, the seasons
// and a signing bonus. No friendlies. The odds shown are the odds drawn against, from the spend's seed.
//
// A target here is one reply in the talk that is open: `talk|reply` (`club:loan|fee`, `sp:shirt:Brand|agree`).
// Only one talk is open at a time; a new loan talk waits while the market slot is taken.
import { addDays, type DayKey } from '../../../domain/dates';
import { loanById } from '../../globe/loans';
import {
  coolingUntil, openingLoan, openingSponsor, playRound, replies, secretsOf, startMood, talkState,
  type ReplyOption, type Reply, type Secrets, type TalkRound, type TalkState, type Terms,
} from '../../market/market';
import { MOVE } from '../../market/relations';
import type { Tier } from '../../types';
import type { DeskView, Die, Effect, JobDef, Target } from '../types';
import { leadTaken, studiedIn } from './leads';

export const SPONSOR_PREFIX = 'sp:';
export const sponsorTalk = (slot: string, brand: string) => `${SPONSOR_PREFIX}${slot}:${brand}`;
export const splitTarget = (t: string): { talk: string; reply: Reply } => {
  const i = t.lastIndexOf('|');
  return { talk: t.slice(0, i), reply: t.slice(i + 1) as Reply };
};

/** A talk's fixed context: who, the opening terms, the starting mood, what is known. */
export interface TalkCtx {
  talk: string;
  kind: 'loan' | 'sponsor';
  name: string;
  /** Their club (a loan), or the brand (a sponsor). */
  who: string;
  club?: string;
  loan?: string;
  opinion: number;
  poach: boolean;
  studied: number;
  secrets?: Secrets;
  opening: Terms;
  state: TalkState;
}

const talksOf = (v: DeskView) => v.market?.talks ?? [];
export { leadTaken };

export function talkCtx(v: DeskView, talk: string): TalkCtx | undefined {
  const m = v.market;
  if (!m) return undefined;
  if (talk.startsWith(SPONSOR_PREFIX)) {
    const o = m.offers.find((x) => sponsorTalk(x.slot, x.brand) === talk);
    if (!o) return undefined;
    const opening = openingSponsor(o);
    return { talk, kind: 'sponsor', name: o.brand, who: o.brand, opinion: 0, poach: false, studied: 0, opening, state: talkState(m.talks, talk, opening, startMood(0)) };
  }
  const lead = m.leads.find((l) => l.key === talk);
  const def = lead && loanById(lead.loan);
  if (!lead || !def) return undefined;
  const opening = openingLoan(def.tier, m.ownTier as Tier, lead.opinion);
  const studied = studiedIn(v, talk);
  return {
    talk, kind: 'loan', name: def.name, who: lead.clubName, club: lead.club, loan: lead.loan, opinion: lead.opinion, poach: lead.poach,
    studied, secrets: secretsOf(talk), opening, state: talkState(m.talks, talk, opening, startMood(lead.opinion)),
  };
}

/** The talk under way, if any: only one at a time. */
export function liveTalk(v: DeskView): TalkCtx | undefined {
  const live = [...new Set(talksOf(v).map((x) => x.e.talk))].map((t) => talkCtx(v, t)).filter((c): c is TalkCtx => !!c && c.state.live);
  return live[0];
}

/** Why a talk can't start now, or undefined when it can. */
export function talkBlocked(v: DeskView, c: TalkCtx): string | undefined {
  if (c.kind === 'loan' && leadTaken(v, c.talk)) return `${c.name} is already signed`;
  const live = liveTalk(v);
  if (live && live.talk !== c.talk) return `Talks with ${live.who} are open: finish them first`;
  const cool = coolingUntil(c.state);
  if (!c.state.live && cool && v.date < cool) return `${c.who} won’t take a call until ${cool}`;
  if (c.kind === 'loan' && !c.state.live && v.market?.slot) return `The market slot is taken until ${v.market.slot.until}`;
  return undefined;
}

/** Every talk that could be held: open targets and sponsor offers. */
export function talkList(v: DeskView): TalkCtx[] {
  const m = v.market;
  if (!m) return [];
  const all = [...m.leads.map((l) => l.key), ...m.offers.map((o) => sponsorTalk(o.slot, o.brand))];
  return all.map((t) => talkCtx(v, t)).filter((c): c is TalkCtx => !!c && !(c.kind === 'loan' && leadTaken(v, c.talk)));
}

/** The replies this round for a die, with their odds. */
export function optionsFor(v: DeskView, c: TalkCtx, die: Die): ReplyOption[] {
  return replies(c.state, { die: die.value, studied: c.studied, secrets: c.secrets, opinion: c.opinion }, v.market?.budget ?? 0);
}

/** The round a reply would play, the effects it leaves, given whether a push came off. */
export function roundEffects(v: DeskView, c: TalkCtx, reply: Reply, pct: number, hit: boolean): Effect[] {
  const round: TalkRound = playRound(c.state, reply, pct, hit, v.market?.budget ?? 0);
  const out: Effect[] = [round];
  const t = round.terms;
  if (round.end === 'deal' && t.kind === 'loan' && c.club && c.loan) {
    out.push({ kind: 'deal', talk: c.talk, n: round.n, club: c.club, loan: c.loan, days: t.days, fee: t.fee, promise: t.promise });
    const sharp = c.state.won.includes('fee') || (reply === 'fee' && hit);
    out.push(sharp
      ? { kind: 'opinion', club: c.club, d: MOVE.sharp, why: `A hard bargain over ${c.name}`, move: 'deal' }
      : { kind: 'opinion', club: c.club, d: MOVE.fair, why: `A fair deal for ${c.name}`, move: 'deal' });
    if (c.poach) out.push({ kind: 'opinion', club: c.club, d: MOVE.poach, why: `Took ${c.name} from a club in your own division`, move: 'poach' });
  }
  if (round.end === 'deal' && t.kind === 'sponsor') {
    const [, slot, ...brand] = c.talk.split(':');
    out.push({ kind: 'sponsor', slot, brand: brand.join(':'), perSeason: t.perSeason, seasons: t.seasons, bonus: t.bonus });
  }
  if (round.end === 'walked' && c.club) out.push({ kind: 'opinion', club: c.club, d: MOVE.walked, why: `Talks over ${c.name} broke down`, move: 'talks' });
  return out;
}

function pick(v: DeskView, target?: string): { c: TalkCtx; reply: Reply } | undefined {
  if (!target) return undefined;
  const { talk, reply } = splitTarget(target);
  const c = talkCtx(v, talk);
  return c ? { c, reply } : undefined;
}

export const negotiate: JobDef = {
  id: 'negotiate',
  ink: '#f2c46d',
  open: (v) => talkList(v).length > 0,
  card: (v) => {
    const live = liveTalk(v);
    const n = talkList(v).length;
    return {
      title: 'Negotiate', ask: 'Loan talks',
      line: live ? `${live.name}, ${live.who}: round ${live.state.round} of 3.` : `${n} ${n === 1 ? 'talk' : 'talks'} you could open: a die a round, three rounds.`,
      chip: live ? `Round ${live.state.round}` : 'New',
    };
  },
  targets(v): Target[] {
    const out: Target[] = [];
    for (const c of talkList(v)) {
      if (talkBlocked(v, c)) continue;
      for (const r of replies(c.state, { die: 3, studied: c.studied, secrets: c.secrets, opinion: c.opinion }, v.market?.budget ?? 0)) {
        if (r.ok) out.push({ id: `${c.talk}|${r.reply}`, name: `${c.name}: ${r.reply}` });
      }
    }
    return out;
  },
  blocked(v) {
    const list = talkList(v);
    if (!list.length) return 'No one to talk to yet: a scout’s 6 can find a loan target';
    return list.every((c) => talkBlocked(v, c)) ? talkBlocked(v, list[0]) : undefined;
  },
  preview(die, v, target) {
    const p = pick(v, target);
    if (!p) return { head: 'Pick a reply.', line: '', gain: '', others: '', effects: [] };
    const o = optionsFor(v, p.c, die).find((x) => x.reply === p.reply);
    if (!o) return { head: 'Not now.', line: 'That reply is off the table.', gain: '', others: '', effects: [] };
    if (p.reply === 'agree') return { head: 'Deal.', line: 'Sure: they shake on it.', gain: 'Sure', others: '', effects: roundEffects(v, p.c, 'agree', 100, true) };
    return {
      head: `${o.pct}%.`, line: 'If it comes off, the term is yours; if not, their mood drops.', gain: `${o.pct}%`,
      others: 'A 5 or 6 pushes better; a 1 or 2 worse.', effects: roundEffects(v, p.c, p.reply, o.pct, true),
      risk: { pct: o.pct, line: 'the push comes off.' },
    };
  },
  spend(die, v, target, r) {
    const p = pick(v, target);
    if (!p) return { effects: [] };
    const o = optionsFor(v, p.c, die).find((x) => x.reply === p.reply);
    if (!o) return { effects: [] };
    if (p.reply === 'agree') return { effects: roundEffects(v, p.c, 'agree', 100, true) };
    const hit = r() * 100 < o.pct;
    return { effects: roundEffects(v, p.c, p.reply, o.pct, hit), risk: { pct: o.pct, line: 'the push comes off.', hit } };
  },
};

/** "the 22nd": a day of the month in words, for the scout's hint. */
export function dayInWords(d: DayKey): string {
  const n = Number(d.slice(8, 10));
  const s = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return `the ${n}${s}`;
}
export const untilFor = (date: DayKey, days: number) => dayInWords(addDays(date, days));
