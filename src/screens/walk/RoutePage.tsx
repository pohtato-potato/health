import { useState } from 'react';
import { daysBetween, type DayKey } from '../../domain/dates';
import type { RouteRun } from '../../domain/types';
import { Icon } from '../../ui/Icon';
import { RECORD_NAMES, kindOf, type RouteDef } from '../../walk/catalogue';
import { finishedOn, runState } from '../../walk/runs';
import { targetLine } from '../../walk/shelf';
import { marksReached, signatureOf } from '../../walk/signature';
import { chaptersShown, storyState } from '../../walk/story';
import { MarkShape } from '../../walk/ui/MarkShape';
import { inkStyle } from '../../walk/ui/RouteArt';
import { RouteMap } from '../../walk/ui/RouteMap';
import { endsOf } from './JoinMoment';
import { TAKEN } from './Shelf';
import { Odometer, ThenLine } from './RouteNumbers';
import { Sources } from './Sources';
import { WalkFrame } from './WalkFrame';
import { auroraFor, auroraForInk } from '../../walk/page';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
const KIND = { challenge: 'Challenge', expedition: 'Expedition' };

/** A stale link, or a draft opened in a production build: said plainly. */
export function NotOnShelf({ onShelf }: { onShelf: () => void }) {
  return (
    <WalkFrame as="main" tint={auroraFor('plains')}>
      <h1 className="walk-title">This route isn’t on the shelf</h1>
      <p className="walk-para">It may still be being written, or the link is old.</p>
      <button type="button" className="walk-primary" onClick={onShelf}>
        See the routes
      </button>
    </WalkFrame>
  );
}

/** Their whole journey against yours, in years: expeditions with a record. */
function Years({ theirs, note, yours }: { theirs: number; note: string; yours: number }) {
  const max = Math.max(theirs, yours, 0.1);
  return (
    <section className="walk-years" aria-label={`Then and you: ${note}; you, about ${yours.toFixed(1)} years at your pace`}>
      <span className="walk-kind">Then and you · the whole journey</span>
      <div className="walk-yr">
        <span className="who">Then</span>
        <i style={{ ['--f' as string]: theirs / max }} />
        <span className="note">{note}</span>
      </div>
      <div className="walk-yr you">
        <span className="who">You</span>
        <i style={{ ['--f' as string]: yours / max }} />
        <span className="note">about {yours.toFixed(1)} years at your pace</span>
      </div>
    </section>
  );
}

/**
 * One page for every route, built from its data: the head, the whole road on its land, the number, then and you
 * where a record exists, today's page on the road, the collection, the chronicle, the places in order, the target,
 * and what you can do. A book route adds its story controls and keeps its full synopsis behind a warning until the
 * finish.
 */
