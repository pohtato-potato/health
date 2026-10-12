import { fmtDayLong, fmtDuration, fmtInt, fmtTime, lowerFirst } from '../domain/format';
import { daysBetween } from '../domain/dates';
import { sleepMinutes } from '../domain/rings';
import { fmtGap, sessionQuirks } from '../domain/sessionQuirks';
import { fmtKg } from '../domain/loads';
import { exerciseMark } from '../domain/marks';
import { findExercise, findSession } from '../domain/plan';
import type { SetEntry } from '../domain/types';
import { useEffect } from 'react';
import { bump, discardSession } from '../db/actions';
import { useAllDays, useAllSets, useSessions, useSettings } from '../db/hooks';
import { back, useRoute } from '../router';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toasts';
import { doneSessions } from '../state/derived';
import { sessionStats } from './SessionDone';
import { SessionClips } from './Clips';
import { askConfirm } from '../ui/Confirm';

/** A session in detail, Flighty style: the numbers, then exercise by exercise. */
export function SessionView() {
  const { params } = useRoute();
  const viewId = params.get('id');
  useEffect(() => {
    if (viewId) void bump('session-details', { value: viewId });
  }, [viewId]);
  const settings = useSettings();
  const sessions = useSessions();
  const sets = useAllSets();
  const days = useAllDays();
  const toast = useToast();
  if (!settings || !sessions || !sets || !days) return <div className="page bare" />;
  const s = sessions.find((x) => x.id === params.get('id'));
  if (!s) {
    return (
      <div className="page bare">
        <button type="button" className="backlink" onClick={() => back('/train')}>
          <Icon name="left" size={20} stroke={1.8} />
          Train
        </button>
        <div className="t15 q">This session isn't here any more.</div>
      </div>
    );
  }
  const plan = settings.plan;
  const def = plan ? findSession(plan, s.session) : undefined;
  const mine = sets.filter((x) => x.sessionId === s.id).sort((a, b) => a.at - b.at);
  const stats = sessionStats(mine, plan);
  const mins = Math.round(((s.endedAt ?? s.startedAt) - s.startedAt) / 60000);
  const same = doneSessions(sessions).filter((x) => x.session === s.session);
  const volumes = same.map((x) => ({ id: x.id, kg: sessionStats(sets.filter((y) => y.sessionId === x.id), plan).kg }));
  const rank = [...volumes].sort((a, b) => b.kg - a.kg).findIndex((v) => v.id === s.id) + 1;
  const avg = volumes.length > 1 ? volumes.filter((v) => v.id !== s.id).reduce((n, v) => n + v.kg, 0) / (volumes.length - 1) : undefined;

  const order: string[] = [];
  for (const x of mine) if (!order.includes(x.exerciseId)) order.push(x.exerciseId);
  const exRows = order.map((id) => {
    const xs = mine.filter((x) => x.exerciseId === id);
    return { id, sets: xs, mark: exerciseMark(xs), name: xs[0].exercise };
  });
  const beaten = exRows.filter((r) => r.mark).length;
  const flags = (s.flags ?? []).map((id) => plan?.flags.find((f) => f.id === id)?.label ?? id);
  const quirks = sessionQuirks(mine, plan);
  const day = days.find((d) => d.date === s.date);
  const prev = doneSessions(sessions).filter((x) => x.startedAt < s.startedAt).pop();
  const home = settings.homes.find((h) => h.id === day?.home)?.name;
  const hour = new Date(s.startedAt).getHours();
  const partOfDay = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 21 ? 'Evening' : 'Late night';
  const takeoff: [string, string][] = [
    ...(s.readiness !== undefined ? [[String(s.readiness), 'readiness'] as [string, string]] : []),
    ...(day?.sleep ? [[fmtDuration(sleepMinutes(day.sleep.asleep, day.sleep.woke)), day.sleep.rested ? `slept, rested ${day.sleep.rested}/5` : 'slept the night before'] as [string, string]] : []),
    [fmtTime(s.startedAt), partOfDay.toLowerCase() + (home ? ` · ${home}` : '')],
    ...(prev ? [[String(daysBetween(prev.date, s.date)), daysBetween(prev.date, s.date) === 1 ? 'day since the last session' : 'days since the last session'] as [string, string]] : []),
  ];

  const del = async () => {
    if (!(await askConfirm({ title: 'Delete this session?', body: 'All its sets go too. This cannot be undone.', yes: 'Delete', danger: true }))) return;
    await discardSession(s.id);
    toast({ text: 'Session deleted' });
    back('/train');
  };

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/train')}>
        <Icon name="left" size={20} stroke={1.8} />
        Train
      </button>
      <div className="col gap6">
        <div className="lbl">
          {fmtDayLong(s.date)} · {fmtTime(s.startedAt)}
          {s.endedAt ? `–${fmtTime(s.endedAt)}` : ''}
        </div>
        <h1 className="h1" style={{ fontSize: 34 }}>
          {def?.name ?? `Session ${s.session}`}
        </h1>
        <div className="t14 q">
          {def?.focus ? `${def.focus} · ` : ''}
          {mins} min{s.short ? ' · short session' : ''}
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <Stat n={fmtInt(stats.sets)} label="sets" />
        <Stat n={fmtInt(stats.reps)} label="reps" />
        <Stat n={fmtInt(stats.kg)} label="kg moved" />
        <Stat n={fmtInt(stats.records)} label={stats.records === 1 ? 'record' : 'records'} gold={stats.records > 0} />
      </div>

      <div className="card" style={{ gap: 12 }}>
        <div className="lbl">Conditions at take-off</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          {takeoff.map(([n, label]) => (
            <Stat key={label} n={n} label={label} small />
          ))}
        </div>
      </div>

      {(quirks.longestRest || quirks.fastestSuperset || quirks.tempo || quirks.mostReps) && (
        <div className="card" style={{ gap: 10 }}>
          <div className="lbl">Quirks</div>
          {quirks.longestRest && quirks.longestRest.ms > 0 && (
            <div className="row t15">
              <span>Longest rest</span>
              <span className="tn">
                {fmtGap(quirks.longestRest.ms)} <span className="q">before {lowerFirst(quirks.longestRest.before.exercise)}</span>
              </span>
            </div>
          )}
          {quirks.fastestSuperset && (
            <div className="row t15">
              <span>Fastest superset</span>
              <span className="tn">
                {fmtGap(quirks.fastestSuperset.ms)} <span className="q">{quirks.fastestSuperset.names.map(lowerFirst).join(' + ')}</span>
              </span>
            </div>
          )}
          {quirks.mostReps && (
            <div className="row t15">
              <span>Most reps in a set</span>
              <span className="tn">
                {quirks.mostReps.reps} <span className="q">{lowerFirst(quirks.mostReps.exercise)}</span>
              </span>
            </div>
          )}
          {quirks.tempo && (
            <div className="row t15">
              <span>Slow lowering</span>
              <span className="tn">
                {quirks.tempo.sets} sets <span className="q">· about {fmtGap(quirks.tempo.reps * 3000)} of it</span>
              </span>
            </div>
          )}
        </div>
      )}

      {same.length > 1 && (
        <div className="card" style={{ gap: 12 }}>
          <div className="lbl">How it compares</div>
          {avg !== undefined && avg > 0 && (
            <div className="row t15">
              <span>Volume vs your average {s.session}</span>
              <span className={stats.kg >= avg ? 'sage' : 'q'}>
                {stats.kg >= avg ? '+' : '−'}
                {Math.abs(Math.round(((stats.kg - avg) / avg) * 100))}%
              </span>
            </div>
          )}
          <div className="row t15">
            <span>
              Rank among {same.length} {def?.name ?? s.session}s
            </span>
            <span className="mono">#{rank}</span>
          </div>
          <div className="row t15">
            <span>Exercises beaten or matched</span>
            <span>
              {beaten} of {exRows.length}
            </span>
          </div>
        </div>
      )}

      <div className="card" style={{ gap: 0 }}>
        <div className="row base" style={{ paddingBottom: 8 }}>
          <div className="lbl">Exercise by exercise</div>
          <div className="t12 q mono">!! record · ! beat · = matched</div>
        </div>
        {exRows.map((r) => (
          <ExerciseLine key={r.id} name={r.name} sets={r.sets} mark={r.mark} unitHint={plan ? findExercise(plan, r.id)?.load : undefined} />
        ))}
      </div>

      <SessionClips sessionId={s.id} />

      {(flags.length > 0 || s.notes) && (
        <div className="card" style={{ gap: 8 }}>
          {flags.length > 0 && <div className="t14 apri lh">Flagged: {flags.join(', ')}.</div>}
          {s.notes && <div className="t14 q lh">{s.notes}</div>}
        </div>
      )}

      <button type="button" className="btn danger block" onClick={del}>
        Delete session
      </button>
    </div>
  );
}

