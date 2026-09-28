import { useEffect, useMemo, useRef, useState } from 'react';
import { buzz, scheduleDing, unlockAudio, wakeLockManager } from '../audio';
import { lowerFirst } from '../domain/format';
import { fmtKg } from '../domain/loads';
import { markFor } from '../domain/marks';
import {
  allExercises,
  bottomOfRange,
  buildSession,
  findExercise,
  findSession,
  groupExercises,
  isSuperset,
  targetText,
  topOfRange,
  type ExerciseDef,
  type PlanDef,
} from '../domain/plan';
import { exerciseStatus, historyFor, type ExerciseStatus } from '../domain/progression';
import type { SetEntry, Settings, Side, TrainingSession } from '../domain/types';
import { bump, deleteSet, discardSession, logSet, patchSession, patchSettings, startSession } from '../db/actions';
import { APP_START } from '../appStart';
import { setRestRunning } from '../state/restState';
import { useActiveSession, useAllDays, useAllSets, useEntriesBetween, useNow, useSessions, useSettings } from '../db/hooks';
import { addDays, dayKey } from '../domain/dates';
import { readiness } from '../domain/readiness';
import { go, useRoute } from '../router';
import { Icon } from '../ui/Icon';
import { MiniRing } from '../ui/Rings';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { flagEvents, nextUp, pendingSwaps, targetsFor } from '../state/derived';
import { clock } from './NextUpCard';
import { TempoCoach } from '../ui/TempoCoach';
import { ClipButtons } from './Clips';
import { prefOn } from '../domain/types';

export function SessionScreen() {
  const { params } = useRoute();
  const settings = useSettings();
  const active = useActiveSession();
  const sessions = useSessions();
  const sets = useAllSets();
  const days = useAllDays();
  const yesterdayEntries = useEntriesBetween(addDays(dayKey(), -1), addDays(dayKey(), -1));
  const starting = useRef(false);
  const start = params.get('start');
  const short = params.get('short') === '1';

  useEffect(() => {
    if (!settings || active === undefined || !sessions || !sets || !days || !yesterdayEntries || starting.current) return;
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
    const score = readiness({
      today,
      day: days.find((d) => d.date === today),
      sleepTarget: targetsFor(settings, today).sleepMin,
      sessions,
      entriesYesterday: yesterdayEntries,
      flagDates: flagEvents(plan, sessions, days).map((e) => e.date),
    }).score;
    void startSession({
      session: sessionId,
      planName: plan.name,
      exercises: exs.map((e) => e.id),
      short,
      swaps: swaps.map(({ from, to, reason }) => ({ from, to, reason })),
      tempo,
      readiness: score,
    }).then(() => {
      starting.current = false;
      if (Date.now() - APP_START < 60_000) void bump('leeroy');
      go('/session', undefined, { replace: true });
    });
  }, [settings, active, sessions, sets, days, yesterdayEntries, start, short]);

  if (!settings?.plan || !active || !sets) return <div className="page bare" />;
  return <Runner session={active} settings={settings} plan={settings.plan} allSets={sets} />;
}

interface Row {
  ex: ExerciseDef;
  setNo: number;
  side: Side;
  drop: boolean;
  key: string;
}

function rowsFor(group: ExerciseDef[], extra: Record<string, number>): Row[] {
  const count = (ex: ExerciseDef) => ex.sets + (extra[ex.id] ?? 0);
  const max = Math.max(...group.map(count));
  const rows: Row[] = [];
  for (let n = 1; n <= max; n++) {
    for (const ex of group) {
      if (n > count(ex)) continue;
      const sides: Side[] = ex.perSide ? (ex.lead === 'R' ? ['R', 'L'] : ['L', 'R']) : ['both'];
      for (const side of sides) rows.push({ ex, setNo: n, side, drop: false, key: `${ex.id}:${n}:${side}` });
      if (n === ex.sets && ex.drop) for (const side of sides) rows.push({ ex, setNo: n, side, drop: true, key: `${ex.id}:${n}:${side}:drop` });
    }
  }
  return rows;
}

