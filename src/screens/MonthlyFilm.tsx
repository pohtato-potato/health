import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import { fmtDayMonth, fmtInt } from '../domain/format';
import { dosesAllowPerfect } from '../domain/medicines';
import { constellationFor, skyStars } from '../domain/nightSky';
import { dayRings } from '../state/derived';
import { lastMonth, monthlyFilm, strongestWeek, surpriseRecord, type FilmSlide } from '../domain/film';
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
  const settings = useSettings();
  const entries = useAllEntries();
  const [i, setI] = useState(0);
  if (!days || !sessions || !sets || !songs || !settings || !entries) return <div className="page bare" />;
  const month = params.get('m') ?? lastMonth(today);
  const film = monthlyFilm(month, { days, sessions, sets, songs });
  // Three more frames: the strongest week, the record nobody saw coming, and the month's constellation.
  const week = strongestWeek(month, sets);
  const surprise = surpriseRecord(month, sets);
  const byDate = new Map<string, typeof entries>();
  for (const e of entries) if (e.date.startsWith(month)) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const perfect = days.filter((d) => d.date.startsWith(month) && d.date < today && byDate.has(d.date) && dayRings(settings, d.date, d, byDate.get(d.date)!).rings.perfect && dosesAllowPerfect(settings, d)).map((d) => d.date);
  const frames: (FilmSlide & { stars?: { x: number; y: number }[] })[] = [
    ...film.slides,
    ...(week ? [{ big: `${fmtInt(week.kg)} kg`, small: `moved in your strongest week, from ${fmtDayMonth(week.from)}, over ${week.sets} sets.`, tone: 'lavender' as const }] : []),
    ...(surprise ? [{ big: `+${surprise.pct}%`, small: `${surprise.exercise}, ${surprise.from} to ${surprise.to} kg on ${fmtDayMonth(surprise.date)}. The record you didn’t see coming.`, tone: 'gold' as const }] : []),
    ...(perfect.length ? [{ big: constellationFor(month).name, small: `${perfect.length} perfect day${perfect.length === 1 ? '' : 's'}, joined into this month’s constellation.`, tone: 'lavender' as const, stars: skyStars(perfect) }] : []),
  ];
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
        {f.stars && <Constellation stars={f.stars} />}
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

/** The month's perfect days as stars, joined in date order, scaled to fill the frame. */
function Constellation({ stars }: { stars: { x: number; y: number }[] }) {
  const xs = stars.map((s) => s.x);
  const ys = stars.map((s) => s.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const fit = (s: { x: number; y: number }) => ({ x: 20 + ((s.x - x0) / Math.max(1, x1 - x0)) * 260, y: 20 + ((s.y - y0) / Math.max(1, y1 - y0)) * 120 });
  const pts = stars.map(fit);
  return (
    <svg viewBox="0 0 300 160" width="100%" aria-hidden="true">
      <path d={`M${pts.map((p) => `${p.x} ${p.y}`).join(' L')}`} fill="none" stroke="var(--lavender)" strokeOpacity="0.45" strokeWidth="1" />
      {pts.map((p, k) => (
        <g key={k}>
          <circle cx={p.x} cy={p.y} r="7" fill="#fff8e6" opacity="0.12" />
          <circle cx={p.x} cy={p.y} r="2.4" fill="#fff8e6" />
        </g>
      ))}
    </svg>
  );
}
