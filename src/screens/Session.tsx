import { useEffect, useRef } from 'react';
import { lowerFirst } from '../domain/format';
import { chipLoads, fmtKg } from '../domain/loads';
import { findLogged, SetTable } from './session/SetTable';
import { HeavierMoment } from './session/HeavierMoment';
import { useRunner } from './session/useRunner';
import { LiveSession } from './live/LiveSession';
import { cueFor } from '../domain/quality';
import {
  allExercises,
  bottomOfRange,
  buildSession,
  findExercise,
  isSuperset,
  measureOf,
  sidesFor,
  valueOfSet,
  targetText,
  topOfRange,
  type ExerciseDef,
  type PlanDef,
} from '../domain/plan';
import { movementKind } from '../domain/trainingChecks';
import { adviceTonight, exerciseStatus, ladder, loadTonight } from '../domain/progression';
import type { SetEntry, Settings, TrainingSession } from '../domain/types';
import { bump, patchSession, patchSettings, startSession } from '../db/actions';
import { APP_START } from '../appStart';
import { setRestRunning } from '../state/restState';
import { useActiveSession, useAllDays, useAllSets, useAllSetsWithSkips, useSessions, useSettings } from '../db/hooks';
import { dayKey } from '../domain/dates';
import { readinessFor } from '../state/readinessFor';
import { go, useRoute } from '../router';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { flagEvents, nextUp, pendingSwaps } from '../state/derived';
import { clock } from './NextUpCard';
import { TempoCoach } from '../ui/TempoCoach';
import { RestPill } from '../ui/RestPill';
import { RestScreen } from '../ui/RestScreen';
import { prefOn } from '../domain/types';
import { askConfirm } from '../ui/Confirm';
import { withTrip } from '../domain/trip';
import { readinessToStore } from '../domain/readiness';

export function SessionScreen() {
  const { params } = useRoute();
  const settings = useSettings();
  const active = useActiveSession();
  const sessions = useSessions();
  const sets = useAllSets();
  const withSkips = useAllSetsWithSkips();
  const days = useAllDays();
  const starting = useRef(false);
  const start = params.get('start');
  const only = params.get('only')?.split(',').filter(Boolean);
  const short = params.get('short') === '1' || !!only;

  useEffect(() => {
    if (!settings || active === undefined || !sessions || !sets || !days || starting.current) return;
    if (active) {
      if (start) go('/session', undefined, { replace: true });
      return;
    }
    const plan = settings.plan ? withTrip(settings.plan) : undefined;
    if (!start || !plan) {
      go('/train', undefined, { replace: true });
      return;
    }
    starting.current = true;
    const sessionId = start === 'next' ? nextUp(settings, sessions, sets, days)?.sessionId ?? plan.rotation[0] : start;
    const swaps = pendingSwaps(plan, sessions, days).filter((s) => s.flag.swap?.session === sessionId);
    const today = dayKey();
    const exs = buildSession(plan, sessionId, { short: short && !only, swaps }).filter((e) => !only || only.includes(e.id));
    const lighter = !!settings.lighterWeek && today >= settings.lighterWeek.from && today <= settings.lighterWeek.to;
    const tempo = Object.fromEntries(exs.map((ex) => [ex.id, exerciseStatus(ex, settings.planState, settings.equipment, sets, plan.bigJump).tempo]));
    const ready = readinessFor(settings, today, days, sessions, sets, flagEvents(plan, sessions, days).map((e) => e.date));
    void startSession({
      session: sessionId,
      planName: plan.name,
      exercises: exs.map((e) => e.id),
      short,
      swaps: swaps.map(({ from, to, reason }) => ({ from, to, reason })),
      tempo,
      ...readinessToStore(ready),
      lighter }).then(() => {
      starting.current = false;
      if (Date.now() - APP_START < 60_000) void bump('leeroy');
      go('/session', undefined, { replace: true });
    });
  }, [settings, active, sessions, sets, days, start, short]);

  if (!settings?.plan || !active || !sets || !withSkips) return <div className="page bare" />;
  return <Runner session={active} settings={settings} plan={withTrip(settings.plan)} allSets={withSkips} />;
}

