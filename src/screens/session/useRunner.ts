import { useEffect, useMemo, useRef, useState } from 'react';
import { buzz, scheduleDing, unlockAudio, wakeLockManager } from '../../audio';
import { describe, findLogged, type Draft, type Row } from './SetTable';
import { markFor } from '../../domain/marks';
import { challengeRest } from '../../domain/setChallenges';
import {
  bottomOfRange,
  findExercise,
  findSession,
  groupExercises,
  isPlaceholder,
  measured,
  measureOf,
  realSets,
  sidesFor,
  valueOfSet,
  topOfRange,
  type ExerciseDef,
  type PlanDef,
} from '../../domain/plan';
import { looksUnfinished } from '../../domain/trainingChecks';
import { exerciseStatus, heavierOffer, historyFor, loadSoFar, loadTonight } from '../../domain/progression';
import type { LiveCounter, SetEntry, Settings, TrainingSession } from '../../domain/types';
import { deleteSet, discardSession, logSet, patchSession } from '../../db/actions';
import { setLastSetAt, setRestRunning } from '../../state/restState';
import { useNow } from '../../db/hooks';
import { go } from '../../router';
import { useToast } from '../../ui/Toasts';
import { useBatteryLevel } from '../../ui/RestScreen';
import { batteryMode, resumeRest, type ActiveRest } from '../../domain/rest';
import { prefOn } from '../../domain/types';
import { askConfirm } from '../../ui/Confirm';
import { fmtDayMonth } from '../../domain/format';
import { db } from '../../db/db';
import { useMoments } from '../../ui/Moments';
import { detectFirsts } from '../../domain/firsts';
import { liveFields, restAfter, rowsFor, type LiveInput } from './rows';

const valueOf = valueOfSet;

