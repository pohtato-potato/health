import { hourBreakdown } from '../../domain/muscles';
import { cleanOf, FAULTS, FORM_LABELS, topFault } from '../../domain/quality';
import type { SetEntry, SongRecord, TrainingSession } from '../../domain/types';
import { songAt, topWorkoutArtists } from '../../sources/lastfm';
import { Story, type StoryCard } from '../../ui/Story';
import type { RecordPage } from '../../ui/Moments';

const mins = (ms: number) => `${Math.round(ms / 60000)} min`;

/** The session finale: records one by one, where the hour went, the form, then the quality score. */
export function Finale({ session, mine, pages, quality, songs = [], onClose }: { session: TrainingSession; mine: SetEntry[]; pages: RecordPage[]; quality: number; songs?: SongRecord[]; onClose: () => void }) {
  const done = mine.filter((s) => !s.skipped && !s.drop);
  const cards: StoryCard[] = [];

  for (const p of pages) {
    const recordSet = mine.find((s) => s.mark === '!!' && s.exercise === p.name);
    const song = recordSet ? songAt(recordSet.at, songs) : undefined;
    cards.push({
      id: `rec-${p.name}`,
      ground: 'radial-gradient(circle at 50% 30%, #3a2e17, var(--deep) 70%)',
      body: (
        <>
          <div className="lbl gold">New record</div>
          <div className="t17">{p.name}</div>
          <div className="finale-big gold">
            {p.big}
            <span className="finale-unit">{p.bigLabel.toLowerCase()}</span>
          </div>
          <div className="t15 lh">{p.detail}</div>
          {p.previous && <div className="t14 q">{p.previous}</div>}
          {p.next && <div className="t14 q">Next: {p.next}</div>}
          {song && (
            <div className="t14">
              Set to <span className="gold">{song.track}</span>, {song.artist}
            </div>
          )}
        </>
      ),
    });
  }

  if (songs.length) {
    const top = topWorkoutArtists(songs)[0];
    cards.push({
      id: 'soundtrack',
      ground: 'radial-gradient(circle at 50% 25%, #1f2a4a, var(--deep) 70%)',
      body: (
        <>
          <div className="lbl blue">The soundtrack</div>
          <div className="finale-big" style={{ fontSize: 48 }}>
            {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
          </div>
          {songs.slice(0, 5).map((s) => (
            <div key={s.id} className="t15">
              {s.track} <span className="q">· {s.artist}</span>
            </div>
          ))}
          {top && top.plays > 1 && <div className="t14 q">Most played: {top.artist}.</div>}
        </>
      ),
    });
  }

  const hour = hourBreakdown(session);
  if (hour.total > 0) {
    const share = hour.total ? Math.round((hour.lift / hour.total) * 100) : 0;
    cards.push({
      id: 'hour',
      body: (
        <>
          <div className="lbl blue">Where the hour went</div>
          <div className="finale-big">{mins(hour.total)}</div>
          <div className="hourbar" aria-hidden>
            <span style={{ width: `${share}%` }} />
          </div>
          <div className="row t15">
            <span>Lifting</span>
            <span className="tn">{mins(hour.lift)}</span>
          </div>
          <div className="row t15">
            <span>Resting</span>
            <span className="tn">{mins(hour.rest)}</span>
          </div>
          {hour.longestRest > 0 && <div className="t14 q">Longest rest: {mins(hour.longestRest)}.</div>}
        </>
      ),
    });
  }

  const rated = done.filter((s) => s.form !== undefined);
  if (rated.length) {
    const avg = Math.round(rated.reduce((n, s) => n + s.form!, 0) / rated.length);
    const reps = done.reduce((n, s) => n + (s.reps ?? 0), 0);
    const clean = done.reduce((n, s) => n + (s.reps !== undefined ? cleanOf(s) : 0), 0);
    const fault = topFault(done);
    cards.push({
      id: 'form',
      body: (
        <>
          <div className="lbl">Form</div>
          <div className="finale-big" style={{ color: `var(--f${avg})` }}>
            {FORM_LABELS[avg - 1]}
          </div>
          <div className="t15 lh">
            {clean} of {reps} reps clean.
          </div>
          {fault && <div className="t14 q lh">Most common slip: {FAULTS.find((f) => f.id === fault)!.name.toLowerCase()}. Next time's cue is aimed at it.</div>}
        </>
      ),
    });
  }

  cards.push({
    id: 'quality',
    body: (
      <>
        <div className="lbl">Session quality</div>
        <div className="finale-big">{quality}</div>
        <div className="t15 lh">{quality >= 85 ? 'A properly good session.' : quality >= 65 ? 'Solid work.' : 'It counts. The next one builds on it.'}</div>
        <div className="t13 q lh">Form, effort against the 1–2 reps-left target, and sets completed. Readiness learns from it.</div>
      </>
    ),
  });

  return <Story cards={cards} onClose={onClose} label="Session finale" />;
}
