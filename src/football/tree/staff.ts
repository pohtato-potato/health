// Staff and money from the tree (spec §11.4, §12, §16). Pure.
// - No staff limit: every staff tech researched is hired.
// - Wages are paid at season end from the budget, in hiring order. Staff the budget can't cover go on leave
//   (their effect pauses) until a later season end can pay them. There is never any debt.
// - The club doctor gains experience on days every medicine is kept, and shortens knocks at each level. It never
//   touches a rating.
import { STAFF, staffById } from '../content/staff';
import { SPONSOR_SHARE, stableShirt, wage } from '../content/money';
import type { StaffDef } from '../content/types';
import type { Tier } from '../types';
import { hiredStaff, moneyShare, ruleValue, slots, type Active } from './research';

export interface WageBill { paid: number; budget: number; staff: { id: string; amount: number; paid: boolean }[]; leave: string[] }

/** Pays the season's wages in hiring order. Anyone the budget can't cover goes on leave; nothing is borrowed. */
export function payWages(researched: string[], tier: Tier, budget: number): WageBill {
  let left = budget;
  const staff: WageBill['staff'] = [];
  const order = researched.map((id) => STAFF.find((s) => s.tech === id)).filter((s): s is StaffDef => Boolean(s));
  for (const s of order) {
    const amount = wage(s.wageUnits, tier);
    const ok = left >= amount;
    if (ok) left = Math.round((left - amount) * 1000) / 1000;
    staff.push({ id: s.id, amount, paid: ok });
  }
  return { paid: Math.round((budget - left) * 1000) / 1000, budget: left, staff, leave: staff.filter((s) => !s.paid).map((s) => s.id) };
}
/** This season's wage bill if it were paid today: every hired member. */
export const wageBill = (researched: string[], tier: Tier) =>
  Math.round(hiredStaff(researched).reduce((t, s) => t + wage(s.wageUnits, tier), 0) * 1000) / 1000;

/** The club doctor's level from experience (days every medicine was kept since hiring). */
export function doctorLevel(xp: number): number {
  const d = staffById('club-doctor')!.levels!;
  return d.at.filter((n) => xp >= n).length;
}
export const doctorNext = (xp: number): number | undefined => staffById('club-doctor')!.levels!.at.find((n) => xp < n);

/**
 * Days a knock heals faster: the physio, the recovery pool, and one per doctor level (each a `knock-days` −1).
 * `physio()` in discipline.ts reads it.
 */
export function healDays(a: Active, doctorXp: number, doctorAtWork: boolean): number {
  return -ruleValue(a, 'knock-days', 0) + (doctorAtWork ? doctorLevel(doctorXp) : 0);
}

/** Money the tree adds at season end, as lines (millions). */
export function treeIncome(a: Active, tier: Tier, base: { gate: number; tv: number; sponsors: number; shop: number; continental: number }): { name: string; amount: number }[] {
  const shirt = stableShirt(tier);
  const out: { name: string; amount: number }[] = [];
  const line = (name: string, amount: number) => { const x = Math.round(amount * 1000) / 1000; if (x > 0) out.push({ name, amount: x }); };
  line('Sleeve sponsor (the tree)', slots(a, 'sponsor-sleeve') * SPONSOR_SHARE.sleeve * shirt);
  line('Partners (the tree)', slots(a, 'sponsor-partner') * SPONSOR_SHARE.partner * shirt);
  line('Sponsor abroad', slots(a, 'sponsor-abroad') * SPONSOR_SHARE.abroad * shirt);
  line('Gate, from the tree', moneyShare(a, 'gate') * base.gate);
  line('TV, from the tree', moneyShare(a, 'tv') * base.tv);
  line('Sponsors, from the tree', moneyShare(a, 'sponsors') * base.sponsors);
  line('Shop, from the tree', moneyShare(a, 'shop') * base.shop);
  line('Continental gate, from the tree', moneyShare(a, 'continental-gate') * base.continental);
  return out;
}
