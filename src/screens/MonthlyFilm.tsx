import { useState, type CSSProperties } from 'react';
import { creatureById, nameAt } from '../domain/creatureRoster';
import { lastMonth } from '../domain/film';
import { fmtInt } from '../domain/format';
import { filmFrames, type FilmFrame } from '../domain/monthReport';
import { constellationFor, skyStars } from '../domain/nightSky';
import { back, go, useRoute } from '../router';
import { CreatureFigure } from '../ui/creatures/Figure';
import { stageNow } from '../ui/creatures/Payoffs';
import { CountUp } from '../ui/you/CountUp';
import { GOLD } from '../ui/you/palette';
import { TrailDrawing } from '../walk/ui/TrailDrawing';
import { Grades } from './reports/Grades';
import { useMonthInput } from './reports/useMonthInput';

function BigNumber({ text }: { text: string }) {
  const m = /^(\D*)([\d,]+)(.*)$/.exec(text);
  if (!m) return <>{text}</>;
  const to = Number(m[2].replace(/,/g, ''));
  return <CountUp to={to} fmt={(n) => `${m[1]}${fmtInt(n)}${m[3]}`} />;
}

function Stars({ dates }: { dates: string[] }) {
  const stars = skyStars(dates);
  const xs = stars.map((s) => s.x);
  const ys = stars.map((s) => s.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pts = stars.map((s) => [20 + ((s.x - x0) / Math.max(1, x1 - x0)) * 200, 20 + ((s.y - y0) / Math.max(1, y1 - y0)) * 110]);
  return (
    <svg className="yu-f-stars" viewBox="0 0 240 150" aria-hidden="true">
      {pts.length > 1 && <polyline className="yu-draw2" pathLength={1} points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={GOLD} strokeOpacity=".6" strokeWidth="1.6" />}
      {pts.map(([x, y], i) => <circle key={i} className="yu-star" style={{ '--i': i } as CSSProperties} cx={x} cy={y} r="4.5" fill={GOLD} />)}
    </svg>
  );
}

function Frame({ f, month, sightings }: { f: FilmFrame; month: string; sightings: { creatureId: string }[] }) {
  switch (f.kind) {
    case 'opening':
      return <><div className="yu-f-big" style={{ fontSize: 46, color: '#ffc0dc' }}>{f.title}</div><div className="yu-f-s">{f.small}</div></>;
    case 'number':
      return <><div className="yu-f-big" style={{ color: f.color, fontSize: f.big.length > 6 ? 60 : 80 }}><BigNumber text={f.big} /></div><div className="yu-f-s">{f.small}</div></>;
    case 'trail':
      return <><div className="yu-f-trail"><TrailDrawing fromKm={f.fromKm} toKm={f.toKm} label={f.small} /></div><div className="yu-f-s">{f.small}</div></>;
    case 'creatures':
      return (
        <>
          <div className="yu-f-art">
            {f.ids.map((id) => {
              const c = creatureById(id);
              if (!c) return null;
              const stage = stageNow(c, sightings);
              return <div key={id} className="yu-f-cr" style={{ '--k': c.main } as CSSProperties}><CreatureFigure c={c} stage={stage} width={140} burst={false} /><b>{nameAt(c, stage)}</b></div>;
            })}
          </div>
          <div className="yu-f-s">{f.small}</div>
        </>
      );
    case 'stars':
      return <><div className="yu-f-big" style={{ fontSize: 46, color: GOLD }}>{constellationFor(month).name}</div><Stars dates={f.dates} /><div className="yu-f-s">{f.small}</div></>;
    case 'credits':
      return <div className="yu-roll"><div className="yu-rin">{f.lines.map(([a, b]) => <p key={a}><span>{a}</span>{b}</p>)}</div></div>;
    case 'assessment':
      return (
        <>
          <div className="yu-f-big" style={{ fontSize: 46 }}>The assessment</div>
          <Grades grades={f.grades} />
          <button type="button" className="btn" onClick={(e) => { e.stopPropagation(); go('/reports/month', { m: month }); }}>Read the full report</button>
        </>
      );
  }
}

/** A month as a tap-through film: colour fields, a coloured number on each screen, credits, then the marks. */
export function MonthlyFilmPage() {
  const { params } = useRoute();
  const input = useMonthInput();
  const [i, setI] = useState(0);
  if (!input) return <div className="page bare" />;
  const month = params.get('m') ?? lastMonth(input.today);
  const frames = filmFrames(month, input);
  const close = (e: { stopPropagation: () => void }) => { e.stopPropagation(); back('/you'); };
  if (!frames.length) {
    return (
      <div className="yu-film" style={{ background: 'linear-gradient(165deg,#3a1f6e,#141a4a 70%)' }}>
        <button type="button" className="yu-close" onClick={close}>Close</button>
        <div className="yu-film-b"><div className="yu-f-s">Nothing was logged this month, so there's no film yet.</div></div>
      </div>
    );
  }
  const k = Math.min(i, frames.length - 1);
  const f = frames[k];
  return (
    <div className="yu-film" style={{ background: f.ground }} onClick={() => setI(Math.min(frames.length - 1, k + 1))}>
      <div className="yu-film-glow" />
      <div className="yu-bars" aria-hidden="true">{frames.map((_, n) => <i key={n} className={n <= k ? 'on' : undefined} />)}</div>
      <button type="button" className="yu-close" onClick={close}>Close</button>
      <div className="yu-film-b" key={k} aria-live="polite"><Frame f={f} month={month} sightings={input.sightings} /></div>
      {k > 0 && <button type="button" className="yu-film-prev" onClick={(e) => { e.stopPropagation(); setI(k - 1); }}>Back</button>}
      {k < frames.length - 1 && <span className="yu-film-hint">Tap to go on</span>}
    </div>
  );
}
