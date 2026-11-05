import { useMemo } from 'react';
import { lastMonth, monthlyFilm, posterLine } from '../../domain/film';
import type { Day, SetEntry, TrainingSession } from '../../domain/types';
import { go } from '../../router';

const FIRST_DAYS = 7;

/** For the first week of a month, if last month has anything to show. */
export function FilmPoster({ today, days, sessions, sets }: { today: string; days: Day[]; sessions: TrainingSession[]; sets: SetEntry[] }) {
  const month = lastMonth(today);
  const film = useMemo(() => monthlyFilm(month, { days, sessions, sets, songs: [] }), [month, days, sessions, sets]);
  const hasData = days.some((d) => d.date.startsWith(month) && d.steps !== undefined) || sessions.some((s) => s.date.startsWith(month));
  if (Number(today.slice(8)) > FIRST_DAYS || !hasData) return null;
  const [km, done, records] = film.slides;
  return (
    <button type="button" className="yu-poster" onClick={() => go('/film', { m: month })}>
      <span className="yu-poster-glow" />
      <span className="yu-q">{film.month} is finished</span>
      <span className="yu-poster-t">Your {film.month} film</span>
      <span className="yu-poster-row"><span>{posterLine(km.big, done.big, records.big)}</span><u>Play</u></span>
    </button>
  );
}
