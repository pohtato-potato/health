import type { Day, SetEntry, SongRecord, TrainingSession } from './types';
import { fmtInt } from './format';

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
): { title: string; month: string; slides: FilmSlide[] } {
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
  return {
    title: top ?? name,
    month: name,
    slides: [
      { big: fmtInt(steps), small: `steps in ${name}`, tone: 'sage' },
      { big: fmtInt(sessions.length), small: `session${sessions.length === 1 ? '' : 's'} finished`, tone: 'lavender' },
      { big: fmtInt(records), small: `record${records === 1 ? '' : 's'} set`, tone: 'gold' },
      { big: fmtInt(best), small: 'steps on your best day', tone: 'apricot' },
    ],
  };
}

/** The month before this one, as YYYY-MM. */
export function lastMonth(today: string): string {
  const [y, m] = today.split('-').map(Number);
  const d = new Date(y, m - 2, 1, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
