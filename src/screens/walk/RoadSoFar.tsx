import { useAllDays } from '../../db/hooks';
import { fmtDayMonth } from '../../domain/format';
import { regionAt } from '../../domain/regions';
import { kmFromSteps } from '../../domain/walk';
import { back, go } from '../../router';
import { Icon } from '../../ui/Icon';
import { flyoverAllowed } from '../../walk/mapView';
import { auroraFor } from '../../walk/page';
import { roadSoFar, type RoadEvent } from '../../walk/roadSoFar';
import { stepsByDay } from '../../walk/runs';
import { WalkFrame } from './WalkFrame';

const WORDS: Record<RoadEvent['kind'], (e: RoadEvent) => string> = {
  city: (e) => `Reached ${e.name}`,
  state: (e) => `Into ${e.name}`,
  chapter: (e) => `Chapter ${e.chapter} walked: ${e.name}`,
};

/** Each kind keeps its own shape, so the timeline never leans on colour: a dot for a city, a diamond for a state line, a star for a chapter. */
function KindMark({ kind }: { kind: RoadEvent['kind'] }) {
  const d = { city: 'M7 3 a4 4 0 1 0 0.01 0Z', state: 'M7 2 L12 7 L7 12 L2 7Z', chapter: 'M7 1 L8.8 5 L13 5.3 L9.8 8.1 L10.8 12.5 L7 10.2 L3.2 12.5 L4.2 8.1 L1 5.3 L5.2 5Z' }[kind];
  return (
    <svg className={`walk-road-mark ${kind}`} viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** The road so far, at #/road: every arrival in date order, the whole road replayed on the map, the chapter films, and the journey wrapped. */
export function RoadSoFarPage() {
  const days = useAllDays();
  if (!days) return <div className="page walk3" />;
  const steps = stepsByDay(days);
  const km = kmFromSteps([...steps.values()].reduce((a, b) => a + b, 0));
  const events = roadSoFar(steps);
  const chapters = events.filter((e) => e.kind === 'chapter');
  const byDate = [...new Set(events.map((e) => e.date))].reverse();
  return (
    <WalkFrame as="main" tint={auroraFor(regionAt(km))}>
      <button type="button" className="backlink" onClick={() => back('/walk')}>
        <Icon name="left" size={20} stroke={1.8} />
        Walk
      </button>
      <div className="walk-head">
        <h1 className="walk-title">The road so far</h1>
        <p className="walk-sub">Every place you’ve reached, newest first.</p>
      </div>
      <div className="walk-end-btns">
        {flyoverAllowed(km) && (
          <button type="button" className="walk-primary" onClick={() => go('/map', { fly: '1' })}>
            Replay the whole road
          </button>
        )}
        {chapters.map((c) => (
          <button key={c.chapter} type="button" className="walk-ghost" onClick={() => go('/chapter', { n: String(c.chapter) })}>
            Play chapter {c.chapter}’s film
          </button>
        ))}
        <button type="button" className="walk-ghost" onClick={() => go('/wrapped', { all: '1' })}>
          The journey, wrapped
        </button>
      </div>
      {byDate.length === 0 ? (
        <p className="walk-para">Your first steps will start the road.</p>
      ) : (
        <ol className="walk-road">
          {byDate.map((date) => (
            <li key={date}>
              <div className="walk-road-date">{fmtDayMonth(date)} {date.slice(0, 4)}</div>
              <ul>
                {events
                  .filter((e) => e.date === date)
                  .map((e) => (
                    <li key={`${e.kind}-${e.name}-${e.chapter}`} className={e.kind === 'chapter' ? 'walk-road-chapter' : undefined}>
                      <KindMark kind={e.kind} />
                      {WORDS[e.kind](e)}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </WalkFrame>
  );
}
