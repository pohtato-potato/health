import { useState } from 'react';
import { addDays, daysBetween } from '../domain/dates';
import { fmtDayMonth, fmtInt, weekdayName } from '../domain/format';
import { fmtKg } from '../domain/loads';
import { findSession, realSets } from '../domain/plan';
import { recordShot } from '../domain/strengthForecast';
import { songAt } from '../sources/lastfm';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { SetEntry } from '../domain/types';
import { useActiveSession, useAllDays, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import { go, openSheet } from '../router';
import { Icon } from '../ui/Icon';
import { doneSessions, nextUp, triggersMet, weeksFor } from '../state/derived';
import { NextUpCard } from './NextUpCard';
import { sessionStats } from './SessionDone';
import { MuscleCard } from './MuscleMap';
import { deloadCase } from '../domain/deload';
import { placeFor } from '../domain/places';
import { TRIP_SESSION_ID } from '../domain/trip';
import { patchSettings } from '../db/actions';

export function Train() {
  const settings = useSettings();
  const today = useToday();
  const sessions = useSessions();
  const sets = useAllSets();
  const days = useAllDays();
  const active = useActiveSession();
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
  const triggers = triggersMet(plan, sets);
  const lighter = deloadCase(sessions, today, settings.lighterWeek?.to);
  const lighterOn = !!settings.lighterWeek && today >= settings.lighterWeek.from && today <= settings.lighterWeek.to;
  const todayDay = days.find((d) => d.date === today);
  const isTripDay = placeFor(todayDay, settings).kind === 'trip' || todayDay?.status === 'travelling';

  return (
    <div className="page">
      <div className="row base">
        <h1 className="h1">Train</h1>
        <span className="row" style={{ gap: 6 }} aria-label={`${Math.min(weeks.thisWeek, weeks.perWeek)} of ${weeks.perWeek} sessions this week`}>
          {Array.from({ length: weeks.perWeek }, (_, i) => (
            <i key={i} className={`wk-dot${i < weeks.thisWeek ? ' on' : ''}`} />
          ))}
          <span className="t13 q" style={{ marginLeft: 4 }}>
            {Math.min(weeks.thisWeek, weeks.perWeek)} of {weeks.perWeek}
          </span>
        </span>
      </div>

      {triggers.map((t) => (
        <div key={t.id} className="card gold">
          <div className="lbl gold">{t.title}</div>
          <div className="t15 lh">{t.message}</div>
        </div>
      ))}

      {active || trainedToday.length || !up ? (
        <NextUpCard settings={settings} up={up} active={active} trainedToday={trainedToday} weeks={weeks} />
      ) : (
        (() => {
          const next = findSession(plan, up.sessionId);
          const names = up.exercises.map((e) => e.status.name);
          const shot = up.exercises.map((e) => recordShot({ id: e.id, name: e.status.name }, sets)).find((x): x is string => !!x);
          const heavier = up.exercises.filter((e) => e.status.advice && e.status.advice.kind !== 'maxed').length;
          return (
            <div className="card" style={{ gap: 12 }}>
              <div className="row top">
                <span className="col gap2">
                  <span className="serif" style={{ fontSize: 24, fontWeight: 600 }}>
                    {next?.name ?? `Session ${up.sessionId}`}
                  </span>
                  <span className="t13 q">
                    {next?.focus} · {names.length} exercises
                  </span>
                </span>
                {(shot || heavier > 0) && (
                  <span className="t13 gold right" style={{ maxWidth: 120, lineHeight: 1.3 }}>
                    {shot ? shot.charAt(0).toUpperCase() + shot.slice(1) : `${heavier} ready to go heavier`}
                  </span>
                )}
              </div>
              <div className="row wrap" style={{ gap: 6, justifyContent: 'flex-start' }}>
                {names.slice(0, 3).map((n) => (
                  <span key={n} className="chip sm static">
                    {n}
                  </span>
                ))}
                {names.length > 3 && <span className="chip sm static q">+{names.length - 3}</span>}
              </div>
              {up.swaps.length > 0 && <div className="t13 apri lh">{up.swaps.length} swapped out for a joint flag.</div>}
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn grow" onClick={() => go('/session', { start: up.sessionId })}>
                  Start · {next?.minutes ?? 60} min
                </button>
                <button type="button" className="btn ghost" onClick={() => openSheet('short', { session: up.sessionId })}>
                  <Icon name="clock" size={16} /> 30 min
                </button>
              </div>
              {isTripDay && (
                <button type="button" className="chip sm" style={{ alignSelf: 'flex-start' }} onClick={() => go('/session', { start: TRIP_SESSION_ID })}>
                  Trip workout instead
                </button>
              )}
            </div>
          );
        })()
      )}

      {lighterOn ? (
        <div className="card">
          <div className="lbl blue">Lighter week</div>
          <div className="t15 lh">One set fewer per exercise, same weights, until {fmtDayMonth(settings.lighterWeek!.to)}.</div>
        </div>
      ) : (
        lighter.due &&
        (!settings.lighterDismissed || daysBetween(settings.lighterDismissed, today) >= 7) && (
          <div className="card">
            <div className="lbl blue">A lighter week?</div>
            {lighter.evidence.map((e) => (
              <div key={e} className="t14 lh">
                {e}
              </div>
            ))}
            <div className="t13 q lh">Fewer sets at the same weights for a week. Your call.</div>
            <div className="row" style={{ gap: 10 }}>
              <button type="button" className="btn ghost grow" onClick={() => patchSettings({ lighterDismissed: today })}>
                Not now
              </button>
              <button type="button" className="btn grow" onClick={() => patchSettings({ lighterWeek: { from: today, to: addDays(today, 6) } })}>
                Take it
              </button>
            </div>
          </div>
        )
      )}

      <MuscleCard sets={sets} plan={plan} today={today} />

      <RecordsCard sets={sets} />

      <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onClick={() => go('/plan')}>
        <span className="col gap2 grow" style={{ textAlign: 'left' }}>
          <span className="t16">The plan</span>
          <span className="t13 q">
            {plan.name} · {plan.sessions.map((x) => `${x.id}: ${x.exercises.length} exercises`).join(' · ')}
          </span>
        </span>
        <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
      </button>

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
                      {mins} min · {st.sets} set{st.sets === 1 ? '' : 's'}{st.kg ? ` · ${fmtInt(st.kg)} kg moved` : ''}
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

const MEDAL_INK = ['var(--gold)', '#c9ccd6', '#d39a6a'];

/** Records (s7): the three latest, as gold, silver and bronze, and the song the newest was set to. */
function RecordsCard({ sets }: { sets: SetEntry[] }) {
  const songs = useLiveQuery(() => db.songs.toArray(), []) ?? [];
  const seen = new Set<string>();
  const recs = realSets(sets)
    .filter((x) => x.mark === '!!')
    .sort((x, y) => y.at - x.at)
    .filter((x) => !seen.has(x.exerciseId) && seen.add(x.exerciseId))
    .slice(0, 3);
  if (!recs.length) return null;
  const song = songAt(recs[0].at, songs);
  return (
    <div className="card" style={{ gap: 12 }}>
      <div className="row base">
        <span className="lbl">Records</span>
        <button type="button" className="link t13" style={{ minHeight: 32 }} onClick={() => go('/records')}>
          All ›
        </button>
      </div>
      <div className="grid3">
        {recs.map((r, i) => (
          <span key={r.id} className="rec-medal" style={{ ['--medal' as string]: MEDAL_INK[i] }}>
            <b className="serif tn">{r.reps ?? r.seconds ?? r.steps}</b>
            <span className="t12">{r.exercise}</span>
            <span className="t12 q">{r.loadKg ? `${fmtKg(r.loadKg)} kg` : 'bodyweight'}</span>
          </span>
        ))}
      </div>
      {song && (
        <div className="t13 q lh">
          {recs[0].exercise} {recs[0].reps}, set to <span style={{ color: 'var(--text)' }}>{song.track}</span>
        </div>
      )}
    </div>
  );
}
