import { daysBetween } from '../../domain/dates';
import { discomfortByExercise } from '../../domain/trackStats';
import { realSets } from '../../domain/plan';
import { flagEvents } from '../../state/derived';
import { JointsBody } from '../TrackExtras';
import type { TrackData } from './data';
import { TrackShell } from './Template';

/** Joints: each joint's status, the timeline of flags (the shared body keeps v1's physio summary), and the exercises discomfort tags came from. */
export function JointsTrack({ data, title }: { data: TrackData; title: string }) {
  const { settings, today } = data;
  const plan = settings.plan;
  const events = plan ? flagEvents(plan, data.sessions, [...data.days.values()]) : [];
  const last = events[events.length - 1];
  const since = last ? daysBetween(last.date, today) : undefined;
  const tags = discomfortByExercise(realSets(data.sets));
  return (
    <TrackShell
      title={title}
      color="var(--apricot)"
      value={since === undefined ? 'All clear' : since === 0 ? 'Flagged today' : `Clear ${since} day${since === 1 ? '' : 's'}`}
      sub={last ? `${events.length} flag${events.length === 1 ? '' : 's'} so far` : 'Nothing flagged yet'}
      insights={[tags.length > 0 && `Discomfort tags came from ${tags.length} exercise${tags.length === 1 ? '' : 's'}; the list is below.`]}
    >
      <JointsBody settings={settings} sessions={data.sessions} days={[...data.days.values()]} today={today} />
      {tags.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl apri" style={{ paddingBottom: 6 }}>
            Discomfort, by exercise
          </div>
          {tags.map((t) => (
            <div key={t.exercise} className="sess" style={{ minHeight: 44 }}>
              <span className="t14">{t.exercise}</span>
              <span className="t13 q">
                {Object.entries(t.tags)
                  .map(([k, n]) => `${k} × ${n}`)
                  .join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </TrackShell>
  );
}
