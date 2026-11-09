/**
 * A training plan is data: the engine knows nothing about any one plan.
 * The app starts with the built-in home A/B plan (defaultPlan.ts); a starter
 * file or "Import a plan" replaces it.
 */

/**
 * pair / single: kg per dumbbell. body: bodyweight. band: a band level.
 * Gym kinds (coach reply 8 Nov §3): barbell = total kg, bar included; stack = the number the machine's
 * stack shows, in that machine's unit; plates = plates added to a plate-loaded machine (not the sled);
 * assist = an assisted machine's assist number, where less assist is progress.
 * Gym loads are never converted, and never compared across machines.
 */
export type LoadKind = 'pair' | 'single' | 'body' | 'band' | 'barbell' | 'stack' | 'plates' | 'assist';

export const LOAD_KINDS: LoadKind[] = ['pair', 'single', 'body', 'band', 'barbell', 'stack', 'plates', 'assist'];

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
  /** The plan asks for a fresh start at startKg: history from before the import no longer sets the load. */
  resetLoad?: boolean;
  /** Set on import (ms): sets logged before this don't set the load or the progression. History and records keep them. */
  loadFrom?: number;
  /** v3: 3–6 form points, ticked after each set. Written by the coach. */
  checks?: FormCheck[];
  /** v3: single-joint work, where the session nudges you through the burn. */
  isolation?: boolean;
  /** v3: the coach's default setup (chair, bench, grip). */
  setup?: string;
  /** v3: the weight passes over the face: collars are checked first. */
  overFace?: boolean;
  /** v3: why the lead side goes first. */
  leadWhy?: string;
  /** Coach tags (calibration §13.2): the movement pattern, e.g. "hinge". Football reads them; nothing else does yet. */
  family?: string;
  /** What it's done with: dumbbell, barbell, machine, cable, band, bodyweight, kettlebell. */
  kit?: string;
  /** The same movement on new kit: the id of the exercise it replaces. Football keeps the player and its history. */
  replaces?: string;
  /** A harder variation the coach counts as the next step of an earlier exercise (its id). Treated like `replaces`. */
  progressionOf?: string;
  /** Gym kit: the machine this is done on, e.g. "Leg press". Its stack unit is remembered per machine. Defaults to the exercise id. */
  machine?: string;
  /** Stack or assist work: the machine's unit when the plan knows it (kg, lb, or the stack's own numbers). Default kg. */
  unit?: 'kg' | 'lb' | 'stack';
  /** Plate-loaded machines: the sled's own weight, when known, as a note. */
  sledKg?: number;
}

