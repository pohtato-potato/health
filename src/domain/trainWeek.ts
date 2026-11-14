// Train for plan v2 (look pass L2, 14 Nov): the week in any order, home and gym, each exercise's effort,
// the first gym week's easy start, the go-up suggestion, weights changed for next time, and sets per muscle.
import { addDays, daysBetween, weekStart, type DayKey } from './dates';
import { weekdayName } from './format';
import { isGymKind, loadStep, unitFor } from './gym';
import { fmtKg, loadOptions } from './loads';
import { musclesOf } from './muscles';
import { allExercises, extraSessions, findSession, hasGym, placeOfSession, realSets, rotationOf, type ExerciseDef, type Place, type PlanDef } from './plan';
import type { ExerciseStatus } from './progression';
import type { Equipment, MuscleId, SetEntry, Settings, TrainingSession } from './types';

type Done = Pick<TrainingSession, 'id' | 'status' | 'date' | 'session' | 'place' | 'startedAt'>;

export interface WeekSlot {
  sessionId: string;
  place: Place;
  /** Done this week: the first run of it, and its weekday. */
  done?: { id: string; date: DayKey; day: string };
}

export interface Week {
  slots: WeekSlot[];
  /** Done this week, any session (repeats and extras too). */
  doneCount: number;
  /** Sessions a week the plan asks for. */
  target: number;
  /** Rotation sessions not yet done this week, in the plan's order. */
  left: string[];
  /** Done this week but outside the slots or a second time: "also". */
  extra: { id: string; sessionId: string; date: DayKey }[];
}

/**
 * The week as slots, one per rotation session, in any order. With home and gym rotations they are interleaved
 * (gym, home, gym, home), the order the plan reads in; nothing ties a slot to a weekday.
 */
export function weekOf(plan: PlanDef, sessions: Done[], today: DayKey, perWeek?: number): Week {
  const from = weekStart(today);
  const week = sessions.filter((s) => s.status === 'done' && s.date >= from && s.date <= addDays(from, 6)).sort((a, b) => a.startedAt - b.startedAt);
  const ids = slotIds(plan);
  const used = new Set<string>();
  const slots: WeekSlot[] = ids.map((sessionId) => {
    const run = week.find((s) => s.session === sessionId && !used.has(s.id));
    if (run) used.add(run.id);
    return { sessionId, place: placeOfSession(plan, sessionId), ...(run ? { done: { id: run.id, date: run.date, day: weekdayName(run.date).slice(0, 3) } } : {}) };
  });
  const t = plan.weeklyTarget;
  const target = t && (t.gym !== undefined || t.home !== undefined) ? (t.gym ?? 0) + (t.home ?? 0) : perWeek ?? plan.perWeek ?? slots.length;
  return {
    slots,
    doneCount: week.length,
    target,
    left: slots.filter((s) => !s.done).map((s) => s.sessionId),
    extra: week.filter((s) => !used.has(s.id)).map((s) => ({ id: s.id, sessionId: s.session, date: s.date })),
  };
}

/** The rotation sessions in reading order: gym and home interleaved when both exist, else the one loop. */
export function slotIds(plan: PlanDef): string[] {
  if (!hasGym(plan)) return rotationOf(plan, 'home');
  const g = rotationOf(plan, 'gym');
  const h = rotationOf(plan, 'home');
  const out: string[] = [];
  for (let i = 0; i < Math.max(g.length, h.length); i++) {
    if (g[i]) out.push(g[i]);
    if (h[i]) out.push(h[i]);
  }
  return out;
}

/**
 * The next sensible session: one still to do this week, in the other place from the last session done when there is
 * one (gym days and home days alternate), else the first one left. With the week's sessions all done, the next in the
 * loop the last one belongs to, so a repeat keeps the rotation going.
 */
export function suggestNext(plan: PlanDef, week: Week, sessions: Done[], loopNext: (place: Place) => string): string {
  const last = sessions.filter((s) => s.status === 'done').sort((a, b) => b.startedAt - a.startedAt)[0];
  const lastPlace = last ? last.place ?? placeOfSession(plan, last.session) : undefined;
  if (week.left.length) {
    const other = lastPlace && hasGym(plan) ? week.left.find((id) => placeOfSession(plan, id) !== lastPlace) : undefined;
    return other ?? week.left[0];
  }
  const place: Place = hasGym(plan) && lastPlace === 'home' ? 'gym' : 'home';
  return loopNext(hasGym(plan) ? place : 'home');
}

/** "Two done, two to go": the week's count in words. */
export function weekWords(done: number, target: number): string {
  const n = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
  const w = (x: number) => n[x] ?? String(x);
  if (done === 0) return `${w(target)} to do`;
  if (done >= target) return done > target ? `${w(done)} done, ${done - target} extra` : `All ${w(target).toLowerCase()} done`;
  return `${w(done)} done, ${w(target - done).toLowerCase()} to go`;
}

