import { useEffect, useState } from 'react';
import { checksFor } from '../../domain/checks';
import { RINGS } from '../../domain/liveLook';
import { burnNudge, counter, justTags, restoreCounter, seconds, setState } from '../../domain/liveSet';
import { newLoad, recordBar, recordHolder, recordValue } from '../../domain/marks';
import { bottomOfRange, measureOf, sidesFor, valueOfSet, type ExerciseDef, type PlanDef } from '../../domain/plan';
import { adaptiveRest, addSetup, afterSave, lastLoad, loadBlocks, plateChange, plateChanges, setupOn, usualLength } from '../../domain/sessionEdges';
import { movementKind } from '../../domain/trainingChecks';
import { GYM_SAFETY, gymLoadLabel, isDumbbellKind, isGymExercise, isGymKind, isOverheadPress, lightWarmup, loadText, lowerIsHarder, safetyFor, unitFor, unitLabel } from '../../domain/gym';
import { HALF_RULES, HALF_TEXT } from '../../domain/deload';
import { loadOptions } from '../../domain/loads';
import { useSessions } from '../../db/hooks';
import { historyFor } from '../../domain/progression';
import type { LiveCounter, SetEntry, Settings, TrainingSession } from '../../domain/types';
import { patchSession, patchSettings } from '../../db/actions';
import { go } from '../../router';
import { Icon } from '../../ui/Icon';
import { useLiveTheme } from '../../ui/live/useLiveTheme';
import { clock } from '../NextUpCard';
import { HeavierMoment } from '../session/HeavierMoment';
import { findLogged, type Row } from '../session/SetTable';
import { nextGroupIndex, restAfter } from '../session/rows';
import { challengeRest } from '../../domain/setChallenges';
import type { useRunner } from '../session/useRunner';
import { BeforeScreen } from './BeforeScreen';
import { CheckScreen } from './CheckScreen';
import { RecordScreen } from './RecordScreen';
import { SessionLook, SetsLook } from './QuickLooks';
import { fetchRecent, songAt } from '../../sources/lastfm';
import { mmss } from './Frame';
import { GuideScreen } from './GuideScreen';
import { PlatesScreen } from './PlatesScreen';
import { LiveFrame, LiveStage, Primary } from './Frame';
import { RestLive } from './RestLive';
import { effortOf, effortTitle, stepWeight, weightCanChange } from '../../domain/trainWeek';
import { SetScreen } from './SetScreen';

type Runner = ReturnType<typeof useRunner>;

const span = ([lo, hi]: [number, number]) => (lo === hi ? `${lo}` : `${lo}–${hi}`);
/** The plan's range as text: "10–15", "45–60 s". */
const aimOf = (ex: ExerciseDef) => (ex.seconds ? `${span(ex.seconds)} s` : ex.reps && !ex.open ? span(ex.reps) : undefined);
const sideWord = (s: Row['side']) => (s === 'L' ? ' · left' : s === 'R' ? ' · right' : '');

/** The gym's breathing line: the plan's first safety line, its first two sentences. */
const breatheLine = (plan: PlanDef) => (plan.gymSafety?.[0] ?? GYM_SAFETY[0]).text.split(/(?<=\.)\s/).slice(0, 2).join(' ');

type LiveProps = { r: Runner; session: TrainingSession; settings: Settings; plan: PlanDef };

/** The live session, on one aurora that stays put from screen to screen. */
export function LiveSession(p: LiveProps) {
  return (
    <LiveStage>
      <LiveScreens {...p} />
    </LiveStage>
  );
}

