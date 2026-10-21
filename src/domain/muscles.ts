import { addDays, daysBetween, type DayKey } from './dates';
import { allExercises, realSets, type ExerciseDef, type PlanDef } from './plan';
import { restSpans } from './rest';
import type { MuscleId, SetEntry, TrainingSession } from './types';

export interface Muscles {
  primary: MuscleId[];
  secondary: MuscleId[];
}

const m = (primary: MuscleId[], secondary: MuscleId[] = []): Muscles => ({ primary, secondary });

/** What each exercise works, for the plans this app ships with and the usual home moves. */
export const EXERCISE_MUSCLES: Record<string, Muscles> = {
  row: m(['lats', 'upper-back'], ['biceps', 'rear-delts', 'forearms']),
  rdl: m(['hamstrings', 'glutes'], ['upper-back', 'forearms']),
  'lateral-raise': m(['side-delts']),
  'lean-lateral': m(['side-delts']),
  'y-raise': m(['rear-delts', 'upper-back'], ['side-delts']),
  'face-pull': m(['rear-delts', 'upper-back']),
  'rear-delt': m(['rear-delts'], ['upper-back']),
  'hammer-curl': m(['biceps', 'forearms']),
  curl: m(['biceps'], ['forearms']),
  'wrist-curl': m(['forearms']),
  'reverse-curl': m(['forearms', 'biceps']),
  'farmer-carry': m(['forearms'], ['upper-back', 'abs', 'calves']),
  'floor-press': m(['chest', 'triceps'], ['front-delts']),
  'split-squat': m(['quads', 'glutes'], ['hamstrings']),
  'goblet-squat': m(['quads', 'glutes'], ['abs']),
  ohp: m(['front-delts', 'triceps'], ['side-delts']),
  pullover: m(['lats', 'chest'], ['triceps']),
  'incline-pushup': m(['chest', 'triceps'], ['front-delts', 'abs']),
  'skull-crusher': m(['triceps']),
  'calf-raise': m(['calves']),
  'side-plank': m(['abs']),
  'dead-bug': m(['abs']),
  'single-leg-bridge': m(['glutes'], ['hamstrings']),
  'overhead-ext': m(['triceps']),
  'floor-fly': m(['chest'], ['front-delts']),
  plank: m(['abs']),
  'seal-row': m(['upper-back', 'lats'], ['rear-delts', 'biceps']),
  'seated-lateral': m(['side-delts']),
  'concentration-curl': m(['biceps']),
  'close-grip-press': m(['triceps', 'chest'], ['front-delts']),
};

/** Name keywords for exercises not in the table, most specific first. */
const BY_NAME: [RegExp, Muscles][] = [
  [/lateral|side raise/i, m(['side-delts'])],
  [/rear delt|face pull|y-raise|reverse fly/i, m(['rear-delts', 'upper-back'])],
  [/overhead|shoulder press|\bohp\b/i, m(['front-delts', 'triceps'])],
  [/press|push-?up|fly/i, m(['chest', 'triceps'], ['front-delts'])],
  [/row|pull-?down|pull-?up|chin/i, m(['lats', 'upper-back'], ['biceps'])],
  [/pullover/i, m(['lats', 'chest'])],
  [/skull|tricep|dip|kickback/i, m(['triceps'])],
  [/hammer|curl/i, m(['biceps'], ['forearms'])],
  [/wrist|grip|carry/i, m(['forearms'])],
  [/deadlift|rdl|hinge|good morning/i, m(['hamstrings', 'glutes'])],
  [/squat|lunge|step-?up|split/i, m(['quads', 'glutes'])],
  [/hip thrust|bridge|glute/i, m(['glutes'])],
  [/calf/i, m(['calves'])],
  [/plank|crunch|bug|ab|core|leg raise/i, m(['abs'])],
];

export function musclesOf(ex: Pick<ExerciseDef, 'id' | 'name'>): Muscles {
  return EXERCISE_MUSCLES[ex.id] ?? BY_NAME.find(([re]) => re.test(ex.name))?.[1] ?? m([]);
}

/** A set counts as hard when it was taken close to failure: three or fewer reps left (unrated sets count). */
const isHard = (s: SetEntry) => !s.drop && (s.rir === undefined || s.rir <= 3);

/** Hard sets per muscle this week: a primary muscle counts the set fully, a secondary one half. */
export function weeklyHardSets(sets: SetEntry[], plan: PlanDef, weekFrom: DayKey): Partial<Record<MuscleId, number>> {
  const to = addDays(weekFrom, 6);
  const byId = new Map(allExercises(plan).map((e) => [e.id, e]));
  const out: Partial<Record<MuscleId, number>> = {};
  for (const s of realSets(sets)) {
    if (s.date < weekFrom || s.date > to || !isHard(s)) continue;
    const ms = musclesOf(byId.get(s.exerciseId) ?? { id: s.exerciseId, name: s.exercise });
    for (const p of ms.primary) out[p] = (out[p] ?? 0) + 1;
    for (const q of ms.secondary) out[q] = (out[q] ?? 0) + 0.5;
  }
  return out;
}

/** Days since a muscle was last worked as a primary muscle; undefined when never. */
export function daysSince(muscle: MuscleId, sets: SetEntry[], plan: PlanDef, today: DayKey): number | undefined {
  const byId = new Map(allExercises(plan).map((e) => [e.id, e]));
  let last: DayKey | undefined;
  for (const s of realSets(sets)) {
    if (s.date > today) continue;
    if (musclesOf(byId.get(s.exerciseId) ?? { id: s.exerciseId, name: s.exercise }).primary.includes(muscle) && (!last || s.date > last)) last = s.date;
  }
  return last ? daysBetween(last, today) : undefined;
}

/** Where the hour went: lifting against resting, and the longest rest. */
export function hourBreakdown(s: Pick<TrainingSession, 'startedAt' | 'endedAt' | 'restLog'>): { total: number; lift: number; rest: number; longestRest: number } {
  const end = s.endedAt ?? Math.max(s.startedAt, ...(s.restLog ?? []).map((r) => r.to));
  const spans = restSpans(s.startedAt, end, (s.restLog ?? []).filter((r) => r.kind === 'rest'));
  const sum = (kind: 'lift' | 'rest') => spans.filter((x) => x.kind === kind).reduce((n, x) => n + (x.to - x.from), 0);
  return { total: end - s.startedAt, lift: sum('lift'), rest: sum('rest'), longestRest: Math.max(0, ...spans.filter((x) => x.kind === 'rest').map((x) => x.to - x.from)) };
}

/** Muscle groups, as Train and the muscle map show them. */
export const GROUPS: { name: string; muscles: MuscleId[] }[] = [
  { name: 'Delts', muscles: ['front-delts', 'side-delts', 'rear-delts'] },
  { name: 'Back', muscles: ['upper-back', 'lats'] },
  { name: 'Chest', muscles: ['chest'] },
  { name: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { name: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { name: 'Core', muscles: ['abs'] },
];
