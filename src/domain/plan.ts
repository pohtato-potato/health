/**
 * A training plan is data: the engine knows nothing about any one plan.
 * The app starts with the built-in home A/B plan (defaultPlan.ts); a starter
 * file or "Import a plan" replaces it.
 */

export type LoadKind = 'pair' | 'single' | 'body' | 'band';

/** What a set counts: repetitions, a hold in seconds, or steps walked (carries). */
export type Measure = 'reps' | 'seconds' | 'steps';

/** The ways to make the same load harder (spec §5.5). */
export const CHALLENGE_IDS = ['shorter-rest', 'deeper-incline', 'pause-bottom', 'pause-top', 'slow-lowering', 'one-and-half', 'harder-version', 'one-arm', 'longer-range', 'added-hold', 'shorter-pair-rest', 'slower-last-set'] as const;
export type ChallengeId = (typeof CHALLENGE_IDS)[number];

export const CHALLENGE_NAMES: Record<ChallengeId, string> = {
  'shorter-rest': 'Shorter rest',
  'deeper-incline': 'Deeper incline',
  'pause-bottom': 'Pause at the bottom',
  'pause-top': 'Pause at the top',
  'slow-lowering': 'Slower lowering (3 s)',
  'one-and-half': '1½ reps',
  'harder-version': 'Harder version',
  'one-arm': 'One-arm version',
  'longer-range': 'Longer range',
  'added-hold': 'Added hold',
  'shorter-pair-rest': 'Shorter rest between the pair',
  'slower-last-set': 'Slower last set',
};

/** A full guide for one exercise, written for the setup at home. */
export interface Guide {
  setup: string;
  movement: string;
  breathing: string;
  faults: string[];
  feel: string;
  stop: string;
  progress: string;
}

export interface ExerciseDef {
  id: string;
  /** "1", "3a". Exercises sharing a number are a superset. */
  order: string;
  name: string;
  sets: number;
  reps?: [number, number];
  seconds?: [number, number];
  /** "Clean reps": no top of the range, so no load suggestions. */
  open?: boolean;
  perSide?: boolean;
  /** The side done first. The other side never does more reps than it. */
  lead?: 'L' | 'R';
  /** pair: one dumbbell in each hand. single: one dumbbell. Loads are per dumbbell. */
  load: LoadKind;
  startKg?: number;
  /** For band work, easiest first. */
  bandLevels?: string[];
  /** Bodyweight work that picks up dumbbells once every set reaches the top. */
  thenLoad?: { load: 'pair' | 'single'; kg: number };
  /** Harder versions to switch to at the top of the range, before adding load. */
  variants?: { name: string; note?: string }[];
  /** Last set: drop to this load and keep going. */
  drop?: { kg: number };
  /** Slow lowering by default. */
  tempo?: boolean;
  restSec?: number;
  note?: string;
  /** A flag that stops this exercise on the spot, e.g. wrist pain. */
  stopFlag?: string;
  /** v2: what a set counts. Defaults to seconds when `seconds` is set, else reps. */
  measure?: Measure;
  /** Steps per set for carries measured in steps. */
  steps?: [number, number];
  challenges?: ChallengeId[];
  /** The one cue shown before a set when no fault pattern has formed yet. */
  cue?: string;
  guide?: Guide;
  /** Used instead when there is no band. */
  noBand?: Partial<Omit<ExerciseDef, 'id' | 'order' | 'noBand'>> & { name: string; load: LoadKind };
  /** Grip-heavy: afterwards, inputs switch to big dials and chips. */
  tiredHands?: boolean;
}

export interface SessionDef {
  id: string;
  name: string;
  focus: string;
  minutes: number;
  exercises: ExerciseDef[];
  /** Exercise ids for a short-on-time session. */
  short: string[];
}

export interface FlagDef {
  id: string;
  label: string;
  /** Groups flags for summaries, e.g. "Knee". */
  group: string;
  /** Ticked after a session, or answered in the next morning's log. */
  when: 'session' | 'morning';
  question?: string;
  hint?: string;
  /** Morning questions are only asked after a session with one of these exercises. */
  after?: string[];
  /** Swap one exercise for another in the next session of this kind. */
  swap?: { from: string; to: string; session: string };
  advice?: string;
}

export interface TriggerDef {
  id: string;
  exercise: string;
  kg: number;
  sets: number;
  reps: number;
  title: string;
  message: string;
}