export function RoutePageView(p: {
  def: RouteDef;
  run?: RouteRun;
  km: number;
  steps: Map<DayKey, number>;
  usualKm: number;
  today: DayKey;
  free: { challenge: number; expedition: number };
  onJoin: () => void;
  onDown: () => void;
  onUp: () => void;
  onPause: () => void;
  onResume: () => void;
  onTarget: (day: DayKey | undefined) => void;
  onBack: () => void;
}) {
  const { def, run, km } = p;
  const [deeper, setDeeper] = useState(false);
  const [spoil, setSpoil] = useState(false);
  const [allPlaces, setAllPlaces] = useState(false);
  const kind = kindOf(def);
  const state = run ? runState(run, def, km) : undefined;
  const finished = state === 'finished';
  const pct = Math.min(100, Math.floor((km / def.km) * 100));
  const day = run?.spans[0] ? daysBetween(run.spans[0].from, p.today) + 1 : 0;
  const page = [...def.pages].reverse().find((x) => x.km <= km) ?? def.pages[0];
  const sig = signatureOf(def);
  const got = marksReached(sig, km);
  const story = run ? storyState(run, def) : undefined;
  const chapters = run ? chaptersShown(run, def, km) : [];
  const waiting = story === 'paused' && def.book ? def.book.chapters.filter((c) => c.km >= run!.storyPauseKm! && c.km <= km).length : 0;
  const aim = targetLine(run?.target, p.today);
  // The latest place with a record you've passed: their day there beside yours.
  const thenAt = def.then && run ? [...def.then.places].reverse().find((t) => (def.places.find((x) => x.name === t.name)?.km ?? Infinity) <= km) : undefined;
  const yourDayAt = thenAt && run ? finishedOn(run, { km: def.places.find((x) => x.name === thenAt.name)!.km }, p.steps) : undefined;

  return (
    <WalkFrame as="main" className={`walk-route${kind === 'expedition' ? ' exp' : ''}`} tint={auroraForInk(def.ink)} style={inkStyle(def.id)}>
      <button type="button" className="backlink" onClick={p.onBack}>
        <Icon name="left" size={20} stroke={1.8} />
        Walk
      </button>
      <header className="walk-head">
        <span className="walk-kind walk-route-kind">
          <MarkShape mark={sig.mark} />
          {def.book ? 'Book route' : KIND[kind]} · {def.era}
        </span>
        <h1 className="walk-title">{def.name}</h1>
        <p className="walk-sub">
          {endsOf(def)} · {RECORD_NAMES[def.record]}
        </p>
      </header>

      <section className="walk-route-map" aria-label="The whole road">
        <RouteMap id={def.id} km={km} />
        {def.turn !== undefined && (
          <ul className="walk-map-key">
            <li>
              <i className="out" aria-hidden="true" /> The road out
            </li>
            <li>
              <i className="home" aria-hidden="true" /> The road home
            </li>
          </ul>
        )}
      </section>

      <Odometer km={km} of={def.km} about={kind === 'expedition'}>
        of {kind === 'expedition' ? 'about ' : ''}
        {fmt(def.km)} km · {pct}%{day > 0 ? ` · your day ${fmt(day)}` : ''}
        {state && state !== 'walking' ? ` · ${state === 'finished' ? 'Finished' : 'Set down'}` : ''}
      </Odometer>

      {def.record !== 'none' && def.years && <Years theirs={def.years.theirs} note={def.years.note} yours={def.km / Math.max(p.usualKm, 0.1) / 365} />}
      {def.record !== 'none' && !def.years && def.then && run && (thenAt ?? def.then.places[0]) && (
        <ThenLine
          who={def.then.who}
          place={(thenAt ?? def.then.places[0]).name}
          theirDay={(thenAt ?? def.then.places[0]).theirDay}
          yourDay={thenAt && yourDayAt && run ? daysBetween(run.spans[0].from, yourDayAt) + 1 : undefined}
          totalDays={def.then.totalDays}
          source={def.then.source}
        />
      )}

      {story === 'paused' && (
        <section className="walk-dispatch bookmark">
          <span className="walk-kind">The story is paused</span>
          <p className="walk-para">
            It waits here while you read on in the book. {waiting > 0 ? `${waiting} ${waiting === 1 ? 'chapter' : 'chapters'} waiting since you paused.` : 'Nothing new yet.'}
          </p>
          <button type="button" className="walk-primary" onClick={p.onResume}>
            Resume the story
          </button>
        </section>
      )}

      {page && (
        <section className="walk-dispatch">
          <span className="walk-kind">On the road · {page.title}</span>
          <p className="walk-voice">{page.line}</p>
          {page.page.map((t) => (
            <p key={t} className="walk-para">
              {t}
            </p>
          ))}
          {story === 'story' && chapters.length > 0 && (
            <div className="walk-chapters">
              <span className="walk-kind">In the story</span>
              {chapters.map((c) => (
                <p key={c.km} className="walk-para">
                  {c.text}
                </p>
              ))}
            </div>
          )}
          {page.deeper && (
            <>
              <button type="button" className="walk-ghost" aria-expanded={deeper} onClick={() => setDeeper(!deeper)}>
                {deeper ? 'Back to the road' : 'Go deeper'}
              </button>
              {deeper && (
                <div className="walk-deeper">
                  <h2 className="walk-h3">{page.deeper.title}</h2>
                  <p className="walk-para">{page.deeper.text}</p>
                </div>
              )}
            </>
          )}
          {story === 'story' && state === 'walking' && (
            <button type="button" className="walk-ghost" onClick={p.onPause}>
              Pause the story here
            </button>
          )}
        </section>
      )}

      <section className="walk-collection" aria-label={`${sig.title}: ${got} of ${sig.marks.length}`}>
        <h2 className="walk-h2">{sig.title}</h2>
        <p className="walk-sub">{sig.note}</p>
        <p className="walk-route-count">
          <b>{got}</b> of {fmt(sig.marks.length)}
        </p>
        <ol className="walk-marks">
          {sig.marks.slice(0, 24).map((m, i) => (
            <li key={i} className={i < got ? 'on' : ''}>
              {i < got ? <MarkShape mark={sig.mark} /> : <span aria-hidden="true">{i + 1}</span>}
              <span className="sr">{i < got ? `${m.name ?? `Number ${i + 1}`}: collected` : `Number ${i + 1}: not reached yet`}</span>
            </li>
          ))}
        </ol>
        {sig.marks.length > 24 && <p className="walk-sub">and {fmt(sig.marks.length - 24)} more along the road</p>}
      </section>

      <section className="walk-section">
        <h2 className="walk-h2">The places</h2>
        <ol className="walk-halts">
          {def.places.map((x, i) => {
            const next = def.places.findIndex((y) => y.km > km);
            const from = Math.max(0, (next < 0 ? def.places.length : next) - 3);
            if (!allPlaces && def.places.length > 9 && (i < from || i >= from + 9)) return null;
            return (
              <li key={`${x.name}-${i}`} className={x.km <= km ? 'done' : i === next ? 'here' : ''}>
                <span className="grow">{x.name}</span>
                <span className="st">{x.km <= km ? 'Reached' : i === next ? `Next · ${fmt(x.km - km)} km` : `${fmt(x.km)} km`}</span>
              </li>
            );
          })}
        </ol>
        {def.places.length > 9 && (
          <button type="button" className="walk-ghost" aria-expanded={allPlaces} onClick={() => setAllPlaces(!allPlaces)}>
            {allPlaces ? 'Show the places near you' : `Show all ${def.places.length} places`}
          </button>
        )}
      </section>

      {def.chronicle && def.chronicle.length > 0 && (
        <section className="walk-section">
          <h2 className="walk-h2">The chronicle</h2>
          <ol className="walk-chron">
            {def.chronicle.map((e) => (
              <li key={e.when + e.place}>
                <span className="walk-chron-when">
                  {e.when} · {e.place}
                </span>
                <span className="walk-para">{e.text}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {def.book && (
        <section className="walk-dispatch quiet">
          <span className="walk-kind">About the {def.record === 'story' && /film/i.test(def.hook) ? 'film' : 'book'}</span>
          <p className="walk-para">
            <b>{def.book.by}.</b> {def.book.synopsis}
          </p>
          {finished || spoil ? (
            <>
              <span className="walk-kind">Full synopsis</span>
              <p className="walk-para">{def.book.fullSynopsis}</p>
            </>
          ) : (
            <>
              <span className="walk-kind">Full synopsis · spoilers</span>
              <p className="walk-sub">It opens freely once you finish the walk.</p>
              <button type="button" className="walk-ghost" onClick={() => setSpoil(true)}>
                Show it anyway
              </button>
            </>
          )}
        </section>
      )}

      {aim && <p className="walk-sub walk-aim">You’re {aim}.</p>}
      <div className="walk-end-btns">
        {!run &&
          (p.free[kind] > 0 ? (
            <button type="button" className="walk-primary" onClick={p.onJoin}>
              Join this walk
            </button>
          ) : (
            <p className="walk-para">{TAKEN[kind]}</p>
          ))}
        {state === 'walking' && (
          <button type="button" className="walk-ghost" onClick={p.onDown}>
            Set it down
          </button>
        )}
        {state === 'set down' &&
          (p.free[kind] > 0 ? (
            <button type="button" className="walk-primary" onClick={p.onUp}>
              Pick it up
            </button>
          ) : (
            <p className="walk-para">{TAKEN[kind]}</p>
          ))}
        {run && !finished && kind === 'challenge' && (
          <label className="walk-target">
            <span>{run.target && aim ? 'Change the target date' : 'Add a target date (optional)'}</span>
            <input type="date" min={p.today} value={aim ? run.target : ''} onChange={(e) => p.onTarget(e.target.value || undefined)} />
          </label>
        )}
      </div>
      {def.sources.length > 0 && <Sources sources={def.sources} />}
    </WalkFrame>
  );
}
