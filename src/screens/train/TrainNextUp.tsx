import { doneTodayLine, loggedLater, unfinishedInSession } from '../../domain/trainingChecks';
import { lowerFirst, weekdayName } from '../../domain/format';
import { findSession } from '../../domain/plan';
import type { Settings, TrainingSession } from '../../domain/types';
import { useAllSets, useNow } from '../../db/hooks';
import { go } from '../../router';
import { recordShot } from '../../domain/strengthForecast';
import type { NextUp } from '../../state/derived';
import { logHour } from '../../domain/dates';

/** Train's own next-up card (the old Today card): the session, its plan length and first exercise, the last session, and the record shot. */
export function TrainNextUp({
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
    // The same unfinished-sets check as Train, so Today never calls a placeholder session a clean finish.
    const done = doneTodayLine({
      mins,
      later: !!sets && loggedLater(sets.filter((x) => x.sessionId === s.id)),
      sets: n,
      short: s.short,
      unfinished: sets ? unfinishedInSession(s.id, sets, settings.keptSets) : 0,
    });
    return (
      <button type="button" className="card" onClick={() => (done.clean ? go('/session/view', { id: s.id }) : go('/train'))}>
        <div className="row">
          <div className={`lbl${done.clean ? ' sage' : ''}`}>{done.clean ? 'Done today' : 'Saved today'}</div>
          <div className="t13 q">
            {Math.min(weeks.thisWeek, weeks.perWeek)} of {weeks.perWeek} this week
          </div>
        </div>
        <div className="sf" style={{ fontSize: 24 }}>
          {sd?.name ?? `Session ${s.session}`}
        </div>
        <div className="t14 q">
          {done.text}. Next time: {def?.name ?? up.sessionId}.
        </div>
      </button>
    );
  }

  const ready = up.exercises.filter((e) => e.status.advice && e.status.advice.kind !== 'maxed');
  const shots = up.exercises.map((e) => recordShot({ id: e.id, name: e.status.name }, sets ?? [])).filter((x): x is string => !!x);
  const met = weeks.thisWeek >= weeks.perWeek;
  const last = up.lastDone;

  const first = up.exercises[0]?.status.name;
  return (
    <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, textAlign: 'left' }} onClick={() => go('/train')}>
      <span className="col gap4 grow">
        <span className="serif" style={{ fontSize: 19, fontWeight: 600 }}>
          {def?.name ?? `Session ${up.sessionId}`} {met ? 'if you feel fresh' : logHour(Date.now()) >= 15 ? 'tonight' : 'today'}
        </span>
        <span className="t13 q">
          {def?.minutes ?? 60} min{first ? ` · ${lowerFirst(first)} first` : ''}
          {up.swaps.length ? ` · ${up.swaps.length} swap${up.swaps.length === 1 ? '' : 's'} for a flag` : ''}
        </span>
        {last && (
          <span className="t12 q">
            Last: {last.session}, {weekdayName(last.date)}
          </span>
        )}
      </span>
      {(shots.length > 0 || ready.length > 0) && (
        <span className="t13 gold right" style={{ maxWidth: 130, lineHeight: 1.3 }}>
          {shots.length ? shots[0].charAt(0).toUpperCase() + shots[0].slice(1) : `${ready.length} ready to go heavier`}
        </span>
      )}
    </button>
  );
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
