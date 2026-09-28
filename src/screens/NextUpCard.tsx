import { fmtInt, lowerFirst, weekdayName } from '../domain/format';
import { findExercise, findSession } from '../domain/plan';
import type { Settings, TrainingSession } from '../domain/types';
import { useAllSets, useNow } from '../db/hooks';
import { go } from '../router';
import type { NextUp } from '../state/derived';

export function NextUpCard({
  settings,
  up,
  active,
  trainedToday,
  weeks,
}: {
  settings: Settings;
  up: NextUp | undefined;
  active: TrainingSession | null;
  trainedToday: TrainingSession[];
  weeks: { thisWeek: number; perWeek: number };
}) {
  const plan = settings.plan;
  const sets = useAllSets();
  const now = useNow(active ? 1000 : 60_000);

  if (active) {
    const def = plan ? findSession(plan, active.session) : undefined;
    const n = sets?.filter((s) => s.sessionId === active.id && !s.drop).length ?? 0;
    return (
      <div className="card" style={{ gap: 14 }}>
        <div className="row">
          <div className="lbl sage">In progress</div>
          <div className="t13 q tn">{clock(now - active.startedAt)}</div>
        </div>
        <div className="col gap4">
          <div className="sf" style={{ fontSize: 26 }}>
            {def?.name ?? `Session ${active.session}`}
          </div>
          <div className="t14 q">
            {n} set{n === 1 ? '' : 's'} logged{active.short ? ' · short session' : ''}
          </div>
        </div>
        <button type="button" className="btn block" onClick={() => go('/session')}>
          Resume session
        </button>
      </div>
    );
  }

  if (!plan || !up) {
    return (
      <div className="card" style={{ gap: 12 }}>
        <div className="lbl">Training</div>
        <div className="t15 lh">No training plan yet. Add one from Settings, and Train will run it: the A/B rotation, loads and every rule.</div>
        <button type="button" className="btn ghost" onClick={() => go('/settings', { at: 'training' })}>
          Add a plan
        </button>
      </div>
    );
  }

  const def = findSession(plan, up.sessionId);
  if (trainedToday.length) {
    const s = trainedToday[trainedToday.length - 1];
    const sd = findSession(plan, s.session);
    const n = sets?.filter((x) => x.sessionId === s.id && !x.drop).length ?? 0;
    const mins = Math.round(((s.endedAt ?? s.startedAt) - s.startedAt) / 60000);
    return (
      <button type="button" className="card" onClick={() => go('/session/view', { id: s.id })}>
        <div className="row">
          <div className="lbl sage">Done today</div>
          <div className="t13 q">
            {Math.min(weeks.thisWeek, weeks.perWeek)} of {weeks.perWeek} this week
          </div>
        </div>
        <div className="sf" style={{ fontSize: 24 }}>
          {sd?.name ?? `Session ${s.session}`}
        </div>
        <div className="t14 q">
          {mins} min · {fmtInt(n)} sets{s.short ? ' · short' : ''}. Next time: {def?.name ?? up.sessionId}.
        </div>
      </button>
    );
  }

  const ready = up.exercises.filter((e) => e.status.advice && e.status.advice.kind !== 'maxed');
  const met = weeks.thisWeek >= weeks.perWeek;
  const last = up.lastDone;

  return (
    <div className="card" style={{ gap: 14 }}>
      <div className="row">
        <div className="lbl">Next up</div>
        {last && (
          <div className="t13 q">
            Last: {last.session}, {weekdayName(last.date)}
          </div>
        )}
      </div>
      <div className="col gap4">
        <div className="sf" style={{ fontSize: 26 }}>
          {def?.name ?? `Session ${up.sessionId}`}
        </div>
        <div className="t14 q">
          {def?.focus} · {up.exercises.length} exercises · about {def?.minutes ?? 60} min
        </div>
      </div>
      {up.swaps.map((s) => (
        <div key={s.from} className="t13 apri lh">
          {s.flag.group} flagged: {lowerFirst(findExercise(plan, s.from)?.name ?? s.from)} {findExercise(plan, s.to) ? `out, ${lowerFirst(findExercise(plan, s.to)!.name)} covers it` : 'out'}.
        </div>
      ))}
      {ready.length > 0 && (
        <div className="t13 gold">
          {ready.length === 1 ? `${ready[0].status.name} is` : `${ready.length} exercises are`} ready to go heavier.
        </div>
      )}
      {met && <div className="t13 q lh">{weeks.thisWeek} of {weeks.perWeek} done this week. Rest counts as training; a fifth is fine if you feel fresh.</div>}
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className={`btn grow${met ? ' ghost' : ''}`} onClick={() => go('/session', { start: up.sessionId })}>
          Start session
        </button>
        <button type="button" className="btn ghost" onClick={() => go('/session', { start: up.sessionId, short: '1' })}>
          Short
        </button>
      </div>
    </div>
  );
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
