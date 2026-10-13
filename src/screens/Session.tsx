import { useEffect, useMemo, useRef, useState } from 'react';
import { buzz, scheduleDing, unlockAudio, wakeLockManager } from '../audio';
import { lowerFirst } from '../domain/format';
import { chipLoads, fmtKg } from '../domain/loads';
import { describe, findLogged, SetTable, type Draft, type Row } from './session/SetTable';
import { HeavierMoment } from './session/HeavierMoment';
import { markFor } from '../domain/marks';
import { cueFor } from '../domain/quality';
import { challengeRest } from '../domain/setChallenges';
import {
  allExercises,
  bottomOfRange,
  buildSession,
  findExercise,
  findSession,
  groupExercises,
  isPlaceholder,
  isSuperset,
  measured,
  measureOf,
  realSets,
  sidesFor,
  valueOfSet,
  targetText,
  topOfRange,
  type ExerciseDef,
  type PlanDef,
} from '../domain/plan';
import { adviceTonight, exerciseStatus, heavierOffer, historyFor, ladder, loadSoFar, loadTonight } from '../domain/progression';
import type { SetEntry, Settings, Side, TrainingSession } from '../domain/types';
import { bump, deleteSet, discardSession, logSet, patchSession, patchSettings, startSession } from '../db/actions';
import { APP_START } from '../appStart';
import { setRestRunning } from '../state/restState';
import { useActiveSession, useAllDays, useAllSets, useAllSetsWithSkips, useNow, useSessions, useSettings } from '../db/hooks';
import { dayKey } from '../domain/dates';
import { readinessFor } from '../state/readinessFor';
import { go, useRoute } from '../router';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { flagEvents, nextUp, pendingSwaps } from '../state/derived';
import { clock } from './NextUpCard';
import { TempoCoach } from '../ui/TempoCoach';
import { RestPill } from '../ui/RestPill';
import { RestScreen, useBatteryLevel } from '../ui/RestScreen';
import { batteryMode } from '../domain/rest';
import { ClipButtons } from './Clips';
import { prefOn } from '../domain/types';
import { askConfirm } from '../ui/Confirm';

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
  const short = params.get('short') === '1';

  useEffect(() => {
    if (!settings || active === undefined || !sessions || !sets || !days || starting.current) return;
    if (active) {
      if (start) go('/session', undefined, { replace: true });
      return;
    }
    const plan = settings.plan;
    if (!start || !plan) {
      go('/train', undefined, { replace: true });
      return;
    }
    starting.current = true;
    const sessionId = start === 'next' ? nextUp(settings, sessions, sets, days)?.sessionId ?? plan.rotation[0] : start;
    const swaps = pendingSwaps(plan, sessions, days).filter((s) => s.flag.swap?.session === sessionId);
    const exs = buildSession(plan, sessionId, { short, swaps });
    const tempo = Object.fromEntries(exs.map((ex) => [ex.id, exerciseStatus(ex, settings.planState, settings.equipment, sets, plan.bigJump).tempo]));
    const today = dayKey();
    const ready = readinessFor(settings, today, days, sessions, sets, flagEvents(plan, sessions, days).map((e) => e.date));
    void startSession({
      session: sessionId,
      planName: plan.name,
      exercises: exs.map((e) => e.id),
      short,
      swaps: swaps.map(({ from, to, reason }) => ({ from, to, reason })),
      tempo,
      readiness: ready.score,
      readinessX: ready.x,
    }).then(() => {
      starting.current = false;
      if (Date.now() - APP_START < 60_000) void bump('leeroy');
      go('/session', undefined, { replace: true });
    });
  }, [settings, active, sessions, sets, days, start, short]);

  if (!settings?.plan || !active || !sets || !withSkips) return <div className="page bare" />;
  return <Runner session={active} settings={settings} plan={settings.plan} allSets={withSkips} />;
}

function rowsFor(group: ExerciseDef[], extra: Record<string, number>, first: Record<string, 'L' | 'R'> = {}): Row[] {
  const count = (ex: ExerciseDef) => ex.sets + (extra[ex.id] ?? 0);
  const max = Math.max(...group.map(count));
  const rows: Row[] = [];
  for (let n = 1; n <= max; n++) {
    for (const ex of group) {
      if (n > count(ex)) continue;
      const sides: Side[] = sidesFor(ex, first[ex.id]);
      for (const side of sides) rows.push({ ex, setNo: n, side, drop: false, key: `${ex.id}:${n}:${side}` });
      if (n === ex.sets && ex.drop) for (const side of sides) rows.push({ ex, setNo: n, side, drop: true, key: `${ex.id}:${n}:${side}:drop` });
    }
  }
  return rows;
}

