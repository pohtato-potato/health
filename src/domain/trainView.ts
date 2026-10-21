import { addDays, daysBetween, weekStart, type DayKey } from './dates';
import { hourSplit } from './finale';
import { fmtKg } from './loads';
import { GROUPS, musclesOf } from './muscles';
import { allExercises, realSets, valueOfSet, type PlanDef } from './plan';
import { loggedLater } from './trainingChecks';
import { formScore } from './quality';
import type { SetEntry, TrainingSession } from './types';

const done = (sessions: TrainingSession[]) => sessions.filter((s) => s.status === 'done').sort((a, b) => a.startedAt - b.startedAt);
const working = (sets: SetEntry[]) => realSets(sets).filter((s) => !s.drop);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Heavier first, then more reps or seconds. */
const better = (a: SetEntry, b: SetEntry) => (b.loadKg ?? 0) - (a.loadKg ?? 0) || (valueOfSet(b) ?? 0) - (valueOfSet(a) ?? 0);
const bestOf = (sets: SetEntry[]) => [...sets].sort(better)[0];
const fmtSet = (s: SetEntry) => {
  const v = `${valueOfSet(s) ?? 0}${s.seconds !== undefined && s.reps === undefined ? ' s' : ''}`;
  return s.loadKg !== null ? `${fmtKg(s.loadKg)} × ${v}` : v;
};

/** The same session about four weeks ago against the latest, exercise by exercise. None without one 3–5 weeks back. */
export function fourWeeksAgo(sessions: TrainingSession[], sets: SetEntry[], sessionId: string, today: DayKey): { then: DayKey; rows: { name: string; then: string; now: string; up: boolean }[] } | undefined {
  const runs = done(sessions).filter((s) => s.session === sessionId);
  const now = runs[runs.length - 1];
  const then = runs
    .filter((s) => {
      const ago = daysBetween(s.date, today);
      return ago >= 21 && ago <= 35;
    })
    .sort((a, b) => Math.abs(daysBetween(a.date, today) - 28) - Math.abs(daysBetween(b.date, today) - 28))[0];
  if (!now || !then || now.id === then.id) return undefined;
  const nowSets = working(sets.filter((s) => s.sessionId === now.id)).sort((a, b) => a.at - b.at);
  const thenSets = working(sets.filter((s) => s.sessionId === then.id));
  const rows: { name: string; then: string; now: string; up: boolean }[] = [];
  for (const id of [...new Set(nowSets.map((s) => s.exerciseId))]) {
    const a = bestOf(thenSets.filter((s) => s.exerciseId === id));
    const b = bestOf(nowSets.filter((s) => s.exerciseId === id));
    if (!a || !b) continue;
    rows.push({ name: b.exercise, then: fmtSet(a), now: fmtSet(b), up: better(a, b) > 0 });
    if (rows.length === 4) break;
  }
  return rows.length ? { then: then.date, rows } : undefined;
}

const DEFAULT_TARGETS: Record<string, [number, number]> = { Shoulders: [10, 16], Back: [10, 16], Chest: [8, 12], Arms: [8, 14], Legs: [10, 16], Core: [4, 8] };
const LABEL: Record<string, string> = { Delts: 'Shoulders' };

export interface VolumeRow {
  name: string;
  sets: number;
  lo: number;
  hi: number;
  state: 'low' | 'ok' | 'high';
}

/** Hard sets this week per muscle group, each set counted once per group its main muscles are in, against the plan's targets. */
export function weekVolume(sets: SetEntry[], plan: PlanDef, today: DayKey): VolumeRow[] {
  const from = weekStart(today);
  const to = addDays(from, 6);
  const byId = new Map(allExercises(plan).map((e) => [e.id, e]));
  const count = new Map<string, number>();
  for (const s of working(sets)) {
    if (s.date < from || s.date > to || (s.rir !== undefined && s.rir > 3)) continue;
    const primary = musclesOf(byId.get(s.exerciseId) ?? { id: s.exerciseId, name: s.exercise }).primary;
    for (const g of GROUPS) if (g.muscles.some((m) => primary.includes(m))) count.set(g.name, (count.get(g.name) ?? 0) + 1);
  }
  return GROUPS.map((g) => {
    const name = LABEL[g.name] ?? g.name;
    const [lo, hi] = plan.weeklyTargets?.[name] ?? DEFAULT_TARGETS[name];
    const n = count.get(g.name) ?? 0;
    return { name, sets: n, lo, hi, state: n < lo ? 'low' : n > hi ? 'high' : 'ok' };
  });
}

/** The biggest gap in words: "Legs are 5 sets short of 10 this week." */
export function volumeLine(rows: VolumeRow[]): string | undefined {
  const low = rows.filter((r) => r.state === 'low').sort((a, b) => b.lo - b.sets - (a.lo - a.sets))[0];
  return low && `${low.name}: ${low.lo - low.sets} set${low.lo - low.sets === 1 ? '' : 's'} short of ${low.lo} this week.`;
}

