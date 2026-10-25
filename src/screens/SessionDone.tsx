import { useEffect, useState } from 'react';
import { addDays, daysBetween } from '../domain/dates';
import { fmtDayMonth, lowerFirst, weekdayName } from '../domain/format';
import { fmtKg } from '../domain/loads';
import { findExercise, findSession, type PlanDef } from '../domain/plan';
import { exerciseStatus } from '../domain/progression';
import type { Day, SetEntry, Settings, SongRecord, TrainingSession } from '../domain/types';
import { fetchSessionTracks } from '../sources/lastfm';
import { discardSession, finishSession } from '../db/actions';
import { useActiveSession, useAllDays, useAllSets, useAllSetsWithSkips, useSessions, useSettings } from '../db/hooks';
import { go } from '../router';
import { useToast } from '../ui/Toasts';
import { doneSessions, swapSentence } from '../state/derived';
import { type RecordPage } from '../ui/Moments';
import { sessionQuality } from '../domain/sessionQuality';
import { askConfirm } from '../ui/Confirm';
import { withTrip } from '../domain/trip';
import { comparable, contextOf } from '../domain/context';
import { movedLine, vsLastTime, type FinaleData } from '../domain/finale';
import { RINGS } from '../domain/liveLook';
import { usualLength } from '../domain/sessionEdges';
import { useLiveTheme } from '../ui/live/useLiveTheme';
import { LiveFinale } from './live/LiveFinale';
import { finaleData } from './live/finaleData';

export function SessionDone() {
  const settings = useSettings();
  const active = useActiveSession();
  const sets = useAllSets();
  const withSkips = useAllSetsWithSkips();
  const days = useAllDays();
  const sessions = useSessions();
  // Saving ends the session; the finale keeps showing it after that.
  const [kept, setKept] = useState<TrainingSession | null>(null);
  useEffect(() => {
    if (active) setKept(active);
  }, [active]);
  const session = active ?? kept;
  if (!settings || active === undefined || !sets || !sessions || !withSkips) return <div className="page bare" />;
  if (!session || !settings.plan) {
    return (
      <div className="page bare">
        <div className="t15 q">No session in progress.</div>
        <button type="button" className="btn" onClick={() => go('/train', undefined, { replace: true })}>
          Go to Train
        </button>
      </div>
    );
  }
  return <LiveDone key={session.id} session={session} plan={withTrip(settings.plan)} days={days ?? []} sets={sets} withSkips={withSkips} sessions={sessions} settings={settings} />;
}

export interface RecordLine {
  name: string;
  text: string;
}

/** Records in a session, one line per exercise, e.g. "10 kg × 15, all three sets". */
export function recordLines(mine: SetEntry[]): RecordLine[] {
  const byEx = new Map<string, SetEntry[]>();
  for (const s of mine) if (!s.drop) byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), s]);
  const out: RecordLine[] = [];
  for (const sets of byEx.values()) {
    const recs = sets.filter((s) => s.mark === '!!');
    if (!recs.length) continue;
    const best = [...recs].sort((a, b) => (b.loadKg ?? 0) - (a.loadKg ?? 0) || (b.reps ?? b.seconds ?? 0) - (a.reps ?? a.seconds ?? 0))[0];
    const val = best.reps !== undefined ? `${best.reps}` : `${best.seconds} s`;
    const all = sets.length > 1 && sets.every((s) => s.loadKg === best.loadKg && (s.reps ?? s.seconds) === (best.reps ?? best.seconds));
    const sided = sets.some((s) => s.side !== 'both');
    let text = best.loadKg !== null ? `${fmtKg(best.loadKg)} kg × ${val}` : best.reps !== undefined ? `${val} reps` : val;
    if (all) text += sets.length === 3 ? ', all three sets' : `, all ${sets.length} sets`;
    else if (sided) text += best.side === 'L' ? ', left' : best.side === 'R' ? ', right' : '';
    out.push({ name: best.exercise, text });
  }
  return out;
}

const valueOf = (s: SetEntry) => s.reps ?? s.seconds ?? 0;
const better = (a: SetEntry, b: SetEntry) => (b.loadKg ?? 0) - (a.loadKg ?? 0) || valueOf(b) - valueOf(a);

