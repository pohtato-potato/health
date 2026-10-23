import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../../ui/Icon';
import { along, byId, fmt, inkOf } from './walkArt';
import { contentFor, type Mark } from './walkContent';
import type { CardData } from './walkLooks';
import { REGIONS, ROUTE_ART } from './walkRoutes';
import { EXPEDITIONS, EXPEDITION_KM, KM_A_DAY, RECORD_NAMES, WALKING } from './walkSample';

/**
 * Design prototype: one page for every challenge and expedition, built from the route's data. The whole road on
 * its map, the odometer, then and you, the route's own signature collection, today's page, the milestones, the
 * chronicle, a story layer and book controls where they apply. Expeditions get the grander parts (years, the
 * road out and home). Nothing here is specific to one route: a new route only needs data.
 */

/** Sample progress for any route: the walked ones from the sample, the rest a little way in. */
export function progressFor(id: string): CardData {
  const w = WALKING.find((x) => x.id === id);
  if (w) return w;
  const e = EXPEDITIONS.find((x) => x.id === id);
  const c = contentFor(id);
  if (e) return { id, km: e.km, day: Math.round(e.km / KM_A_DAY), stretch: c.today?.title ?? e.place, line: c.today?.line ?? e.news };
  const km = Math.round(byId(id).km * 0.15);
  return { id, km, day: Math.max(1, Math.round(km / KM_A_DAY)), stretch: c.today?.title ?? 'The first stretch', line: c.today?.line ?? "[Today's line for this road, written from the record.]" };
}

function useCount(to: number, ms = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return n;
}

