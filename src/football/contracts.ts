// Contracts, youth and trading (spec §8.5).
import type { YouthDef } from './data/load';
import { shuffle } from './rng';

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