/** Everything the session runs on, shared by the live screens and the set list. */
export function useRunner(session: TrainingSession, settings: Settings, plan: PlanDef, allSets: SetEntry[]) {
  const toast = useToast();
  const moments = useMoments();
  const now = useNow(250);
  const exs = useMemo(
    () =>
      session.exercises
        .map((id) => findExercise(plan, id))
        .filter((e): e is ExerciseDef => !!e)
        .map((e) => (session.lighter ? { ...e, sets: Math.max(1, e.sets - 1) } : e)),
    [session.exercises, plan, session.lighter],
  );
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
  // The running rest lives on the session row too, so minimising the session doesn't drop it.
  const [rest, setRestState] = useState<ActiveRest | null>(() => resumeRest(session.activeRest ?? undefined, Date.now()).rest);
  const setRest = (r: ActiveRest | null) => {
    setRestState(r);
    void patchSession(session.id, { activeRest: r });
  };
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

  // Back from elsewhere mid-rest: the ding and buzz are set again for what's left.
  useEffect(() => {
    const back = resumeRest(session.activeRest ?? undefined, Date.now());
    if (back.dingSec === undefined) return;
    setRestRunning(true);
    if (settings.prefs.ding) cancelDing.current = scheduleDing(back.dingSec);
    buzzTimer.current = window.setTimeout(() => buzz([90, 70, 90]), back.dingSec * 1000);
  }, []);

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

  /** The set being counted on the live screens, kept on the session row. */
  const saveCounter = (c: LiveCounter | null) => void patchSession(session.id, { liveSet: c });

  const defaults = (r: Row) => {
    const st = statuses.get(r.ex.id)!;
    const kg = r.drop ? r.ex.drop?.kg ?? null : loadSoFar(mine, r.ex.id, loadTonight(st, session.heavier?.[r.ex.id]));
    const last = st.last?.sets.find((s) => s.setNo === r.setNo && s.side === r.side && !!s.drop === r.drop);
    // A "1 rep, no weight" from last time (old band rows) is no target: aim from the range instead.
    let val = last && !isPlaceholder(last) ? valueOf(last) : undefined;
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

  /** Saves a row. From the live screens, `live` carries the count, timer, burn and checks. Returns the mark. */
  const save = async (r: Row, live?: LiveInput): Promise<SetEntry['mark'] | 'skipped' | 'invalid'> => {
    unlockAudio();
    const existing = findLogged(mine, r);
    const d = defaults(r);
    const kgText = draft.kg ?? (existing ? existing.loadKg?.toString() : d.kg?.toString());
    const valText = draft.val ?? (existing ? valueOf(existing)?.toString() : undefined);
    const watched = watch?.key === r.key ? Math.floor((Date.now() - watch.startedAt) / 1000) : undefined;
    const val = live?.val ?? watched ?? (valText ? parseFloat(valText) : d.val);
    if (val === undefined || !Number.isFinite(val) || val <= 0) {
      toast({ text: `Add the ${measureOf(r.ex)} first.` });
      return 'invalid';
    }
    const loadKg = kgEditable(r) ? (kgText ? parseFloat(kgText) : null) : null;
    const asSaved = { ...measured(r.ex, val), loadKg: Number.isFinite(loadKg as number) ? loadKg : null };
    // Compare with last time's set, else the best set of this exercise tonight.
    const tonight = realSets(mine).filter((s) => s.exerciseId === r.ex.id && !s.drop).map((s) => valueOf(s) ?? 0);
    const reference = (d.last && !isPlaceholder(d.last) ? valueOf(d.last) : undefined) ?? (tonight.length ? Math.max(...tonight) : undefined);
    if (!existing && !r.drop && looksUnfinished(asSaved, reference)) {
      const n = valueOfSet(asSaved) ?? 0;
      const skipIt = await askConfirm({
        title: 'Real set, or skip?',
        body: isPlaceholder(asSaved) ? "1 rep with no weight is usually a set that wasn't done. Skipped sets stay out of records and volume." : `${n} is well under the ${reference} it follows. If the set wasn't done, skip it: skipped sets stay out of records and volume.`,
        yes: 'Skip it',
        no: `Save ${n}` });
      if (skipIt) {
        await skip(r);
        return 'skipped';
      }
    }
    const st = statuses.get(r.ex.id)!;
    const tempo = !!session.tempo?.[r.ex.id];
    const lead = sidesFor(r.ex, session.firstSide?.[r.ex.id])[0];
    const firstSide = lead === 'both' ? undefined : lead;
    const prev = existing ?? undefined;
    const checked = !!(live?.checks ?? prev?.checks);
    const quality = {
      form: checked ? undefined : draft.form ?? prev?.form,
      cleanReps: checked || draft.form === 5 ? undefined : draft.clean ?? prev?.cleanReps,
      rir: live ? live.rir : draft.rir ?? prev?.rir,
      challenges: draft.challenges ?? prev?.challenges,
      faults: draft.faults ?? prev?.faults,
      discomfort: draft.discomfort ?? prev?.discomfort };
    const base = { setNo: r.setNo, side: r.side, loadKg: asSaved.loadKg, tempo, drop: r.drop || undefined, ...(firstSide ? { firstSide } : {}), ...quality, ...liveFields(prev, live) };
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
      ...measure });
    setEditing(null);
    setDraft({});
    setWatch(null);
    if (live) saveCounter(null);
    if (existing) return mark;
    const firsts = detectFirsts(before, [{ ...base, ...measure, id: 'new', sessionId: session.id, date: session.date, session: session.session, exerciseId: r.ex.id, exercise: st.name, at: Date.now() } as SetEntry]);
    if (firsts.length) {
      const firstsSoFar = await db.seen.filter((x) => x.id.startsWith('first:')).count();
      firsts.forEach((f, i) => moments.show({ kind: 'first', key: `first:${f.key}`, title: f.title, detail: `${f.detail} · ${fmtDayMonth(session.date)}`, count: firstsSoFar + i + 1 }));
    }
    if (mark === '!!') {
      toast({ kicker: 'New record', text: `${st.name}: ${describe(base.loadKg, measure)}`, tone: 'gold' });
      if (settings.prefs.buzz) buzz(40);
    }
    setLastSetAt(Date.now());
    afterRow(r);
    return mark;
  };

  /** Rest after the last row of a round; in a superset, glide to the partner first. */
  const afterRow = (r: Row, rested = true) => {
    const after = restAfter(rows, (x) => !!findLogged(mine, x), r);
    const next = rows[rows.findIndex((x) => x.key === r.key) + 1];
    if (after === 'rest') {
      if (!rested) return;
      const done = findLogged(mine, r);
      startRest(Math.max(...group.map((e) => challengeRest(e, e.id === r.ex.id ? { challenges: done?.challenges ?? draft.challenges } : {}))));
    } else if (after === 'glide') {
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
  const tired = session.tiredHands ?? (prefOn(settings.prefs, 'bigSetControls') || groups.slice(0, gi).some((g) => g.some((e) => e.tiredHands)));
  const offerFor = group
    .map((ex) => ({ ex, offer: heavierOffer(statuses.get(ex.id)!) }))
    .find(({ ex, offer }) => offer && !session.heavier?.[ex.id] && !mine.some((m) => m.exerciseId === ex.id));
  const answer = (exId: string, v: 'yes' | 'no') => patchSession(session.id, { heavier: { ...session.heavier, [exId]: v } });

  return {
    toast, now, exs, groups, mine, history, statuses, extra, setExtra, groupRows, complete, gi, setGi, editing, setEditing, draft, setDraft,
    rest, restHidden, setRestHidden, level, saver, watch, setWatch, swapFor, setSwapFor, coach, setCoach, group, rows, current, activeKey,
    startRest, extendRest, stopRest, defaults, kgEditable, save, afterRow, skip, undoSkip, remove, toggleTempo, finish, def, firstIdx, restLeft,
    nextGroup, groupDone, tired, offerFor, answer, saveCounter };
}
