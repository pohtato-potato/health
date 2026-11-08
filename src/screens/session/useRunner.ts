import { useEffect, useMemo, useRef, useState } from 'react';
import { buzz, scheduleDing, unlockAudio, wakeLockManager } from '../../audio';
import { describe, findLogged, type Draft, type Row } from './SetTable';
import { markFor } from '../../domain/marks';
import { challengeRest } from '../../domain/setChallenges';
import {
  bottomOfRange,
  buildSession,
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
import type { BodyKind, LiveCounter, SetEntry, Settings, SkipReason, TrainingSession } from '../../domain/types';
import { addBodyEntry, deleteSet, discardSession, logSet, patchSession, patchSettings } from '../../db/actions';
import { halfSets } from '../../domain/deload';
import { BODY_PARTS, heavyFirstOffer, isDumbbellKind, isGymKind, lowerIsHarder, machineKey, machineUnit, protectedLeft, SKIP_REASONS, unitFor, unitLabel } from '../../domain/gym';
import { askChoice } from '../../ui/Confirm';
import { setLastSetAt, setRestRunning } from '../../state/restState';
import { useNow } from '../../db/hooks';
import { go } from '../../router';
import { useToast } from '../../ui/Toasts';
import { resumeRest, type ActiveRest } from '../../domain/rest';
import { askConfirm } from '../../ui/Confirm';
import { fmtDayMonth } from '../../domain/format';
import { db } from '../../db/db';
import { useMoments } from '../../ui/Moments';
import { detectFirsts } from '../../domain/firsts';
import { liveFields, restAfter, rowsFor, type LiveInput } from './rows';
import { adaptiveRest, legSets, loadBlocks } from '../../domain/sessionEdges';

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
        // Half sets (a lighter week, the first session back, a sick day); sessions from before keep the old one-fewer lighter week.
        .map((e) => (session.half ? { ...e, sets: halfSets(e.sets) } : session.lighter ? { ...e, sets: Math.max(1, e.sets - 1) } : e))
        .map((e) => ({ ...e, sets: Math.min(e.sets, legSets(e, session.legSoreness)) })),
    [session.exercises, plan, session.lighter, session.half, session.legSoreness],
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
    if (settings.prefs.ding) cancelDing.current = scheduleDing(sec);
    buzzTimer.current = window.setTimeout(() => buzz([90, 70, 90]), sec * 1000);
  };
  const extendRest = (sec: number) => {
    if (!rest) return;
    // The reason named the old length; after +30 s it would be wrong.
    if (session.restWhy) void patchSession(session.id, { restWhy: undefined });
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
    const picked = session.loadSet?.[r.ex.id];
    const kg = r.drop ? r.ex.drop?.kg ?? null : picked ?? loadSoFar(mine, r.ex.id, loadTonight(st, session.heavier?.[r.ex.id]));
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

  const kgEditable = (r: Row) => r.ex.load === 'pair' || r.ex.load === 'single' || isGymKind(r.ex.load) || (r.ex.load === 'body' && loadTonight(statuses.get(r.ex.id)!, session.heavier?.[r.ex.id]) !== null) || r.drop;

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
    const loadUnit = asSaved.loadKg !== null ? unitFor(r.ex, settings) : undefined;
    const base = { setNo: r.setNo, side: r.side, loadKg: asSaved.loadKg, ...(loadUnit ? { loadUnit } : {}), tempo, drop: r.drop || undefined, ...(firstSide ? { firstSide } : {}), ...quality, ...liveFields(prev, live) };
    const measure = measured(r.ex, val);
    // A record has to beat everything before it, earlier sets tonight included.
    const before = [...history, ...mine.filter((s) => s.id !== existing?.id && (!existing || s.at < existing.at))];
    const mark = markFor({ ...base, ...measure }, historyFor(r.ex, settings.planState, before), st.last?.sets ?? [], bottomOfRange(r.ex) ?? 1, { clean: settings.formRecordsClean !== false, lowerIsHarder: lowerIsHarder(r.ex) });
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
    // From the live screens a record gets its own screen, and the rest waits for it.
    if (mark === '!!' && live) return mark;
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
      // Each exercise's rest follows how its reps held up last time; a superset rests for the longest.
      const rests = group.map((e) => adaptiveRest(challengeRest(e, e.id === r.ex.id ? { challenges: done?.challenges ?? draft.challenges } : {}), statuses.get(e.id)?.last?.sets.filter((s) => s.exerciseId === e.id) ?? []));
      const longest = rests.reduce((a, b) => (b.sec > a.sec ? b : a));
      void patchSession(session.id, { restWhy: longest.why });
      startRest(longest.sec);
    } else if (after === 'glide') {
      window.setTimeout(() => document.getElementById(`row-${next.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    }
  };

  /** Skipped sets count as done for the flow and for nothing else. */
  const skip = async (r: Row, why?: SkipReason) => {
    const st = statuses.get(r.ex.id)!;
    await logSet({ sessionId: session.id, date: session.date, session: session.session, exerciseId: r.ex.id, exercise: st.name, at: Date.now(), setNo: r.setNo, side: r.side, loadKg: null, drop: r.drop || undefined, skipped: true, ...(why ? { skipWhy: why } : {}) });
    setEditing(null);
    setDraft({});
    afterRow(r, false);
  };
  /** Skip, with the coach's reasons on offer (none is fine too). Cancel keeps the set. */
  const askSkip = async (r: Row) => {
    const pick = await askChoice({
      title: 'Why skip it?',
      body: 'The coach reads this in the export, so a skip can be fixed.',
      options: [...SKIP_REASONS.map((x) => ({ id: x.id, label: x.label })), { id: 'none', label: 'Just skip it' }],
      cancel: 'Keep the set',
    });
    if (!pick) return;
    await skip(r, pick.id === 'none' ? undefined : (pick.id as SkipReason));
  };

  /** Tonight's load for a gym exercise, typed on the set screen. For a stack, the machine's unit is set here once and remembered. */
  const pickLoad = async (ex: ExerciseDef, current: number | null) => {
    const unit = unitFor(ex, settings);
    const stacky = ex.load === 'stack' || ex.load === 'assist';
    const res = await askChoice({
      title: ex.load === 'assist' ? 'Assist tonight' : ex.load === 'plates' ? 'Plates added' : ex.load === 'barbell' ? 'Bar total' : 'Stack number',
      body: ex.load === 'barbell' ? 'Total kg, bar included.' : ex.load === 'plates' ? `Plates added, not the sled.${ex.sledKg ? ` The sled is ${ex.sledKg} kg.` : ''}` : ex.load === 'assist' ? 'The assist number: less assist is progress.' : 'The number this machine’s stack shows. Never compared with another machine.',
      input: { label: `In ${unitLabel(ex.load, unit)}`, value: current?.toString() ?? '', inputMode: 'decimal' },
      options: [
        { id: 'save', label: 'Use this' },
        ...(stacky ? (['kg', 'lb', 'stack'] as const).map((u) => ({ id: `unit:${u}`, label: u === 'stack' ? 'This stack shows plain numbers' : `This stack is in ${u}`, on: machineUnit(ex, settings) === u })) : []),
      ],
    });
    if (!res) return;
    if (res.id.startsWith('unit:')) {
      const u = res.id.slice(5) as 'kg' | 'lb' | 'stack';
      await patchSettings((s) => ({ machineUnits: { ...s.machineUnits, [machineKey(ex)]: u } }));
    }
    const v = parseFloat(res.text);
    if (Number.isFinite(v) && v >= 0) await patchSession(session.id, { loadSet: { ...session.loadSet, [ex.id]: v } });
  };

  /** A pain or strain entry made during a set: it carries the exercise, side and set. */
  const logBody = async (r: Row) => {
    const part = await askChoice({ title: 'Where?', options: BODY_PARTS.map((p) => ({ id: p, label: p })), cancel: 'Never mind' });
    if (!part) return;
    const side = await askChoice({ title: `${part.id}: which side?`, options: [{ id: 'L', label: 'Left' }, { id: 'R', label: 'Right' }, { id: 'both', label: 'Both, or the middle' }], cancel: 'Never mind' });
    if (!side) return;
    const kind = await askChoice({
      title: 'What kind?',
      input: { label: 'A note (optional)', placeholder: 'e.g. sharp at the top of the rep' },
      options: [{ id: 'pain', label: 'Pain' }, { id: 'strain', label: 'Strain' }, { id: 'sore', label: 'Sore' }, { id: 'tight', label: 'Tight' }],
      cancel: 'Never mind',
    });
    if (!kind) return;
    await addBodyEntry({ part: part.id, side: side.id as 'L' | 'R' | 'both', kind: kind.id as BodyKind, note: kind.text.trim() || undefined, exerciseId: r.ex.id, exercise: statuses.get(r.ex.id)?.name ?? r.ex.name, setNo: r.setNo, setSide: r.side, sessionId: session.id });
    toast({ text: `Logged: ${kind.id} in the ${part.id.toLowerCase()}. If it hurts, stop this exercise.` });
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
    // Heavy block first: the light work it put off can't be dropped quietly. Asked once.
    const protect = session.heavyFirst && !session.protectAsked ? protectedLeft(heavyProtect(), mine) : [];
    if (protect.length) {
      void patchSession(session.id, { protectAsked: true });
      const names = protect.map((id) => statuses.get(id)?.name ?? id).map((n) => n.toLowerCase());
      const go2 = await askConfirm({ title: 'Shoulders first?', body: `2 sets of ${names.join(' / ')} before you finish?`, yes: 'Do 2 sets', no: 'Finish anyway' });
      if (go2) {
        const i = groups.findIndex((g) => g.some((e) => e.id === protect[0]));
        if (i >= 0) setGi(i);
        return;
      }
    }
    stopRest();
    go('/session/done', undefined, { replace: true });
  };

  /** The light block the heavy one jumped: the plan's order says which exercises came before it. */
  const heavyProtect = () => {
    const planned = buildSession(plan, session.session, { short: session.short });
    const kgOf = (e: ExerciseDef) => (isDumbbellKind(e.load) ? statuses.get(e.id)?.loadKg ?? e.startKg ?? null : null);
    return (heavyFirstOffer(loadBlocks(planned, kgOf))?.protect ?? []).filter((id) => exs.some((e) => e.id === id));
  };

  const def = findSession(plan, session.session);
  const firstIdx = exs.indexOf(group[0]);
  const restLeft = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0;
  setRestRunning(restLeft > 0);
  const nextGroup = groups[gi + 1];
  const groupDone = complete(gi);
  const tired = session.tiredHands ?? (groups.slice(0, gi).some((g) => g.some((e) => e.tiredHands)));
  // Half-set nights don't chase records: no "ready for heavier?".
  const offerFor = session.half ? undefined : group
    .map((ex) => ({ ex, offer: heavierOffer(statuses.get(ex.id)!) }))
    .find(({ ex, offer }) => offer && !session.heavier?.[ex.id] && !mine.some((m) => m.exerciseId === ex.id));
  const answer = (exId: string, v: 'yes' | 'no') => patchSession(session.id, { heavier: { ...session.heavier, [exId]: v } });

  return {
    toast, now, exs, groups, mine, history, statuses, extra, setExtra, groupRows, complete, gi, setGi, editing, setEditing, draft, setDraft,
    rest, watch, setWatch, swapFor, setSwapFor, coach, setCoach, group, rows, current, activeKey,
    startRest, extendRest, stopRest, defaults, kgEditable, save, afterRow, skip, askSkip, pickLoad, logBody, undoSkip, remove, toggleTempo, finish, def, firstIdx, restLeft,
    nextGroup, groupDone, tired, offerFor, answer, saveCounter };
}
