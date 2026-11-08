// Research, eras and eurekas (spec §11.1–11.2, §16). Pure.
// - Lesson points: win 2, draw 2, loss 3, +1 a logged day, +10 a board objective met.
// - Six eras, each entered by research alone: 6 techs from the era before.
// - Cost per tech by era: 20, 35, 55, 80, 110, 150. A eureka halves it.
// - Techs never add flat rating points: their effects are rules, options, slots and +1/+2 in one situation.
import type { DayKey } from '../../domain/dates';
import { addDays } from '../../domain/dates';
import { ERA_ENTRY_TECHS, ERAS, EUREKA_SHARE, TECHS } from '../content/tree';
import { BOONS } from '../content/season';
import { STAFF } from '../content/staff';
import { PROJECTS } from '../content/projects';
import { BOOSTS } from '../content/packs';
import { ERA_IDS, type Effect, type EraId, type RuleKey, type TechDef, type UnlockKey, type SlotKey, type MoneyKey } from '../content/types';
import { FORMATIONS, type Formation } from '../players/eleven';
import { countIn } from './metrics';
import type { ResearchWhy, TreeEngine, TreeUser } from './types';

/** Lesson points from a match (spec §11.1): losses teach the most. */
export const LESSON: Record<'W' | 'D' | 'L', number> = { W: 2, D: 2, L: 3 };
export const LOGGED_DAY = 1;
export const BOARD_MET = 10;

export const techById = (id: string): TechDef | undefined => TECHS.find((t) => t.id === id);
export const eraIndex = (e: EraId) => ERA_IDS.indexOf(e);

/** Research banked: everything earned, plus pack research and duplicates, minus what techs cost. */
export function bank(eng: TreeEngine, user: TreeUser): number {
  return eng.earned + packResearch(user) - user.researched.reduce((t, r) => t + r.cost, 0);
}
export const packResearch = (user: TreeUser) =>
  user.opened.reduce((t, p) => t + p.items.reduce((s, i) => s + (i.kind === 'research' || i.duplicate ? i.n ?? 0 : 0), 0), 0);

/** Eras entered: Sunday league from the start, then each one after 6 techs of the era before (spec §16). */
export function erasOpen(researched: string[]): EraId[] {
  const out: EraId[] = ['sunday'];
  for (let i = 1; i < ERA_IDS.length; i++) {
    const prev = ERA_IDS[i - 1];
    const n = researched.filter((id) => techById(id)?.era === prev).length;
    if (n >= ERA_ENTRY_TECHS) out.push(ERA_IDS[i]); else break;
  }
  return out;
}
export const currentEra = (researched: string[]): EraId => { const o = erasOpen(researched); return o[o.length - 1]; };

/** A tech's cost today: its era's cost, halved by its eureka. */
export function costOf(t: TechDef, eurekas: string[]): number {
  return eurekas.includes(t.id) ? Math.ceil(t.cost * EUREKA_SHARE) : t.cost;
}
export type TechState = 'done' | 'open' | 'locked' | 'sealed';
/** done: researched. open: its era is entered and its prerequisites are done. locked: era open, prerequisites missing. sealed: era not entered. */
export function techState(t: TechDef, researched: string[]): TechState {
  if (researched.includes(t.id)) return 'done';
  if (!erasOpen(researched).includes(t.era)) return 'sealed';
  return t.prereqs.every((p) => researched.includes(p)) ? 'open' : 'locked';
}

/**
 * Settles the bank: the target (or nothing) completes once the bank covers it. Returns the new user state and the
 * techs just researched. A target that isn't open is left waiting.
 */
export function settle(eng: TreeEngine, user: TreeUser, on: DayKey): { user: TreeUser; done: string[] } {
  let u = user;
  const done: string[] = [];
  const eurekas = eng.eurekas.map((e) => e.id);
  while (u.target) {
    const t = techById(u.target);
    const ids = u.researched.map((r) => r.id);
    if (!t || ids.includes(t.id)) { u = { ...u, target: undefined }; break; }
    if (techState(t, ids) !== 'open') break;
    const cost = costOf(t, eurekas);
    if (bank(eng, u) < cost) break;
    u = { ...u, researched: [...u.researched, { id: t.id, on, cost }], target: undefined };
    done.push(t.id);
  }
  return { user: u, done };
}
/** Research a tech now (or save for it): sets the target and settles. */
export function research(eng: TreeEngine, user: TreeUser, id: string, on: DayKey) {
  return settle(eng, { ...user, target: id }, on);
}

/**
 * Eurekas (spec §11.1): a tech's real-life trigger, counted only from when its era opened. With a window, any run of
 * `withinDays` stored days counts; without one, everything since the era opened. Once fired, it stays.
 */
export function eurekasDue(eng: TreeEngine, researched: string[], date: DayKey): string[] {
  const open = erasOpen(researched);
  const had = new Set(eng.eurekas.map((e) => e.id));
  const out: string[] = [];
  for (const t of TECHS) {
    if (had.has(t.id) || researched.includes(t.id) || !open.includes(t.era)) continue;
    const base = eng.eurekaBase[t.era];
    if (!base) continue;
    const e = t.eureka;
    const n = e.withinDays
      ? countIn(eng.days, e.what, maxDate(base.on, addDays(date, -(e.withinDays - 1))), date)
      : (eng.total[e.what] ?? 0) - (base.m[e.what] ?? 0);
    if (n >= e.count) out.push(t.id);
  }
  return out;
}
const maxDate = (a: DayKey, b: DayKey) => (a > b ? a : b);