/** The whole road on its land: framed to the route, places named, the road out and home drawn apart if it turns. */
export function RouteMap({ id, frac }: { id: string; frac: number }) {
  const art = ROUTE_ART[id];
  const region = REGIONS[art.region];
  const c = contentFor(id);
  const line = art.line;
  const xs = line.map((p) => p[0]);
  const ys = line.map((p) => p[1]);
  const [bx0, bx1, by0, by1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(bx1 - bx0, by1 - by0, region.box[2] * 0.06);
  let w = bx1 - bx0 + span * 0.7;
  let h = by1 - by0 + span * 0.5;
  const aspect = 360 / 250;
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  const x = (bx0 + bx1) / 2 - w / 2;
  const y = (by0 + by1) / 2 - h / 2;
  const unit = 360 / w;
  const turn = c.turn;
  const out = 'M' + (turn ? line.slice(0, turn + 1) : line).map((p) => p.join(' ')).join(' L');
  const home = turn ? 'M' + line.slice(turn).map((p) => p.join(' ')).join(' L') : '';
  const all = 'M' + line.map((p) => p.join(' ')).join(' L');
  const [ux, uy] = along(line, frac);
  const places = c.places ?? [
    [0, art.ends[0]],
    [line.length - 1, art.ends[1]],
  ];
  return (
    <svg className="wp-xm" viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${byId(id).name}: the whole road, from ${art.ends[0]} to ${art.ends[1]}`}>
      {region.extra && <path className="wp-ra-ridge" d={region.extra} vectorEffect="non-scaling-stroke" />}
      <path className="wp-ra-land" d={region.outline} vectorEffect="non-scaling-stroke" />
      <path className="wp-xm-out" d={out} vectorEffect="non-scaling-stroke" />
      {home && <path className="wp-xm-home" d={home} vectorEffect="non-scaling-stroke" />}
      <path className="wp-ra-walked" d={all} pathLength={1} style={{ strokeDasharray: `${frac} 1`, ['--f' as string]: frac }} vectorEffect="non-scaling-stroke" />
      {places.map(([i, name]) => {
        const [px, py] = line[Math.min(i, line.length - 1)];
        const right = px < x + w * 0.7;
        return (
          <g key={`${i}-${name}`}>
            <circle className="wp-xm-place" cx={px} cy={py} r={2.6 / unit} />
            <text className="wp-xm-name" style={{ fontSize: 14 / unit, strokeWidth: 3 / unit }} x={right ? px + 5 / unit : px - 5 / unit} y={py - 5 / unit} textAnchor={right ? 'start' : 'end'}>
              {name}
            </text>
          </g>
        );
      })}
      <circle className="wp-ra-halo" cx={ux} cy={uy} r={8 / unit} />
      <circle className="wp-ra-you" cx={ux} cy={uy} r={4.5 / unit} />
    </svg>
  );
}

/** The small drawn marks a route's collection is made of: one shape per kind of road. */
export function MarkShape({ mark }: { mark: Mark }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {markPath(mark)}
    </svg>
  );
}

/** A mark's drawing alone, on a 24-unit grid, for placing inside another drawing. */
export function markPath(mark: Mark): ReactNode {
  const p: Record<Mark, ReactNode> = {
    seal: <path d="M12 2 a10 10 0 1 0 0.01 0 M7 8 h10 M8 12 h8 M7 16 h10 M12 5 v14" />,
    crystal: <path d="M12 2 L19 9 L12 22 L5 9 Z M5 9 h14 M12 2 v20" />,
    minar: <path d="M10 22 L10.8 5 Q12 2 13.2 5 L14 22 Z M8 22 h8 M10.6 9 h2.8 M10.4 14 h3.2" />,
    station: <path d="M4 10 L12 4 L20 10 M6 10 v10 h12 v-10 M10 20 v-5 h4 v5" />,
    milecastle: <path d="M5 21 V9 h3 V6 h3 v3 h2 V6 h3 v3 h3 v12 Z M10 21 v-5 h4 v5" />,
    postcard: <path d="M3 6 h18 v13 H3 Z M14 9 h4 v4 h-4 Z M5 11 h6 M5 14 h6" />,
    elephant: <path d="M4 18 V11 Q4 6 10 6 h5 Q20 6 20 11 V13 Q20 16 18 16 V20 M4 18 h3 v-4 M15 18 v-3 M20 13 Q22 15 21 19" />,
    walker: <path d="M12 4 a2 2 0 1 0 0.01 0 M12 8 v6 M12 14 l-3 7 M12 14 l3 7 M12 10 l-4 3 M12 10 l4 3" />,
    island: <path d="M2 18 Q8 10 12 12 T22 18 Z M8 14 l2 -5 l3 4" />,
    moon: <path d="M15 3 a9 9 0 1 0 6 13 a7 7 0 1 1 -6 -13 Z" />,
    shield: <path d="M12 2 L20 6 V12 Q20 18 12 22 Q4 18 4 12 V6 Z M12 7 v10 M8 11 h8" />,
    house: <path d="M3 11 L12 4 L21 11 M5 10 V20 H19 V10 M10 20 v-6 h4 v6" />,
    stage: <path d="M12 2 a10 10 0 1 0 0.01 0 M12 6 v6 l4 3" />,
    chapter: <path d="M5 4 h10 l4 4 v12 H5 Z M15 4 v4 h4 M8 12 h8 M8 15 h8 M8 18 h5" />,
    stone: <path d="M6 22 V9 a6 6 0 0 1 12 0 V22 Z M6 11 h12" />,
  };
  return p[mark];
}

function Signature({ id, done }: { id: string; done: number }) {
  const s = contentFor(id).signature;
  const shown = Math.min(s.count, 24);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="wp-seals rise" aria-label={`${s.title}: ${done} of ${s.count}`}>
      <div>
        <h2 className="wp-h2">{s.title}</h2>
        <p className="wp-quiet">{s.note}</p>
      </div>
      <p className="wp-sig-count">
        <b>{done}</b> of {fmt(s.count)}
      </p>
      <div className="wp-seal-grid">
        {Array.from({ length: shown }, (_, i) => (
          <button key={i} type="button" className={`wp-seal ${i < done ? 'on' : ''}`} style={{ animationDelay: `${600 + i * 40}ms` }} aria-label={i < done ? `${s.names?.[i] ?? `Number ${i + 1}`}: collected` : `Number ${i + 1}: not reached yet`} onClick={() => setOpen(i)}>
            {i < done ? <MarkShape mark={s.mark} /> : <span aria-hidden="true">{i + 1}</span>}
          </button>
        ))}
      </div>
      {s.count > shown && <p className="wp-quiet">and {fmt(s.count - shown)} more along the road</p>}
      {open !== null && <p className="wp-para">{open < done ? `${s.names?.[open] ?? `Number ${open + 1}`}: collected.` : 'Not reached yet. Each one is revealed as you arrive.'}</p>}
    </section>
  );
}

function Years({ theirs, note, yours }: { theirs: number; note: string; yours: number }) {
  const max = Math.max(theirs, yours);
  return (
    <section className="wp-years rise" aria-label="Their journey against yours">
      <span className="wp-label">Then and you · the whole journey</span>
      <div className="wp-yr them">
        <span className="who">Then</span>
        <i style={{ ['--f' as string]: theirs / max }} />
        <span className="note">{note}</span>
      </div>
      <div className="wp-yr you">
        <span className="who">You</span>
        <i style={{ ['--f' as string]: yours / max }} />
        <span className="note">about {yours.toFixed(1)} years at your pace</span>
      </div>
    </section>
  );
}

function ThenLine({ t }: { t: NonNullable<ReturnType<typeof contentFor>['then']> }) {
  const at = (d: number) => `${(d / Math.max(t.totalDays, t.yourDay)) * 100}%`;
  return (
    <section className="wp-then rise" aria-label={`Then and you: ${t.who} reached ${t.place} on day ${t.theirDay}, you on day ${t.yourDay}`}>
      <span className="wp-label">Then and you · reaching {t.place}</span>
      <div className="wp-then-line">
        <i className="track" />
        <span className="mark them" style={{ left: at(t.theirDay) }}>
          <i />
          <b>Day {t.theirDay}</b>
          <small>Then</small>
        </span>
        <span className="mark you" style={{ left: at(t.yourDay) }}>
          <i />
          <b>Day {t.yourDay}</b>
          <small>You</small>
        </span>
      </div>
      <p className="wp-quiet">
        {t.who} took {t.totalDays} days in all. {t.source}
      </p>
    </section>
  );
}

export function RoutePage({ id, onBack, paused, onStory }: { id: string; onBack: () => void; paused?: boolean; onStory?: (story: boolean) => void }) {
  const r = byId(id);
  const c = contentFor(id);
  const p = progressFor(id);
  const art = ROUTE_ART[id];
  const frac = Math.min(1, p.km / r.km);
  const km = useCount(p.km);
  const expedition = r.km > EXPEDITION_KM;
  const done = c.signature.names ? c.signature.names.length : Math.max(1, Math.floor(c.signature.count * frac));
  const [open, setOpen] = useState(false);
  const [deeper, setDeeper] = useState(false);
  const yours = (r.km / KM_A_DAY) / 365;
  return (
    <main className={`wp-page wp-route ${expedition ? 'is-exp' : 'is-ch'}`} style={inkOf(id)}>
      <div className="wp-col">
        <button type="button" className="wp-back" onClick={onBack}>
          <Icon name="left" size={20} stroke={1.8} />
          Walk
        </button>
      </div>
      <header className="wp-col wp-route-head rise">
        <span className="wp-route-kind">
          <MarkShape mark={c.signature.mark} />
          {expedition ? 'Expedition' : r.book ? 'Book route' : 'Challenge'} · {r.era}
        </span>
        <h1 className="wp-title big">{r.name}</h1>
        <p className="wp-sub">
          {art.ends[0]} to {art.ends[1]} · {RECORD_NAMES[r.record]}
        </p>
      </header>

      <section className="wp-xm-wrap rise" aria-label="The whole road">
        <RouteMap id={id} frac={frac} />
        {c.turn !== undefined && (
          <div className="wp-xm-key wp-col">
            <span>
              <i className="out" /> The road out
            </span>
            <span>
              <i className="home" /> The road home
            </span>
          </div>
        )}
      </section>

      <div className="wp-col">
        <p className="wp-odo rise" aria-label={`${fmt(p.km)} of ${fmt(r.km)} km`}>
          {fmt(km)
            .split('')
            .map((ch, i) => (
              <span key={i} className={ch === ',' ? 'sep' : 'digit'}>
                {ch}
              </span>
            ))}
          <small>
            of {expedition ? 'about ' : ''}
            {fmt(r.km)} km · {Math.round(frac * 100)}% · your day {p.day}
          </small>
        </p>

        {r.book && onStory && (
          <div className="wp-chips" role="group" aria-label="Story or places">
            <button type="button" className={!paused ? 'on' : ''} onClick={() => onStory(true)}>
              With the story
            </button>
            <button type="button" className={paused ? 'on' : ''} onClick={() => onStory(false)}>
              Places only
            </button>
          </div>
        )}
        {r.book && paused && (
          <section className="wp-dispatch bookmark rise">
            <span className="wp-ribbon big" aria-hidden="true" />
            <span className="wp-label">Bookmarked · your day 18</span>
            <p className="wp-voice">The story waits here while you read on in the book.</p>
            <p className="wp-para">Until you come back, the walk shows places only.</p>
            <div className="wp-actions">
              <button type="button" className="wp-primary" onClick={() => onStory?.(true)}>
                Resume the story
              </button>
              <button type="button" className="wp-ghost">Catch me up first</button>
            </div>
          </section>
        )}

        {expedition && c.years && <Years theirs={c.years.theirs} note={c.years.note} yours={yours} />}
        {!expedition && c.then && <ThenLine t={c.then} />}

        <section className="wp-dispatch rise">
          <span className="wp-label">{r.book && !paused ? 'Today in the story' : 'On the road'} · {p.stretch}</span>
          <p className="wp-voice">{p.line}</p>
          {c.today && c.today.page.length > 0 && (
            <div className={`wp-unfold ${open ? 'open' : ''}`}>
              <div>
                {c.today.page.map((t) => (
                  <p key={t} className="wp-para">
                    {t}
                  </p>
                ))}
              </div>
            </div>
          )}
          <div className="wp-actions">
            {c.today && c.today.page.length > 0 && (
              <button type="button" className="wp-ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
                {open ? 'Less' : 'Read the day'}
              </button>
            )}
            <button type="button" className="wp-ghost" onClick={() => setDeeper(true)}>
              Go deeper
            </button>
            {r.book && !paused && (
              <button type="button" className="wp-ghost" onClick={() => onStory?.(false)}>
                Pause the story here
              </button>
            )}
          </div>
        </section>

        <Signature id={id} done={done} />

        {c.milestones && (
          <section className="wp-group rise">
            <h2 className="wp-h2">The milestones</h2>
            <ol className="wp-halts">
              {c.milestones.names.map((n, i) => (
                <li key={n} className={i < c.milestones!.done ? 'done' : i === c.milestones!.done ? 'here' : ''} style={{ animationDelay: `${300 + i * 50}ms` }}>
                  <span className="wp-halt-stamp" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="grow">{n}</span>
                  <span className="st">{i < c.milestones!.done ? 'Stamped' : i === c.milestones!.done ? "You're here" : ''}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {c.chronicle && (
          <section className="wp-chron rise">
            <h2 className="wp-h2">The chronicle</h2>
            <ol>
              {c.chronicle.map((e) => (
                <li key={e.when + e.place}>
                  <span className="when">
                    {e.when} · {e.place}
                  </span>
                  <span className="what">{e.text}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {c.layer && (
          <section className="wp-dispatch quiet rise">
            <span className="wp-label">Story layer</span>
            <p className="wp-para">{c.layer} can run beside the history. It's off.</p>
            <button type="button" className="wp-ghost">Turn it on</button>
          </section>
        )}
        {r.book && (
          <section className="wp-dispatch quiet rise">
            <span className="wp-label">About the {r.book.by.includes('Sircar') ? 'film' : 'book'}</span>
            <p className="wp-para">{r.book.synopsis}</p>
            <details className="wp-about">
              <summary>Full synopsis · spoilers</summary>
              <p className="wp-para">Opens behind this warning, and freely once you finish the walk.</p>
            </details>
          </section>
        )}
        <div className="wp-actions">
          {!expedition && <button type="button" className="wp-ghost">Add a target date</button>}
          <button type="button" className="wp-ghost">Put it down</button>
        </div>
      </div>

      {deeper && (
        <div className="wp-sheet" role="dialog" aria-label="Go deeper" onClick={() => setDeeper(false)}>
          <div className="wp-sheet-in ink" onClick={(e) => e.stopPropagation()}>
            <span className="wp-label">Go deeper</span>
            <h2 className="wp-title">{c.today?.deeper?.title ?? r.name}</h2>
            <p className="wp-para">{c.today?.deeper?.text ?? '[The long read for this road: its politics, its people, and the arguments historians still have.]'}</p>
            <button type="button" className="wp-primary" onClick={() => setDeeper(false)}>
              Back to the road
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
