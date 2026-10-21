import { checksFor } from '../../domain/checks';
import { bestMoment, formReport, hourSplit, recapRings, type FinaleData } from '../../domain/finale';
import { findExercise, findSession, type ExerciseDef, type PlanDef } from '../../domain/plan';
import { FORM_LABELS, formScore } from '../../domain/quality';
import type { SetEntry, SongRecord, TrainingSession } from '../../domain/types';
import type { RecordPage } from '../../ui/Moments';
import { songAt, topWorkoutArtists } from '../../sources/lastfm';

const songName = (s: Pick<SongRecord, 'track' | 'artist'>) => `${s.track} · ${s.artist}`;

/** Everything the finale shows, from the saved session, its sets and its soundtrack. */
export function finaleData(a: { session: TrainingSession; mine: SetEntry[]; songs: SongRecord[]; pages: RecordPage[]; plan: PlanDef; quality: number; usualMin?: number }): FinaleData {
  const records = a.mine.filter((s) => s.mark === '!!' && !s.skipped);
  const recordSongs: Record<string, string> = {};
  const recordTracks = new Set<string>();
  for (const s of records) {
    const song = songAt(s.at, a.songs);
    if (!song) continue;
    recordTracks.add(songName(song));
    if (!recordSongs[s.exercise]) recordSongs[s.exercise] = songName(song);
  }
  const top = topWorkoutArtists(a.songs)[0];
  const exs = a.session.exercises.map((id) => findExercise(a.plan, id)).filter((e): e is ExerciseDef => !!e);
  const form = formReport(a.mine, (id) => checksFor(findExercise(a.plan, id) ?? { checks: [] }));
  const scores = a.mine.filter((s) => !s.skipped && !s.drop).map(formScore).filter((f) => f !== undefined);
  return {
    name: findSession(a.plan, a.session.session)?.name ?? `Session ${a.session.session}`,
    pages: a.pages,
    recordSongs,
    songs: a.songs.map((s) => ({ name: songName(s), record: recordTracks.has(songName(s)) })),
    topArtist: top && top.plays > 1 ? top.artist : undefined,
    hour: hourSplit(a.session, a.mine),
    usualMin: a.usualMin,
    form,
    formWord: !form.rows.length && scores.length ? FORM_LABELS[Math.round(scores.reduce((n, f) => n + f, 0) / scores.length) - 1] : undefined,
    rings: recapRings(a.mine, exs),
    quality: a.quality,
    best: bestMoment(a.pages),
  };
}