export interface PlanDef {
  format: 'health-plan';
  version: 1 | 2;
  name: string;
  from: string;
  rotation: string[];
  sessions: SessionDef[];
  perWeek?: number;
  warmup?: string;
  rules?: { title: string; text: string }[];
  /** A load jump bigger than this fraction counts as big. */
  bigJump?: number;
  flags: FlagDef[];
  triggers?: TriggerDef[];
  /** What to expect and when, e.g. "the slow stretch". */
  phases?: { from: string; to: string; title: string; text: string }[];
}

export type PlanState = { variants: Record<string, number>; band: Record<string, number> };

export function allExercises(plan: PlanDef): ExerciseDef[] {
  return plan.sessions.flatMap((s) => s.exercises);
}

export function findExercise(plan: PlanDef, id: string): ExerciseDef | undefined {
  return allExercises(plan).find((e) => e.id === id);
}

export function findSession(plan: PlanDef, id: string): SessionDef | undefined {
  return plan.sessions.find((s) => s.id === id);
}

/** "3a" → "3"; "1" → "1". */
export function groupKey(order: string): string {
  const m = /^(\d+)/.exec(order);
  return m ? m[1] : order;
}

export function isSuperset(ex: ExerciseDef): boolean {
  return /\d+[a-z]$/i.test(ex.order);
}

/** Consecutive exercises that share a number, done back to back. */
export function groupExercises(exs: ExerciseDef[]): ExerciseDef[][] {
  const groups: ExerciseDef[][] = [];
  for (const ex of exs) {
    const last = groups[groups.length - 1];
    if (last && isSuperset(ex) && isSuperset(last[0]) && groupKey(last[0].order) === groupKey(ex.order)) {
      last.push(ex);
    } else {
      groups.push([ex]);
    }
  }
  return groups;
}

/** Alternate from the last session logged. */
export function nextSessionId(plan: PlanDef, lastDone?: string): string {
  const rot = plan.rotation.length ? plan.rotation : plan.sessions.map((s) => s.id);
  if (!lastDone) return rot[0];
  const i = rot.indexOf(lastDone);
  return rot[(i + 1) % rot.length];
}

export function exerciseName(ex: ExerciseDef, state?: PlanState): string {
  const v = state?.variants[ex.id] ?? 0;
  if (v > 0 && ex.variants?.[v - 1]) return ex.variants[v - 1].name;
  return ex.name;
}

export function bandLevel(ex: ExerciseDef, state?: PlanState): string | undefined {
  if (ex.load !== 'band') return undefined;
  const levels = ex.bandLevels?.length ? ex.bandLevels : ['Band'];
  return levels[Math.min(state?.band[ex.id] ?? 0, levels.length - 1)];
}

/** "3 × 10–15", "2 × 45–60 s", "3 × clean reps". */
export function targetText(ex: ExerciseDef): string {
  let t: string;
  if (measureOf(ex) === 'steps' && ex.steps) t = `${ex.sets} × ${range(ex.steps)} steps`;
  else if (ex.seconds) t = `${ex.sets} × ${range(ex.seconds)} s`;
  else if (ex.open || !ex.reps) t = `${ex.sets} × clean reps`;
  else t = `${ex.sets} × ${range(ex.reps)}`;
  return ex.perSide ? `${t} each side` : t;
}

function range([lo, hi]: [number, number]): string {
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}

/** The range the exercise's measure is counted in. */
function rangeOf(ex: ExerciseDef): [number, number] | undefined {
  const m = measureOf(ex);
  return m === 'steps' ? ex.steps : m === 'seconds' ? ex.seconds : ex.reps;
}

export function topOfRange(ex: ExerciseDef): number | undefined {
  if (ex.open) return undefined;
  return rangeOf(ex)?.[1];
}

export function bottomOfRange(ex: ExerciseDef): number | undefined {
  return rangeOf(ex)?.[0];
}

export function measureOf(ex: ExerciseDef): Measure {
  return ex.measure ?? (ex.seconds ? 'seconds' : 'reps');
}

/** A set's value in the exercise's own measure, ready to save. */
export function measured(ex: ExerciseDef, value: number): { reps?: number; seconds?: number; steps?: number } {
  const v = Math.round(value);
  const m = measureOf(ex);
  return m === 'steps' ? { steps: v } : m === 'seconds' ? { seconds: v } : { reps: v };
}

/** Reps, seconds or steps: whichever the set counted. */
export function valueOfSet(s: { reps?: number; seconds?: number; steps?: number }): number | undefined {
  return s.reps ?? s.seconds ?? s.steps;
}

