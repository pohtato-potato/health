import { addDays, daysBetween, type DayKey } from '../domain/dates';
import { fmtDayMonth, fmtDayShort } from '../domain/format';
import { fmtKg } from '../domain/loads';
import { findExercise, type PlanDef } from '../domain/plan';
import type { Day, SetEntry, Settings, TrainingSession } from '../domain/types';
import { bump } from '../db/actions';
import { downloadBlob } from '../db/backup';
import { useAllDays, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import { back } from '../router';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toasts';
import { doneSessions, flagEvents } from '../state/derived';

const WEEKS = 8;

interface Summary {
  from: DayKey;
  to: DayKey;
  events: { date: DayKey; label: string; group: string; where: string }[];
  groups: { group: string; n: number; last?: DayKey }[];
  swaps: { date: DayKey; text: string }[];
  exercises: { name: string; lines: string[] }[];
  notes: { date: DayKey; text: string }[];
  sessions: number;
}

/** What a physio needs: flags, swaps, and how the exercises that load those joints are going. */
export function physioSummary(settings: Settings, sessions: TrainingSession[], sets: SetEntry[], days: Day[], today: DayKey): Summary {
  const plan = settings.plan;
  const from = addDays(today, -7 * WEEKS);
  const done = doneSessions(sessions).filter((s) => s.date >= from);
  const events = flagEvents(plan, sessions, days)
    .filter((e) => e.date >= from)
    .map((e) => ({ date: e.date, label: e.flag.label, group: e.flag.group, where: e.flag.when === 'session' ? 'after a session' : 'morning check' }));
  const groups = [...new Set(plan?.flags.map((f) => f.group) ?? [])].map((g) => {
    const evs = events.filter((e) => e.group === g);
    return { group: g, n: evs.length, last: evs[evs.length - 1]?.date };
  });
  const swaps = done.flatMap((s) => (s.swapped ?? []).map((w) => ({ date: s.date, text: `${exName(plan, w.from)} ${w.to ? `swapped for ${exName(plan, w.to)}` : 'dropped'} (${w.reason.toLowerCase()})` })));
  // Exercises named by the joint checks: the ones asked about the morning after, and the ones with a stop flag.
  const watched = new Set<string>([...(plan?.flags.flatMap((f) => [...(f.after ?? []), ...(f.swap ? [f.swap.from, f.swap.to] : [])]) ?? []), ...(plan?.sessions.flatMap((s) => s.exercises.filter((e) => e.stopFlag).map((e) => e.id)) ?? [])]);
  const exercises = [...watched].map((id) => {
    const xs = sets.filter((x) => x.exerciseId === id && x.date >= from && !x.drop);
    const bySession = [...new Set(xs.map((x) => x.sessionId))].slice(-4);
    const lines = bySession.map((sid) => {
      const ss = xs.filter((x) => x.sessionId === sid).sort((a, b) => a.setNo - b.setNo);
      const kg = ss.find((x) => x.loadKg !== null)?.loadKg;
      return `${fmtDayMonth(ss[0].date)}: ${kg != null ? `${fmtKg(kg)} kg × ` : ''}${ss.map((x) => x.reps ?? `${x.seconds} s`).join(', ')}${ss.some((x) => x.side !== 'both') ? ' (per side)' : ''}`;
    });
    return { name: exName(plan, id), lines };
  });
  const notes = done.filter((s) => s.notes?.trim()).map((s) => ({ date: s.date, text: s.notes!.trim() }));
  return { from, to: today, events, groups, swaps, exercises, notes, sessions: done.length };
}

const exName = (plan: PlanDef | undefined, id: string) => (plan ? findExercise(plan, id)?.name : undefined) ?? id;

export function physioText(s: Summary, name: string): string {
  const out = [`Training and joint summary${name ? ` for ${name}` : ''}`, `${fmtDayShort(s.from)} to ${fmtDayShort(s.to)} · ${s.sessions} sessions`, ''];
  out.push('JOINT FLAGS');
  for (const g of s.groups) out.push(`${g.group}: ${g.n ? `${g.n} flag${g.n === 1 ? '' : 's'}, last on ${fmtDayMonth(g.last!)}` : 'no flags'}`);
  for (const e of s.events) out.push(`  ${fmtDayMonth(e.date)} · ${e.label} (${e.where})`);
  if (s.swaps.length) {
    out.push('', 'SWAPS');
    for (const w of s.swaps) out.push(`  ${fmtDayMonth(w.date)} · ${w.text}`);
  }
  if (s.exercises.length) {
    out.push('', 'EXERCISES THAT LOAD THOSE JOINTS');
    for (const x of s.exercises) {
      out.push(x.name);
      for (const l of x.lines.length ? x.lines : ['not done in this period']) out.push(`  ${l}`);
    }
  }
  if (s.notes.length) {
    out.push('', 'SESSION NOTES');
    for (const n of s.notes) out.push(`  ${fmtDayMonth(n.date)} · ${n.text}`);
  }
  return out.join('\n');
}

export function PhysioPage() {
  const settings = useSettings();
  const sessions = useSessions();
  const sets = useAllSets();
  const days = useAllDays();
  const today = useToday();
  const toast = useToast();
  if (!settings || !sessions || !sets || !days) return <div className="page bare" />;
  const s = physioSummary(settings, sessions, sets, days, today);
  const text = physioText(s, settings.name);

  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    try {
      if (nav.share) await nav.share({ title: 'Training and joint summary', text });
      else downloadBlob(new Blob([text], { type: 'text/plain' }), `health-physio-${today}.txt`);
      void bump('physio');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast({ text: `Couldn't share: ${(e as Error).message}` });
    }
  };

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/tracks')}>
        <Icon name="left" size={20} stroke={1.8} />
        Back
      </button>
      <div className="col gap6">
        <h1 className="h1">For your physio</h1>
        <div className="t15 q lh">
          The last {WEEKS} weeks: every joint flag, every swap, and how the exercises that load those joints are going. {s.sessions} sessions.
        </div>
      </div>
      <div className="card" style={{ gap: 8 }}>
        <div className="lbl apri">Joint flags</div>
        {s.groups.map((g) => (
          <div key={g.group} className="row t15">
            <span>{g.group}</span>
            <span className="q">{g.n ? `${g.n} · last ${fmtDayMonth(g.last!)} (${daysBetween(g.last!, today)} days ago)` : 'none'}</span>
          </div>
        ))}
        {s.events.map((e, i) => (
          <div key={i} className="t13 q">
            {fmtDayMonth(e.date)} · {e.label} ({e.where})
          </div>
        ))}
      </div>
      {s.swaps.length > 0 && (
        <div className="card" style={{ gap: 8 }}>
          <div className="lbl">Swaps</div>
          {s.swaps.map((w, i) => (
            <div key={i} className="t14 lh">
              {fmtDayMonth(w.date)} · {w.text}
            </div>
          ))}
        </div>
      )}
      {s.exercises.length > 0 && (
        <div className="card" style={{ gap: 10 }}>
          <div className="lbl">Exercises that load those joints</div>
          {s.exercises.map((x) => (
            <div key={x.name} className="col gap2">
              <span className="t15">{x.name}</span>
              {(x.lines.length ? x.lines : ['Not done in this period']).map((l) => (
                <span key={l} className="t13 q mono">
                  {l}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
      <button type="button" className="btn lg block" onClick={share}>
        Share as text
      </button>
      <div className="t12 d center lh">Shared only when you tap, as plain text. No photos, no food, no weight.</div>
    </div>
  );
}
