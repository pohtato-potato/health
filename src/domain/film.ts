import type { Day, SetEntry, SongRecord, TrainingSession } from './types';
import { fmtInt } from './format';
import { kmFromSteps } from './walk';
import { weekStart } from './dates';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface FilmSlide {
  big: string;
  small: string;
  tone: 'sage' | 'lavender' | 'gold' | 'apricot';
}

/**
 * Last month as a tap-through film: titled by the song most played during workouts that month
 * (or the month's name), then its numbers in big type.
 */
export function monthlyFilm(
  month: string,
  d: {
    days: Pick<Day, 'date' | 'steps'>[];
    sessions: Pick<TrainingSession, 'date' | 'status' | 'startedAt' | 'endedAt'>[];
    sets: Pick<SetEntry, 'date' | 'mark'>[];
    songs: Pick<SongRecord, 'at' | 'artist' | 'track'>[];
  },
): { title: string; heading: string; month: string; slides: FilmSlide[]; next: string } {
  const inMonth = (date: string) => date.startsWith(month);
  const sessions = d.sessions.filter((s) => s.status === 'done' && inMonth(s.date));
  const plays = new Map<string, number>();
  for (const s of d.songs) {
    if (!sessions.some((x) => s.at >= x.startedAt && s.at <= (x.endedAt ?? x.startedAt + 2 * 3_600_000))) continue;
    plays.set(s.track, (plays.get(s.track) ?? 0) + 1);
  }
  const top = [...plays].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  const days = d.days.filter((x) => inMonth(x.date) && x.steps !== undefined);
  const steps = days.reduce((n, x) => n + x.steps!, 0);
  const best = Math.max(0, ...days.map((x) => x.steps!));
  const records = d.sets.filter((s) => inMonth(s.date) && s.mark === '!!').length;
  const name = MONTHS[Number(month.slice(5, 7)) - 1];
  const km = kmFromSteps(steps);
  return {
    title: top ?? name,
    heading: top ? `${name}, scored by ${top}` : name,
    month: name,
    slides: [
      { big: fmtInt(km), small: 'kilometres walked.', tone: 'sage' },
      { big: fmtInt(sessions.length), small: `session${sessions.length === 1 ? '' : 's'} finished`, tone: 'lavender' },
      { big: fmtInt(records), small: `record${records === 1 ? '' : 's'} set`, tone: 'gold' },
      { big: fmtInt(best), small: 'steps on your best day', tone: 'apricot' },
    ],
    next: `Next: your sessions · the records · your best day`,
  };
}

/** The month before this one, as YYYY-MM. */
export function lastMonth(today: string): string {
  const [y, m] = today.split('-').map(Number);
  const d = new Date(y, m - 2, 1, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type FilmSet = Pick<SetEntry, 'date' | 'exerciseId' | 'exercise' | 'loadKg' | 'reps' | 'mark'> & { skipped?: boolean };
const lifted = (x: FilmSet) => !x.skipped && x.loadKg !== null && !!x.reps;

/** The month's strongest week: the most weight moved (load × reps), by the Monday it starts. */
export function strongestWeek(month: string, sets: FilmSet[]): { from: string; kg: number; sets: number } | undefined {
  const weeks = new Map<string, { kg: number; sets: number }>();
  for (const x of sets) {
    if (!x.date.startsWith(month) || !lifted(x)) continue;
    const w = weekStart(x.date);
    const cur = weeks.get(w) ?? { kg: 0, sets: 0 };
    weeks.set(w, { kg: cur.kg + x.loadKg! * x.reps!, sets: cur.sets + 1 });
  }
  const best = [...weeks].sort((a, b) => b[1].kg - a[1].kg || a[0].localeCompare(b[0]))[0];
  return best ? { from: best[0], ...best[1] } : undefined;
}

/** The record you didn't see coming: the month's biggest jump over a previous best weight. */
export function surpriseRecord(month: string, sets: FilmSet[]): { exercise: string; date: string; from: number; to: number; pct: number } | undefined {
  let out: { exercise: string; date: string; from: number; to: number; pct: number } | undefined;
  for (const r of sets) {
    if (!r.date.startsWith(month) || r.mark !== '!!' || !lifted(r)) continue;
    const before = sets.filter((x) => x.exerciseId === r.exerciseId && x.date < r.date && lifted(x)).map((x) => x.loadKg!);
    if (!before.length) continue;
    const from = Math.max(...before);
    if (r.loadKg! <= from) continue;
    const pct = Math.round(((r.loadKg! - from) / from) * 100);
    if (!out || pct > out.pct) out = { exercise: r.exercise, date: r.date, from, to: r.loadKg!, pct };
  }
  return out;
}