/** Sets that were done. Skipped sets keep the session's flow but count for nothing. */
export function realSets<T extends { skipped?: boolean }>(sets: T[]): T[] {
  return sets.filter((s) => !s.skipped);
}

/** A "1 rep, no weight" save is almost always a set that wasn't done. */
export function isPlaceholder(s: { reps?: number; seconds?: number; steps?: number; loadKg: number | null }): boolean {
  return (s.reps ?? 0) <= 1 && !s.seconds && !s.steps && s.loadKg === null;
}

/** The order of sides for a per-side set: a plan's lead side is fixed; otherwise the side picked first. */
export function sidesFor(ex: ExerciseDef, first: 'L' | 'R' | undefined): ('L' | 'R' | 'both')[] {
  if (!ex.perSide) return ['both'];
  const lead = ex.lead ?? first ?? 'L';
  return lead === 'R' ? ['R', 'L'] : ['L', 'R'];
}

export interface Swap {
  from: string;
  to: string;
  reason: string;
}

/**
 * The exercises for a session after the short-on-time cut and any swaps.
 * A swap whose replacement is already in the session just drops the original.
 */
export function buildSession(plan: PlanDef, sessionId: string, opts: { short?: boolean; swaps?: Swap[] } = {}): ExerciseDef[] {
  const def = findSession(plan, sessionId);
  if (!def) return [];
  let list = def.exercises.slice();
  if (opts.short && def.short.length) list = list.filter((e) => def.short.includes(e.id));
  for (const swap of opts.swaps ?? []) {
    const i = list.findIndex((e) => e.id === swap.from);
    if (i < 0) continue;
    const replacement = findExercise(plan, swap.to);
    if (!replacement || list.some((e) => e.id === swap.to)) list.splice(i, 1);
    else list[i] = { ...replacement, order: list[i].order };
  }
  return list;
}

/** Checks an imported plan and returns what's wrong with it, if anything. */
export function validatePlan(p: unknown): string[] {
  const errs: string[] = [];
  const plan = p as Partial<PlanDef>;
  if (!plan || typeof plan !== 'object') return ['The file is not a plan.'];
  if (plan.format !== 'health-plan') errs.push('The file is missing format: "health-plan".');
  if (!Array.isArray(plan.sessions) || plan.sessions.length === 0) errs.push('The plan has no sessions.');
  const ids = new Set<string>();
  for (const s of plan.sessions ?? []) {
    if (!s.id || !s.name) errs.push('A session is missing its id or name.');
    if (!Array.isArray(s.exercises) || s.exercises.length === 0) errs.push(`${s.name ?? 'A session'} has no exercises.`);
    for (const e of s.exercises ?? []) {
      if (!e.id || !e.name) errs.push(`An exercise in ${s.name} is missing its id or name.`);
      if (ids.has(e.id)) errs.push(`The exercise id "${e.id}" is used twice.`);
      ids.add(e.id);
      if (!(e.sets > 0)) errs.push(`${e.name} needs a number of sets.`);
      if (!['pair', 'single', 'body', 'band'].includes(e.load)) errs.push(`${e.name} has an unknown load type.`);
    }
    for (const id of s.short ?? []) if (!s.exercises?.some((e) => e.id === id)) errs.push(`The short ${s.name} names "${id}", which isn't in it.`);
  }
  for (const f of plan.flags ?? []) {
    if (f.swap && (!ids.has(f.swap.from) || !ids.has(f.swap.to))) errs.push(`The flag "${f.label}" swaps an exercise that isn't in the plan.`);
  }
  if (!Array.isArray(plan.rotation)) errs.push('The plan is missing its rotation, e.g. ["A", "B"].');
  return errs;
}

/** Brings a v1 plan to v2: every exercise says what it measures. Ids and everything else stay. */
export function upgradePlan(plan: PlanDef): PlanDef {
  return {
    ...plan,
    version: 2,
    sessions: plan.sessions.map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e, measure: e.measure ?? (e.seconds ? 'seconds' : 'reps') })) })),
  };
}

/** The exercise as it will be done with this kit: a band move swaps to its no-band version. */
export function effectiveExercise(ex: ExerciseDef, eq: { band: boolean }): ExerciseDef {
  if (ex.load !== 'band' || eq.band || !ex.noBand) return ex;
  const { noBand, bandLevels: _levels, ...rest } = ex;
  return { ...rest, ...noBand, id: ex.id, order: ex.order };
}