export interface FormCheck {
  /** Stays the same across plan versions, so the export can track it. */
  id: string;
  text: string;
  kind: 'do' | 'avoid';
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
  /**
   * Home and gym, each with its own rotation (coach reply 8 Nov §3). Train asks which at the start and offers
   * the next session in that one; one never moves the other. When set, `rotation` is the home one.
   */
  rotations?: { home: string[]; gym: string[] };
  /** A guide, not a rule: sessions a week in each place, e.g. { gym: 2, home: 2 }. Consistency counts every session. */
  weeklyTarget?: { home?: number; gym?: number };
  /** The coach's safety lines for every gym exercise's guide, e.g. eyes and knees. Kept in the plan file, not the app. */
  gymSafety?: { title: string; text: string }[];
  /** Sessions outside the rotation, e.g. ["G"] for a gym night. Logged and counted, but the loop doesn't move. */
  extra?: string[];
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
  /** v3: the coach's version of this plan, e.g. "1.2"; sessions record it. */
  planVersion?: string;
  /** v3: hard sets per muscle group per week, [low, high], e.g. { Legs: [10, 16] }. */
  weeklyTargets?: Record<string, [number, number]>;
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

export type Place = 'home' | 'gym';

/** The plan has a home rotation and a gym rotation. */
export function hasGym(plan: PlanDef): boolean {
  return !!plan.rotations && plan.rotations.gym.length > 0;
}

/** The loop for a place: with home and gym rotations, that place's; otherwise the one rotation. */
export function rotationOf(plan: PlanDef, place: Place = 'home'): string[] {
  if (plan.rotations) {
    const r = plan.rotations[place];
    if (r?.length) return r;
  }
  const extra = new Set(plan.extra ?? []);
  const gym = new Set(plan.rotations?.gym ?? []);
  return plan.rotation.length ? plan.rotation : plan.sessions.map((s) => s.id).filter((id) => !extra.has(id) && !gym.has(id));
}

/** Which place a session belongs to: in the gym rotation is gym, everything else home. */
export function placeOfSession(plan: PlanDef, sessionId: string): Place {
  return plan.rotations?.gym.includes(sessionId) ? 'gym' : 'home';
}

/** Alternate from the last rotation session logged. A session outside the loop (a trip, a gym night) never resets it. */
export function nextSessionId(plan: PlanDef, lastDone?: string, place: Place = 'home'): string {
  const rot = rotationOf(plan, place);
  const i = lastDone ? rot.indexOf(lastDone) : -1;
  return i < 0 ? rot[0] : rot[(i + 1) % rot.length];
}

/**
 * Where the loop stands: a start picked at import holds until a rotation session is done after it.
 * With home and gym rotations, each place has its own loop: a gym session never moves the home one.
 */
export function nextInLoop(plan: PlanDef, done: { session: string; startedAt: number }[], start?: { session: string; at: number }, place: Place = 'home'): string {
  const rot = rotationOf(plan, place);
  const inLoop = done.filter((s) => rot.includes(s.session) && (!start || s.startedAt >= start.at)).sort((a, b) => a.startedAt - b.startedAt);
  const last = inLoop[inLoop.length - 1];
  if (last) return nextSessionId(plan, last.session, place);
  if (start && rot.includes(start.session)) return start.session;
  return nextSessionId(plan, undefined, place);
}

/** Sessions that run outside the loop, such as a gym night. */
export function extraSessions(plan: PlanDef): SessionDef[] {
  return (plan.extra ?? []).map((id) => findSession(plan, id)).filter((s): s is SessionDef => !!s);
}

/** Sets that set an exercise's load: after a reset at import, only the ones since. */
export function sinceReset<T extends { at: number }>(ex: Pick<ExerciseDef, 'loadFrom'>, sets: T[]): T[] {
  return ex.loadFrom === undefined ? sets : sets.filter((s) => s.at >= ex.loadFrom!);
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
export function buildSession(plan: PlanDef, sessionId: string, opts: { short?: boolean; swaps?: Swap[]; equipment?: { band: boolean } } = {}): ExerciseDef[] {
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
  const eq = opts.equipment;
  return eq ? list.map((e) => effectiveExercise(e, eq)) : list;
}

/** The plan as this kit will do it: with no band, every band move is swapped (see effectiveExercise). */
export function planForKit(plan: PlanDef, eq: { band: boolean } | undefined): PlanDef {
  if (!eq || eq.band || !plan.sessions.some((s) => s.exercises.some((e) => e.load === 'band'))) return plan;
  return { ...plan, sessions: plan.sessions.map((s) => ({ ...s, exercises: s.exercises.map((e) => effectiveExercise(e, eq)) })) };
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
      if (!LOAD_KINDS.includes(e.load)) errs.push(`${e.name} has an unknown load type.`);
      if (e.unit !== undefined && !['kg', 'lb', 'stack'].includes(e.unit)) errs.push(`${e.name} has an unknown unit "${e.unit}"; use kg, lb or stack.`);
    }
    for (const id of s.short ?? []) if (!s.exercises?.some((e) => e.id === id)) errs.push(`The short ${s.name} names "${id}", which isn't in it.`);
  }
  for (const f of plan.flags ?? []) {
    if (f.swap && (!ids.has(f.swap.from) || !ids.has(f.swap.to))) errs.push(`The flag "${f.label}" swaps an exercise that isn't in the plan.`);
  }
  if (!Array.isArray(plan.rotation)) errs.push('The plan is missing its rotation, e.g. ["A", "B"].');
  const sessionIds = new Set((plan.sessions ?? []).map((s) => s.id));
  for (const id of Array.isArray(plan.rotation) ? plan.rotation : []) if (!sessionIds.has(id)) errs.push(`The rotation names "${id}", which isn't a session.`);
  if (plan.gymSafety !== undefined && !(Array.isArray(plan.gymSafety) && plan.gymSafety.every((g) => g && typeof g.title === 'string' && typeof g.text === 'string'))) errs.push('gymSafety is a list of { "title", "text" } lines.');
  if (plan.rotations !== undefined) {
    const r = plan.rotations as Partial<{ home: unknown; gym: unknown }>;
    if (!Array.isArray(r.home) || !Array.isArray(r.gym)) errs.push('rotations needs a home list and a gym list, e.g. { "home": ["A", "B"], "gym": ["G1", "G2"] }.');
    else {
      for (const id of [...(r.home as string[]), ...(r.gym as string[])]) if (!sessionIds.has(id)) errs.push(`The rotations name "${id}", which isn't a session.`);
      for (const id of r.gym as string[]) if ((r.home as string[]).includes(id)) errs.push(`"${id}" is in both the home and the gym rotation; it can only be one.`);
    }
  }
  for (const [k, v] of Object.entries(plan.weeklyTarget ?? {})) if (!['home', 'gym'].includes(k) || !(typeof v === 'number' && v >= 0)) errs.push('weeklyTarget takes home and gym session counts, e.g. { "gym": 2, "home": 2 }.');
  for (const e of (plan.sessions ?? []).flatMap((x) => x.exercises ?? [])) {
    for (const k of ['replaces', 'progressionOf'] as const) if (e[k] !== undefined && typeof e[k] !== 'string') errs.push(`${e.name}: ${k} names an exercise id.`);
  }
  for (const id of plan.extra ?? []) {
    if (!sessionIds.has(id)) errs.push(`The extra session "${id}" isn't a session.`);
    else if (plan.rotation?.includes(id)) errs.push(`"${id}" is in the rotation and in extra; it can only be one.`);
  }
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

/**
 * The swap for a band move whose plan names none: a dumbbell rear-delt raise, chest down on a
 * bench or bed. It trains what most band pulls do (the back of the shoulder) with no band.
 */
export const NO_BAND_DEFAULT: NonNullable<ExerciseDef['noBand']> = {
  name: 'Dumbbell rear-delt raise',
  load: 'pair',
  cue: 'Chest down on a bench or bed, arms hanging; lift the dumbbells out to the sides, thumbs down, and pause at the top.',
};

/** The exercise as it will be done with this kit: with no band, a band move swaps to its no-band version. */
export function effectiveExercise(ex: ExerciseDef, eq: { band: boolean }): ExerciseDef {
  if (ex.load !== 'band' || eq.band) return ex;
  const { noBand, bandLevels: _levels, guide: _guide, checks: _checks, ...rest } = ex;
  const swap = noBand ?? NO_BAND_DEFAULT;
  // The band move's guide, cue, setup and form checks describe the band, so they go with it.
  return { ...rest, guide: undefined, checks: undefined, cue: undefined, setup: undefined, ...swap, id: ex.id, order: ex.order };
}
