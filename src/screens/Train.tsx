import { useState } from 'react';
import { addDays, dayRange, weekStart } from '../domain/dates';
import { fmtInt, weekdayName } from '../domain/format';
import { fmtKg } from '../domain/loads';
import { exerciseName, findExercise, findSession, isSuperset, targetText } from '../domain/plan';
import { exerciseStatus } from '../domain/progression';
import { useActiveSession, useAllDays, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import { go } from '../router';
import { Icon } from '../ui/Icon';
import { doneSessions, nextUp, triggersMet, weeksFor } from '../state/derived';
import { NextUpCard } from './NextUpCard';
import { sessionStats } from './SessionDone';
import { trainingStreakLine } from '../domain/streaks';

export function Train() {
  const settings = useSettings();
  const today = useToday();
  const sessions = useSessions();
  const sets = useAllSets();
  const days = useAllDays();
  const active = useActiveSession();
  const [tab, setTab] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  if (!settings || !sessions || !sets || !days || active === undefined) return <div className="page" />;

  const plan = settings.plan;
  if (!plan) {
    return (
      <div className="page">
        <h1 className="h1">Train</h1>
        <NextUpCard settings={settings} up={undefined} active={null} trainedToday={[]} weeks={{ thisWeek: 0, perWeek: 4 }} />
      </div>
    );
  }

  const up = nextUp(settings, sessions, sets, days);
  const weeks = weeksFor(settings, sessions, today, days);
  const done = doneSessions(sessions);
  const trainedToday = done.filter((s) => s.date === today);
  const ws = weekStart(today);
  const week = dayRange(ws, addDays(ws, 6));
  const shown = tab ?? up?.sessionId ?? plan.rotation[0];
  const def = findSession(plan, shown);
  const ready = up?.exercises.filter((e) => e.status.advice) ?? [];
  const triggers = triggersMet(plan, sets);
  const short = def ? def.short.map((id) => findExercise(plan, id)?.name).filter(Boolean) : [];

  return (
    <div className="page">
      <div className="row">
        <h1 className="h1">Train</h1>
        <div className="t13 q">{plan.name}</div>
      </div>

      <div className="card" style={{ gap: 14 }}>
        <div className="week7" style={{ gap: 4 }}>
          {week.map((d) => {
            const s = done.find((x) => x.date === d);
            const isToday = d === today;
            return (
              <div key={d} className="wk">
                <b style={isToday ? { color: 'var(--text)', fontWeight: 600 } : undefined}>{weekdayName(d).charAt(0)}</b>
                <div className={`dot${s ? ' done' : isToday && up ? ' next' : ''}`}>{s ? s.session : isToday && up && !active ? up.sessionId : ''}</div>
              </div>
            );
          })}
        </div>
        <div className="row t13 q">
          <span>
            {trainingStreakLine({ ...weeks, thisWeek: Math.min(weeks.thisWeek, weeks.perWeek) }, weeks.perWeek)}
            {!trainedToday.length && up && weeks.thisWeek < weeks.perWeek ? ` · ${up.sessionId} today makes ${weeks.thisWeek + 1}` : ''}
          </span>
        </div>
      </div>

      {triggers.map((t) => (
        <div key={t.id} className="card gold">
          <div className="lbl gold">{t.title}</div>
          <div className="t15 lh">{t.message}</div>
        </div>
      ))}

      <NextUpCard settings={settings} up={up} active={active} trainedToday={trainedToday} weeks={weeks} />
      {!active && !trainedToday.length && short.length > 0 && (
        <div className="t13 q lh" style={{ marginTop: -6, padding: '0 4px' }}>
          Short on time: {short.join(' · ')}.{' '}
          {up?.swaps.length ? '' : plan.flags.some((f) => f.swap) ? 'No joints flagged, so the full list stays in.' : ''}
        </div>
      )}

      {ready.length > 0 && (
        <div className="card gold">
          <div className="lbl gold">Ready to go heavier</div>
          {ready.map((e, i) => (
            <div key={e.id} className="col gap12">
              {i > 0 && <div className="gold-rule" />}
              <div className="col gap4">
                <div className="t16">{e.status.name}</div>
                <div className="t14 lh gold-text">{e.status.advice!.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ paddingTop: 6 }}>
        <div className="lbl">The plan</div>
        <div className="seg" style={{ gridAutoColumns: '52px' }}>
          {plan.sessions.map((s) => (
            <button key={s.id} type="button" className={s.id === shown ? 'on' : undefined} onClick={() => setTab(s.id)} style={{ height: 36, fontSize: 14 }}>
              {s.id}
            </button>
          ))}
        </div>
      </div>

      {def && (
        <div className="panel">
          <div className="ex" style={{ borderTop: 0, paddingTop: 14, paddingBottom: 6 }}>
            <div className="nm">
              <b className="sf" style={{ fontSize: 18 }}>
                {def.name}
              </b>
              <span>
                {def.focus} · about {def.minutes} min
              </span>
            </div>
          </div>
          {def.exercises.map((ex) => {
            const st = exerciseStatus(ex, settings.planState, settings.equipment, sets, plan.bigJump ?? 0.25);
            const tags = [ex.load === 'single' ? 'one dumbbell' : '', isSuperset(ex) ? 'superset' : '', ex.lead ? `${ex.lead === 'L' ? 'left' : 'right'} first` : '', ex.stopFlag ? 'stop at pain' : '']
              .filter(Boolean)
              .join(' · ');
            const load = ex.load === 'band' ? st.band ?? 'Band' : st.loadKg !== null ? `${fmtKg(st.loadKg)} kg` : 'Body';
            const heavier = st.advice && st.advice.kind !== 'maxed';
            return (
              <div key={ex.id} className="ex">
                <span className="o">{ex.order}</span>
                <div className="nm">
                  <b>{exerciseName(ex, settings.planState)}</b>
                  <span>
                    {targetText(ex)}
                    {tags ? ` · ${tags}` : ''}
                  </span>
                </div>
                <span className={`ld${heavier ? ' gold' : st.loadKg === null && ex.load !== 'band' ? ' q' : ''}`}>
                  {load}
                  {heavier ? ' ↑' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {(plan.warmup || plan.rules?.length) && (
        <div className="card" style={{ gap: 10 }}>
          <button type="button" className="row" onClick={() => setShowRules(!showRules)} aria-expanded={showRules}>
            <span className="lbl">Warm-up and rules</span>
            <Icon name={showRules ? 'up' : 'down'} size={16} stroke={1.8} color="var(--dim)" />
          </button>
          {showRules && (
            <div className="col gap10 t14 lh">
              {plan.warmup && (
                <div>
                  <b style={{ fontWeight: 500 }}>Warm-up.</b> <span className="q">{plan.warmup}</span>
                </div>
              )}
              {plan.rules?.map((r) => (
                <div key={r.title}>
                  <b style={{ fontWeight: 500 }}>{r.title}.</b> <span className="q">{r.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {done.length > 0 && (
        <div className="card" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            Recent sessions
          </div>
          {[...done]
            .reverse()
            .slice(0, 6)
            .map((s) => {
              const mine = sets.filter((x) => x.sessionId === s.id);
              const st = sessionStats(mine, plan);
              const mins = Math.round(((s.endedAt ?? s.startedAt) - s.startedAt) / 60000);
              return (
                <button key={s.id} type="button" className="sess" onClick={() => go('/session/view', { id: s.id })}>
                  <span className="col gap2 t15">
                    {weekdayName(s.date)} · {findSession(plan, s.session)?.name ?? s.session}
                    <span className="t12 q">
                      {mins} min · {st.sets} sets{st.kg ? ` · ${fmtInt(st.kg)} kg moved` : ''}
                      {s.short ? ' · short' : ''}
                    </span>
                  </span>
                  <span className={`t12 ${st.records ? 'gold' : 'q'}`}>{st.records ? `${st.records} record${st.records === 1 ? '' : 's'} ›` : '›'}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