const findLogged = (mine: SetEntry[], r: Row) => mine.find((s) => s.exerciseId === r.ex.id && s.setNo === r.setNo && s.side === r.side && !!s.drop === r.drop);
const valueOf = (s: Pick<SetEntry, 'reps' | 'seconds'>) => s.reps ?? s.seconds;

function Runner({ session, settings, plan, allSets }: { session: TrainingSession; settings: Settings; plan: PlanDef; allSets: SetEntry[] }) {
  const toast = useToast();
  const now = useNow(250);
  const exs = useMemo(() => session.exercises.map((id) => findExercise(plan, id)).filter((e): e is ExerciseDef => !!e), [session.exercises, plan]);
  const groups = useMemo(() => groupExercises(exs), [exs]);
  const mine = useMemo(() => allSets.filter((s) => s.sessionId === session.id), [allSets, session.id]);
  const history = useMemo(() => allSets.filter((s) => s.sessionId !== session.id), [allSets, session.id]);
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
  const groupRows = useMemo(() => groups.map((g) => rowsFor(g, extra)), [groups, extra]);
  const complete = (gi: number) => groupRows[gi].every((r) => findLogged(mine, r));
  const [gi, setGi] = useState(() => {
    const i = groupRows.findIndex((rows) => rows.some((r) => !findLogged(mine, r)));
    return i < 0 ? Math.max(groups.length - 1, 0) : i;
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ kg?: string; val?: string }>({});
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
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

  const startRest = (sec: number) => {
    setRestRunning(true);
    cancelDing.current?.();
    window.clearTimeout(buzzTimer.current);
    const endsAt = Date.now() + sec * 1000;
    setRest({ endsAt, total: sec });
    if (settings.prefs.ding) cancelDing.current = scheduleDing(sec);
    buzzTimer.current = window.setTimeout(() => buzz([90, 70, 90]), sec * 1000);
  };
  const extendRest = (sec: number) => {
    if (!rest) return;
    const left = Math.max(0, (rest.endsAt - Date.now()) / 1000) + sec;
    cancelDing.current?.();
    window.clearTimeout(buzzTimer.current);
    setRest({ endsAt: Date.now() + left * 1000, total: rest.total + sec });
    if (settings.prefs.ding) cancelDing.current = scheduleDing(left);
    buzzTimer.current = window.setTimeout(() => buzz([90, 70, 90]), left * 1000);
  };
  const stopRest = () => {
    setRestRunning(false);
    cancelDing.current?.();
    cancelDing.current = null;
    window.clearTimeout(buzzTimer.current);
    setRest(null);
  };

  const defaults = (r: Row) => {
    const st = statuses.get(r.ex.id)!;
    const earlier = mine.filter((s) => s.exerciseId === r.ex.id && !s.drop).sort((a, b) => b.at - a.at)[0];
    const kg = r.drop ? r.ex.drop?.kg ?? null : earlier ? earlier.loadKg : st.loadKg;
    const last = st.last?.sets.find((s) => s.setNo === r.setNo && s.side === r.side && !!s.drop === r.drop);
    let val = last ? valueOf(last) : undefined;
    // The second side of a set follows the first. With a lead side, it never goes above it.
    const firstSide = r.ex.lead ?? 'L';
    if (r.ex.perSide && r.side !== firstSide) {
      const first = mine.find((s) => s.exerciseId === r.ex.id && s.setNo === r.setNo && s.side === firstSide && !!s.drop === r.drop);
      const firstVal = first ? valueOf(first) : undefined;
      if (firstVal !== undefined) val = r.ex.lead ? (val === undefined ? firstVal : Math.min(val, firstVal)) : val ?? firstVal;
    }
    if (val === undefined) {
      // No history yet: repeat the previous set on this side, or aim for the top of the range.
      const prev = mine
        .filter((s) => s.exerciseId === r.ex.id && s.side === r.side && !!s.drop === r.drop && s.setNo < r.setNo)
        .sort((a, b) => b.setNo - a.setNo)[0];
      val = prev ? valueOf(prev) : r.drop ? undefined : topOfRange(r.ex);
    }
    return { kg, val, last };
  };

  const kgEditable = (r: Row) => r.ex.load === 'pair' || r.ex.load === 'single' || (r.ex.load === 'body' && (statuses.get(r.ex.id)?.loadKg ?? null) !== null) || r.drop;

  const save = async (r: Row) => {
    unlockAudio();
    const existing = findLogged(mine, r);
    const d = defaults(r);
    const kgText = draft.kg ?? (existing ? existing.loadKg?.toString() : d.kg?.toString());
    const valText = draft.val ?? (existing ? valueOf(existing)?.toString() : undefined);
    const watched = watch?.key === r.key ? Math.floor((Date.now() - watch.startedAt) / 1000) : undefined;
    const val = watched ?? (valText ? parseFloat(valText) : d.val);
    if (val === undefined || !Number.isFinite(val) || val <= 0) {
      toast({ text: r.ex.seconds ? 'Add the seconds first.' : 'Add the reps first.' });
      return;
    }
    const loadKg = kgEditable(r) ? (kgText ? parseFloat(kgText) : null) : null;
    const st = statuses.get(r.ex.id)!;
    const tempo = !!session.tempo?.[r.ex.id];
    const base = { setNo: r.setNo, side: r.side, loadKg: Number.isFinite(loadKg as number) ? loadKg : null, tempo, drop: r.drop || undefined };
    const measure = r.ex.seconds ? { seconds: Math.round(val) } : { reps: Math.round(val) };
    // A record has to beat everything before it, earlier sets tonight included.
    const before = [...history, ...mine.filter((s) => s.id !== existing?.id && (!existing || s.at < existing.at))];
    const mark = markFor({ ...base, ...measure }, historyFor(r.ex, settings.planState, before), st.last?.sets ?? [], bottomOfRange(r.ex) ?? 1);
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
    // Rest after the last row of a round.
    const idx = rows.findIndex((x) => x.key === r.key);
    const next = rows[idx + 1];
    if (!next || next.setNo !== r.setNo || rows.slice(idx + 1).every((x) => findLogged(mine, x))) {
      startRest(Math.max(...group.map((e) => e.restSec ?? (e.seconds ? 60 : 90))));
    }
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
      if (window.confirm('Nothing is logged yet. Discard this session?')) {
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

  return (
    <div className="page bare" style={{ gap: 16, paddingTop: 'calc(14px + var(--safe-top))' }}>
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
          <div key={ex.id} className="col gap12">
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
                {st.loadKg !== null && ex.load !== 'band' ? ` · ${fmtKg(st.loadKg)} kg` : ''}
                {st.band ? ` · ${st.band.toLowerCase()}` : ''}
              </div>
              {ex.note && <div className="t13 d lh">{ex.note}</div>}
            </div>

            {st.advice && (
              <div className="col gap4" style={{ padding: '12px 16px', border: '1px solid var(--gold-border)', borderRadius: 16, background: 'var(--gold-bg)' }}>
                <div className="lbl sm gold">{st.advice.title}</div>
                <div className="t14 lh">{st.advice.tonight}</div>
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
              {session.tempo?.[ex.id] && prefOn(settings.prefs, 'tempoCoach') && !ex.seconds && (
                <button type="button" className={`tool${coach === ex.id ? ' on' : ''}`} onClick={() => setCoach(coach === ex.id ? null : ex.id)} aria-pressed={coach === ex.id}>
                  <Icon name="stopwatch" size={16} stroke={1.8} />
                  Coach
                </button>
              )}
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

            {coach === ex.id && <TempoCoach key={current?.key ?? ex.id} reps={topOfRange(ex) ?? bottomOfRange(ex) ?? 10} vibrate={settings.prefs.buzz} onStop={() => setCoach(null)} />}

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
                setDraft(s ? { kg: s.loadKg?.toString(), val: valueOf(s)?.toString() } : {});
              }}
              defaults={defaults}
              kgEditable={kgEditable}
              onSave={save}
              onRemove={remove}
              watch={watch}
              setWatch={setWatch}
              now={now}
            />
            <button type="button" className="link" style={{ alignSelf: 'flex-start', minHeight: 32, marginTop: -6 }} onClick={() => setExtra({ ...extra, [ex.id]: (extra[ex.id] ?? 0) + 1 })}>
              + Add a set
            </button>
          </div>
        );
      })}

      {rest && (
        <div className="rest" style={{ position: 'sticky', bottom: 'calc(12px + var(--safe-bottom))', zIndex: 5, boxShadow: '0 -8px 30px rgba(0,0,0,.35)' }}>
          <MiniRing progress={restLeft / rest.total} size={50} label="Rest timer" />
          <div className="grow col gap2">
            <div className="lbl sm blue">{restLeft > 0 ? `Rest · ${settings.prefs.ding ? 'ding at 0:00' : 'no ding'}` : 'Rest over'}</div>
            <div className="num tn" style={{ fontSize: 26 }}>
              {restLeft > 0 ? clock(restLeft * 1000 + 999) : 'Go'}
            </div>
          </div>
          {restLeft > 0 && (
            <button type="button" className="btn ghost sm" onClick={() => extendRest(30)}>
              +30 s
            </button>
          )}
          <button type="button" className="icon-btn" aria-label="Stop the rest timer" onClick={stopRest}>
            <Icon name="close" size={18} stroke={1.8} />
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

function describe(kg: number | null, m: { reps?: number; seconds?: number }) {
  const v = m.reps !== undefined ? `${m.reps}` : `${m.seconds} s`;
  return kg !== null ? `${fmtKg(kg)} kg × ${v}` : m.reps !== undefined ? `${v} reps` : v;
}

function SetTable({
  ex,
  st,
  rows,
  mine,
  activeKey,
  draft,
  setDraft,
  editing,
  setEditing,
  defaults,
  kgEditable,
  onSave,
  onRemove,
  watch,
  setWatch,
  now,
}: {
  ex: ExerciseDef;
  st: ExerciseStatus;
  rows: Row[];
  mine: SetEntry[];
  activeKey: string | null;
  draft: { kg?: string; val?: string };
  setDraft: (d: { kg?: string; val?: string }) => void;
  editing: string | null;
  setEditing: (k: string | null) => void;
  defaults: (r: Row) => { kg: number | null; val?: number; last?: SetEntry };
  kgEditable: (r: Row) => boolean;
  onSave: (r: Row) => void;
  onRemove: (r: Row) => void;
  watch: { key: string; startedAt: number } | null;
  setWatch: (w: { key: string; startedAt: number } | null) => void;
  now: number;
}) {
  const timed = !!ex.seconds;
  return (
    <div className="sets">
      <div className="setrow head">
        <div>Set</div>
        <div>Last time</div>
        <div className="center">{ex.load === 'band' ? 'Band' : 'kg'}</div>
        <div className="center">{timed ? 'Secs' : 'Reps'}</div>
        <div />
        <div />
      </div>
      {rows.map((r) => {
        const logged = findLogged(mine, r);
        const isActive = r.key === activeKey;
        const d = defaults(r);
        const lastText = d.last ? describe(d.last.loadKg, d.last).replace(' kg', '') : '—';
        const label = `${r.drop ? '↓' : r.setNo}${r.side !== 'both' ? ` ${r.side}` : ''}`;
        const leadSet = ex.lead && r.side !== ex.lead ? mine.find((s) => s.exerciseId === ex.id && s.setNo === r.setNo && s.side === ex.lead && !!s.drop === r.drop) : undefined;
        const typedVal = isActive ? parseFloat(draft.val ?? '') : NaN;
        const followerVal = logged ? valueOf(logged) : Number.isFinite(typedVal) ? typedVal : undefined;
        const overLead = leadSet && followerVal !== undefined && (valueOf(leadSet) ?? 0) < followerVal;
        const watching = watch?.key === r.key;
        return (
          <div key={r.key}>
            <div className={`setrow${isActive ? ' cur' : ''}`}>
              <div className={isActive ? 't15' : 't15 q'}>{label}</div>
              <div className="t14 q" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lastText}
              </div>
              {isActive ? (
                <>
                  {kgEditable(r) ? (
                    <input
                      className="field sm"
                      inputMode="decimal"
                      aria-label="Load in kg"
                      value={draft.kg ?? d.kg?.toString() ?? ''}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setDraft({ ...draft, kg: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })}
                    />
                  ) : (
                    <div className="t14 q center">{ex.load === 'band' ? st.band?.split(' ')[0] ?? 'Band' : 'Body'}</div>
                  )}
                  <div style={{ position: 'relative' }}>
                    <input
                      className="field sm focus"
                      inputMode="numeric"
                      aria-label={timed ? 'Seconds' : 'Reps'}
                      placeholder={d.val?.toString() ?? ''}
                      value={watching ? String(Math.floor((now - watch!.startedAt) / 1000)) : draft.val ?? ''}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setDraft({ ...draft, val: e.target.value.replace(/[^\d]/g, '') })}
                    />
                  </div>
                  {timed ? (
                    <button
                      type="button"
                      aria-label={watching ? 'Stop the stopwatch' : 'Start the stopwatch'}
                      className="center"
                      style={{ color: watching ? 'var(--sage)' : 'var(--quiet)' }}
                      onClick={() => {
                        if (watching) {
                          setDraft({ ...draft, val: String(Math.floor((now - watch!.startedAt) / 1000)) });
                          setWatch(null);
                        } else {
                          unlockAudio();
                          setWatch({ key: r.key, startedAt: Date.now() });
                        }
                      }}
                    >
                      <Icon name={watching ? 'pause' : 'stopwatch'} size={18} stroke={1.8} />
                    </button>
                  ) : (
                    <div />
                  )}
                  <button type="button" className="okdot" aria-label={`Complete set ${label}`} onClick={() => onSave(r)} />
                </>
              ) : (
                <>
                  <div className={`t16 center ${logged ? '' : 'f'}`}>
                    {logged ? (logged.loadKg !== null ? fmtKg(logged.loadKg) : ex.load === 'band' ? 'B' : '—') : d.kg !== null && kgEditable(r) ? fmtKg(d.kg) : ''}
                  </div>
                  <div className={`t16 center ${logged ? '' : 'f'}`}>{logged ? valueOf(logged) : d.val ?? ''}</div>
                  <div className="mark" style={{ color: logged?.mark === '!!' ? 'var(--gold)' : logged?.mark === '!' ? 'var(--sage)' : 'var(--quiet)' }}>
                    {logged?.mark ?? ''}
                  </div>
                  {logged ? (
                    <button type="button" className="okdot done" aria-label={`Edit set ${label}`} onClick={() => setEditing(r.key)}>
                      <Icon name="check" size={16} stroke={2.4} color="var(--ink)" />
                    </button>
                  ) : (
                    <div />
                  )}
                </>
              )}
            </div>
            {overLead && <div className="flagline">{r.side === 'R' ? 'Right' : 'Left'} did more than {ex.lead === 'L' ? 'left' : 'right'}. Keep it at or below.</div>}
            {isActive && editing === r.key && (
              <div className="row" style={{ padding: '0 14px 10px 66px', justifyContent: 'flex-start', gap: 16 }}>
                <button type="button" className="t13 q" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button type="button" className="t13" style={{ color: '#e38a7c' }} onClick={() => onRemove(r)}>
                  Delete set
                </button>
              </div>
            )}
          </div>
        );
      })}
      <div className="t12 q" style={{ padding: '8px 14px 10px', borderTop: '1px solid var(--divider)' }}>
        ! beats last time: more reps, more weight, or the same reps with a slower lowering. !! is a record.
      </div>
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
