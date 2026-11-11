// Dealing the deck from the last seven nights (spec §3, §12). Pure: the store hands in the league's own nightly axis
// values, and this decides the twelve cards, the extras, and the plain-words reasons for "How your deck was dealt".
import type { DayKey } from '../../domain/dates';
import type { Status } from '../../domain/types';
import { AXES, type Axis, type AxisFlags, type AxisValues } from '../types';
import { TITLE } from './cards';
import type { Card, CardKind, Level } from './types';

/** One night of the seven: the values the league match played from, and what the day was. */
export interface DealDay {
  date: DayKey;
  values: AxisValues;
  flags: AxisFlags;
  status?: Status;
  /** Nothing at all was logged that day. */
  empty: boolean;
  /** Every ring closed. */
  perfect: boolean;
  /** Exercises with a record set that day. */
  records: string[];
}
export interface DealInput {
  /** The seven nights before today, oldest first. */
  days: DealDay[];
  /** Each axis's 28-day form (the average of its logged nights), for sick and travelling days. */
  form28: Partial<Record<Axis, number>>;
  /** The first week of the app, or the first after a long gap: thin axes play at basic, not as punts. */
  firstWeek: boolean;
  /** Loan players at the club today. */
  loans: { id: string; name: string; axis: Axis }[];
}
export interface DealRow { axis: Axis; avg: number | null; level: Level | 'punt'; cards: Card[]; why: string; days: number; away: number }
export interface DealExtra { kind: 'record' | 'total' | 'empty' | 'loan'; card: Card; why: string }
export interface Deal { cards: Card[]; rows: DealRow[]; extras: DealExtra[] }

export const SLOTS: Record<Axis, CardKind[]> = {
  Pace: ['one-two', 'one-two', 'overlap'],
  Power: ['strike', 'strike', 'header'],
  Fuel: ['second-wind', 'fuelled'],
  Rest: ['hold', 'fresh-legs'],
  Routine: ['drilled'],
  Shape: ['system'],
};
/** What a loan player's card plays as, by the unit it plays in. */
export const LOAN_AS: Record<Axis, CardKind> = { Pace: 'overlap', Power: 'strike', Fuel: 'second-wind', Rest: 'hold', Routine: 'drilled', Shape: 'hold' };
export const MAX = { records: 2, total: 2, empty: 3 };
/** Statuses that count at 28-day form (spec §3.2: sick or travelling). */
const AWAY: Status[] = ['sick', 'injured', 'travelling'];
const BASIC_CAP = 10;

export const levelFor = (avg: number): Level => (avg >= 15 ? 'great' : avg >= 11 ? 'good' : 'basic');

export function dealDeck(i: DealInput): Deal {
  const cards: Card[] = [];
  const rows: DealRow[] = [];
  for (const a of AXES) {
    const vals: number[] = [];
    let away = 0;
    for (const d of i.days) {
      if (d.status && AWAY.includes(d.status)) {
        away++;
        vals.push(Math.min(i.form28[a] ?? BASIC_CAP, BASIC_CAP));
      } else if (!d.flags[a]) vals.push(d.values[a]);
    }
    const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    const level: Level | 'punt' = avg != null ? levelFor(avg) : i.firstWeek ? 'basic' : 'punt';
    const mine = SLOTS[a].map((kind, k): Card =>
      level === 'punt' ? { id: `${a}-${k}`, kind: 'punt', level: 'basic', axis: null } : { id: `${a}-${k}`, kind, level, axis: a });
    cards.push(...mine);
    const logged = vals.length - away;
    let why: string;
    if (level === 'punt') why = 'Not logged this week, so hopeful punts.';
    else if (avg == null) why = 'Your first week: too little data yet, so basic.';
    else why = `${logged} day${logged === 1 ? '' : 's'} logged${away ? `, ${away} sick or away (count at form, capped at basic)` : ''}.`;
    rows.push({ axis: a, avg: avg == null ? null : avg, level, cards: mine, why, days: logged, away });
  }

  const extras: DealExtra[] = [];
  const seen = new Set<string>();
  for (const d of i.days) for (const r of d.records) {
    if (seen.has(r) || seen.size >= MAX.records) continue;
    seen.add(r);
    const card: Card = { id: `rec-${seen.size}`, kind: 'thunderbolt', level: 'great', axis: 'Power', name: r };
    extras.push({ kind: 'record', card, why: `A record in ${r} this week: a ${TITLE.thunderbolt}.` });
  }
  const perfect = i.days.filter((d) => d.perfect).slice(0, MAX.total);
  perfect.forEach((d, k) => extras.push({ kind: 'total', card: { id: `tot-${k}`, kind: 'total', level: 'basic', axis: null }, why: `Every ring closed on ${dayName(d.date)}: ${TITLE.total}.` }));
  const empty = i.days.filter((d) => d.empty && !(d.status && AWAY.includes(d.status))).slice(0, MAX.empty);
  empty.forEach((d, k) => extras.push({ kind: 'empty', card: { id: `emp-${k}`, kind: 'punt', level: 'basic', axis: null }, why: `Nothing logged on ${dayName(d.date)}: one more hopeful punt.` }));
  i.loans.forEach((l, k) => extras.push({ kind: 'loan', card: { id: `loan-${k}`, kind: 'loan', level: 'great', axis: l.axis, name: l.name, loanAs: LOAN_AS[l.axis] }, why: `${l.name} is on loan at the club: their own card.` }));
  cards.push(...extras.map((e) => e.card));
  return { cards, rows, extras };
}

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function dayName(date: DayKey): string {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