// ---------------- effects ----------------

/** Every effect switched on: researched techs, staff not on leave, finished projects, this season's boons, and pending boosts. */
export interface Active {
  effects: Effect[];
  /** Where each came from, for the "How tonight adds up" lines. */
  named: { name: string; effect: Effect }[];
}
export interface ActiveInput {
  researched: string[];
  leave: string[];
  projectsDone: string[];
  boons: string[];
  boosts?: string[];
}
export function activeEffects(i: ActiveInput): Active {
  const named: Active['named'] = [];
  for (const id of i.researched) {
    const t = techById(id);
    if (t) for (const e of t.effects) if (e.kind !== 'staff' && e.kind !== 'project') named.push({ name: t.name, effect: e });
  }
  for (const s of hiredStaff(i.researched)) {
    if (i.leave.includes(s.id)) continue;
    for (const e of s.effects) named.push({ name: s.name, effect: e });
  }
  for (const id of i.projectsDone) {
    const p = PROJECTS.find((x) => x.id === id);
    if (p) for (const e of p.effects) named.push({ name: p.name, effect: e });
  }
  for (const id of i.boons) {
    const b = BOONS.find((x) => x.id === id);
    if (b) for (const e of b.effects) named.push({ name: b.name, effect: e });
  }
  for (const id of i.boosts ?? []) {
    const b = BOOSTS.find((x) => x.id === id);
    if (b) named.push({ name: b.name, effect: b.effect });
  }
  return { effects: named.map((n) => n.effect), named };
}
/** Staff hired: every staff tech researched (spec §16: no staff limit). */
export const hiredStaff = (researched: string[]) => STAFF.filter((s) => researched.includes(s.tech));

/** Rules whose value is the new number, and which way is better. Everything else adds up (or is a 1 = on flag). */
const SET_RULES: Partial<Record<RuleKey, 'low' | 'high'>> = {
  'chemistry-days': 'low', 'fuel-break-days': 'low', 'academy-promote-sessions': 'low', 'freshness-cost': 'low',
  'freshness-return': 'high', 'freshness-floor': 'high', 'loan-days': 'high', 'loan-slots': 'high', 'boon-choices': 'high',
  'packs-items': 'high', 'trialist-wait': 'high', 'false-nine': 'high', 'chemistry-changes': 'high', 'trials-hold-days': 'high',
};
/** A rule's value with every active effect combined, or `fallback` when none sets it. */
export function ruleValue(a: Active, rule: RuleKey, fallback: number): number {
  const xs = a.effects.filter((e): e is Extract<Effect, { kind: 'rule' }> => e.kind === 'rule' && e.rule === rule).map((e) => e.value);
  if (!xs.length) return fallback;
  const dir = SET_RULES[rule];
  if (dir === 'low') return Math.min(fallback, ...xs);
  if (dir === 'high') return Math.max(fallback, ...xs);
  return fallback + xs.reduce((t, x) => t + x, 0);
}
export const unlocked = (a: Active, what: UnlockKey) => a.effects.some((e) => e.kind === 'unlock' && e.what === what);
export const slots = (a: Active, slot: SlotKey) => a.effects.filter((e) => e.kind === 'slot' && e.slot === slot).length;
export const moneyShare = (a: Active, what: MoneyKey) =>
  a.effects.reduce((t, e) => t + (e.kind === 'money' && e.what === what ? e.share : 0), 0);

/** Formations open (spec §7): 4-3-3 from the start, the rest from the tree. Layer 2's team sheet reads this. */
export function formationsOpen(a: Active): Formation[] {
  const map: [UnlockKey, Formation][] = [['formation-442', '4-4-2'], ['formation-4231', '4-2-3-1'], ['formation-352', '3-5-2']];
  return ['4-3-3', ...map.filter(([k]) => unlocked(a, k)).map(([, f]) => f)].filter((f): f is Formation => f in FORMATIONS);
}
/** Extra places a unit can field, from projects like the long road ("Pace can field 3"). Layer 2's team sheet reads this. */
export function extraPlaces(a: Active): Partial<Record<'Pace' | 'Power' | 'Shape' | 'Fuel' | 'Rest', number>> {
  return { Pace: slots(a, 'pace-places'), Power: slots(a, 'power-places'), Shape: slots(a, 'shape-places'), Fuel: slots(a, 'fuel-places'), Rest: slots(a, 'rest-places') };
}

/** Lesson points for a result, with the press officer, tour manager and boons (spec §11.1). */
export function lessonFor(result: 'W' | 'D' | 'L', a: Active): { n: number; why: ResearchWhy } {
  if (result === 'L') return { n: ruleValue(a, 'lesson-loss', LESSON.L), why: 'loss' };
  if (result === 'D') return { n: ruleValue(a, 'lesson-draw', LESSON.D), why: 'draw' };
  return { n: LESSON.W, why: 'win' };
}

/** Eras the save has entered but whose moment hasn't been seen. */
export const erasUnseen = (user: TreeUser) => erasOpen(user.researched.map((r) => r.id)).filter((e) => !user.seenEras.includes(e));
export const eraName = (e: EraId) => ERAS.find((x) => x.id === e)!.name;
