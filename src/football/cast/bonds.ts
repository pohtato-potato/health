// The cast and their bonds (desk-and-world spec §7, f-cast A, k-bonds A). Pure: no React, no Dexie.
//
// - Seven people (`content/desk/cast.ts`), ten ranks each. A rank has a short scene; some carry one small lasting perk.
// - Bond points come from time at the desk (the `cast` job), from living up to the real habit each one cares about
//   (one point on a day any of their habits counted, folded at 4 am), from asks met, and from the pick of three.
// - A low opinion only cools their tone (`toneOf`). It never costs points: nothing here ever subtracts.
// - Perks never touch a rating or a match's odds: each is one rule in a desk job, the dice, the parcel, the kit
//   maker, research, the trials, the return ramp or the cup-run pool (`PERK_RULES` lists where).
import { addDays, type DayKey } from '../../domain/dates';
import { CAST, type CastAsk, type CastId, type CastMember, type CastPerk, type PerkKey } from '../content/desk';
import type { DayMetrics } from '../tree/types';
import type { DeskState, Quality } from '../desk/types';

export const CAST_IDS: CastId[] = CAST.map((c) => c.id);
export const castById = (id: string): CastMember | undefined => CAST.find((c) => c.id === id);

/** Bond points needed for ranks 1 to 10 (cumulative). A rank or so a fortnight at first, slower later. */
export const RANK_AT = [4, 10, 18, 28, 40, 55, 72, 92, 115, 140] as const;
export const MAX_RANK = 10;
/** Points from time with the cast, by how well the die does it. */
export const DESK_POINTS: Record<Quality, number> = { well: 3, does: 2, badly: 1 };
/** A day any of a member's habits counted. */
export const HABIT_POINT = 1;
/** An ask met. */
export const ASK_POINTS = 4;
/** The shown chance a member asks for something after desk time (only when no ask of theirs is open). */
export const ASK_CHANCE = 33;
/** A bond tile in the pick of three. */
export const PICK_POINTS = 2;
/** The tone window: days back that count toward a warm tone. */
export const TONE_DAYS = 14;
/** Warm when their habit counted on this many of the last 14 days, or after desk time in the last week. */
export const WARM_AT = 4;

export const rankOf = (points: number): number => RANK_AT.filter((n) => points >= n).length;
/** Points still to go for the next rank (0 at rank 10). */
export const toNext = (points: number): number => { const r = rankOf(points); return r >= MAX_RANK ? 0 : RANK_AT[r] - points; };

/** save.bonds: what the days folded in (engine side, written at 4 am and by the pick of three). */
export interface BondState {
  /** The day bonds began on this save: habits before it never count (an old save does not jump ten ranks). */
  since: DayKey;
  /** Habit points, by member. */
  habit: Partial<Record<CastId, number>>;
  /** Days each member's habit counted, the last 14 (for the tone only). */
  recent: Partial<Record<CastId, DayKey[]>>;
  /** Asks met: the spend that brought the ask, and the day it was met. */
  met: Record<string, DayKey>;
  /** Points from the pick of three, by member. */
  picks: Partial<Record<CastId, number>>;
}
export const emptyBonds = (since: DayKey): BondState => ({ since, habit: {}, recent: {}, met: {}, picks: {} });

/** An ask, as the cast job leaves it in the desk's log. */
export interface AskRow { spend: string; day: DayKey; member: CastId; ask: number }
export function asksOf(desk: DeskState | undefined): AskRow[] {
  return (desk?.spends ?? []).flatMap((s) => s.effects.flatMap((e) => (e.kind === 'ask' ? [{ spend: s.id, day: s.day, member: e.member, ask: e.ask }] : [])));
}
export const askDef = (a: Pick<AskRow, 'member' | 'ask'>): CastAsk | undefined => castById(a.member)?.asks[a.ask];
/** The last day an ask can be met: its window from the day it was made. */
export const askUntil = (a: AskRow): DayKey => addDays(a.day, (askDef(a)?.trigger.withinDays ?? 7) - 1);
/** An ask still open on `date`: not met, and inside its window. Missing one costs nothing; it just lapses. */
export const askOpen = (a: AskRow, b: BondState | undefined, date: DayKey) => !b?.met[a.spend] && date <= askUntil(a);

