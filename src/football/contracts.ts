// Contracts, youth and trading (spec §8.5).
import type { YouthDef } from './data/load';
import { shuffle } from './rng';
import type { AxisInput } from './axes';
import { checklistShare, sleepHours } from './axes';
import { addDays, type DayKey } from '../domain/dates';
import type { HabitId } from './squad';
import { hashSeed, rng } from './rng';
import { euros } from './money';

export const CONTRACT_WEEKS = 4;
/** The habit kept on at least 5 of 7 days on average over the contract. */
export const contractCheck = (keptDays: number, days: number): 'renew' | 'run-down' => (days > 0 && (keptDays / days) * 7 >= 5 ? 'renew' : 'run-down');
/** Each renewal adds 5% to the axis weight, capped at +15% over a career. */
export const weightAfterRenew = (w: number) => Math.min(1.15, Math.round((w + 0.05) * 100) / 100);

export const PROMOTE_AT = 12;
export const LEAVE_UNDER = 4;
export function youthStatus(logged: number, seasonOver: boolean): 'promoted' | 'growing' | 'leaves' {
  if (logged >= PROMOTE_AT) return 'promoted';
  return seasonOver && logged < LEAVE_UNDER ? 'leaves' : 'growing';
}
export const youthBonus = (stars: 3 | 4 | 5) => ({ 3: 1, 4: 1.5, 5: 2 })[stars];
/** Three youngsters, at most one exercise, and exercises only once the coach's plan includes them. */
export function intake(pool: YouthDef[], r: () => number, allowExercise: boolean): YouthDef[] {
  const order = shuffle(r, pool);
  const out: YouthDef[] = [];
  for (const y of order) {
    if (out.length === 3) break;
    if (y.kind === 'exercise' && (!allowExercise || out.some((o) => o.kind === 'exercise'))) continue;
    out.push(y);
  }
  return out;
}
export type TradeFee = { kind: 'money'; amount: number } | { kind: 'youth' } | { kind: 'staff'; role: string };

// ---- Contracts over time (Part 4) ----

export interface Contract { habit: HabitId; start: DayKey; until: DayKey; weight: number; kept: number; days: number; state: 'running' | 'due' | 'listed' }
export const CONTRACT_DAYS = CONTRACT_WEEKS * 7;
export const newContract = (habit: HabitId, start: DayKey, weight = 1): Contract => ({ habit, start, until: addDays(start, CONTRACT_DAYS - 1), weight, kept: 0, days: 0, state: 'running' });

/** Whether a day kept the habit's contract line. Reads values only. Food never rewards eating under the range. */
export function keptOn(habit: HabitId, i: AxisInput): boolean {
  const t = i.targets;
  switch (habit) {
    case 'steps': return (i.day?.steps ?? 0) >= t.steps;
    case 'training': {
      // On schedule: sessions done this week, today included, keep pace with the week's plan.
      const done = i.weekDoneBefore + i.sessionsToday.length;
      return i.sessionsToday.length > 0 || done >= Math.floor((t.sessionsPerWeek * i.weekdayMon1) / 7);
    }
    case 'food': return i.foodLogged && i.kcal >= t.kcalMin && i.kcal <= t.kcalMax && i.protein >= t.proteinG;
    case 'sleep': return Boolean(i.day?.sleep) && sleepHours(i.day!.sleep!) * 60 >= t.sleepMin;
    case 'checklist': return checklistShare(i.checklist, i.day) === 1;
    case 'body': return i.weighIns7 >= 5;
  }
}

/** One day on a running contract. At its end the habit is due a renewal, or runs down and is listed. */
export function contractDay(c: Contract, date: DayKey, kept: boolean): Contract {
  if (c.state !== 'running' || date < c.start) return c;
  const next = { ...c, days: c.days + 1, kept: c.kept + (kept ? 1 : 0) };
  if (date >= c.until) next.state = contractCheck(next.kept, next.days) === 'renew' ? 'due' : 'listed';
  return next;
}
/** The renewal tap: more money, a heavier axis, four more weeks. */
export const renew = (c: Contract, today: DayKey): Contract => newContract(c.habit, today, weightAfterRenew(c.weight));
/** Letting a due contract run: no penalty, four more weeks at the same weight. */
export const letRun = (c: Contract, today: DayKey): Contract => newContract(c.habit, today, c.weight);

const BUYERS = ['Night Owls FC', 'Kiel Sunday XI', 'Rotterdam Ramblers', 'Lyon Dockers', 'Ghent Ferrymen'];
const STAFF = ['a fitness coach', 'a kit man', 'a scout'];
/** A buyer's bid for a listed habit: money, a youth slot or a staff member. Same habit and season, same bid. */
export function bidFor(habit: HabitId, season: number): { buyer: string; fee: TradeFee } {
  const r = rng(hashSeed('bid', habit, String(season)));
  const buyer = BUYERS[Math.floor(r() * BUYERS.length)];
  const k = r();
  const fee: TradeFee = k < 0.5 ? { kind: 'money', amount: Math.round((0.05 + r() * 0.2) * 100) / 100 } : k < 0.8 ? { kind: 'youth' } : { kind: 'staff', role: STAFF[Math.floor(r() * STAFF.length)] };
  return { buyer, fee };
}
export const feeWords = (f: TradeFee) => (f.kind === 'money' ? euros(f.amount) : f.kind === 'youth' ? 'one extra youth slot' : `${f.role}`);
