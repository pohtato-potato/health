import { useEffect, useState } from 'react';
import { checksFor } from '../../domain/checks';
import { RINGS } from '../../domain/liveLook';
import { burnNudge, justTags, restoreCounter, seconds, setState } from '../../domain/liveSet';
import { newLoad, recordBar } from '../../domain/marks';
import { bottomOfRange, measureOf, sidesFor, valueOfSet, type ExerciseDef, type PlanDef } from '../../domain/plan';
import { addSetup, loadBlocks, plateChange, plateChanges, setupOn, usualLength } from '../../domain/sessionEdges';
import { dayKey } from '../../domain/dates';
import { movementKind } from '../../domain/trainingChecks';
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
import type { useRunner } from '../session/useRunner';
import { BeforeScreen } from './BeforeScreen';
import { CheckScreen } from './CheckScreen';
import { GuideScreen } from './GuideScreen';
import { PlatesScreen } from './PlatesScreen';
import { LiveFrame, Primary } from './Frame';
import { RestLive } from './RestLive';
import { SetScreen } from './SetScreen';

type Runner = ReturnType<typeof useRunner>;

const span = ([lo, hi]: [number, number]) => (lo === hi ? `${lo}` : `${lo}–${hi}`);
/** The plan's range as text: "10–15", "45–60 s". */
const aimOf = (ex: ExerciseDef) => (ex.seconds ? `${span(ex.seconds)} s` : ex.reps && !ex.open ? span(ex.reps) : undefined);
const sideWord = (s: Row['side']) => (s === 'L' ? ' · left' : s === 'R' ? ' · right' : '');