/** One page per record for the celebration: the number, the previous best and what's next. */
export function recordPages(mine: SetEntry[], all: SetEntry[], plan: PlanDef, settings: Settings, today: string): RecordPage[] {
  const pages: RecordPage[] = [];
  const lines = recordLines(mine);
  for (const line of lines) {
    const sets = mine.filter((s) => s.exercise === line.name && !s.drop);
    const best = [...sets.filter((s) => s.mark === '!!')].sort(better)[0];
    if (!best) continue;
    const prior = all.filter((s) => s.exerciseId === best.exerciseId && s.exercise === best.exercise && !s.drop && s.sessionId !== best.sessionId && s.at < best.at);
    const prevBest = [...prior].sort(better)[0];
    const heavier = prevBest && (best.loadKg ?? 0) > (prevBest.loadKg ?? 0);
    const unit = best.seconds !== undefined ? 'SECONDS' : 'REPS';
    const fmtSet = (s: SetEntry) => (s.loadKg !== null ? `${fmtKg(s.loadKg)} kg × ${valueOf(s)}${s.seconds !== undefined ? ' s' : ''}` : `${valueOf(s)}${s.seconds !== undefined ? ' s' : ' reps'}`);
    const when = prevBest ? (daysBetween(prevBest.date, today) < 7 ? `on ${weekdayName(prevBest.date)}` : `on ${fmtDayMonth(prevBest.date)}`) : '';
    const ex = findExercise(plan, best.exerciseId);
    const advice = ex ? exerciseStatus(ex, settings.planState, settings.equipment, all, plan.bigJump ?? 0.25).advice : undefined;
    pages.push({
      name: line.name,
      big: heavier ? fmtKg(best.loadKg!) : String(valueOf(best)),
      bigLabel: heavier ? 'KG' : unit,
      detail: line.text.replace(', all three sets', ' on all three sets'),
      previous: prevBest ? `Previous best: ${fmtSet(prevBest)}, ${when}` : undefined,
      next: advice ? advice.tonight.replace(/^Tonight: /, '').replace(/Tonight,/, 'Next time,') : 'Same load next time, and one more rep if it moves well.',
    });
  }
  return pages;
}

/** Sets, reps and kg moved. A pair of dumbbells moves twice the load per rep. */
export function sessionStats(mine: SetEntry[], plan?: PlanDef) {
  const working = mine.filter((s) => !s.drop);
  const reps = mine.reduce((n, s) => n + (s.reps ?? 0), 0);
  const hands = (id: string) => (plan && findExercise(plan, id)?.load === 'pair' ? 2 : 1);
  const kg = mine.reduce((n, s) => n + (s.loadKg ?? 0) * (s.reps ?? 0) * hands(s.exerciseId), 0);
  return { sets: working.length, reps, kg: Math.round(kg), records: new Set(mine.filter((s) => s.mark === '!!').map((s) => s.exerciseId)).size };
}

