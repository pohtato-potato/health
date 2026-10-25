import type { DayKey } from './dates';
import { fmtDayShort, fmtInt } from './format';
import type { Status } from './types';

const STATUS_WORD: Record<Status, string> = { sick: 'sick', injured: 'injured', travelling: 'travelling', break: 'on a break', occasion: 'occasion' };

/**
 * The walk's caption on Today: the date, place and status; the Walk tab's own title (the stretch's name, or near or
 * between places); and one walk line. No day count: the Walk tab counts days on the stretch, and two counts disagreed.
 */
export function walkCaption(i: { date: DayKey; place?: string; status?: Status; title: string; line: string }): [string, string, string] {
  const first = [fmtDayShort(i.date), i.place, i.status && STATUS_WORD[i.status]].filter(Boolean).join(' · ');
  return [first, i.title, i.line];
}

/**
 * The one walk line Today shows, from the Walk tab's lines: an arrival, then a small stop, then a rest day, then the night sky, then
 * tomorrow (only once today's steps are in, or it would plan from a day not yet counted). Otherwise the km the
 * milestone shows; nothing at the end of the road.
 */
export function todayWalkLine(i: { arrival?: string; stop?: string; rest?: string; sky?: string; tomorrow?: string; stepsIn: boolean; stone?: { name: string; km: number } }): string {
  if (i.arrival) return `Arrived in ${i.arrival} today.`;
  if (i.stop) return i.stop;
  if (i.rest) return i.rest;
  if (i.sky) return i.sky;
  if (i.tomorrow && i.stepsIn) return i.tomorrow;
  return i.stone ? `${fmtInt(i.stone.km)} km to ${i.stone.name}` : '';
}

/**
 * Which place Today's scene draws: the nearer of the place behind and the place ahead, the one with its illustration
 * (the fort at Gwalior, say) if only one has. The same drawings as the arrival's welcome, every day.
 */
export function scenePlace(km: number, from: { name: string; km: number }, to: { name: string; km: number } | undefined, drawn: (name: string) => boolean): string {
  if (!to) return from.name;
  const [near, far] = km - from.km <= to.km - km ? [from, to] : [to, from];
  return drawn(near.name) || !drawn(far.name) ? near.name : far.name;
}
