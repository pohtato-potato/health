import { useEffect, useState } from 'react';
import { useAllDays } from '../../db/hooks';
import { back, go, useRoute } from '../../router';
import { Icon } from '../../ui/Icon';
import { CHAPTER_SLIDE_MS, chapterFilm } from '../../walk/chapterFilm';
import { auroraFor } from '../../walk/page';
import { stepsByDay } from '../../walk/runs';
import { TrailDrawing } from '../../walk/ui/TrailDrawing';
import { WalkFrame } from './WalkFrame';

/** A finished chapter's film at #/chapter?n=: about fifteen seconds of frames that move on by themselves; a tap moves on, Skip leaves. */
export function ChapterFilmPage() {
  const n = Number(useRoute().params.get('n'));
  const days = useAllDays();
  const [i, setI] = useState(0);
  const film = days ? chapterFilm(n, stepsByDay(days)) : undefined;
  const frames = film ? film.slides.length + 1 : 0;
  const last = i >= frames - 1;
  useEffect(() => {
    if (!film || last) return;
    const t = window.setTimeout(() => setI((k) => k + 1), CHAPTER_SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [film?.n, i, last]);
  const leave = () => back('/road');
  if (!days) return <div className="page bare" />;
  if (!film)
    return (
      <WalkFrame as="main" tint={auroraFor('plains')}>
        <h1 className="walk-title">This chapter isn’t walked yet</h1>
        <p className="walk-para">Its film plays when you reach the chapter’s end.</p>
        <button type="button" className="walk-primary" onClick={() => go('/road', {}, { replace: true })}>
          The road so far
        </button>
      </WalkFrame>
    );
  const s = film.slides[i];
  return (
    <div className="film chapter-film" onClick={() => (last ? undefined : setI(i + 1))}>
      <div className="film-bars" aria-hidden="true">
        {Array.from({ length: frames }, (_, k) => (
          <i key={k} className={k <= i ? 'on' : undefined} />
        ))}
      </div>
      <button
        type="button"
        className="icon-btn film-close"
        aria-label="Skip the film"
        onClick={(e) => {
          e.stopPropagation();
          leave();
        }}
      >
        <Icon name="close" size={22} />
      </button>
      <div className="film-body" aria-live="polite">
        {last ? (
          <>
            <TrailDrawing fromKm={film.fromKm} toKm={film.toKm} label={`Chapter ${film.n}, ${film.name}, on the map`} />
            <div className="t17 lh center">Chapter {film.n}, walked.</div>
          </>
        ) : (
          <>
            <div className="film-big tn" style={{ color: 'var(--sage)', fontSize: s.big.length > 6 ? 56 : 88 }}>
              {s.big}
            </div>
            <div className="t17 lh">{s.small}</div>
          </>
        )}
      </div>
      {last ? (
        <div className="row film-foot" style={{ gap: 8 }}>
          <button type="button" className="btn ghost grow" onClick={() => setI(0)}>
            Again
          </button>
          <button type="button" className="btn grow" onClick={leave}>
            Done
          </button>
        </div>
      ) : (
        <div className="t14 q film-foot center">Tap to move on</div>
      )}
    </div>
  );
}