const valueOf = valueOfSet;

function Runner({ session, settings, plan, allSets }: { session: TrainingSession; settings: Settings; plan: PlanDef; allSets: SetEntry[] }) {
  const r = useRunner(session, settings, plan, allSets);
  if (session.view !== 'list') return <LiveSession r={r} session={session} settings={settings} plan={plan} />;
  const { toast, now, exs, groups, mine, history, statuses, extra, setExtra, complete, gi, setGi, editing, setEditing, draft, setDraft, rest, restHidden, setRestHidden, saver, watch, setWatch, swapFor, setSwapFor, coach, setCoach, group, rows, current, activeKey, extendRest, stopRest, defaults, kgEditable, save, skip, undoSkip, remove, toggleTempo, finish, def, firstIdx, restLeft, nextGroup, groupDone, tired, offerFor, answer } = r;

  return (
    <div className={`page bare${saver ? ' saver' : ''}`} style={{ gap: 16, paddingTop: 'calc(14px + var(--safe-top))' }}>
      <div className="row">
        <button type="button" className="icon-btn" aria-label="Minimise session" onClick={() => go('/today')}>
          <Icon name="down" size={22} />
        </button>
        <div className="col" style={{ alignItems: 'center', gap: 2 }}>
          <div className="lbl">
            {def?.name ?? `Session ${session.session}`}
            {session.short ? ' · short' : ''}
          </div>
          <div className="t15 tn">{clock(now - session.startedAt)}</div>
        </div>
        <span className="row" style={{ gap: 4 }}>
          <button type="button" className="chip sm" onClick={() => patchSession(session.id, { view: 'live' })}>
            Live
          </button>
          <button type="button" style={{ height: 44, padding: '0 6px', fontSize: 15, fontWeight: 600 }} onClick={finish}>
            Finish
          </button>
        </span>
      </div>

      <div className="segs" role="tablist" aria-label="Exercises">
        {groups.map((g, i) => (
          <button
            key={g[0].id}
            type="button"
            role="tab"
            aria-selected={i === gi}
            aria-label={g.map((e) => statuses.get(e.id)?.name).join(' + ')}
            style={{ padding: '8px 0' }}
            onClick={() => {
              setGi(i);
              setEditing(null);
            }}
          >
            <i className={complete(i) ? 'done' : i === gi ? 'cur' : ''} style={{ display: 'block' }} />
          </button>
        ))}
      </div>

      {offerFor?.offer && (
        <HeavierMoment exercise={statuses.get(offerFor.ex.id)!.name} offer={offerFor.offer} onYes={() => answer(offerFor.ex.id, 'yes')} onNo={() => answer(offerFor.ex.id, 'no')} />
      )}

      {gi === 0 && session.swapped?.length ? (
        <div className="t13 apri lh">
          {session.swapped.map((s) => `${findExercise(plan, s.from)?.name ?? s.from} is out tonight (${s.reason.toLowerCase()}).`).join(' ')}
        </div>
      ) : null}

      {group.map((ex, k) => {
        const st = statuses.get(ex.id)!;
        const exRows = rows.filter((r) => r.ex.id === ex.id);
        const flag = ex.stopFlag ? plan.flags.find((f) => f.id === ex.stopFlag) : undefined;
        return (
          <div key={ex.id} id={`ex-${ex.id}`} className="col gap12">
            <div className="col gap6">
              <div className="t13 q">
                Exercise {firstIdx + k + 1} of {exs.length}
                {isSuperset(ex) && group.length > 1 ? ` · superset ${ex.order}` : ''}
              </div>
              <div className="sf" style={{ fontSize: group.length > 1 ? 26 : 32, lineHeight: 1.1 }}>
                {st.name}
              </div>
              <div className="t14 q">
                {targetText(ex)}
                {ex.load === 'single' ? ' · one dumbbell' : ''}
                {loadTonight(st, session.heavier?.[ex.id]) !== null && ex.load !== 'band' ? ` · ${fmtKg(loadTonight(st, session.heavier?.[ex.id])!)} kg` : ''}
                {st.band ? ` · ${st.band.toLowerCase()}` : ''}
              </div>
              {(() => {
                const l = ladder(ex, history);
                return l.rungs.length > 1 && l.rungs.some((x) => x.done) ? (
                  <div className="ladder" aria-label={`Rep ladder at ${l.load ?? 'bodyweight'}: ${l.rungs.filter((x) => x.done).length} of ${l.rungs.length} rungs`}>
                    {l.rungs.map((x) => (
                      <span key={x.reps} className={x.done ? 'done' : ''}>
                        {x.reps}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}
              {ex.note && <div className="t13 d lh">{ex.note}</div>}
            </div>

            {st.advice && (
              <div className="col gap4" style={{ padding: '12px 16px', border: '1px solid var(--gold-border)', borderRadius: 16, background: 'var(--gold-bg)' }}>
                <div className="lbl sm gold">{st.advice.title}</div>
                <div className="t14 lh">{adviceTonight(st, session.heavier?.[ex.id])}</div>
                {st.advice.toVariant !== undefined && (
                  <button
                    type="button"
                    className="btn sm"
                    style={{ alignSelf: 'flex-start', marginTop: 6 }}
                    onClick={() => patchSettings((s) => ({ planState: { ...s.planState, variants: { ...s.planState.variants, [ex.id]: st.advice!.toVariant! } } }))}
                  >
                    Switch now
                  </button>
                )}
                {st.advice.toBand !== undefined && (
                  <button
                    type="button"
                    className="btn sm"
                    style={{ alignSelf: 'flex-start', marginTop: 6 }}
                    onClick={() => patchSettings((s) => ({ planState: { ...s.planState, band: { ...s.planState.band, [ex.id]: st.advice!.toBand! } } }))}
                  >
                    Move up a band
                  </button>
                )}
              </div>
            )}

            <div className="row" style={{ gap: 8, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              {ex.load !== 'band' && (
                <button type="button" className={`tool${session.tempo?.[ex.id] ? ' on' : ''}`} onClick={() => toggleTempo(ex.id)} aria-pressed={!!session.tempo?.[ex.id]}>
                  <Icon name="tempo" size={16} stroke={1.8} />
                  Tempo 3 s · {session.tempo?.[ex.id] ? 'on' : 'off'}
                </button>
              )}
              {session.tempo?.[ex.id] && prefOn(settings.prefs, 'tempoCoach') && measureOf(ex) === 'reps' && (
                <button type="button" className={`tool${coach === ex.id ? ' on' : ''}`} onClick={() => setCoach(coach === ex.id ? null : ex.id)} aria-pressed={coach === ex.id}>
                  <Icon name="stopwatch" size={16} stroke={1.8} />
                  Coach
                </button>
              )}
              <button type="button" className={`tool${tired ? ' on' : ''}`} aria-pressed={tired} onClick={() => patchSession(session.id, { tiredHands: !tired })}>
                <Icon name="steps" size={16} stroke={1.8} />
                Tired hands · {tired ? 'on' : 'off'}
              </button>
              <button type="button" className="tool" onClick={() => setSwapFor(ex.id)}>
                <Icon name="swap" size={16} stroke={1.8} />
                Swap
              </button>
              {flag && (
                <button
                  type="button"
                  className="tool"
                  style={{ borderColor: '#5a3530', color: '#e38a7c' }}
                  onClick={async () => {
                    await patchSession(session.id, { flags: Array.from(new Set([...(session.flags ?? []), flag.id])) });
                    toast({ kicker: `${flag.group} flagged`, text: `${st.name} stopped. Move on to the next exercise.`, sub: flag.advice });
                  }}
                >
                  Stop: {flag.label.split(':')[0].toLowerCase()}
                </button>
              )}
            </div>

            {ex.perSide && !ex.lead && !mine.some((m) => m.exerciseId === ex.id) && (
              <div className="row" style={{ gap: 8, justifyContent: 'flex-start' }} role="radiogroup" aria-label="First side">
                <span className="t13 q">Start with</span>
                {(['L', 'R'] as const).map((side) => {
                  const on = sidesFor(ex, session.firstSide?.[ex.id])[0] === side;
                  return (
                    <button key={side} type="button" role="radio" aria-checked={on} className={`chip sm${on ? ' on' : ''}`} onClick={() => patchSession(session.id, { firstSide: { ...session.firstSide, [ex.id]: side } })}>
                      {side === 'L' ? 'Left' : 'Right'}
                    </button>
                  );
                })}
              </div>
            )}

            {coach === ex.id && <TempoCoach key={current?.key ?? ex.id} reps={topOfRange(ex) ?? bottomOfRange(ex) ?? 10} vibrate={settings.prefs.buzz} onStop={() => setCoach(null)} />}

            {(() => {
              const cue = cueFor(ex, history.filter((h) => h.exerciseId === ex.id));
              return (
                <div className="cue">
                  {cue && <span className="lbl sm gold">Your cue</span>}
                  {cue && <span className="t15 lh">{cue}</span>}
                  <button type="button" className="link t13" style={{ alignSelf: 'flex-start', minHeight: 32 }} onClick={() => go('/guide', { ex: ex.id })}>
                    The full guide
                  </button>
                </div>
              );
            })()}
            <SetTable
              ex={ex}
              st={st}
              rows={exRows}
              mine={mine}
              activeKey={activeKey}
              draft={draft}
              setDraft={setDraft}
              editing={editing}
              setEditing={(key) => {
                setEditing(key);
                const r = exRows.find((x) => x.key === key);
                const s = r && findLogged(mine, r);
                setDraft(s ? { kg: s.loadKg?.toString(), val: valueOf(s)?.toString(), form: s.form, clean: s.cleanReps, rir: s.rir, challenges: s.challenges, faults: s.faults, discomfort: s.discomfort === 'knee' || s.discomfort === 'wrist' ? s.discomfort : undefined } : {});
              }}
              defaults={defaults}
              kgEditable={kgEditable}
              onSave={save}
              onRemove={remove}
              onSkip={skip}
              onUndoSkip={undoSkip}
              watch={watch}
              setWatch={setWatch}
              now={now}
              chips={ex.load === 'pair' || ex.load === 'single' ? chipLoads(settings.equipment, ex.load) : ex.load === 'body' ? chipLoads(settings.equipment, ex.thenLoad?.load ?? 'pair') : []}
              tired={tired}
              turnSteps={settings.turnSteps}
            />
            <button type="button" className="link" style={{ alignSelf: 'flex-start', minHeight: 32, marginTop: -6 }} onClick={() => setExtra({ ...extra, [ex.id]: (extra[ex.id] ?? 0) + 1 })}>
              + Add a set
            </button>
          </div>
        );
      })}

      {rest && restLeft > 0 && saver && !restHidden && <RestScreen endsAt={rest.endsAt} total={rest.total} onEndNow={stopRest} onHide={() => setRestHidden(true)} />}

      {rest && restLeft > 0 && (
        <div className="restdock">
          <RestPill endsAt={rest.endsAt} total={rest.total} onEnd={() => setRestRunning(false)} onEndNow={stopRest} />
          <button type="button" className="chip sm" onClick={() => extendRest(30)}>
            +30 s
          </button>
        </div>
      )}
      {rest && restLeft <= 0 && (
        <div className="row t14 q" style={{ gap: 12 }}>
          <span>Rest ended {clock(Math.max(0, now - rest.endsAt))} ago.</span>
          <button type="button" className="link" onClick={stopRest}>
            Clear
          </button>
        </div>
      )}

      {nextGroup ? (
        groupDone ? (
          <button
            type="button"
            className="btn lg block"
            onClick={() => {
              setGi(gi + 1);
              setEditing(null);
              window.scrollTo({ top: 0 });
            }}
          >
            Next: {nextGroup.map((e) => statuses.get(e.id)?.name).join(' + ')}
          </button>
        ) : (
          <button
            type="button"
            className="col gap4"
            style={{ padding: '0 2px', textAlign: 'left' }}
            onClick={() => {
              setGi(gi + 1);
              setEditing(null);
              window.scrollTo({ top: 0 });
            }}
          >
            <div className="lbl">Up next{nextGroup.length > 1 ? ' · superset' : ''}</div>
            <div className="t15">{nextGroup.map((e) => statuses.get(e.id)?.name).join(' + ')}</div>
          </button>
        )
      ) : (
        groupDone && (
          <button type="button" className="btn lg block" onClick={finish}>
            Finish session
          </button>
        )
      )}

      {swapFor && findExercise(plan, swapFor) && (
        <SwapSheet
          plan={plan}
          session={session}
          current={findExercise(plan, swapFor)!}
          onClose={() => setSwapFor(null)}
          onSwap={async (toId) => {
            const cur = findExercise(plan, swapFor)!;
            const list = [...session.exercises];
            const i = list.indexOf(cur.id);
            if (toId === null) list.splice(i, 1);
            else list[i] = toId;
            await patchSession(session.id, {
              exercises: list,
              swapped: [...(session.swapped ?? []), { from: cur.id, to: toId, reason: 'Swapped during the session' }] });
            setSwapFor(null);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SwapSheet({
  plan,
  session,
  current,
  onClose,
  onSwap }: {
  plan: PlanDef;
  session: TrainingSession;
  current: ExerciseDef;
  onClose: () => void;
  onSwap: (to: string | null) => void;
}) {
  const others = allExercises(plan).filter((e) => !session.exercises.includes(e.id));
  // A swap keeps the movement type: legs for legs. Anything else asks first, so leg work isn't lost quietly.
  const kind = movementKind(current);
  const same = others.filter((e) => movementKind(e) === kind);
  const different = others.filter((e) => movementKind(e) !== kind);
  const KIND_WORDS = { legs: 'leg work', push: 'pushing work', pull: 'pulling work', core: 'core work' } as const;
  const pickDifferent = async (e: ExerciseDef) => {
    const ok = await askConfirm({
      title: `Swap ${lowerFirst(current.name)} for ${lowerFirst(e.name)}?`,
      body: kind ? `That trades ${KIND_WORDS[kind]} for ${movementKind(e) ? KIND_WORDS[movementKind(e)!] : 'something else'}, so tonight has less ${KIND_WORDS[kind]}.` : undefined,
      yes: 'Swap anyway' });
    if (ok) onSwap(e.id);
  };
  const row = (e: ExerciseDef, onClick: () => void) => (
    <button key={e.id} type="button" className="li" onClick={onClick}>
      <span className="s">
        <span>{e.name}</span>
        <small>{targetText(e)}</small>
      </span>
      <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
    </button>
  );
  return (
    <Sheet title={`Swap ${lowerFirst(current.name)}`} onClose={onClose}>
      <button type="button" className="btn ghost block" onClick={() => onSwap(null)}>
        Skip it tonight
      </button>
      {same.length > 0 && (
        <>
          <div className="lbl">Same kind of work{kind ? `: ${KIND_WORDS[kind]}` : ''}</div>
          <div className="list">{same.map((e) => row(e, () => onSwap(e.id)))}</div>
        </>
      )}
      {different.length > 0 && (
        <>
          <div className="lbl">{same.length ? 'Different work' : 'Or do one of these instead'}</div>
          <div className="list">{different.map((e) => row(e, () => void pickDifferent(e)))}</div>
        </>
      )}
    </Sheet>
  );
}