const valueOf = valueOfSet;

function Runner({ session, settings, plan, allSets }: { session: TrainingSession; settings: Settings; plan: PlanDef; allSets: SetEntry[] }) {
  const toast = useToast();
  const now = useNow(250);
  const exs = useMemo(() => session.exercises.map((id) => findExercise(plan, id)).filter((e): e is ExerciseDef => !!e), [session.exercises, plan]);
  const groups = useMemo(() => groupExercises(exs), [exs]);
  const mine = useMemo(() => allSets.filter((s) => s.sessionId === session.id), [allSets, session.id]);
  const history = useMemo(() => realSets(allSets.filter((s) => s.sessionId !== session.id)), [allSets, session.id]);
  const statuses = useMemo(
    () => new Map(exs.map((ex) => [ex.id, exerciseStatus(ex, settings.planState, settings.equipment, history, plan.bigJump ?? 0.25)])),
    [exs, settings.planState, settings.equipment, history, plan.bigJump],
  );

  const [extra, setExtra] = useState<Record<string, number>>(() => {
    const e: Record<string, number> = {};
    for (const s of mine) {
      const ex = exs.find((x) => x.id === s.exerciseId);
      if (ex && s.setNo > ex.sets) e[ex.id] = Math.max(e[ex.id] ?? 0, s.setNo - ex.sets);
    }
    return e;
  });
  const groupRows = useMemo(() => groups.map((g) => rowsFor(g, extra, session.firstSide)), [groups, extra, session.firstSide]);
  const complete = (gi: number) => groupRows[gi].every((r) => findLogged(mine, r));
  const [gi, setGi] = useState(() => {
    const i = groupRows.findIndex((rows) => rows.some((r) => !findLogged(mine, r)));
    return i < 0 ? Math.max(groups.length - 1, 0) : i;
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [rest, setRest] = useState<{ from: number; endsAt: number; total: number } | null>(null);
  const [restHidden, setRestHidden] = useState(false);
  const level = useBatteryLevel();
  const saver = batteryMode(level, !!settings.prefs.batterySaver);
  const [watch, setWatch] = useState<{ key: string; startedAt: number } | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [coach, setCoach] = useState<string | null>(null);
  const cancelDing = useRef<(() => void) | null>(null);
  const buzzTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!settings.prefs.wakeLock) return;
    const wl = wakeLockManager();
    wl.start();
    return () => wl.stop();
  }, [settings.prefs.wakeLock]);

  useEffect(
    () => () => {
      cancelDing.current?.();
      window.clearTimeout(buzzTimer.current);
      setRestRunning(false);
    },
    [],
  );

  const group = groups[gi] ?? [];
  const rows = groupRows[gi] ?? [];
  const current = rows.find((r) => !findLogged(mine, r));
  const activeKey = editing ?? current?.key ?? null;

  // A fresh row starts with a fresh draft.
  useEffect(() => {
    if (!editing) setDraft({});
  }, [current?.key, editing]);

  /** Each rest is kept as a span, so the finale can say where the hour went. */
  const logRest = (r: { from: number; endsAt: number }) => {
    const to = Math.min(Date.now(), r.endsAt);
    if (to > r.from) void patchSession(session.id, { restLog: [...(session.restLog ?? []), { from: r.from, to, kind: 'rest' }] });
  };
  const startRest = (sec: number) => {
    setRestRunning(true);
    cancelDing.current?.();
    window.clearTimeout(buzzTimer.current);
    if (rest) logRest(rest);
    const endsAt = Date.now() + sec * 1000;
    setRest({ from: Date.now(), endsAt, total: sec });
    setRestHidden(false);
    if (settings.prefs.ding) cancelDing.current = scheduleDing(sec);
    buzzTimer.current = window.setTimeout(() => buzz([90, 70, 90]), sec * 1000);
  };
  const extendRest = (sec: number) => {
    if (!rest) return;
    const left = Math.max(0, (rest.endsAt - Date.now()) / 1000) + sec;
    cancelDing.current?.();
    window.clearTimeout(buzzTimer.current);
    setRest({ from: rest.from, endsAt: Date.now() + left * 1000, total: rest.total + sec });
    if (settings.prefs.ding) cancelDing.current = scheduleDing(left);
    buzzTimer.current = window.setTimeout(() => buzz([90, 70, 90]), left * 1000);
  };
  const stopRest = () => {
    if (rest) logRest(rest);
    setRestRunning(false);
    cancelDing.current?.();
    cancelDing.current = null;
    window.clearTimeout(buzzTimer.current);
    setRest(null);
  };

  const defaults = (r: Row) => {
    const st = statuses.get(r.ex.id)!;
    const kg = r.drop ? r.ex.drop?.kg ?? null : loadSoFar(mine, r.ex.id, loadTonight(st, session.heavier?.[r.ex.id]));
    const last = st.last?.sets.find((s) => s.setNo === r.setNo && s.side === r.side && !!s.drop === r.drop);
    let val = last ? valueOf(last) : undefined;
    // The second side of a set follows the first. With a lead side, it never goes above it.
    const firstSide = sidesFor(r.ex, session.firstSide?.[r.ex.id])[0];
    if (r.ex.perSide && r.side !== firstSide) {
      const first = mine.find((s) => s.exerciseId === r.ex.id && s.setNo === r.setNo && s.side === firstSide && !!s.drop === r.drop);
      const firstVal = first ? valueOf(first) : undefined;
      if (firstVal !== undefined) val = r.ex.lead ? (val === undefined ? firstVal : Math.min(val, firstVal)) : val ?? firstVal;
    }
    if (val === undefined) {
      // No history yet: repeat the previous set on this side, or aim for the top of the range.
      const prev = mine
        .filter((s) => s.exerciseId === r.ex.id && s.side === r.side && !!s.drop === r.drop && s.setNo < r.setNo && !s.skipped)
        .sort((a, b) => b.setNo - a.setNo)[0];
      val = prev ? valueOf(prev) : r.drop ? undefined : topOfRange(r.ex);
    }
    return { kg, val, last };
  };

  const kgEditable = (r: Row) => r.ex.load === 'pair' || r.ex.load === 'single' || (r.ex.load === 'body' && loadTonight(statuses.get(r.ex.id)!, session.heavier?.[r.ex.id]) !== null) || r.drop;

  const save = async (r: Row) => {
    unlockAudio();
    const existing = findLogged(mine, r);
    const d = defaults(r);
    const kgText = draft.kg ?? (existing ? existing.loadKg?.toString() : d.kg?.toString());
    const valText = draft.val ?? (existing ? valueOf(existing)?.toString() : undefined);
    const watched = watch?.key === r.key ? Math.floor((Date.now() - watch.startedAt) / 1000) : undefined;
    const val = watched ?? (valText ? parseFloat(valText) : d.val);
    if (val === undefined || !Number.isFinite(val) || val <= 0) {
      toast({ text: `Add the ${measureOf(r.ex)} first.` });
      return;
    }
    const loadKg = kgEditable(r) ? (kgText ? parseFloat(kgText) : null) : null;
    const asSaved = { ...measured(r.ex, val), loadKg: Number.isFinite(loadKg as number) ? loadKg : null };
    if (!existing && isPlaceholder(asSaved)) {
      const skipIt = await askConfirm({ title: 'Skip this set instead?', body: '1 rep with no weight is usually a set that wasn\'t done. Skipped sets stay out of your stats.', yes: 'Skip it', no: 'Save 1 rep' });
      if (skipIt) return skip(r);
    }
    const st = statuses.get(r.ex.id)!;
    const tempo = !!session.tempo?.[r.ex.id];
    const lead = sidesFor(r.ex, session.firstSide?.[r.ex.id])[0];
    const firstSide = lead === 'both' ? undefined : lead;
    const prev = existing ?? undefined;
    const quality = {
      form: draft.form ?? prev?.form,
      cleanReps: draft.form === 5 ? undefined : draft.clean ?? prev?.cleanReps,
      rir: draft.rir ?? prev?.rir,
      challenges: draft.challenges ?? prev?.challenges,
      faults: draft.faults ?? prev?.faults,
      discomfort: draft.discomfort ?? prev?.discomfort,
    };
    const base = { setNo: r.setNo, side: r.side, loadKg: asSaved.loadKg, tempo, drop: r.drop || undefined, ...(firstSide ? { firstSide } : {}), ...quality };
    const measure = measured(r.ex, val);
    // A record has to beat everything before it, earlier sets tonight included.
    const before = [...history, ...mine.filter((s) => s.id !== existing?.id && (!existing || s.at < existing.at))];
    const mark = markFor({ ...base, ...measure }, historyFor(r.ex, settings.planState, before), st.last?.sets ?? [], bottomOfRange(r.ex) ?? 1, { clean: settings.formRecordsClean !== false });
    await logSet({
      id: existing?.id,
      sessionId: session.id,
      date: session.date,
      session: session.session,
      exerciseId: r.ex.id,
      exercise: st.name,
      band: st.band,
      at: existing?.at ?? Date.now(),
      mark,
      ...base,
      ...measure,
    });
    setEditing(null);
    setDraft({});
    setWatch(null);
    if (existing) return;
    if (mark === '!!') {
      toast({ kicker: 'New record', text: `${st.name}: ${describe(base.loadKg, measure)}`, tone: 'gold' });
      if (settings.prefs.buzz) buzz(40);
    }
    afterRow(r);
  };

  /** Rest after the last row of a round; in a superset, glide to the partner first. */
  const afterRow = (r: Row, rested = true) => {
    const idx = rows.findIndex((x) => x.key === r.key);
    const next = rows[idx + 1];
    if (!next || next.setNo !== r.setNo || rows.slice(idx + 1).every((x) => findLogged(mine, x))) {
      if (!rested) return;
      const done = findLogged(mine, r);
      startRest(Math.max(...group.map((e) => challengeRest(e, e.id === r.ex.id ? { challenges: done?.challenges ?? draft.challenges } : {}))));
    } else if (next.ex.id !== r.ex.id) {
      window.setTimeout(() => document.getElementById(`row-${next.key}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }), 120);
    }
  };

  /** Skipped sets count as done for the flow and for nothing else. */
  const skip = async (r: Row) => {
    const st = statuses.get(r.ex.id)!;
    await logSet({ sessionId: session.id, date: session.date, session: session.session, exerciseId: r.ex.id, exercise: st.name, at: Date.now(), setNo: r.setNo, side: r.side, loadKg: null, drop: r.drop || undefined, skipped: true });
    setEditing(null);
    setDraft({});
    afterRow(r, false);
  };
  const undoSkip = async (r: Row) => {
    const existing = findLogged(mine, r);
    if (existing?.skipped) await deleteSet(existing.id);
  };

  const remove = async (r: Row) => {
    const existing = findLogged(mine, r);
    if (existing) await deleteSet(existing.id);
    setEditing(null);
  };

  const toggleTempo = async (exId: string) => {
    await patchSession(session.id, { tempo: { ...session.tempo, [exId]: !session.tempo?.[exId] } });
  };

  const finish = async () => {
    if (!mine.length) {
      if (await askConfirm({ title: 'Discard this session?', body: 'Nothing is logged yet.', yes: 'Discard', danger: true })) {
        await discardSession(session.id);
        go('/train', undefined, { replace: true });
      }
      return;
    }
    stopRest();
    go('/session/done', undefined, { replace: true });
  };

  const def = findSession(plan, session.session);
  const firstIdx = exs.indexOf(group[0]);
  const restLeft = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0;
  setRestRunning(restLeft > 0);
  const nextGroup = groups[gi + 1];
  const groupDone = complete(gi);
  const tired = session.tiredHands ?? groups.slice(0, gi).some((g) => g.some((e) => e.tiredHands));
  const offerFor = group
    .map((ex) => ({ ex, offer: heavierOffer(statuses.get(ex.id)!) }))
    .find(({ ex, offer }) => offer && !session.heavier?.[ex.id] && !mine.some((m) => m.exerciseId === ex.id));
  const answer = (exId: string, v: 'yes' | 'no') => patchSession(session.id, { heavier: { ...session.heavier, [exId]: v } });

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
        <button type="button" style={{ height: 44, padding: '0 6px', fontSize: 15, fontWeight: 600 }} onClick={finish}>
          Finish
        </button>
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
              <ClipButtons sessionId={session.id} exerciseId={ex.id} exercise={st.name} date={session.date} />
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
              return cue ? (
                <div className="cue">
                  <span className="lbl sm gold">Your cue</span>
                  <span className="t15 lh">{cue}</span>
                </div>
              ) : null;
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
              swapped: [...(session.swapped ?? []), { from: cur.id, to: toId, reason: 'Swapped during the session' }],
            });
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
  onSwap,
}: {
  plan: PlanDef;
  session: TrainingSession;
  current: ExerciseDef;
  onClose: () => void;
  onSwap: (to: string | null) => void;
}) {
  const others = allExercises(plan).filter((e) => !session.exercises.includes(e.id));
  return (
    <Sheet title={`Swap ${lowerFirst(current.name)}`} onClose={onClose}>
      <button type="button" className="btn ghost block" onClick={() => onSwap(null)}>
        Skip it tonight
      </button>
      <div className="lbl">Or do one of these instead</div>
      <div className="list">
        {others.map((e) => (
          <button key={e.id} type="button" className="li" onClick={() => onSwap(e.id)}>
            <span className="s">
              <span>{e.name}</span>
              <small>{targetText(e)}</small>
            </span>
            <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
          </button>
        ))}
      </div>
    </Sheet>
  );
}
