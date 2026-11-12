// The desk's small rules (spec §2–3, decision 12.2 a). Pure.
import type { DayKey } from '../../domain/dates';
import type { Clock, DeskState, Die, Spend } from './types';

/** Unspent dice at Close the day: 1 research for every two dice, at most 2 a day (never more than a good league day). */
export const UNSPENT_CAP = 2;
export const unspentResearch = (unspent: number) => Math.min(UNSPENT_CAP, Math.floor(Math.max(0, unspent) / 2));

/** The spends made on a logging day. */
export const spendsOn = (d: DeskState, day: DayKey): Spend[] => d.spends.filter((s) => s.day === day);

/**
 * The dice still in the tray: each spend takes one die of its axis and value. Dice are matched by axis, so two
 * dice can never be spent from one axis.
 */
export function diceLeft(dice: Die[], spent: Spend[]): Die[] {
  const used = new Set(spent.map((s) => s.axis));
  return dice.filter((d) => !used.has(d.axis));
}

/** A clock's filled segments: everything the spend log has put in, capped at its size. Never backwards. */
export function clockFilled(d: DeskState, c: Clock): number {
  const n = d.spends.reduce((t, s) => t + s.effects.reduce((u, e) => u + (e.kind === 'clock' && e.clock === c.id ? e.n : 0), 0), 0);
  return Math.min(c.size, n);
}
/** Clocks still filling. A clock never expires: it stays until it is full. */
export const openClocks = (d: DeskState) => d.clocks.filter((c) => clockFilled(d, c) < c.size);
export const clockDone = (d: DeskState, c: Clock) => clockFilled(d, c) >= c.size;

/** Coaching courses passed, ever. */
export const coursePasses = (d: DeskState | undefined) => (d?.courses ?? []).filter((c) => c.passed).length;