function Stat({ n, label, gold, small }: { n: string; label: string; gold?: boolean; small?: boolean }) {
  return (
    <div className="col gap2">
      <b className="num" style={{ fontSize: small ? 24 : 30, color: gold ? 'var(--gold)' : undefined }}>
        {n}
      </b>
      <span className="t12 q">{label}</span>
    </div>
  );
}

function ExerciseLine({ name, sets, mark, unitHint }: { name: string; sets: SetEntry[]; mark?: string; unitHint?: string }) {
  const kg = sets.find((s) => s.loadKg !== null && !s.drop)?.loadKg;
  const sided = sets.some((s) => s.side !== 'both');
  const tempo = sets.some((s) => s.tempo);
  const vals = sets.filter((s) => !s.drop).map((s) => s.reps ?? s.seconds ?? 0);
  const sub = [
    kg !== undefined && kg !== null ? `${fmtKg(kg)} kg` : unitHint === 'band' ? sets[0].band?.toLowerCase() ?? 'band' : 'bodyweight',
    sided ? 'each side' : '',
    tempo ? '3-second lowering' : '',
    sets.some((s) => s.seconds !== undefined) ? 'seconds' : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '30px minmax(0,1fr) auto', gap: 10, alignItems: 'baseline', padding: '11px 0', borderTop: '1px solid var(--divider)' }}>
      <span className="mono t14" style={{ fontWeight: 500, color: mark === '!!' ? 'var(--gold)' : mark === '!' ? 'var(--sage)' : 'var(--quiet)' }}>
        {mark ?? ''}
      </span>
      <div className="col gap2">
        <b style={{ fontWeight: 400, fontSize: 15 }}>{name}</b>
        <span className="t12 q">{sub}</span>
      </div>
      <span className="mono t13 right" style={{ color: 'var(--voice)' }}>
        {vals.join(' · ')}
      </span>
    </div>
  );
}