/** The session as full screens: count the set, check it, rest, and on to the next. */
export function LiveSession({ r, session, settings, plan }: { r: Runner; session: TrainingSession; settings: Settings; plan: PlanDef }) {
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
  const barOf = (x: Row) => recordBar({ side: x.side, loadKg: r.defaults(x).kg, drop: x.drop }, priorOf(x), bottomOfRange(x.ex) ?? 1, { clean: settings.formRecordsClean !== false });
  const firstAt = (x: Row) => newLoad({ side: x.side, loadKg: r.defaults(x).kg }, priorOf(x));
  const [saving, setSaving] = useState(false);
  const [platesSeen, setPlatesSeen] = useState<string[]>([]);

  const top = (
    <>
      <header className="lv-top">
        <button type="button" className="lv-icon" aria-label="Minimise session" onClick={() => go('/today')}>
          <Icon name="down" size={22} stroke={1.8} />
        </button>
        <span className="lv-title">
          <span className="t13">{r.def?.name ?? `Session ${session.session}`}</span>
          <b className="num tn">{clock(r.now - session.startedAt)}</b>
        </span>
        <span className="row" style={{ gap: 6 }}>
          <button type="button" className="lv-chipbtn" onClick={() => patchSession(session.id, { view: 'list' })}>
            List
          </button>
          <button type="button" className="lv-chipbtn" onClick={r.finish}>
            Finish
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
    </>
  );

  const saver = r.saver;
  const firstRow = (ex: ExerciseDef): Row => ({ ex, setNo: 1, side: sidesFor(ex, session.firstSide?.[ex.id])[0], drop: false, key: `${ex.id}:first` });
  const blocks = loadBlocks(r.exs, (ex) => r.defaults(firstRow(ex)).kg);
  const usual = usualLength(sessions ?? [], [...r.history, ...r.mine], session.session, r.def?.minutes ?? 60);

  if (!session.beforeDone && !r.mine.length) {
    const sore = (session.legSoreness ?? 0) >= 4;
    return (
      <BeforeScreen
        name={r.def?.name ?? `Session ${session.session}`}
        usual={usual}
        startedAt={session.startedAt}
        blocks={blocks.map((b) => ({ kg: b.kg, items: b.exs.map((ex) => ({ name: nameOf(ex), light: sore && movementKind(ex) === 'legs' })) }))}
        changes={plateChanges(blocks)}
        legs={r.exs.some((ex) => movementKind(ex) === 'legs')}
        soreness={session.legSoreness}
        onSoreness={(n) => patchSession(session.id, { legSoreness: n })}
        warmup={plan.warmup}
        onStart={() => patchSession(session.id, { beforeDone: true })}
        saver={saver}
        top={top}
      />
    );
  }

  if (pending) {
    const x = pending.row;
    const timed = measureOf(x.ex) === 'seconds';
    const val = timed ? seconds(pending.c, pending.endedAt) : pending.c.taps.length;
    const bar = barOf(x);
    const prev = prevOf(x);
    return (
      <CheckScreen
        key={x.key}
        reps={val}
        unit={timed ? 'seconds' : 'reps'}
        state={setState({ reps: val, burnAt: pending.c.burnAt, bottom: bottomOfRange(x.ex), bar })}
        unrecord={setState({ reps: val, burnAt: pending.c.burnAt, bottom: bottomOfRange(x.ex) })}
        bar={bar}
        clean={settings.formRecordsClean !== false}
        checks={checksFor(x.ex)}
        prev={prev ? { checks: prev.checks, rir: prev.rir } : undefined}
        saver={saver}
        detail={`${timed ? 'held' : 'reps'}${r.defaults(x).kg !== null ? ` at ${r.defaults(x).kg} kg` : ''}${sideWord(x.side)}`}
        top={top}
        saving={saving}
        firstAtLoad={firstAt(x)}
        onSave={async ({ checks, rir }) => {
          // One save per set: a second tap while this one is writing does nothing.
          if (saving) return;
          setSaving(true);
          try {
            const res = await r.save(x, { val, startedAt: pending.c.startedAt, endedAt: pending.endedAt, burnAt: pending.c.burnAt, checks, rir });
            if (res !== 'invalid') setPending(null);
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  // What comes after the rest: the next row here, or the next exercise's first set.
  const following = r.nextGroup?.[0];
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
          if (!row && r.nextGroup) r.setGi(r.gi + 1);
        }}
        saver={saver}
        rings={RINGS[theme]}
        top={top}
      />
    );
  }

  if (!row) {
    return (
      <LiveFrame state="calm" saver={saver} top={top}>
        <div className="lv-ex" style={{ marginTop: 24 }}>
          <h1 className="lv-name">{r.nextGroup ? `Up next: ${r.nextGroup.map(nameOf).join(' + ')}` : 'Every set is in'}</h1>
        </div>
        <div style={{ marginTop: 'auto' }}>
          {r.nextGroup ? <Primary onClick={() => r.setGi(r.gi + 1)}>Start {nameOf(r.nextGroup[0])}</Primary> : <Primary onClick={r.finish}>Finish session</Primary>}
        </div>
      </LiveFrame>
    );
  }

  if (measureOf(row.ex) === 'steps') {
    return (
      <LiveFrame state="calm" saver={saver} top={top}>
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
  if (firstOfEx && !platesSeen.includes(row.ex.id)) {
    const lastKg = [...r.mine].filter((s) => !s.skipped).sort((a, b) => b.at - a.at)[0]?.loadKg;
    const kg = r.defaults(row).kg;
    const change = plateChange(lastKg, kg);
    const collar = !!row.ex.overFace && !session.collarCheckedAt;
    if (change || collar) {
      const block = blocks.find((b) => b.exs.some((e) => e.id === row.ex.id));
      return (
        <PlatesScreen
          change={change}
          forNames={(block?.exs ?? [row.ex]).filter((e) => !r.mine.some((m) => m.exerciseId === e.id)).map(nameOf)}
          collar={collar}
          onCollar={() => patchSession(session.id, { collarCheckedAt: Date.now() })}
          onGo={() => setPlatesSeen([...platesSeen, row.ex.id])}
          saver={saver}
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
        onSetup={(text) => patchSettings((s) => ({ setups: addSetup(s.setups, row.ex.id, dayKey(), text) }))}
        checks={checksFor(row.ex)}
        onGo={() => patchSession(session.id, { guided: [...(session.guided ?? []), row.ex.id] })}
        saver={saver}
        top={top}
      />
    );
  }
  const offer = r.offerFor?.ex.id === row.ex.id ? r.offerFor.offer : undefined;
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
        nudge={burnNudge(row.ex, prev) && (row.side === 'both' || row.side === lead)}
        leadSide={lead}
        c={c.key === row.key ? c : restoreCounter(null, row.key)}
        onCounter={(n) => {
          setC(n);
          r.saveCounter(n);
        }}
        onDone={() => setPending({ row, c, endedAt: Date.now() })}
        onSkip={() => void r.skip(row)}
        saver={saver}
        theme={theme}
        buzz={!!settings.prefs.buzz}
        now={r.now}
        top={top}
      />
      {offer && <HeavierMoment exercise={nameOf(row.ex)} offer={offer} onYes={() => r.answer(row.ex.id, 'yes')} onNo={() => r.answer(row.ex.id, 'no')} />}
    </>
  );
}
