import { parseDay } from './dates';
import { placeFor } from './places';
import type { Day, Settings, TrainingSession } from './types';

/** Tags that make two sessions comparable or not. */
export type Context = 'post-office' | 'morning' | 'weekend' | 'short' | 'after-night-out' | `place:${string}`;

/** The automatic context of a session: when, where, and what came before. */
export function contextOf(
  s: Pick<TrainingSession, 'startedAt' | 'date'> & { short?: boolean },
  day: Pick<Day, 'place' | 'placeChanges'> | undefined,
  prevDay: Pick<Day, 'nightOut'> | undefined,
  settings: Pick<Settings, 'places'>,
): Context[] {
  const out: Context[] = [];
  const hour = new Date(s.startedAt).getHours();
  const place = placeFor(day, settings, s.startedAt);
  if (place.kind === 'office' && hour >= 17) out.push('post-office');
  if (hour < 12) out.push('morning');
  const wd = parseDay(s.date).getDay();
  if (wd === 0 || wd === 6) out.push('weekend');
  if (s.short) out.push('short');
  if (prevDay?.nightOut) out.push('after-night-out');
  out.push(`place:${place.id}`);
  return out;
}

/** The tags that change how a session goes; weekends and places alone do not. */
const KEY: Context[] = ['post-office', 'morning', 'short', 'after-night-out'];

/** Like with like: the same key tags on both sessions. */
export function comparable(a: string[], b: string[]): boolean {
  return KEY.every((k) => a.includes(k) === b.includes(k));
}