/** Sessions to offer beside the picks: the ones done this week again, and the plan's extras. */
export function alsoOffer(plan: PlanDef, week: Week): string[] {
  const again = week.slots.filter((s) => s.done).map((s) => s.sessionId);
  return [...again, ...extraSessions(plan).map((s) => s.id)].filter((id, i, a) => a.indexOf(id) === i && !!findSession(plan, id));
}

// ---------- effort ----------

/** Plan v2 says where to stop for each exercise: small lifts close to failure, big ones a few reps short. */
export function effortOf(ex: Pick<ExerciseDef, 'effort' | 'isolation' | 'load'>, plan: Pick<PlanDef, 'rotations'>, easy?: { rir: number }): [number, number] | undefined {
  if (easy) return [easy.rir, easy.rir];
  if (ex.effort) return ex.effort;
  // Derived only for plans with home and gym rotations (v2), and never for bodyweight holds.
  if (!plan.rotations || ex.load === 'body' || ex.load === 'band') return undefined;
  return ex.isolation ? [0, 1] : [2, 3];
}

/** "stop 2–3 short", "to 0–1 left", "stop 3 short". */
export function effortText(e: [number, number] | undefined): string | undefined {
  if (!e) return undefined;
  const [lo, hi] = e;
  const span = lo === hi ? `${lo}` : `${lo}–${hi}`;
  return lo <= 1 ? `to ${span} left` : `stop ${span} short`;
}

/** Effort for the set screen's panel, capitalised. */
export const effortTitle = (e: [number, number] | undefined) => {
  const t = effortText(e);
  return t && t[0].toUpperCase() + t.slice(1);
};

// ---------- the first gym week ----------

export const DEFAULT_EASY_START = { days: 7, sets: 2, rir: 3 } as const;

/** The plan's easy start: its own, the default for a plan with a gym rotation, or none. */
export function easyStartOf(plan: PlanDef): { days: number; sets: number; rir: number } | undefined {
  if (plan.easyStart === false) return undefined;
  if (plan.easyStart) return plan.easyStart;
  return hasGym(plan) ? DEFAULT_EASY_START : undefined;
}

/**
 * Whether a gym session today is in the easy start: from the first gym session done (or today, before any) for the
 * plan's days. Home sessions never are.
 */
export function easyStartOn(plan: PlanDef, sessions: Done[], today: DayKey, place: Place): { sets: number; rir: number; daysLeft: number } | undefined {
  const es = easyStartOf(plan);
  if (!es || place !== 'gym') return undefined;
  const gym = sessions.filter((s) => s.status === 'done' && (s.place ?? placeOfSession(plan, s.session)) === 'gym').map((s) => s.date).sort();
  const first = gym[0] ?? today;
  const gone = daysBetween(first, today);
  if (gone < 0 || gone >= es.days) return undefined;
  return { sets: es.sets, rir: es.rir, daysLeft: es.days - gone };
}

/** An exercise as the easy start does it: never more than its sets. */
export const easySets = (sets: number, easy?: { sets: number }) => (easy ? Math.min(sets, easy.sets) : sets);

// ---------- weights ----------

/** The weight for next time: one changed on Train (until a set is logged after it), else what progression says. */
export function nextWeight(exId: string, status: Pick<ExerciseStatus, 'loadKg'>, loadNext: Settings['loadNext'], sets: Pick<SetEntry, 'exerciseId' | 'at' | 'skipped'>[]): number | null {
  const changed = loadNext?.[exId];
  if (changed && !sets.some((s) => s.exerciseId === exId && !s.skipped && s.at > changed.at)) return changed.kg;
  return status.loadKg;
}

/** Whether an exercise's load is a number you can change: dumbbells and gym kit. */
export const weightCanChange = (ex: Pick<ExerciseDef, 'load'>) => ex.load === 'pair' || ex.load === 'single' || isGymKind(ex.load);

/** One step down or up from a load: the dumbbells you have at home, the machine's step at the gym. */
export function stepWeight(ex: Pick<ExerciseDef, 'id' | 'load' | 'machine' | 'unit'>, kg: number | null, dir: -1 | 1, settings: Pick<Settings, 'machineUnits'> & { equipment: Equipment }): number | null {
  const cur = kg ?? 0;
  if (ex.load === 'pair' || ex.load === 'single') {
    const opts = loadOptions(settings.equipment, ex.load);
    if (!opts.length) return Math.max(0, cur + dir * 0.5);
    if (dir > 0) return opts.find((o) => o > cur + 1e-9) ?? opts[opts.length - 1];
    return [...opts].reverse().find((o) => o < cur - 1e-9) ?? opts[0];
  }
  if (isGymKind(ex.load)) {
    const step = loadStep(ex.load, unitFor(ex, settings));
    return Math.max(0, Math.round((cur + dir * step) * 100) / 100);
  }
  return kg;
}