/** This calendar month: sessions, records, the usual length, and the exercise that improved most. */
export function monthSoFar(sessions: TrainingSession[], sets: SetEntry[], today: DayKey): { sessions: number; records: number; usualMin?: number; improved?: { name: string; pct: number } } {
  const month = today.slice(0, 7);
  const runs = done(sessions).filter((s) => s.date.startsWith(month));
  const ids = new Set(runs.map((s) => s.id));
  const mine = working(sets.filter((s) => ids.has(s.sessionId)));
  const out: { sessions: number; records: number; usualMin?: number; improved?: { name: string; pct: number } } = { sessions: runs.length, records: mine.filter((s) => s.mark === '!!').length };
  const lengths = runs.filter((s) => s.endedAt && !loggedLater(sets.filter((x) => x.sessionId === s.id))).map((s) => (s.endedAt! - s.startedAt) / 60_000);
  if (lengths.length >= 2) out.usualMin = Math.round(median(lengths));
  let improved: { name: string; pct: number } | undefined;
  for (const id of new Set(mine.map((s) => s.exerciseId))) {
    const ex = mine.filter((s) => s.exerciseId === id);
    const first = runs.find((r) => ex.some((s) => s.sessionId === r.id))!;
    const start = bestOf(ex.filter((s) => s.sessionId === first.id));
    const best = bestOf(ex);
    // At the same weight, reps (or seconds) decide; across weights, an estimated one-rep max does.
    const value = (s: SetEntry) => valueOfSet(s) ?? 0;
    const e1rm = (s: SetEntry) => (s.loadKg ? s.loadKg * (1 + value(s) / 30) : value(s));
    const same = start.loadKg === best.loadKg;
    const from = same ? value(start) : e1rm(start);
    const to = same ? value(best) : e1rm(best);
    const pct = from > 0 ? Math.round(((to - from) / from) * 100) : 0;
    if (pct >= 10 && (!improved || pct > improved.pct)) improved = { name: ex[0].exercise, pct };
  }
  if (improved) out.improved = improved;
  return out;
}

/** The latest session done today, summed up for the card after it. */
export function tonight(sessions: TrainingSession[], sets: SetEntry[], today: DayKey): { session: TrainingSession; records: SetEntry[]; mins: number; later: boolean; sets: number; liftMin?: number; quality?: number; checks?: number; formAvg?: number } | undefined {
  const session = done(sessions)
    .filter((s) => s.date === today)
    .pop();
  if (!session) return undefined;
  const mine = working(sets.filter((s) => s.sessionId === session.id));
  const timed = mine.length > 0 && mine.every((s) => s.startedAt !== undefined && s.endedAt !== undefined);
  const marks = mine.flatMap((s) => Object.values(s.checks ?? {}));
  const scores = mine.map(formScore).filter((f): f is NonNullable<typeof f> => f !== undefined);
  return {
    session,
    records: mine.filter((s) => s.mark === '!!'),
    mins: Math.round(((session.endedAt ?? session.startedAt) - session.startedAt) / 60_000),
    later: loggedLater(sets.filter((s) => s.sessionId === session.id)),
    sets: mine.length,
    ...(timed ? { liftMin: Math.round(hourSplit(session, mine).lift / 60_000) } : {}),
    ...(session.quality !== undefined ? { quality: session.quality } : {}),
    ...(marks.length ? { checks: marks.filter((m) => m === 'ok').length / marks.length } : {}),
    ...(!marks.length && scores.length ? { formAvg: scores.reduce((a, b) => a + b, 0) / scores.length } : {}),
  };
}

/** The check slipped most across a session's last three runs: tonight's form focus. */
export function formFocus(sets: SetEntry[], plan: PlanDef, sessionId: string): string | undefined {
  const texts = new Map(allExercises(plan).flatMap((e) => (e.checks ?? []).map((c) => [`${e.id}:${c.id}`, c.text] as const)));
  const runs = [...new Set(sets.filter((s) => s.session === sessionId).sort((a, b) => b.at - a.at).map((s) => s.sessionId))].slice(0, 3);
  const slips = new Map<string, number>();
  for (const s of sets) {
    if (!runs.includes(s.sessionId)) continue;
    for (const [id, m] of Object.entries(s.checks ?? {})) {
      const text = texts.get(`${s.exerciseId}:${id}`);
      if (m === 'slip' && text) slips.set(text, (slips.get(text) ?? 0) + 1);
    }
  }
  return [...slips.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** The card at the top of Train: resume a session, tonight's, up next, or the plain next-up card. */
export function heroFor(h: { active: boolean; tonight: boolean; trainedToday: boolean; up: boolean }): 'resume' | 'tonight' | 'upnext' | 'nextup' {
  if (h.active) return 'resume';
  if (h.tonight) return 'tonight';
  return h.up && !h.trainedToday ? 'upnext' : 'nextup';
}

/** Well enough to glow green: 80% of form checks went well, or old scores averaging solid (4). */
const GOOD_CHECKS = 0.8;
const GOOD_FORM = 4;

/** The glow behind Train today: gold for more than one record, green for good form, else calm. */
export function trainGlow(day: { records: number; checks?: number; formAvg?: number } | undefined): 'record' | 'in' | 'calm' {
  if (!day) return 'calm';
  if (day.records >= 2) return 'record';
  if ((day.checks ?? 0) >= GOOD_CHECKS || (day.formAvg ?? 0) >= GOOD_FORM) return 'in';
  return 'calm';
}

/** Last month's film is worth a link on the first three days of a month, when there was training last month. */
export function filmDue(sessions: TrainingSession[], today: DayKey): boolean {
  if (Number(today.slice(8)) > 3) return false;
  const [y, m] = today.split('-').map(Number);
  const last = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  return done(sessions).some((s) => s.date.startsWith(last));
}
