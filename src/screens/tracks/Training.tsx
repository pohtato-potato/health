import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { addDays } from '../../domain/dates';
import { fmt1, fmtDayMonth, fmtDayShort } from '../../domain/format';
import { allExercises, realSets } from '../../domain/plan';
import { exerciseStatus, hitTop, ladder } from '../../domain/progression';
import { FAULTS, formScore } from '../../domain/quality';
import { formTrend, liftLine } from '../../domain/trackStats';
import { go } from '../../router';
import { songAt } from '../../sources/lastfm';
import { doneSessions } from '../../state/derived';
import { strengthIndex } from '../../domain/strength';
import { StrengthCard } from '../TrackExtras';
import { spanDays, type TrackData } from './data';
import { HeroChart, TrackShell } from './Template';

const formInk = (f: number) => (f >= 4 ? 'var(--sage)' : f >= 3 ? 'var(--gold)' : 'var(--rose)');

/** Training: the strength index with records marked, each lift's ladder and form, the clean-rep trend and fading faults, records with songs, then sessions. */
export function TrainingTrack({ data }: { data: TrackData }) {
  const [span, setSpan] = useState('30');
  const { settings, today } = data;
  const songs = useLiveQuery(() => db.songs.toArray(), []) ?? [];
  const range = spanDays(today, span);
  const sets = realSets(data.sets);
  const done = doneSessions(data.sessions);
  const inRange = done.filter((s) => s.date >= range[0]);
  const recordsOn = new Map<string, string>();
  for (const s of sets) if (s.mark === '!!' && s.date >= range[0]) recordsOn.set(s.date, `Record: ${s.exercise}`);
  const dates = [...new Set(inRange.map((s) => s.date))];
  const idx = strengthIndex(data.sets, today);
  const records = sets.filter((s) => s.mark === '!!').sort((a, b) => b.at - a.at);
  const form = formTrend(sets, today);
  const recentFaults = new Map<string, number>();
  const olderFaults = new Map<string, number>();
  for (const s of sets) {
    const bucket = s.date > addDays(today, -14) ? recentFaults : s.date > addDays(today, -42) ? olderFaults : undefined;
    for (const f of s.faults ?? []) bucket?.set(`${f}|${s.exercise}`, (bucket.get(`${f}|${s.exercise}`) ?? 0) + 1);
  }
  const fading = [...olderFaults].filter(([k, n]) => n >= 2 && (recentFaults.get(k) ?? 0) < n / 2).sort((a, b) => b[1] - a[1])[0];
  const lifts = settings.plan
    ? allExercises(settings.plan)
        .map((ex) => {
          const mine = sets.filter((s) => s.exerciseId === ex.id);
          if (!mine.length) return undefined;
          const lad = ladder(ex, data.sets);
          const recent = [...new Set(mine.map((s) => s.sessionId))].slice(-3);
          const forms = mine.filter((s) => recent.includes(s.sessionId)).map(formScore).filter((f) => f !== undefined);
          const formAvg = forms.length ? forms.reduce((a, b) => a + b, 0) / forms.length : undefined;
          const st = exerciseStatus(ex, settings.planState, settings.equipment, data.sets, settings.plan!.bigJump);
          return { ex, lad, ready: hitTop(ex, data.sets), formAvg, st };
        })
        .filter((x) => !!x)
    : [];

  return (
    <TrackShell
      title="Training"
      color="var(--text)"
      value={`${idx >= 0 ? '+' : '−'}${Math.abs(idx)}%`}
      sub={`strength index · ${inRange.length} session${inRange.length === 1 ? '' : 's'}${recordsOn.size ? ` · ${recordsOn.size} record day${recordsOn.size === 1 ? '' : 's'}` : ''}`}
      span={span}
      onSpan={setSpan}
      hero={
        <HeroChart
          label="Strength index by session, with records marked"
          mode="dots"
          color="var(--lavender)"
          fmt={(n) => `${Math.round(n)}%`}
          points={dates.map((d) => {
            const v = strengthIndex(data.sets.filter((s) => s.date <= d), d);
            return { label: fmtDayMonth(d), value: v, trend: v, marker: recordsOn.get(d) };
          })}
        />
      }
      insights={[
        form.now !== undefined && `${Math.round(form.now * 100)}% of reps clean${form.before !== undefined && form.before !== form.now ? `, ${form.now > form.before ? 'up' : 'down'} from ${Math.round(form.before * 100)}%` : ''}.`,
        fading && `Fading fault: ${FAULTS.find((f) => f.id === fading[0].split('|')[0])?.name.toLowerCase() ?? fading[0].split('|')[0]} on ${fading[0].split('|')[1].toLowerCase()}.`,
        lifts.some((l) => l.ready) && `${lifts.filter((l) => l.ready).length} lift${lifts.filter((l) => l.ready).length === 1 ? ' is' : 's are'} ready to go heavier.`,
      ]}
      history={{
        title: 'Sessions',
        rows: [...done].reverse().slice(0, 20).map((s) => [fmtDayShort(s.date), `Session ${s.session}${s.short ? ' · short' : ''}${s.quality !== undefined ? ` · quality ${s.quality}` : ''}`]),
        onRow: (i) => go('/session/view', { id: [...done].reverse()[i].id }),
      }}
    >
      {lifts.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            Each lift
          </div>
          {lifts.map(({ ex, lad, formAvg, st }) => (
            <div key={ex.id} className="sess" style={{ minHeight: 48 }}>
              <span className="col gap2">
                <span className="t14">
                  {ex.name}
                  {lad.load !== null ? ` · ${fmt1(lad.load)} kg` : ''}
                </span>
                <span className="t12 q">
                  {liftLine(st, { done: lad.rungs.filter((r) => r.done).length, of: lad.rungs.length })}
                </span>
              </span>
              {formAvg !== undefined && (
                <span className="t13 tn" style={{ color: formInk(formAvg) }}>
                  form {fmt1(formAvg)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {records.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl gold" style={{ paddingBottom: 6 }}>
            Records, with what was playing
          </div>
          {records.slice(0, 6).map((r) => {
            const song = songAt(r.at, songs);
            return (
              <div key={r.id} className="sess" style={{ minHeight: 48 }}>
                <span className="col gap2">
                  <span className="t14">
                    {r.exercise} · {r.loadKg ? `${fmt1(r.loadKg)} kg × ` : ''}
                    {r.reps}
                  </span>
                  <span className="t12 q">{song ? `${song.track}, ${song.artist}` : 'No song logged'}</span>
                </span>
                <span className="t13 q tn">{fmtDayMonth(r.date)}</span>
              </div>
            );
          })}
        </div>
      )}
      <StrengthCard sets={data.sets} today={today} />
    </TrackShell>
  );
}
