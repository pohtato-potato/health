import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db';
import { useAllDays, useAllSets, useSessions, useToday } from '../db/hooks';
import { lastMonth, monthlyFilm } from '../domain/film';
import { back, go, useRoute } from '../router';
import { Icon } from '../ui/Icon';

const FIELD: Record<string, string> = {
  sage: '#1d3b31',
  lavender: '#2d2652',
  gold: '#3d3014',
  apricot: '#43261a',
};
const INK: Record<string, string> = { sage: 'var(--sage)', lavender: 'var(--lavender)', gold: 'var(--gold)', apricot: 'var(--apricot)' };

/** Last month as a tap-through film in bold colour fields and huge type, titled by your most-played workout song. */
export function MonthlyFilmPage() {
  const { params } = useRoute();
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  const songs = useLiveQuery(() => db.songs.toArray(), []);
  const [i, setI] = useState(0);
  if (!days || !sessions || !sets || !songs) return <div className="page bare" />;
  const month = params.get('m') ?? lastMonth(today);
  const film = monthlyFilm(month, { days, sessions, sets, songs });
  const frames = film.slides;
  const f = frames[Math.min(i, frames.length - 1)];
  const last = i >= frames.length - 1;
  return (
    <div className="film" style={{ background: FIELD[f.tone] }} onClick={() => (last ? undefined : setI(i + 1))}>
      <div className="film-bars" aria-hidden="true">
        {frames.map((_, k) => (
          <i key={k} className={k <= i ? 'on' : undefined} />
        ))}
      </div>
      <button
        type="button"
        className="icon-btn film-close"
        aria-label="Close"
        onClick={(e) => {
          e.stopPropagation();
          back('/you');
        }}
      >
        <Icon name="close" size={22} />
      </button>
      <div className="t15" style={{ marginTop: 18, fontWeight: 600 }}>
        {film.heading}
      </div>
      <div className="film-body" aria-live="polite">
        <div className="film-big tn" style={{ color: INK[f.tone], fontSize: f.big.length > 6 ? 64 : 96 }}>
          {f.big}
        </div>
        <div className="t17 lh" style={{ color: 'var(--text)', opacity: 0.9 }}>
          {f.small}
        </div>
      </div>
      {!last && (
        <div className="t13 lh" style={{ opacity: 0.7, marginBottom: 10 }}>
          Next: {frames.slice(i + 1).map((x) => x.small.split('.')[0]).join(' · ')}
        </div>
      )}
      {last ? (
        <div className="row film-foot" style={{ gap: 8 }}>
          <button type="button" className="btn ghost grow" onClick={() => setI(0)}>
            Again
          </button>
          <button type="button" className="btn grow" onClick={() => go('/climate')}>
            The month in detail
          </button>
        </div>
      ) : (
        <div className="t12 q film-foot center">Tap for the next one</div>
      )}
    </div>
  );
}
