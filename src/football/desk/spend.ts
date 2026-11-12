// Spending a die (desk spec §3). Pure: the desk state in, the desk state out. The store wraps it in a transaction.
import { hashSeed, rng } from '../rng';
import { jobById } from './jobs';
import { diceLeft, spendsOn } from './rules';
import type { DeskState, DeskView, Die, JobId, Spend } from './types';

export type SpendError = 'no-die' | 'no-job' | 'closed' | 'blocked' | 'no-target';

/** The seed of one spend: the day, the die and the job. The same spend always draws the same. */
export const spendSeed = (day: string, die: Die, job: JobId, target?: string) => hashSeed('desk-spend', day, die.axis, String(die.value), job, target ?? '');

export function spendDie(d: DeskState, v: DeskView, die: Die, job: JobId, target?: string): { desk: DeskState; spend: Spend } | { error: SpendError } {
  const tray = diceLeft(d.dice[v.date] ?? [], spendsOn(d, v.date));
  const held = tray.find((x) => x.axis === die.axis && x.value === die.value);
  if (!held) return { error: 'no-die' };
  const def = jobById(job);
  if (!def) return { error: 'no-job' };
  if (!def.open(v)) return { error: 'closed' };
  if (def.blocked?.(v)) return { error: 'blocked' };
  if (def.targets && !def.targets(v).some((t) => t.id === target)) return { error: 'no-target' };
  const out = def.spend(held, v, target, rng(spendSeed(v.date, held, job, target)));
  const spend: Spend = { id: `${v.date}:${held.axis}`, day: v.date, axis: held.axis, value: held.value, job, ...(target ? { target } : {}), effects: out.effects, ...(out.risk ? { risk: out.risk } : {}) };
  const opened = (out.opens ?? []).filter((c) => !d.clocks.some((x) => x.id === c.id)).map((c) => ({ ...c, opened: v.date }));
  return { desk: { ...d, spends: [...d.spends, spend], clocks: [...d.clocks, ...opened] }, spend };
}