/**
 * The gentle go-up line, when it was earned: the top of the range on every set last time. Names the weight when the
 * next step is known ("try 40"); otherwise says what progression says. Nothing when the weight was already changed.
 */
export function goUpHint(ex: Pick<ExerciseDef, 'id' | 'load' | 'machine' | 'unit'>, status: Pick<ExerciseStatus, 'topHit' | 'advice' | 'loadKg'>, shown: number | null, settings: Pick<Settings, 'machineUnits'> & { equipment: Equipment }): string | undefined {
  if (!status.topHit || !status.advice) return undefined;
  if (shown !== status.loadKg) return undefined;
  const a = status.advice;
  if (a.kind === 'heavier' && a.toKg !== undefined) return `Top of the range last time: try ${fmtKg(a.toKg)}`;
  if (a.kind === 'next-step' && shown !== null && ex.load !== 'assist') {
    const up = stepWeight(ex, shown, 1, settings);
    return up !== null ? `Top of the range last time: try ${fmtKg(up)}` : undefined;
  }
  if (a.kind === 'next-step') return 'Top of the range last time: one step less assist';
  if (a.kind === 'variant' || a.kind === 'band' || a.kind === 'add-load') return `Top of the range last time: ${a.tonight.replace(/^Tonight:?\s*/i, '').replace(/\.$/, '')}`;
  return undefined;
}

// ---------- sets per muscle ----------

/** The muscles Train shows, finer than the old groups, as plan v2 counts them. */
export const MUSCLE_ROWS: { name: string; muscles: MuscleId[]; target: [number, number] }[] = [
  { name: 'Side delts', muscles: ['side-delts'], target: [10, 16] },
  { name: 'Triceps', muscles: ['triceps'], target: [8, 14] },
  { name: 'Back', muscles: ['upper-back', 'lats'], target: [10, 16] },
  { name: 'Biceps', muscles: ['biceps'], target: [8, 14] },
  { name: 'Rear delts', muscles: ['rear-delts'], target: [6, 12] },
  { name: 'Chest', muscles: ['chest'], target: [6, 12] },
  { name: 'Front delts', muscles: ['front-delts'], target: [0, 8] },
  { name: 'Forearms', muscles: ['forearms'], target: [4, 8] },
  { name: 'Core', muscles: ['abs'], target: [4, 8] },
  { name: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'], target: [4, 12] },
];

export interface MuscleRow {
  name: string;
  muscles: MuscleId[];
  sets: number;
  lo: number;
  hi: number;
  state: 'low' | 'ok' | 'high';
}

/**
 * Hard sets this week per muscle, each working set counted once for each row its main muscles are in, against the
 * plan's range for that row (its `weeklyTargets` by name) or a general one. Front delts show only when worked.
 */
export function muscleWeek(sets: SetEntry[], plan: PlanDef, today: DayKey): MuscleRow[] {
  const from = weekStart(today);
  const to = addDays(from, 6);
  const byId = new Map(allExercises(plan).map((e) => [e.id, e]));
  const count = new Map<string, number>();
  for (const s of realSets(sets)) {
    if (s.drop || s.date < from || s.date > to || (s.rir !== undefined && s.rir > 3)) continue;
    const primary = musclesOf(byId.get(s.exerciseId) ?? { id: s.exerciseId, name: s.exercise }).primary;
    for (const r of MUSCLE_ROWS) if (r.muscles.some((m) => primary.includes(m))) count.set(r.name, (count.get(r.name) ?? 0) + 1);
  }
  return MUSCLE_ROWS.filter((r) => r.name !== 'Front delts' || (count.get(r.name) ?? 0) > 0 || plan.weeklyTargets?.[r.name]).map((r) => {
    const [lo, hi] = plan.weeklyTargets?.[r.name] ?? r.target;
    const n = count.get(r.name) ?? 0;
    return { name: r.name, muscles: r.muscles, sets: n, lo, hi, state: n < lo ? 'low' : n > hi ? 'high' : 'ok' };
  });
}

/** Each muscle's colour on the body figure, from its row. */
export function muscleTints(rows: MuscleRow[], inks: Record<MuscleRow['state'], string>): Partial<Record<MuscleId, string>> {
  const out: Partial<Record<MuscleId, string>> = {};
  for (const r of rows) for (const m of r.muscles) out[m] = inks[r.state];
  return out;
}
