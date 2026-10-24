import type { DayKey } from '../../domain/dates';
import type { RouteRun } from '../../domain/types';
import { RECORD_NAMES, kindOf, routeById, type RouteDef } from '../../walk/catalogue';
import { timeAtPace } from '../../walk/page';
import { PLACES, runState } from '../../walk/runs';
import { signatureOf } from '../../walk/signature';
import { storyState } from '../../walk/story';
import { MarkShape } from '../../walk/ui/MarkShape';
import { inkStyle } from '../../walk/ui/RouteArt';
import { RouteMap } from '../../walk/ui/RouteMap';
import { Visa } from './Visa';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

/** "Sabarmati to Dandi", or for a road that turns back, "Chang'an to Nalanda and home". */
export function endsOf(def: RouteDef): string {
  const first = def.places[0]?.name;
  const far = def.turn !== undefined ? def.places.find((p) => p.km === def.turn)?.name : def.places.at(-1)?.name;
  if (!first || !far) return '';
  return def.turn !== undefined ? `${first} to ${far} and home` : `${first} to ${far}`;
}

/** The place this route takes: "Challenge 2 of 2" counts the routes of its kind being walked, itself included. */
function placeTaken(def: RouteDef, runs: RouteRun[]): string {
  const kind = kindOf(def);
  const n = runs.filter((r) => {
    const d = routeById(r.id) ?? (r.id === def.id ? def : undefined);
    return d && kindOf(d) === kind && runState(r, d, 0) === 'walking';
  }).length;
  return `${kind === 'challenge' ? 'Challenge' : 'Expedition'} ${Math.max(1, n)} of ${PLACES[kind]}`;
}

/**
 * The joining moment, in the route's own character: its whole road drawing itself faintly in its ink, its visa
 * landing, what you've taken on (length, time at your pace, no deadline), the place it takes, its collection waiting
 * empty, and for a book route the one question of how to walk it. It writes nothing itself: it is reached after the
 * join was saved.
 */
export function JoinView(p: { def: RouteDef; runs: RouteRun[]; usualKm: number; today: DayKey; onStory: (s: 'story' | 'places') => void; onStart: () => void; onTarget: (day: DayKey | undefined) => void; onPage: () => void }) {
  const { def } = p;
  const run = p.runs.find((r) => r.id === def.id);
  if (!run)
    return (
      <main className="walk-moment walk-join" style={inkStyle(def.id)}>
        <h1 className="walk-title">{def.name}</h1>
        <p className="walk-para">You haven’t joined this route.</p>
        <button type="button" className="walk-primary" onClick={p.onPage}>
          See its page
        </button>
      </main>
    );
  const expedition = kindOf(def) === 'expedition';
  const sig = signatureOf(def);
  const story = storyState(run, def);
  return (
    <main className={`walk-moment walk-join${expedition ? ' exp' : ''}`} style={inkStyle(def.id)}>
      <div className="walk-join-road" aria-hidden="true">
        <RouteMap id={def.id} km={0} />
      </div>
      <div className="walk-join-visa">
        <Visa def={def} joined={run.spans[0]?.from} />
      </div>
      <h1 className="walk-moment-title">{expedition ? `Your expedition begins: ${def.name}` : `You’ve joined ${def.name}`}</h1>
      <p className="walk-para center">
        {fmt(def.km)} km, {endsOf(def)}. {expedition ? 'It runs beside your challenges, with the same steps' : 'Your steps count from today'}: {timeAtPace(def.km, p.usualKm)} at your pace, with no deadline.
      </p>
      <ul className="walk-join-facts">
        <li>{RECORD_NAMES[def.record]}</li>
        <li>{def.era}</li>
        <li>{placeTaken(def, p.runs)}</li>
      </ul>
      <section className="walk-join-sig" aria-label={`Your collection, ${sig.title}: 0 of ${sig.marks.length}`}>
        <span className="walk-kind">Your collection · {sig.title}</span>
        <span className="walk-join-marks" aria-hidden="true">
          {Array.from({ length: Math.min(7, sig.marks.length) }, (_, i) => (
            <i key={i}>
              <MarkShape mark={sig.mark} />
            </i>
          ))}
        </span>
        <span className="walk-sub">
          0 of {fmt(sig.marks.length)}. {sig.note}
        </span>
      </section>
      {story && (
        <section className="walk-join-story">
          <span className="walk-kind">How would you like to walk it?</span>
          <div className="walk-chips" role="group" aria-label="With the story or places only">
            <button type="button" aria-pressed={story !== 'places'} className={story !== 'places' ? 'on' : ''} onClick={() => p.onStory('story')}>
              With the story
            </button>
            <button type="button" aria-pressed={story === 'places'} className={story === 'places' ? 'on' : ''} onClick={() => p.onStory('places')}>
              Places only
            </button>
          </div>
          <p className="walk-sub">{story === 'places' ? 'Real places and history only; the plot stays hidden until you choose.' : 'The plot unfolds as you walk. You can pause it any time to read on yourself.'}</p>
        </section>
      )}
      <div className="walk-end-btns">
        <button type="button" className="walk-primary" onClick={p.onStart}>
          {expedition ? 'Set out' : 'Start walking'}
        </button>
        {!expedition && (
          <label className="walk-target">
            <span>Add a target date (optional)</span>
            <input type="date" min={p.today} value={run.target ?? ''} onChange={(e) => p.onTarget(e.target.value || undefined)} />
          </label>
        )}
      </div>
    </main>
  );
}