/** Bond points for one member: habit days, desk time, asks met, picks and any column reach. Never less than before. */
export function pointsOf(member: CastId, desk: DeskState | undefined, b: BondState | undefined, columnReach = 0): number {
  let n = (b?.habit[member] ?? 0) + (b?.picks[member] ?? 0);
  for (const s of desk?.spends ?? []) for (const e of s.effects) {
    if (e.kind === 'bond' && e.member === member) n += e.n;
  }
  for (const a of asksOf(desk)) if (a.member === member && b?.met[a.spend]) n += ASK_POINTS;
  if (columnReach) n += columnReach * (desk?.spends ?? []).filter((s) => s.job === 'column').length;
  return n;
}

export interface Bond { id: CastId; points: number; rank: number; toNext: number }
export function bondsOf(desk: DeskState | undefined, b: BondState | undefined): Bond[] {
  const base = CAST_IDS.map((id) => ({ id, points: pointsOf(id, desk, b) }));
  // A column-reach perk (none in today's content, wired all the same) adds to the holder's own bond.
  const reach = new Map<CastId, number>();
  for (const x of base) for (const p of perksAt(x.id, rankOf(x.points))) if (p.key === 'column-reach') reach.set(x.id, (reach.get(x.id) ?? 0) + p.value);
  return base.map((x) => {
    const points = reach.has(x.id) ? pointsOf(x.id, desk, b, reach.get(x.id)) : x.points;
    return { id: x.id, points, rank: rankOf(points), toNext: toNext(points) };
  });
}

/** The perks a member holds at a rank. */
export const perksAt = (member: CastId, rank: number): CastPerk[] =>
  (castById(member)?.ranks ?? []).filter((r) => r.rank <= rank && r.perk).map((r) => r.perk!);
export interface HeldPerk extends CastPerk { member: CastId; rank: number }
export function perksHeld(bonds: Bond[]): HeldPerk[] {
  return bonds.flatMap((x) => (castById(x.id)?.ranks ?? []).filter((r) => r.rank <= x.rank && r.perk).map((r) => ({ ...r.perk!, member: x.id, rank: r.rank })));
}
/** The sum of a perk's value over everyone holding it (`job` narrows a head start to one job). */
export const perkValue = (held: HeldPerk[], key: PerkKey, job?: string): number =>
  held.filter((p) => p.key === key && (job === undefined || p.job === job)).reduce((t, p) => t + p.value, 0);
export const holds = (held: HeldPerk[], key: PerkKey, member?: CastId, item?: string) =>
  held.some((p) => p.key === key && (member === undefined || p.member === member) && (item === undefined || p.item === item));

/** Warm or cool: their habit on 4 of the last 14 days, or desk time with them in the last week, keeps it warm. */
export function toneOf(member: CastId, b: BondState | undefined, desk: DeskState | undefined, date: DayKey): 'warm' | 'cool' {
  const from = addDays(date, -TONE_DAYS);
  const days = (b?.recent[member] ?? []).filter((d) => d >= from && d < date).length;
  const sat = (desk?.spends ?? []).some((s) => s.job === 'cast' && s.target === member && s.day >= addDays(date, -7) && s.day <= date);
  return days >= WARM_AT || sat ? 'warm' : 'cool';
}

/** Did a member's habit count on a day? Any one of the metrics they care about. */
export const caredOn = (member: CastId, m: DayMetrics): boolean => (castById(member)?.cares.metrics ?? []).some((x) => (m[x] ?? 0) > 0);

/**
 * One day folded in at 4 am: a habit point for each member whose habit counted, the tone window moved on, and any
 * open ask met by the days so far. Returns the asks met today. Days before `since` never count.
 */