/** The session as full screens: count the set, check it, rest, and on to the next. */
function LiveScreens({ r, session, settings, plan }: LiveProps) {
  const theme = useLiveTheme(settings);
  const sessions = useSessions();
  const row = r.current;
  const [c, setC] = useState<LiveCounter>(() => restoreCounter(session.liveSet, row?.key ?? ''));
  const [pending, setPending] = useState<{ row: Row; c: LiveCounter; endedAt: number } | null>(null);
  useEffect(() => {
    if (row) setC(restoreCounter(session.liveSet, row.key));
    // Only a new row resets the counter; the saved copy follows every change.
  }, [row?.key]);

  const nameOf = (ex: ExerciseDef) => r.statuses.get(ex.id)?.name ?? ex.name;
  const leadOf = (ex: ExerciseDef) => {
    const s = sidesFor(ex, session.firstSide?.[ex.id])[0];
    return s === 'both' ? undefined : s;
  };
  /** The last set of this exercise tonight, on the same side when there is one. */
  const prevOf = (x: Row): SetEntry | undefined => {
    const done = r.mine.filter((s) => s.exerciseId === x.ex.id && !s.skipped && !s.drop).sort((a, b) => b.at - a.at);
    return done.find((s) => s.side === x.side) ?? done[0];
  };
  const priorOf = (x: Row) => historyFor(x.ex, settings.planState, [...r.history, ...r.mine.filter((s) => s.id !== findLogged(r.mine, x)?.id)]);
  const barOf = (x: Row) => recordBar({ side: x.side, loadKg: r.defaults(x).kg, drop: x.drop }, priorOf(x), bottomOfRange(x.ex) ?? 1, { clean: settings.formRecordsClean !== false, lowerIsHarder: lowerIsHarder(x.ex) });
  const firstAt = (x: Row) => newLoad({ side: x.side, loadKg: r.defaults(x).kg }, priorOf(x), { lowerIsHarder: lowerIsHarder(x.ex) });
  /** The load as words: "6 kg", or for gym kit "stack 7 kg", "40 kg total", "assist 25 kg". */
  const kgTextOf = (x: Row) => {
    const kg = r.defaults(x).kg;
    return kg === null ? undefined : isGymKind(x.ex.load) ? loadText(x.ex.load, kg, unitFor(x.ex, settings)) : `${kg} kg`;
  };
  /** Dumbbell loads only: a stack number is never a plate change. */
  const dumbbellKg = (ex: ExerciseDef, kg: number | null) => (isDumbbellKind(ex.load) ? kg : null);
  const [saving, setSaving] = useState(false);
  const [look, setLook] = useState<null | 'sets' | 'session'>(null);
  const [record, setRecord] = useState<{ row: Row; name: string; kg: number | null; kgText?: string; value: string; was?: { value: string; date: string } } | null>(null);
  const [song, setSong] = useState<string | undefined>();
  useEffect(() => {
    if (!record) return setSong(undefined);
    let live = true;
    // Best effort: what was playing, if Last.fm is set up and online.
    void fetchRecent(settings, session.startedAt, Date.now()).then((plays) => {
      const s = songAt(Date.now(), plays);
      if (live && s) setSong(`${s.track} · ${s.artist}`);
    });
    return () => {
      live = false;
    };
  }, [record, settings, session.startedAt]);

  const firstRow = (ex: ExerciseDef): Row => ({ ex, setNo: 1, side: sidesFor(ex, session.firstSide?.[ex.id])[0], drop: false, key: `${ex.id}:first` });
  const blocks = loadBlocks(r.exs, (ex) => dumbbellKg(ex, r.defaults(firstRow(ex)).kg));
  const usual = usualLength(sessions ?? [], [...r.history, ...r.mine], session.session, r.def?.minutes ?? 60);
  const sore = (session.legSoreness ?? 0) >= 4;
  const blockItems = blocks.map((b) => ({ kg: b.kg, items: b.exs.map((ex) => ({ name: nameOf(ex), light: sore && movementKind(ex) === 'legs', load: gymLoadLabel(ex.load, r.defaults(firstRow(ex)).kg, unitFor(ex, settings)) })) }));
  const lookEx = row?.ex ?? r.group[0];

  const [scope, setScope] = useState<'good' | 'once'>('good');
  /** Minus and plus work for dumbbells and gym kit, not drops or bodyweight. */
  const kgStepOf = (x: Row) => !x.drop && weightCanChange(x.ex);
  /** "stack · seat 4": what the number is, and the machine's setup when one is saved. */
  const loadNoteOf = (x: Row) => {
    const setup = setupOn(settings, x.ex, session.date);
    const kind = x.ex.load === 'stack' ? 'stack' : x.ex.load === 'assist' ? 'assist' : x.ex.load === 'plates' ? 'plates added' : x.ex.load === 'barbell' ? 'bar total' : x.ex.load === 'pair' ? 'each hand' : undefined;
    return [kind, setup].filter(Boolean).join(' · ') || undefined;
  };
  /** One step lighter or heavier: for the rest of tonight and next time, or for this set only. */
  const stepLoad = async (x: Row, dir: -1 | 1) => {
    const kg = stepWeight(x.ex, r.defaults(x).kg, dir, settings);
    if (kg === null) return;
    if (scope === 'once') {
      await patchSession(session.id, { loadOnce: { key: x.key, kg } });
      return;
    }
    await patchSession(session.id, { loadSet: { ...session.loadSet, [x.ex.id]: kg }, ...(session.loadOnce?.key === x.key ? { loadOnce: undefined } : {}) });
    await patchSettings((s) => ({ loadNext: { ...s.loadNext, [x.ex.id]: { kg, at: Date.now() } } }));
  };

  const top = (
    <>
      <header className="lv-top">
        <button type="button" className="lv-icon" aria-label="Minimise session" onClick={() => go('/today')}>
          <Icon name="down" size={22} stroke={1.8} />
        </button>
        <span className="lv-title">
          <span className="t14">{r.def?.name ?? `Session ${session.session}`}</span>
          <b className="num tn">{clock(r.now - session.startedAt)}</b>
        </span>
        <span className="row" style={{ gap: 6 }}>
          <button type="button" className="lv-chipbtn" onClick={() => setLook('sets')}>
            Sets
          </button>
          <button type="button" className="lv-chipbtn" onClick={() => setLook('session')}>
            Session
          </button>
        </span>
      </header>
      <nav className="lv-strip" aria-label="Exercises">
        {r.groups.map((g, i) => (
          <button key={g[0].id} type="button" className={i === r.gi ? 'cur' : r.complete(i) ? 'done' : ''} aria-label={`${g.map(nameOf).join(' + ')}${r.complete(i) ? ', done' : ''}`} aria-current={i === r.gi} onClick={() => (setPending(null), r.setGi(i))}>
            {i + 1}
            {r.complete(i) && i !== r.gi ? ' ✓' : ''}
          </button>
        ))}
      </nav>
      {look === 'session' && (
        <SessionLook
          blocks={blockItems}
          usual={usual}
          startedAt={session.startedAt}
          onList={() => patchSession(session.id, { view: 'list' })}
          onFinish={() => (setLook(null), r.finish())}
          onClose={() => setLook(null)}
        />
      )}
      {look === 'sets' && lookEx && (
        <SetsLook
          name={nameOf(lookEx)}
          rows={r.rows
            .filter((x) => x.ex.id === lookEx.id)
            .map((x) => {
              const done = findLogged(r.mine, x);
              const last = r.statuses.get(x.ex.id)?.last?.sets.find((s) => s.setNo === x.setNo && s.side === x.side && !!s.drop === x.drop);
              const v = (s?: SetEntry) => (s && !s.skipped ? (x.ex.seconds ? mmss(valueOfSet(s) ?? 0) : String(valueOfSet(s) ?? '')) : undefined);
              return { label: `Set ${x.setNo}${x.drop ? ' drop' : ''}${sideWord(x.side)}`, tonight: done?.skipped ? 'skipped' : v(done), last: v(last), tags: done ? justTags(done) : [] };
            })}
          note={session.exNotes?.[lookEx.id]}
          onClose={() => setLook(null)}
        />
      )}
    </>
  );


  if (!session.beforeDone && !r.mine.length) {
    return (
      <BeforeScreen
        name={r.def?.name ?? `Session ${session.session}`}
        usual={usual}
        startedAt={session.startedAt}
        blocks={blockItems}
        changes={plateChanges(blocks)}
        legs={r.exs.some((ex) => movementKind(ex) === 'legs')}
        soreness={session.legSoreness}
        onSoreness={(n) => patchSession(session.id, { legSoreness: n })}
        warmup={plan.warmup}
        half={session.half ? `${HALF_TEXT[session.half]}: ${HALF_RULES.toLowerCase()}` : undefined}
        gym={session.place === 'gym'}
        onStart={() => patchSession(session.id, { beforeDone: true })}
        top={top}
      />
    );
  }

  if (record) {
    const { row: done, ...shown } = record;
    return (
      <RecordScreen
        {...shown}
        song={song}
        onGo={() => {
          setRecord(null);
          // The rest held back for the record starts now, at full length.
          r.afterRow(done);
        }}
      />
    );
  }

  if (pending) {
    const x = pending.row;
    const timed = measureOf(x.ex) === 'seconds';
    const counted = timed ? seconds(pending.c, pending.endedAt) : pending.c.taps.length;
    const d = r.defaults(x);
    // Timed with one tap and no reps counted: start from last time's count, then minus and plus.
    const start = counted > 0 ? counted : d.val ?? bottomOfRange(x.ex) ?? 10;
    const bar = barOf(x);
    const prev = prevOf(x);
    const lastVal = d.last && !d.last.skipped ? valueOfSet(d.last) : undefined;
    const took = pending.c.startedAt !== undefined ? mmss(Math.max(0, Math.round((pending.endedAt - pending.c.startedAt) / 1000))) : undefined;
    // What Save leads to: the partner in a back-to-back pair, else the rest.
    const after = restAfter(r.rows, (y) => !!findLogged(r.mine, y), x);
    const nextRow = r.rows[r.rows.findIndex((y) => y.key === x.key) + 1];
    const g = r.groups.find((gr) => gr.some((e) => e.id === x.ex.id)) ?? [x.ex];
    const restSec = Math.max(...g.map((e) => adaptiveRest(challengeRest(e, {}), r.statuses.get(e.id)?.last?.sets.filter((s) => s.exerciseId === e.id) ?? []).sec));
    const restText = after === 'rest' ? `rest ${mmss(restSec)}` : after === 'glide' && nextRow && nextRow.ex.id !== x.ex.id ? `then ${nameOf(nextRow.ex)}` : undefined;
    return (
      <CheckScreen
        key={x.key}
        reps={start}
        unit={timed ? 'seconds' : 'reps'}
        stateFor={(v, recordOk) => setState({ reps: v, burnAt: pending.c.burnAt, bottom: bottomOfRange(x.ex), bar: recordOk ? bar : undefined })}
        state={setState({ reps: start, burnAt: pending.c.burnAt, bottom: bottomOfRange(x.ex), bar })}
        unrecord={setState({ reps: start, burnAt: pending.c.burnAt, bottom: bottomOfRange(x.ex) })}
        bar={bar}
        clean={settings.formRecordsClean !== false}
        checks={checksFor(x.ex)}
        prev={prev ? { checks: prev.checks, rir: prev.rir } : undefined}
        last={lastVal}
        title={[nameOf(x.ex), kgTextOf(x), took].filter(Boolean).join(' · ') + sideWord(x.side)}
        rest={restText}
        onBody={() => void r.logBody(x)}
        detail={`${timed ? 'held' : 'reps'}${kgTextOf(x) ? ` at ${kgTextOf(x)}` : ''}${sideWord(x.side)}`}
        top={top}
        saving={saving}
        firstAtLoad={firstAt(x)}
        onSave={async ({ checks, rir, val }) => {
          // One save per set: a second tap while this one is writing does nothing.
          if (saving) return;
          setSaving(true);
          try {
            const res = await r.save(x, { val, startedAt: pending.c.startedAt, endedAt: pending.endedAt, burnAt: pending.c.burnAt, checks, rir });
            if (res === 'invalid') return;
            setPending(null);
            if (afterSave(res, 'none') === 'record') {
              const kg = r.defaults(x).kg;
              const clean = settings.formRecordsClean !== false;
              const best = firstAt(x) ? undefined : recordHolder({ side: x.side, loadKg: kg }, priorOf(x), { clean, lowerIsHarder: lowerIsHarder(x.ex) });
              const shown = (v: number) => (timed ? mmss(v) : String(v));
              setRecord({ row: x, name: nameOf(x.ex), kg, kgText: kgTextOf(x), value: shown(val), was: best ? { value: shown(recordValue(best, clean)), date: best.date } : undefined });
            }
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  // What comes after the rest: the next row here, or the next exercise's first set.
  const ni = nextGroupIndex(r.groups.map((_, i) => r.complete(i)), r.gi);
  const nextG = ni === undefined ? undefined : r.groups[ni];
  const following = nextG?.[0];
  const upNext: Row | undefined = row ?? (following && { ex: following, setNo: 1, side: sidesFor(following, session.firstSide?.[following.id])[0], drop: false, key: '' });
  const lastDone = [...r.mine].filter((s) => !s.skipped).sort((a, b) => b.at - a.at)[0];
  const lastEx = lastDone && r.exs.find((e) => e.id === lastDone.exerciseId);
  const from = lastDone ? setState({ reps: valueOfSet(lastDone) ?? 0, burnAt: lastDone.burnAt, bottom: lastEx && bottomOfRange(lastEx), bar: lastDone.mark === '!!' ? -1 : undefined }) : 'build';

  if (r.rest && r.restLeft > 0) {
    return (
      <RestLive
        endsAt={r.rest.endsAt}
        total={r.rest.total}
        now={r.now}
        from={from}
        just={lastDone ? justTags(lastDone) : []}
        next={
          upNext
            ? {
                label: upNext.ex.id === lastDone?.exerciseId ? `Set ${upNext.setNo}${sideWord(upNext.side)}` : nameOf(upNext.ex),
                kg: r.defaults(upNext).kg,
                kgText: kgTextOf(upNext),
                aim: aimOf(upNext.ex),
                tempo: !!session.tempo?.[upNext.ex.id],
                cue: upNext.ex.cue,
              }
            : null
        }
        note={lastDone ? session.exNotes?.[lastDone.exerciseId] : undefined}
        onNote={lastDone ? (text) => patchSession(session.id, { exNotes: { ...session.exNotes, [lastDone.exerciseId]: text } }) : undefined}
        why={session.restWhy}
        onMore={() => r.extendRest(30)}
        onReady={() => {
          r.stopRest();
          if (!row && ni !== undefined) r.setGi(ni);
        }}
        rings={RINGS[theme]}
        top={top}
      />
    );
  }

  if (!row) {
    return (
      <LiveFrame state="calm" top={top}>
        <div className="lv-ex" style={{ marginTop: 24 }}>
          <h1 className="lv-name">{nextG ? `Up next: ${nextG.map(nameOf).join(' + ')}` : 'Every set is in'}</h1>
        </div>
        <div style={{ marginTop: 'auto' }}>
          {nextG ? <Primary onClick={() => r.setGi(ni!)}>Start {nameOf(nextG[0])}</Primary> : <Primary onClick={r.finish}>Finish session</Primary>}
        </div>
      </LiveFrame>
    );
  }

  if (measureOf(row.ex) === 'steps') {
    return (
      <LiveFrame state="calm" top={top}>
        <h1 className="lv-name">{nameOf(row.ex)}</h1>
        <p className="lv-small">Steps are logged in the list.</p>
        <div style={{ marginTop: 'auto' }}>
          <Primary onClick={() => patchSession(session.id, { view: 'list' })}>Open the list</Primary>
        </div>
      </LiveFrame>
    );
  }

  const prev = prevOf(row);
  const lead = leadOf(row.ex);

  const firstOfEx = !r.mine.some((m) => m.exerciseId === row.ex.id);
  if (firstOfEx && !session.platesSeen?.includes(row.ex.id)) {
    const lastKg = lastLoad(r.mine.filter((m) => { const e = r.exs.find((x) => x.id === m.exerciseId); return !e || isDumbbellKind(e.load); }));
    const kg = dumbbellKg(row.ex, r.defaults(row).kg);
    const change = plateChange(lastKg, kg);
    const collar = !!row.ex.overFace && !session.collarCheckedAt;
    if (change || collar) {
      const block = blocks.find((b) => b.exs.some((e) => e.id === row.ex.id));
      return (
        <PlatesScreen
          change={change}
          forNames={(block?.exs ?? [row.ex]).filter((e) => !r.mine.some((m) => m.exerciseId === e.id) && r.defaults(firstRow(e)).kg === kg).map(nameOf)}
          collar={collar}
          onGo={(ticked) => patchSession(session.id, { platesSeen: [...(session.platesSeen ?? []), row.ex.id], ...(ticked ? { collarCheckedAt: Date.now() } : {}) })}
          top={top}
        />
      );
    }
  }

  if (row.setNo === 1 && !row.drop && !session.guided?.includes(row.ex.id) && !r.mine.some((m) => m.exerciseId === row.ex.id)) {
    return (
      <GuideScreen
        ex={row.ex}
        name={nameOf(row.ex)}
        kg={r.defaults(row).kg}
        lead={lead}
        tempo={!!session.tempo?.[row.ex.id]}
        setup={setupOn(settings, row.ex, session.date)}
        onSetup={(text) => patchSettings((s) => ({ setups: addSetup(s.setups, row.ex.id, session.date, text) }))}
        checks={checksFor(row.ex)}
        kgText={kgTextOf(row)}
        safety={safetyFor(row.ex, plan)}
        warmup={session.heavyFirst && isOverheadPress(row.ex) ? lightWarmup(loadOptions(settings.equipment, 'pair')[0]) : undefined}
        onGo={() => {
          void patchSession(session.id, { guided: [...(session.guided ?? []), row.ex.id] });
          // "Start set 1" starts the set's clock too. Not for a timed set: its clock is the set itself.
          if (measureOf(row.ex) !== 'seconds') {
            const n = counter(c.key === row.key ? c : restoreCounter(null, row.key), { t: 'start', at: Date.now() });
            setC(n);
            r.saveCounter(n);
          }
        }}
        top={top}
      />
    );
  }
  const offer = r.offerFor?.ex.id === row.ex.id ? r.offerFor.offer : undefined;
  /** The other half of a back-to-back pair, when this exercise is in one. */
  function pairOf(ex: ExerciseDef): string | undefined {
    const g = r.groups.find((x) => x.some((e) => e.id === ex.id));
    const other = g && g.length > 1 ? g.find((e) => e.id !== ex.id) : undefined;
    return other ? nameOf(other) : undefined;
  }
  return (
    <>
      <SetScreen
        row={row}
        name={nameOf(row.ex)}
        kg={r.defaults(row).kg}
        aim={aimOf(row.ex)}
        bottom={bottomOfRange(row.ex)}
        bar={barOf(row)}
        firstAtLoad={firstAt(row)}
        tempo={!!session.tempo?.[row.ex.id]}
        timed={measureOf(row.ex) === 'seconds'}
        nudge={!session.half && burnNudge(row.ex, prev) && (row.side === 'both' || row.side === lead)}
        kgText={kgTextOf(row)}
        unit={isGymKind(row.ex.load) ? unitLabel(row.ex.load, unitFor(row.ex, settings)) : undefined}
        onLoad={isGymKind(row.ex.load) ? () => void r.pickLoad(row.ex, r.defaults(row).kg) : undefined}
        onBody={() => void r.logBody(row)}
        half={session.half ? `${HALF_TEXT[session.half]} · stop 3 reps short` : session.easy ? 'First gym week' : undefined}
        effort={effortTitle(effortOf(row.ex, plan, session.half ? { rir: 3 } : session.easy))}
        pair={pairOf(row.ex)}
        breathe={isGymExercise(row.ex) ? breatheLine(plan) : undefined}
        loadNote={loadNoteOf(row)}
        step={
          kgStepOf(row)
            ? {
                scope,
                onScope: setScope,
                changed: session.loadOnce?.key === row.key || session.loadSet?.[row.ex.id] !== undefined,
                onStep: (dir) => void stepLoad(row, dir),
              }
            : undefined
        }
        leadSide={lead}
        c={c.key === row.key ? c : restoreCounter(null, row.key)}
        onCounter={(n) => {
          setC(n);
          r.saveCounter(n);
        }}
        onDone={() => setPending({ row, c, endedAt: Date.now() })}
        onSkip={() => void r.askSkip(row)}
        theme={theme}
        buzz={!!settings.prefs.buzz}
        now={r.now}
        top={top}
      />
      {offer && <HeavierMoment exercise={nameOf(row.ex)} offer={offer} onYes={() => r.answer(row.ex.id, 'yes')} onNo={() => r.answer(row.ex.id, 'no')} />}
    </>
  );
}