/** The end of a session: flags and a note, then the finale's pages. */
function LiveDone({ session, plan, days, sets, withSkips, sessions, settings }: { session: TrainingSession; plan: PlanDef; days: Day[]; sets: SetEntry[]; withSkips: SetEntry[]; sessions: TrainingSession[]; settings: Settings }) {
  const toast = useToast();
  const theme = useLiveTheme(settings);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>(session.flags ?? []);
  const [note, setNote] = useState(session.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<FinaleData | null>(null);
  const mine = sets.filter((s) => s.sessionId === session.id);
  const def = findSession(plan, session.session);
  const records = recordLines(mine);
  const sessionFlags = plan.flags.filter((f) => f.when === 'session');
  // What a tick does, said before it's ticked: a swap next session, a question tomorrow morning.
  const exIds = new Set(mine.map((s) => s.exerciseId));
  const flagNotes = [
    ...new Set(
      sessionFlags
        .filter((f) => f.swap)
        .map((f) => `A ${f.group.toLowerCase()} tick swaps ${lowerFirst(findExercise(plan, f.swap!.from)?.name ?? f.swap!.from)} for ${lowerFirst(findExercise(plan, f.swap!.to)?.name ?? f.swap!.to)} in your next ${findSession(plan, f.swap!.session)?.name ?? 'session'}.`),
    ),
    ...plan.flags
      .filter((f) => f.when === 'morning' && f.after?.some((id) => exIds.has(id)))
      .map((f) => `Tomorrow's morning log asks: ${f.question ?? f.label}`),
  ];

  const save = async () => {
    // One save, however many taps.
    if (saving || data) return;
    setSaving(true);
    const ctx = contextOf(session, days.find((d) => d.date === session.date), days.find((d) => d.date === addDays(session.date, -1)), settings);
    const withSkipped = withSkips.filter((s) => s.sessionId === session.id);
    const quality = sessionQuality(withSkipped);
    await finishSession(session.id, picked, note, quality, ctx);
    const raised = plan.flags.filter((f) => picked.includes(f.id));
    if (raised.length) toast({ kicker: `${raised[0].group} flagged`, text: swapSentence(plan, raised[0].swap) ?? 'Noted in your joint log.', sub: raised[0].advice, ms: 7000 });
    const ended = { ...session, endedAt: Date.now(), flags: picked };
    // The session is saved: whatever fails from here, the finale still opens.
    let songs: SongRecord[] = [];
    let timer: number | undefined;
    try {
      // The soundtrack, if Last.fm is set up and online; never holds the finale up for long.
      songs = await Promise.race([fetchSessionTracks(ended, settings), new Promise<SongRecord[]>((r) => (timer = window.setTimeout(() => r([]), 4000)))]);
    } catch {
      songs = [];
    } finally {
      window.clearTimeout(timer);
    }
    const extra = finaleExtras(session, ctx, sessions, sets, plan);
    try {
      const usual = usualLength(sessions.filter((s) => s.id !== session.id), sets, session.session, def?.minutes ?? 60);
      setData({ ...finaleData({ session: ended, mine: withSkipped, songs, pages: records.length ? recordPages(mine, sets, plan, settings, session.date) : [], plan, quality, usualMin: usual.fromHistory ? usual.min : undefined }), ...extra });
    } catch {
      setData(finaleData({ session: ended, mine: withSkipped, songs: [], pages: [], plan, quality }));
    }
    setStep(1);
  };

  const discard = async () => {
    if (!(await askConfirm({ title: 'Discard this session?', body: 'Every set in it goes too.', yes: 'Discard', danger: true }))) return;
    await discardSession(session.id);
    go('/train', undefined, { replace: true });
  };

  const empty: FinaleData = { name: def?.name ?? `Session ${session.session}`, pages: [], recordSongs: {}, songs: [], hour: { total: 0, lift: 0, rest: 0, between: 0, longestRest: 0 }, form: { rows: [] }, rings: { exercises: [0, 0], inRange: [0, 0] }, quality: 0 };
  return (
    <LiveFinale
      step={step}
      onStep={setStep}
      data={data ?? empty}
      flags={sessionFlags.map((f) => ({ id: f.id, label: f.label }))}
      flagNotes={flagNotes}
      picked={picked}
      onPick={setPicked}
      note={note}
      onNote={setNote}
      onSave={save}
      saving={saving}
      onBack={() => go('/session', undefined, { replace: true })}
      onDiscard={discard}
      onDone={() => go('/train', undefined, { replace: true })}
      rings={RINGS[theme]}
    />
  );
}

/** Reps against the last session of this name before it (a fair match first), and what was moved. */
export function finaleExtras(session: TrainingSession, ctx: string[], sessions: TrainingSession[], sets: SetEntry[], plan: PlanDef): { compare?: string; moved?: string } {
  const same = doneSessions(sessions).filter((s) => s.session === session.session && s.id !== session.id && s.startedAt < session.startedAt);
  const fair = [...same].reverse().find((s) => comparable(s.context ?? [], ctx));
  const prev = fair ?? same[same.length - 1];
  const stats = sessionStats(sets.filter((s) => s.sessionId === session.id), plan);
  return {
    compare: vsLastTime(stats.reps, prev ? sessionStats(sets.filter((s) => s.sessionId === prev.id), plan).reps : undefined, !!fair, findSession(plan, session.session)?.name ?? 'time'),
    moved: stats.reps ? movedLine(stats) : undefined,
  };
}
