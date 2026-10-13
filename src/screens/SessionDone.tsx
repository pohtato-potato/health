import { useState } from 'react';
import { addDays, daysBetween } from '../domain/dates';
import { fmtDayLong, fmtDayMonth, fmtInt, lowerFirst, weekdayName } from '../domain/format';
import { fmtKg } from '../domain/loads';
import { findExercise, findSession, type PlanDef } from '../domain/plan';
import { exerciseStatus } from '../domain/progression';
import type { Day, SetEntry, Settings, TrainingSession } from '../domain/types';
import { discardSession, finishSession } from '../db/actions';
import { useActiveSession, useAllDays, useAllSets, useAllSetsWithSkips, useSessions, useSettings } from '../db/hooks';
import { go } from '../router';
import { useToast } from '../ui/Toasts';
import { doneSessions, swapSentence } from '../state/derived';
import { Confetti } from '../ui/Confetti';
import { type RecordPage } from '../ui/Moments';
import { Finale } from './session/Finale';
import { sessionQuality } from '../domain/sessionQuality';
import { askConfirm } from '../ui/Confirm';
import { withTrip } from '../domain/trip';
import { comparable, contextOf } from '../domain/context';

export function SessionDone() {
  const settings = useSettings();
  const active = useActiveSession();
  const sets = useAllSets();
  const withSkips = useAllSetsWithSkips();
  const days = useAllDays();
  const sessions = useSessions();
  const [finale, setFinale] = useState<{ session: TrainingSession; mine: SetEntry[]; pages: RecordPage[]; quality: number } | null>(null);
  if (finale) return <Finale {...finale} onClose={() => go('/train', undefined, { replace: true })} />;
  if (!settings || active === undefined || !sets || !sessions || !withSkips) return <div className="page bare" />;
  if (!active || !settings.plan) {
    return (
      <div className="page bare">
        <div className="t15 q">No session in progress.</div>
        <button type="button" className="btn" onClick={() => go('/train', undefined, { replace: true })}>
          Go to Train
        </button>
      </div>
    );
  }
  return <DoneForm session={active} plan={withTrip(settings.plan)} days={days ?? []} sets={sets} withSkips={withSkips} sessions={sessions} settings={settings} onFinale={setFinale} />;
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

function DoneForm({ session, plan, days, sets, withSkips, sessions, settings, onFinale }: { session: TrainingSession; plan: PlanDef; days: Day[]; sets: SetEntry[]; withSkips: SetEntry[]; sessions: TrainingSession[]; settings: Settings; onFinale: (f: { session: TrainingSession; mine: SetEntry[]; pages: RecordPage[]; quality: number }) => void }) {
  const toast = useToast();
  const [flags, setFlags] = useState<string[]>(session.flags ?? []);
  const [notes, setNotes] = useState(session.notes ?? '');
  const [saving, setSaving] = useState(false);
  const mine = sets.filter((s) => s.sessionId === session.id);
  const def = findSession(plan, session.session);
  const stats = sessionStats(mine, plan);
  const records = recordLines(mine);
  const ctx = contextOf(session, days.find((d) => d.date === session.date), days.find((d) => d.date === addDays(session.date, -1)), settings);
  const same = doneSessions(sessions).filter((s) => s.session === session.session && s.id !== session.id);
  const fair = [...same].reverse().find((s) => comparable(s.context ?? [], ctx));
  const prev = fair ?? same.pop();
  const likeForLike = !!fair;
  const prevReps = prev ? sessionStats(sets.filter((s) => s.sessionId === prev.id), plan).reps : undefined;
  const mins = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  const sessionFlags = plan.flags.filter((f) => f.when === 'session');
  const exIds = new Set(mine.map((s) => s.exerciseId));
  const morning = plan.flags.filter((f) => f.when === 'morning' && f.after?.some((id) => exIds.has(id)));
  const swapNotes = Array.from(
    new Set(
      sessionFlags
        .filter((f) => f.swap)
        .map((f) => {
          const from = lowerFirst(findExercise(plan, f.swap!.from)?.name ?? f.swap!.from);
          const to = lowerFirst(findExercise(plan, f.swap!.to)?.name ?? f.swap!.to);
          return `A ${f.group.toLowerCase()} tick swaps ${from}s for ${to}s in your next ${findSession(plan, f.swap!.session)?.name ?? 'session'}.`;
        }),
    ),
  );

  const save = async () => {
    setSaving(true);
    const withSkipped = withSkips.filter((s) => s.sessionId === session.id);
    const quality = sessionQuality(withSkipped);
    await finishSession(session.id, flags, notes, quality, ctx);
    const raised = plan.flags.filter((f) => flags.includes(f.id));
    if (raised.length) toast({ kicker: `${raised[0].group} flagged`, text: swapSentence(plan, raised[0].swap) ?? 'Noted in your joint log.', sub: raised[0].advice, ms: 7000 });
    else if (!records.length) toast({ text: `${def?.name ?? 'Session'} saved · ${stats.sets} set${stats.sets === 1 ? '' : 's'}` });
    onFinale({ session: { ...session, endedAt: Date.now() }, mine: withSkipped, pages: records.length ? recordPages(mine, sets, plan, settings, session.date) : [], quality });
  };

  const discard = async () => {
    if (!(await askConfirm({ title: 'Discard this session?', body: 'Every set in it goes too.', yes: 'Discard', danger: true }))) return;
    await discardSession(session.id);
    go('/train', undefined, { replace: true });
  };

  const diff = prevReps !== undefined ? stats.reps - prevReps : undefined;

  return (
    <div className="page bare" style={{ paddingTop: 'calc(28px + var(--safe-top))' }}>
      <div className="col gap6">
        <div className="lbl">
          {def?.name ?? `Session ${session.session}`} · {fmtDayLong(session.date)}
        </div>
        <h1 className="h1" style={{ fontSize: 34 }}>
          Session complete
        </h1>
        <div className="t14 q tn">
          {mins} min · {stats.sets} set{stats.sets === 1 ? '' : 's'}
          {diff !== undefined && diff !== 0 ? ` · ${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} reps than last ${def?.name ?? 'time'}${likeForLike ? '' : ' (different conditions)'}` : ''}
          {diff === 0 ? ` · same reps as last ${def?.name ?? 'time'}` : ''}
        </div>
      </div>

      {records.length > 0 && (
        <div className="card gold" style={{ gap: 12, position: 'relative', overflow: 'hidden' }}>
          <Confetti palette={['var(--gold)', '#f0d79e', '#c9a85a']} count={14} height={70} />
          <div className="lbl gold">
            {records.length} new record{records.length === 1 ? '' : 's'}
          </div>
          {records.map((r, i) => (
            <div key={r.name} className="col gap12">
              {i > 0 && <div className="gold-rule" />}
              <div className="row base">
                <div className="t16">{r.name}</div>
                <div className="t14 gold-text right">{r.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {sessionFlags.length > 0 && (
        <div className="card" style={{ gap: 4, paddingBottom: 12 }}>
          <div className="sf" style={{ fontSize: 21, paddingBottom: 6 }}>
            How did your joints feel?
          </div>
          {sessionFlags.map((f, i) => (
            <label key={f.id} className="row" style={{ justifyContent: 'flex-start', gap: 14, minHeight: 50, borderBottom: i < sessionFlags.length - 1 ? '1px solid var(--divider)' : 0 }}>
              <input type="checkbox" className="cb" checked={flags.includes(f.id)} onChange={(e) => setFlags(e.target.checked ? [...flags, f.id] : flags.filter((x) => x !== f.id))} />
              <span className="t15">{f.label}</span>
            </label>
          ))}
          {(swapNotes.length > 0 || morning.length > 0) && (
            <div className="t13 q lh" style={{ paddingTop: 6 }}>
              {swapNotes.join(' ')}
              {morning.length ? ` Tomorrow's morning log asks about ${morning.map((m) => (m.question ?? m.label).replace(/\?$/, '').toLowerCase()).join(' and ')}.` : ''}
            </div>
          )}
        </div>
      )}

      <label className="flabel">
        <span className="lbl">Notes</span>
        <textarea className="field" rows={2} placeholder="Anything else? Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <button type="button" className="btn lg block" disabled={saving} onClick={save}>
        Save session
      </button>
      <div className="row" style={{ justifyContent: 'center', gap: 24 }}>
        <button type="button" className="link" onClick={() => go('/session', undefined, { replace: true })}>
          Back to the session
        </button>
        <button type="button" className="link" style={{ color: '#e38a7c' }} onClick={discard}>
          Discard
        </button>
      </div>
      <div className="t12 d center">{fmtInt(stats.reps)} reps · {fmtInt(stats.kg)} kg moved</div>
    </div>
  );
}