export function bondDay(b: BondState, desk: DeskState | undefined, date: DayKey, m: DayMetrics, days: { date: DayKey; m: DayMetrics }[]): { bonds: BondState; met: AskRow[] } {
  if (date < b.since) return { bonds: b, met: [] };
  const habit = { ...b.habit }, recent = { ...b.recent }, met = { ...b.met };
  for (const id of CAST_IDS) {
    if (!caredOn(id, m)) continue;
    const had = recent[id] ?? [];
    if (had.includes(date)) continue;
    habit[id] = (habit[id] ?? 0) + HABIT_POINT;
    recent[id] = [...had, date].filter((d) => d > addDays(date, -TONE_DAYS - 1));
  }
  const now: AskRow[] = [];
  for (const a of asksOf(desk)) {
    if (met[a.spend] || date < a.day || date > askUntil(a)) continue;
    const t = askDef(a)?.trigger;
    if (!t) continue;
    const n = days.filter((d) => d.date >= a.day && d.date <= date).reduce((s, d) => s + (d.m[t.what] ?? 0), 0);
    if (n >= t.count) { met[a.spend] = date; now.push(a); }
  }
  return { bonds: { ...b, habit, recent, met }, met: now };
}

/**
 * Research at Close the day from `research-close` perks, each with its holder's own condition (the perk's text):
 * the chairman's a closed day with every checklist slot ticked; the cook's a protein day with three meals.
 */
export function closeResearch(held: HeldPerk[], m: DayMetrics): number {
  let n = 0;
  for (const p of held.filter((x) => x.key === 'research-close')) {
    const ok = p.member === 'cook' ? Boolean(m.protein && m['three-meals']) : Boolean(m.closed && m['checklist-full']);
    if (ok) n += p.value;
  }
  return n;
}

/**
 * The Rest die on a planned rest day kept as rest (`rest-day-dice`): one higher for each holder whose condition
 * holds (the watchman's also needs bedtime kept the night before), up to 6. Never lower than it was.
 */
export function restDieBonus(held: HeldPerk[], m: DayMetrics): number {
  if (!m['rest-day']) return 0;
  return held.filter((p) => p.key === 'rest-day-dice' && (p.member !== 'watchman' || (m.bedtime ?? 0) > 0)).reduce((t, p) => t + p.value, 0);
}

/** `parcel-extra`: the holders with a line in this morning's parcel, by yesterday's habits (each perk's own text). */
const PARCEL_WHEN: Partial<Record<CastId, (m: DayMetrics) => boolean>> = {
  physio: (m) => Boolean(m.rested), kitman: (m) => Boolean(m['weigh-in']), cook: (m) => Boolean(m['three-meals']), watchman: (m) => Boolean(m.bedtime),
};
export const parcelExtras = (held: HeldPerk[], yesterday: DayMetrics): CastId[] =>
  [...new Set(held.filter((p) => p.key === 'parcel-extra' && (PARCEL_WHEN[p.member]?.(yesterday) ?? true)).map((p) => p.member))];

/** Where each perk key plays. None reads or writes a rating or a match's odds (a test checks the engine never reads this). */
export const PERK_RULES: Record<PerkKey, string> = {
  'return-ramp-days': 'store/players.ts: the return ramp after a sick or injured stretch',
  'trials-extra-day': 'store/globe.ts: a second trial day each week',
  'research-close': 'store/play.ts castDay: research at Close the day',
  'clock-head-start': 'desk/jobs scout, study, project: a new clock starts filled',
  'scout-known': 'fog/fog.ts: known % from a scout report',
  'watch-both': 'desk/jobs/watch.ts: style and weak side on any die',
  'negotiate-reroll': 'desk/jobs/negotiate.ts: one round taken back once a talk',
  'lobby-risk': 'desk/jobs/lobby.ts: the shown risk, lower',
  'academy-growth': 'desk/jobs/academy.ts: one more growth on a 5 or 6',
  'column-reach': 'cast/bonds.ts: a column line nudges the holder’s bond',
  'kit-pick': 'kits: one more kit or crest choice',
  'parcel-extra': 'store/around.ts: a line in the morning parcel',
  'rest-day-dice': 'store/desk.ts diceOn: the Rest die one higher',
  'unspent-research': 'desk/fold.ts: unspent dice to research one die sooner',
  'meal-card': 'cup/pool.ts: a card in the cup pool',
  heirloom: 'cup/heirlooms.ts: an heirloom in the cup pool',
};
