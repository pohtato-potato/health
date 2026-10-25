import { daysBetween, type DayKey } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { CHAPTERS, crossings, kmFromSteps } from '../domain/walk';

/** Each frame of the chapter film is on screen this long; with the closing drawing, about fifteen seconds. */
export const CHAPTER_SLIDE_MS = 2200;

export interface ChapterFilm {
  n: number;
  name: string;
  fromKm: number;
  toKm: number;
  slides: { big: string; small: string }[];
}

/** A finished chapter as a short film: its name, the days, the km, the cities and states, and the longest day. Undefined until it's walked. */
export function chapterFilm(n: number, steps: Map<DayKey, number>): ChapterFilm | undefined {
  const ch = CHAPTERS.find((c) => c.n === n);
  if (!ch) return undefined;
  const marks = crossings(steps, [
    { name: 'start', km: ch.start },
    { name: 'end', km: ch.end },
  ]);
  const from = marks.find((m) => m.name === 'start')?.date;
  const to = marks.find((m) => m.name === 'end')?.date;
  if (!from || !to) return undefined;
  const longest = Math.max(0, ...[...steps].filter(([d]) => d >= from && d <= to).map(([, s]) => kmFromSteps(s)));
  const cities = new Set(ch.route.map((s) => s.name)).size;
  const states = new Set(ch.states.map((s) => s.name)).size;
  return {
    n,
    name: ch.name,
    fromKm: ch.start,
    toKm: ch.end,
    slides: [
      { big: `Chapter ${n}`, small: ch.name },
      { big: fmtInt(daysBetween(from, to) + 1), small: 'days on the road' },
      { big: fmtInt(ch.end - ch.start), small: 'kilometres' },
      { big: fmtInt(cities), small: 'cities reached' },
      { big: fmtInt(states), small: 'states and territories' },
      { big: `${fmtInt(longest)} km`, small: 'on your longest day' },
    ],
  };
}
