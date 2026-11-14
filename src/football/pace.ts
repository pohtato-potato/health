// League pace (owner, 13 Nov, ledger O36): three league matchdays a day for the rest of one season, ending the day the
// title cannot be lost. Off until the owner turns it on in Football settings; it never carries into the next season.
// Every day played before it was turned on keeps its one matchday, its seeds and its ids, so old saves replay the same.
import type { DayKey } from '../domain/dates';
import { seasonDays, SEASON_DAYS } from './calendar';
import type { Row } from './table';
import { BREAK_BEFORE } from './globe/duty';

/** League matchdays a sealed day plays while the pace is on. */
export const PACE_PER_DAY = 3;
/** League matchdays in a season (34 for 18 clubs). */
export const LEAGUE_MATCHDAYS = seasonDays().filter((d) => d.kind === 'league').length;

/** Stored on the save: the season it is for, the first logging day it plays, and the last if it was turned off. */
export interface LeaguePace { season: number; from: DayKey; to?: DayKey }

/** Whether `date` plays at three a day: only in the season the switch was turned on for, from that day on. */
export function paceOn(save: { pace?: LeaguePace; season: number; phase: string }, date: DayKey): boolean {
  const p = save.pace;
  return Boolean(p && save.phase === 'season' && p.season === save.season && date >= p.from && (!p.to || date <= p.to));
}

/** League matchdays already played before season day `day` (the next day to play). */
export function matchdaysBefore(day: number): number {
  return seasonDays().slice(0, Math.max(0, Math.min(day, SEASON_DAYS + 1) - 1)).filter((d) => d.kind === 'league').length;
}

/**
 * The title cannot be lost: `id` leads its division by more than three points for every league match left. A lead of
 * exactly that many points is not enough, since goal difference could still settle it.
 */
export function titleSafe(table: Row[], id: string, left: number): boolean {
  if (table[0]?.id !== id || table.length < 2) return false;
  return table[0].pts - table[1].pts > 3 * left;
}

/**
 * The slot is the match's place in the day: 0 is the one a day at one a day would play, and keeps its old seed and
 * id; 1 and 2 are the extra matchdays and get their own, so the three are independent and replay the same.
 */
export const slotKey = (slot: number): string[] => (slot ? [`#${slot}`] : []);
export const matchIdFor = (date: DayKey, leg: number | undefined, slot: number) => `${date}:${leg ?? 1}${slot ? `#${slot}` : ''}`;

/** The week's pack while the pace is on: every seventh real day of the pace, not every seventh season day. */
export function paceWeekDone(pace: LeaguePace, date: DayKey, daysSince: (a: DayKey, b: DayKey) => number): boolean {
  return (daysSince(pace.from, date) + 1) % 7 === 0;
}

/** The switch's words in settings. */
export const PACE_TITLE = 'Three matches a day for the rest of this season';
export function paceLine(on: boolean, ended: boolean): string {
  if (ended) return 'The season this was on for is over. From now on it is one match a day again.';
  return on
    ? 'On. Each closed day plays the next three league matchdays on that day’s numbers, each with its own dice. You watch the last one; your assistant finishes the other two, and you can watch them after. The season ends the day the title is safe, with promotion then. Next season goes back to one a day by itself.'
    : 'Off. Turn it on to play three league matchdays for each closed day, each on that day’s numbers with its own dice, until the title is safe. It ends with this season; next season is one a day again.';
}

/**
 * The night ahead at three a day, from season day `day`: the league matchdays it plays and the cup rounds on the way.
 * `breakBefore(d)` says whether season day d starts an international break not yet played (the night stops there).
 */
export function paceNight(day: number, breakBefore: (d: number) => boolean): { matchdays: number[]; rounds: string[] } {
  const plan = seasonDays();
  const matchdays: number[] = [], rounds: string[] = [];
  for (let d = day; d <= SEASON_DAYS && matchdays.length < PACE_PER_DAY; d++) {
    if (d > day && breakBefore(d)) break;
    const p = plan[d - 1];
    if (p.kind === 'league') matchdays.push(p.matchday!);
    else if (p.round) rounds.push(`${p.kind === 'bigcup' ? 'the Big Cup' : p.kind === 'tiercup' ? 'the tier cup' : 'cup night'}: ${p.round}`);
  }
  return { matchdays, rounds };
}
/** "Matchdays 4, 5 and 6". */
export const matchdayList = (ms: number[]) => (ms.length === 1 ? `Matchday ${ms[0]}` : `Matchdays ${ms.slice(0, -1).join(', ')} and ${ms[ms.length - 1]}`);
/** Whether season day d starts an international break this season has not played yet. */
export const breakBeforeFor = (save: { season: number; globe?: { breaks: { season: number; n: number }[] } }) => (d: number) =>
  ([1, 2] as const).some((n) => BREAK_BEFORE[n] === d && !(save.globe?.breaks ?? []).some((b) => b.season === save.season && b.n === n));
