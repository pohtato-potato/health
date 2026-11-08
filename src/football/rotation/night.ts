// Around the squad on a match night (spec §7, §8, §9.1): the team sheet, captains and the set-piece taker, chemistry,
// morale, the morning tactic and the nudges that together move an axis by 3 at most.
import { AXES, clamp, type Axis, type AxisValues } from '../types';
import { FORMATIONS, type Formation, type SquadMember } from '../players/eleven';
import type { Unit, XiPlace } from '../players/types';
import type { RotationRules } from './rules';

// ---------- the team sheet ----------
export interface TeamSheet {
  /** Your starters, by unit. A unit you never touched starts its best match ratings. */
  picks?: Partial<Record<Unit, string[]>>;
  /** One captain per unit (a player id). Unset: the starter with the most appearances. */
  captains?: Partial<Record<Unit, string>>;
  /** The set-piece taker, a Power player. Unset: Power's best match rating. */
  setPiece?: string;
  /** Unset: 4-3-3. The tree opens the others (layer 3). */
  formation?: Formation;
}

/**
 * Power's default starters come from the latest session's exercises (the whole session plays, calibration §12.7):
 * the best match ratings among them. With no session yet, the whole Power squad is the pool.
 */
export function defaultPool(members: SquadMember[], latest: string[] | undefined): SquadMember[] {
  if (!latest?.length) return members;
  const fromLatest = members.filter((m) => m.unit === 'Power' && m.refs?.some((r) => latest.includes(r)));
  if (!fromLatest.length) return members;
  return members.filter((m) => m.unit !== 'Power' || fromLatest.includes(m));
}

/** A unit's starters after a tap: a bench player comes in for the lowest starter; a starter makes way for the best of the bench. */
export function toggleStarter(unitMembers: SquadMember[], starters: string[], id: string, places: number): string[] {
  const byRating = [...unitMembers].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  const cur = starters.filter((s) => unitMembers.some((m) => m.id === s)).slice(0, places);
  if (cur.includes(id)) {
    const bench = byRating.filter((m) => !cur.includes(m.id));
    if (!bench.length) return cur;
    return cur.map((s) => (s === id ? bench[0].id : s));
  }
  if (cur.length < places) return [...cur, id];
  const lowest = [...cur].sort((a, b) => (byRating.find((m) => m.id === a)?.rating ?? 0) - (byRating.find((m) => m.id === b)?.rating ?? 0))[0];
  return cur.map((s) => (s === lowest ? id : s));
}

/** Each unit's captain: your pick if it's still in the squad, else the starter with most appearances, then rating. */
export function captainsOf(xi: XiPlace[], sheet: TeamSheet | undefined, apps: (id: string) => number, inSquad: (id: string) => boolean): Partial<Record<Unit, string>> {
  const out: Partial<Record<Unit, string>> = {};
  for (const u of AXES) {
    const pick = sheet?.captains?.[u];
    if (pick && inSquad(pick)) { out[u] = pick; continue; }
    const xs = xi.filter((x) => x.unit === u);
    const best = [...xs].sort((a, b) => apps(b.player) - apps(a.player) || b.rating - a.rating)[0];
    if (best) out[u] = best.player;
  }
  return out;
}
/** The set-piece taker: your pick if still in the squad, else Power's best starter. */
export function setPieceOf(xi: XiPlace[], sheet: TeamSheet | undefined, inSquad: (id: string) => boolean): string | undefined {
  if (sheet?.setPiece && inSquad(sheet.setPiece)) return sheet.setPiece;
  return [...xi.filter((x) => x.unit === 'Power')].sort((a, b) => b.rating - a.rating)[0]?.player;
}

// ---------- chemistry ----------
export interface UnitChem { level: number; days: number; xi: string[] }
export type Chemistry = Partial<Record<Unit, UnitChem>>;
export const CHEM_MAX = 5;
/** Chemistry this high gives its unit +1 (spec §8). */
export const CHEM_NUDGE = 4;

/**
 * One match day of chemistry (spec §9.1). The same starters for a week of match days: +1 (up to 5). Two or more
 * changed in a unit (all of them, in a smaller unit): −1. A single change starts the week again.
 */
export function chemistryAfter(prev: Chemistry, xi: XiPlace[], rules: RotationRules, formation: Formation = '4-3-3'): Chemistry {
  const out: Chemistry = {};
  for (const u of AXES) {
    const now = [...new Set(xi.filter((x) => x.unit === u).map((x) => x.player))].sort();
    const p = prev[u];
    if (!now.length) { if (p) out[u] = p; continue; }
    if (!p || !p.xi.length) { out[u] = { level: p?.level ?? 0, days: 1, xi: now }; continue; }
    const changed = now.filter((id) => !p.xi.includes(id)).length;
    if (!changed) {
      const days = p.days + 1;
      out[u] = days >= rules.chemistryDays ? { level: Math.min(CHEM_MAX, p.level + 1), days: 0, xi: now } : { ...p, days };
    } else {
      const drop = changed >= Math.min(rules.chemistryChanges, FORMATIONS[formation][u]);
      out[u] = { level: drop ? Math.max(0, p.level - 1) : p.level, days: 1, xi: now };
    }
  }
  return out;
}

