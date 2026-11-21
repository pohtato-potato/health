import { useMemo } from 'react';
import { lastMonth, monthlyFilm, posterLine } from '../../domain/film';
import type { Day, SetEntry, TrainingSession } from '../../domain/types';
import { go } from '../../router';
import { Icon } from '../../ui/Icon';

const FIRST_DAYS = 7;

/** For the first week of a month, if last month has anything to show: a poster like Reports' week (board three). */
export function FilmPoster({ today, days, sessions, sets }: { today: string; days: Day[]; sessions: TrainingSession[]; sets: SetEntry[] }) {
  const month = lastMonth(today);
  const film = useMemo(() => monthlyFilm(month, { days, sessions, sets, songs: [] }), [month, days, sessions, sets]);
  const hasData = days.some((d) => d.date.startsWith(month) && d.steps !== undefined) || sessions.some((s) => s.date.startsWith(month));
  if (Number(today.slice(8)) > FIRST_DAYS || !hasData) return null;
  const [km, done, records] = film.slides;
  return (
    <button type="button" className="k-poster sm" onClick={() => go('/film', { m: month })}>
      <span>{film.month} is finished</span>
      <b className="k-poster-t">Your {film.month} story</b>
      <span className="k-row"><span>{posterLine(km.big, done.big, records.big)}</span><span className="k-play"><Icon name="play" size={18} stroke={2.2} />Play</span></span>
    </button>
  );
}
