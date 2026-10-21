import { addDays, daysBetween } from '../domain/dates';
import { fmtDayMonth, fmtInt, weekdayName } from '../domain/format';
import { fmtKg } from '../domain/loads';
import { buildSession, extraSessions, findSession, realSets, valueOfSet } from '../domain/plan';
import { removeExercise } from '../domain/planEdit';
import { loggedLater, neglectedExercises, suspiciousSets } from '../domain/trainingChecks';
import { askConfirm } from '../ui/Confirm';
import type { SetEntry, Settings, TrainingSession } from '../domain/types';
import { useActiveSession, useAllDays, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import { go, openSheet } from '../router';
import { doneSessions, nextUp, triggersMet, weeksFor } from '../state/derived';
import { NextUpCard } from './NextUpCard';
import { sessionStats } from './SessionDone';
import { deloadCase } from '../domain/deload';
import { placeFor } from '../domain/places';
import { TRIP_SESSION_ID } from '../domain/trip';
import { markSetsSkipped, patchSettings } from '../db/actions';
import { batteryMode } from '../domain/rest';
import { loadBlocks, plateChanges, usualLength } from '../domain/sessionEdges';
import { formFocus, fourWeeksAgo, heroFor, monthSoFar, tonight, trainGlow, volumeLine, weekVolume } from '../domain/trainView';
import { useBatteryLevel } from '../ui/RestScreen';
import { Aurora } from '../ui/live/Aurora';
import { TonightCard, UpNextCard } from './train/Cards';
import { BodyCard, FourWeeksCard, MonthCard, PlanCard, RecentCard, RecordsCard } from './train/Sections';

export function Train() {
  const settings = useSettings();
  const today = useToday();
  const sessions = useSessions();
  const sets = useAllSets();
  const days = useAllDays();
  const active = useActiveSession();
  const level = useBatteryLevel();
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

  const saver = batteryMode(level, !!settings.prefs.batterySaver);
  const up = nextUp(settings, sessions, sets, days);
  const weeks = weeksFor(settings, sessions, today, days);
  const done = doneSessions(sessions);
  const trainedToday = done.filter((s) => s.date === today);
  const triggers = triggersMet(plan, sets);
  const lighter = deloadCase(sessions, today, settings.lighterWeek?.to);
  const lighterOn = !!settings.lighterWeek && today >= settings.lighterWeek.from && today <= settings.lighterWeek.to;
  const todayDay = days.find((d) => d.date === today);
  const isTripDay = placeFor(todayDay, settings).kind === 'trip' || todayDay?.status === 'travelling';
  const tn = active ? undefined : tonight(sessions, sets, today);
  const next = up ? findSession(plan, up.sessionId) : undefined;
  const hero = heroFor({ active: !!active, tonight: !!tn, trainedToday: trainedToday.length > 0, up: !!up });
  const nameOf = (id: string) => findSession(plan, id)?.name ?? `Session ${id}`;
  const focusId = tn?.session.session ?? up?.sessionId;
  const four = focusId ? fourWeeksAgo(sessions, sets, focusId, today) : undefined;
  const volume = weekVolume(sets, plan, today);
  const month = monthSoFar(sessions, sets, today);
  const d = new Date(`${today}T12:00:00`);
  const monthName = d.toLocaleString('en-IN', { month: 'long' });
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleString('en-IN', { month: 'short' });
  const seen = new Set<string>();
  const allRecords = realSets(sets).filter((x) => x.mark === '!!');
  const recs = [...allRecords]
    .sort((x, y) => y.at - x.at)
    .filter((x) => !seen.has(x.exerciseId) && seen.add(x.exerciseId))
    .slice(0, 3);
  const fmtSet = (s: SetEntry) => `${s.loadKg !== null ? `${fmtKg(s.loadKg)} kg × ` : ''}${valueOfSet(s) ?? 0}${s.seconds !== undefined && s.reps === undefined ? ' s' : ''}`;

  return (
    <div className={`page lv lv-tab st-${trainGlow(tn && { records: tn.records.length, checks: tn.checks, formAvg: tn.formAvg })}${saver ? ' saver' : ''}`}>
      <Aurora still={saver} />
      <div className="lv-tr-head">
        <h1 className="lv-h1">Train</h1>
        <div className="lv-tr-week" aria-label={`${Math.min(weeks.thisWeek, weeks.perWeek)} of ${weeks.perWeek} sessions this week`}>
          {Array.from({ length: weeks.perWeek }, (_, i) => (
            <i key={i} className={i < weeks.thisWeek ? 'on' : ''} />
          ))}
          <span>
            {Math.min(weeks.thisWeek, weeks.perWeek)} of {weeks.perWeek} this week
          </span>
        </div>
      </div>

      {triggers.map((t) => (
        <div key={t.id} className="lv-card gold">
          <div className="lv-kicker gold">{t.title}</div>
          <div className="lv-small">{t.message}</div>
        </div>
      ))}

      {hero === 'resume' || hero === 'nextup' ? (
        <NextUpCard settings={settings} up={up} active={active} trainedToday={trainedToday} weeks={weeks} />
      ) : hero === 'tonight' && tn ? (
        <TonightCard
          name={nameOf(tn.session.session)}
          records={tn.records.map((r) => `${r.exercise} ${fmtSet(r)}`)}
          mins={tn.mins}
          later={tn.later}
          sets={tn.sets}
          liftMin={tn.liftMin}
          quality={tn.quality}
          checks={tn.checks}
          next={up ? `Next is ${nameOf(up.sessionId)}.` : undefined}
          onReplay={() => go('/session/replay', { id: tn.session.id })}
        />
      ) : (
        up &&
        (() => {
          // As the session will build it, swaps in their slots.
          const exs = buildSession(plan, up.sessionId, { swaps: up.swaps });
          const kgOf = (ex: { id: string }) => up.exercises.find((e) => e.id === ex.id)?.status.loadKg ?? null;
          const blocks = loadBlocks(exs, kgOf);
          return (
            <UpNextCard
              name={next?.name ?? `Session ${up.sessionId}`}
              usual={usualLength(sessions, sets, up.sessionId, next?.minutes ?? 60)}
              changes={plateChanges(blocks)}
              heavier={up.exercises.filter((e) => e.status.advice && e.status.advice.kind !== 'maxed').length}
              focus={formFocus(sets, plan, up.sessionId)}
              blocks={blocks.map((b) => ({ kg: b.kg, items: b.exs.map((ex) => ({ name: up.exercises.find((e) => e.id === ex.id)?.status.name ?? ex.name, light: false })) }))}
              swaps={up.swaps.length}
              onStart={() => go('/session', { start: up.sessionId })}
              onShort={() => openSheet('short', { session: up.sessionId })}
              chips={[
                ...(isTripDay ? [{ label: 'Trip workout instead', onClick: () => go('/session', { start: TRIP_SESSION_ID }) }] : []),
                ...extraSessions(plan).map((x) => ({ label: `${x.name} tonight`, onClick: () => go('/session', { start: x.id }) })),
              ]}
              note={extraSessions(plan).length ? `An extra session counts toward the week; ${next?.name ?? `Session ${up.sessionId}`} stays next.` : undefined}
            />
          );
        })()
      )}

      {lighterOn ? (
        <div className="lv-card">
          <div className="lv-card-h">Lighter week</div>
          <div className="lv-small">One set fewer per exercise, same weights, until {fmtDayMonth(settings.lighterWeek!.to)}.</div>
        </div>
      ) : (
        lighter.due &&
        (!settings.lighterDismissed || daysBetween(settings.lighterDismissed, today) >= 7) && (
          <div className="lv-card">
            <div className="lv-card-h">A lighter week?</div>
            {lighter.evidence.map((e) => (
              <div key={e} className="lv-small">
                {e}
              </div>
            ))}
            <div className="lv-small">Fewer sets at the same weights for a week. Your call.</div>
            <div className="lv-actions">
              <button type="button" className="lv-ghost" onClick={() => patchSettings({ lighterDismissed: today })}>
                Not now
              </button>
              <button type="button" className="lv-primary" onClick={() => patchSettings({ lighterWeek: { from: today, to: addDays(today, 6) } })}>
                Take it
              </button>
            </div>
          </div>
        )
      )}

      <TidyCards settings={settings} sessions={sessions} sets={sets} />

      {four && focusId && <FourWeeksCard name={nameOf(focusId)} then={four.then} rows={four.rows} />}

      <BodyCard rows={volume} line={volumeLine(volume)} onOpen={() => go('/muscles')} />

      <RecordsCard total={allRecords.length} rows={recs.map((r) => ({ what: fmtSet(r), name: r.exercise, when: r.date === today ? 'tonight' : fmtDayMonth(r.date) }))} onAll={() => go('/records')} />

      <MonthCard month={monthName} next={`1 ${nextMonth}`} m={month} film={Number(today.slice(8)) <= 3} onFilm={() => go('/film')} />

      <RecentCard
        rows={[...done]
          .reverse()
          .slice(0, 6)
          .map((s) => {
            const mine = sets.filter((x) => x.sessionId === s.id);
            const st = sessionStats(mine, plan);
            const mins = Math.round(((s.endedAt ?? s.startedAt) - s.startedAt) / 60000);
            return {
              id: s.id,
              title: `${weekdayName(s.date)} · ${nameOf(s.session)}`,
              sub: `${loggedLater(mine) ? 'logged later' : `${mins} min`} · ${st.sets} set${st.sets === 1 ? '' : 's'}${st.kg ? ` · ${fmtInt(st.kg)} kg moved` : ''}${s.short ? ' · short' : ''}`,
              records: st.records,
            };
          })}
        onOpen={(id) => go('/session/view', { id })}
      />

      <PlanCard name={plan.name} sessions={plan.sessions.map((x) => x.id)} since={plan.from} warmup={plan.warmup} rules={plan.rules ?? []} onOpen={() => go('/plan')} />
    </div>
  );
}

/** Housekeeping the log needs: sets that look unfinished, and exercises that keep getting left out. */
function TidyCards({ settings, sessions, sets }: { settings: Settings; sessions: TrainingSession[]; sets: SetEntry[] }) {
  const plan = settings.plan!;
  const odd = suspiciousSets(sets, settings.keptSets);
  const left = neglectedExercises(plan, sessions, sets, 3, settings.neglectDismissed);
  if (!odd.length && !left.length) return null;
  const name = (id: string) => sets.find((s) => s.exerciseId === id)?.exercise ?? id;
  const lines = odd.slice(0, 8).map((s) => `${fmtDayMonth(s.date)}: ${name(s.exerciseId)} ${s.loadKg ? `${fmtKg(s.loadKg)} kg × ` : '× '}${valueOfSet(s) ?? 0}`);
  return (
    <>
      {odd.length > 0 && (
        <div className="lv-card">
          <div className="lbl">Sets that look unfinished</div>
          <div className="t14 lh">
            {odd.length} saved set{odd.length === 1 ? '' : 's'} look{odd.length === 1 ? 's' : ''} like a placeholder: 1 rep with no weight, or under a third of the sets around {odd.length === 1 ? 'it' : 'them'}. They count toward records and volume until skipped.
          </div>
          <div className="t13 q lh">{lines.join(' · ')}{odd.length > lines.length ? ` · and ${odd.length - lines.length} more` : ''}</div>
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn ghost grow" onClick={() => void patchSettings((s) => ({ keptSets: [...(s.keptSets ?? []), ...odd.map((x) => x.id)] }))}>
              They’re real
            </button>
            <button
              type="button"
              className="btn grow"
              onClick={async () => {
                if (await askConfirm({ title: `Mark ${odd.length} set${odd.length === 1 ? '' : 's'} skipped?`, body: 'They stay in the session as skipped and leave records, volume and progression.', yes: 'Mark skipped' })) await markSetsSkipped(odd.map((x) => x.id));
              }}
            >
              Mark skipped
            </button>
          </div>
        </div>
      )}
      {left.map((n) => {
        const flagged = plan.flags.some((f) => f.swap && (f.swap.from === n.exerciseId || f.swap.to === n.exerciseId));
        return (
          <div key={n.exerciseId} className="lv-card">
            <div className="lbl">Always skipped</div>
            <div className="t15 lh">
              {n.name} was left out of the last {n.missed} {findSession(plan, n.sessionId)?.name ?? n.sessionId} sessions. Move it, swap it, or drop it from the plan?
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              <button type="button" className="btn ghost grow" onClick={() => void patchSettings((s) => ({ neglectDismissed: { ...s.neglectDismissed, [n.exerciseId]: Date.now() } }))}>
                Keep it
              </button>
              <button type="button" className="btn ghost grow" onClick={() => go('/plan')}>
                Move or swap
              </button>
              {!flagged && (
                <button
                  type="button"
                  className="btn grow"
                  onClick={async () => {
                    if (!(await askConfirm({ title: `Drop ${n.name} from the plan?`, body: 'Its history stays. You can add it back in the plan editor.', yes: 'Drop it' }))) return;
                    await patchSettings((s) => (s.plan ? { plan: { ...s.plan, sessions: s.plan.sessions.map((x) => (x.id === n.sessionId ? removeExercise(x, n.exerciseId) : x)) } } : {}));
                  }}
                >
                  Drop it
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