// ---------- morale ----------
export type Morale = 0 | 1 | 2;
export const MORALE_NAME: Record<Morale, string> = { 0: 'Settled', 1: 'Up', 2: 'High' };
/** A win lifts it a level; a loss drops it one, never below Settled; a draw leaves it. */
export const moraleAfter = (m: Morale = 0, result: 'W' | 'D' | 'L'): Morale => (result === 'W' ? (Math.min(2, m + 1) as Morale) : result === 'L' ? (Math.max(0, m - 1) as Morale) : m);

// ---------- the morning tactic ----------
export type Tactic = 'press' | 'hold' | 'counter';
export const TACTICS: Tactic[] = ['press', 'hold', 'counter'];
export const TACTIC_NAME: Record<Tactic, string> = { press: 'Press', hold: 'Hold', counter: 'Counter' };
export const TACTIC_FX: Record<Tactic, Partial<Record<Axis, number>>> = {
  press: { Pace: 1, Fuel: 1, Rest: -1 },
  hold: { Shape: 1, Routine: 1, Pace: -1 },
  counter: { Pace: 1, Rest: 1, Fuel: -1 },
};
/** "Pace, Fuel up · Rest down" */
export function tacticWords(t: Tactic): string {
  const fx = Object.entries(TACTIC_FX[t]) as [Axis, number][];
  const up = fx.filter(([, d]) => d > 0).map(([a]) => a), down = fx.filter(([, d]) => d < 0).map(([a]) => a);
  return `${up.join(', ')} up${down.length ? ` · ${down.join(', ')} down` : ''}`;
}
/** The assistant leans on what you did best today: the tactic whose two lifted axes are highest; level, it holds. */
export function assistantTactic(today: AxisValues): Tactic {
  const score = (t: Tactic) => (Object.entries(TACTIC_FX[t]) as [Axis, number][]).filter(([, d]) => d > 0).reduce((s, [a]) => s + today[a], 0);
  return (['hold', 'press', 'counter'] as Tactic[]).reduce((best, t) => (score(t) > score(best) ? t : best), 'hold');
}

// ---------- the nudges ----------
export const NUDGE_CAP = 3;
export interface Nudge { axis: Axis; d: number; why: string }
export interface NightCtx {
  formation?: Formation;
  tactic?: Tactic;
  /** Chemistry by unit, captain bonuses added. */
  chemistry?: Partial<Record<Unit, number>>;
  morale?: Morale;
  /** The club's armband axis (the captain's unit for morale). */
  captain?: Axis;
  /** Units in which tonight's opponent holds one of our free agents, with a name for each. */
  agents?: Partial<Record<Unit, string>>;
  rules: RotationRules;
}
/** Every nudge tonight, before the cap. */
export function nudgesFor(n: NightCtx): Nudge[] {
  const out: Nudge[] = [];
  const f = FORMATIONS[n.formation ?? '4-3-3'], b = FORMATIONS['4-3-3'];
  for (const u of AXES) if (f[u] !== b[u]) out.push({ axis: u, d: f[u] > b[u] ? 1 : -1, why: f[u] > b[u] ? 'an extra place' : 'one place fewer' });
  if (n.tactic) for (const [a, d] of Object.entries(TACTIC_FX[n.tactic]) as [Axis, number][]) out.push({ axis: a, d, why: TACTIC_NAME[n.tactic] });
  for (const u of AXES) if ((n.chemistry?.[u] ?? 0) >= CHEM_NUDGE) out.push({ axis: u, d: 1, why: 'chemistry' });
  if (n.captain && (n.morale === 2 || (n.morale === 1 && n.rules.moraleCaptainUp))) out.push({ axis: n.captain, d: 1, why: `morale ${MORALE_NAME[n.morale]}` });
  for (const [u, name] of Object.entries(n.agents ?? {}) as [Unit, string][]) out.push({ axis: u, d: -1, why: `${name} plays for them` });
  return out;
}
/** The nudges added together and capped at ±3 an axis, then the value rounded and kept in 1–20. */
export function applyNudges(base: AxisValues, nudges: Nudge[]): { values: AxisValues; total: AxisValues } {
  const values = { ...base }, total = {} as AxisValues;
  for (const a of AXES) {
    total[a] = clamp(nudges.filter((x) => x.axis === a).reduce((t, x) => t + x.d, 0), -NUDGE_CAP, NUDGE_CAP);
    values[a] = clamp(Math.round(base[a] + total[a]), 1, 20);
  }
  return { values, total };
}
