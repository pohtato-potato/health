// Target talks (matchday spec §5, d-contract A, decision 9.7 a; called "target talks" to keep clear of contracts.ts).
// At a season start the Steps and Protein agents come in with an ask backed by the last six weeks: the median of
// logged days, rounded to 500 steps or 5 g, offered only when it is above the current target. Sign sets the target
// to the ask, Haggle sets it halfway, Hold keeps it. Targets never fall here.
import { addDays, type DayKey } from '../domain/dates';

export type TalkHabit = 'steps' | 'protein';
export type TalkPick = 'sign' | 'haggle' | 'hold';
/** `until`: the season's last day; a raise is rated against `from` until then (choice A a, 12 Nov). */
export interface TalkOutcome { season: number; habit: TalkHabit; pick: TalkPick; from: number; to: number; on: DayKey; until?: DayKey }

export const TALK_DAYS = 42;
/** Talks are held in a season's first week. */
export const TALK_WINDOW = 7;
export const TALK_UNIT: Record<TalkHabit, number> = { steps: 500, protein: 5 };
export const TALK_AGENT: Record<TalkHabit, { name: string; unit: string }> = {
  steps: { name: 'The Steps agent', unit: 'steps' },
  protein: { name: 'The Protein agent', unit: 'g' },
};

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const roundTo = (x: number, u: number) => Math.round(x / u) * u;

/** The days the ask looks at: the six weeks before `today`. */
export function talkWindow(today: DayKey): { from: DayKey; to: DayKey } {
  return { from: addDays(today, -TALK_DAYS), to: addDays(today, -1) };
}

/** The agent's ask from the logged days' values, or undefined when it would not raise the target. */
export function talkAsk(habit: TalkHabit, logged: number[], current: number): number | undefined {
  if (!logged.length) return undefined;
  const ask = roundTo(median(logged), TALK_UNIT[habit]);
  return ask > current ? ask : undefined;
}

/** Halfway between the current target and the ask, on the habit's own step, and at least one step up. */
export function haggled(habit: TalkHabit, current: number, ask: number): number {
  const u = TALK_UNIT[habit];
  const half = Math.floor((ask - current) / 2 / u) * u;
  return Math.min(ask, current + Math.max(u, half));
}

/** The new target for a pick. Never below the current one. */
export function talkTarget(habit: TalkHabit, pick: TalkPick, current: number, ask: number): number {
  const t = pick === 'sign' ? ask : pick === 'haggle' ? haggled(habit, current, ask) : current;
  return Math.max(current, t);
}

/** Talks are due in the first week of a season, once per habit per season. */
export function talkDue(save: { phase: 'season' | 'event'; day: number; season: number }, done: Pick<TalkOutcome, 'season' | 'habit'>[], habit: TalkHabit): boolean {
  return save.phase === 'season' && save.day <= TALK_WINDOW && !done.some((t) => t.season === save.season && t.habit === habit);
}

/**
 * Choice A a (owner, 12 Nov): signing never costs the player. Until the season ends, a raised target is rated against
 * the old one; Health itself shows and counts the new target. From the next season the player meets the new target.
 */
export function ratedTarget(talks: TalkOutcome[] | undefined, habit: TalkHabit, date: DayKey, real: number): number {
  const t = (talks ?? []).find((x) => x.habit === habit && x.to > x.from && x.until && date >= x.on && date <= x.until);
  return t && real >= t.to ? real - (t.to - t.from) : real;
}
export function ratedTargets<T extends { steps: number; proteinG: number }>(t: T, talks: TalkOutcome[] | undefined, date: DayKey): T {
  if (!talks?.length) return t;
  return { ...t, steps: ratedTarget(talks, 'steps', date, t.steps), proteinG: ratedTarget(talks, 'protein', date, t.proteinG) };
}
