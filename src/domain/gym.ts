// Gym prep (coach reply 8 Nov 2026, §1–4): gym load kinds, the safety lines every gym exercise carries,
// the coach's exercise tags, skip reasons, and "Start with the heavy block?".
import { fmtKg } from './loads';
import { weekStart, type DayKey } from './dates';
import { placeOfSession, type ExerciseDef, type LoadKind, type Place, type PlanDef } from './plan';
import type { LoadBlock } from './sessionEdges';
import type { LoadUnit, SetEntry, Settings, SkipReason, TrainingSession } from './types';

/** Kit the gym brings: no plate table at home sets these loads. */
export const GYM_KINDS: LoadKind[] = ['barbell', 'stack', 'plates', 'assist'];
export const isGymKind = (k: LoadKind) => GYM_KINDS.includes(k);

/** Done at the gym: a gym load kind, or the coach tags it machine, cable or barbell. */
export function isGymExercise(ex: Pick<ExerciseDef, 'load' | 'kit'>): boolean {
  return isGymKind(ex.load) || ex.kit === 'machine' || ex.kit === 'cable' || ex.kit === 'barbell';
}

/** Dumbbell work only: what the plate plan and plate changes are about. Gym numbers never mean plates on a handle. */
export function isDumbbellKind(k: LoadKind): boolean {
  return k === 'pair' || k === 'single' || k === 'body';
}

/** Where a stack's unit is remembered: the machine's name, else the exercise. */
export const machineKey = (ex: Pick<ExerciseDef, 'id' | 'machine'>) => (ex.machine?.trim() || ex.id).toLowerCase();

/** The stack unit for this machine: remembered per machine, else the plan's, else kg. */
export function machineUnit(ex: Pick<ExerciseDef, 'id' | 'machine' | 'unit'>, settings: Pick<Settings, 'machineUnits'>): 'kg' | 'lb' | 'stack' {
  return settings.machineUnits?.[machineKey(ex)] ?? ex.unit ?? 'kg';
}

/** What a saved number means for this exercise. Undefined for dumbbell, bodyweight and band work, which stay as they were. */
export function unitFor(ex: Pick<ExerciseDef, 'id' | 'machine' | 'unit' | 'load'>, settings: Pick<Settings, 'machineUnits'>): LoadUnit | undefined {
  switch (ex.load) {
    case 'barbell':
      return 'kg';
    case 'plates':
      return 'plates';
    case 'stack': {
      const u = machineUnit(ex, settings);
      return u === 'kg' ? 'kg' : u;
    }
    case 'assist': {
      const u = machineUnit(ex, settings);
      return u === 'kg' ? 'assist-kg' : u === 'lb' ? 'assist-lb' : 'assist-stack';
    }
    default:
      return undefined;
  }
}

/** Less is progress: an assisted machine's assist number. */
export const lowerIsHarder = (ex: Pick<ExerciseDef, 'load'>) => ex.load === 'assist';

/** Real kilograms lifted, so it can join "kg moved". Stack numbers in lb or plain numbers, plates and assists can't. */
export function countsAsKg(s: Pick<SetEntry, 'loadUnit'>): boolean {
  return s.loadUnit === undefined || s.loadUnit === 'kg';
}

/** A load as words: "40 kg total", "stack 7 (kg)", "3 plates", "assist 25 kg". */
export function loadText(load: LoadKind, value: number | null, unit?: LoadUnit): string {
  if (value === null) return load === 'body' ? 'bodyweight' : '';
  const n = fmtKg(value);
  switch (load) {
    case 'barbell':
      return `${n} kg total`;
    case 'plates':
      return `${n} plate${value === 1 ? '' : 's'} added`;
    case 'stack':
      return unit === 'lb' ? `stack ${n} lb` : unit === 'stack' ? `stack ${n}` : `stack ${n} kg`;
    case 'assist':
      return unit === 'assist-lb' ? `assist ${n} lb` : unit === 'assist-stack' ? `assist ${n}` : `assist ${n} kg`;
    default:
      return `${n} kg`;
  }
}

/** The short unit after a number on the big screens and the list header. */
export function unitLabel(load: LoadKind, unit?: LoadUnit): string {
  if (load === 'plates') return 'plates';
  if (load === 'barbell') return 'kg total';
  if (unit === 'lb' || unit === 'assist-lb') return 'lb';
  if (unit === 'stack' || unit === 'assist-stack') return 'no.';
  return 'kg';
}

/** The steps the load picker moves in: 2.5 kg on a barbell, 1 on a stack or plates, 5 lb. */
export function loadStep(load: LoadKind, unit?: LoadUnit): number {
  if (load === 'barbell') return 2.5;
  if (unit === 'lb' || unit === 'assist-lb') return 5;
  if (unit === 'kg' || unit === 'assist-kg') return load === 'plates' ? 1 : 2.5;
  return 1;
}

/**
 * The safety lines every gym exercise's guide carries (coach reply §3). The plan file's `gymSafety` says them
 * in the coach's words; these generic ones stand in when it doesn't, so the repo holds nothing personal.
 */
export const GYM_SAFETY: { title: string; text: string }[] = [
  { title: 'Eyes', text: 'Breathe out on every effort. No heavy breath-holding, no head-down positions, nothing jarring. No max attempts: stop most sets 1–3 reps short of failure.' },
  { title: 'Knees', text: 'Leg press and leg extension start light, with depth set by comfort. No jumping or plyometrics.' },
];

/** The safety lines for a gym exercise: the plan's own, else the generic ones. None for home work. */
export function safetyFor(ex: Pick<ExerciseDef, 'load' | 'kit'>, plan?: { gymSafety?: { title: string; text: string }[] }): { title: string; text: string }[] {
  if (!isGymExercise(ex)) return [];
  return plan?.gymSafety?.length ? plan.gymSafety : GYM_SAFETY;
}

/**
 * The coach's tags for the home plan (reply 8 Nov §4), used until a plan file carries its own.
 * reverse-curl is grip (the partner to wrist-curl); pullover is pull-vertical.
 */
export const DEFAULT_TAGS: Record<string, { family: string; kit: string }> = {
  rdl: { family: 'hinge', kit: 'dumbbell' },
  'single-leg-bridge': { family: 'hinge', kit: 'bodyweight' },
  'goblet-squat': { family: 'squat', kit: 'dumbbell' },
  'split-squat': { family: 'lunge', kit: 'dumbbell' },
  'floor-press': { family: 'push-horizontal', kit: 'dumbbell' },
  'close-grip-press': { family: 'push-horizontal', kit: 'dumbbell' },
  'incline-pushup': { family: 'push-horizontal', kit: 'bodyweight' },
  'floor-fly': { family: 'push-horizontal', kit: 'dumbbell' },
  ohp: { family: 'push-vertical', kit: 'dumbbell' },
  row: { family: 'pull-horizontal', kit: 'dumbbell' },
  'bent-row': { family: 'pull-horizontal', kit: 'dumbbell' },
  pullover: { family: 'pull-vertical', kit: 'dumbbell' },
  curl: { family: 'biceps', kit: 'dumbbell' },
  'hammer-curl': { family: 'biceps', kit: 'dumbbell' },
  'concentration-curl': { family: 'biceps', kit: 'dumbbell' },
  'reverse-curl': { family: 'grip', kit: 'dumbbell' },
  'skull-crusher': { family: 'triceps', kit: 'dumbbell' },
  'overhead-ext': { family: 'triceps', kit: 'dumbbell' },
  'lateral-raise': { family: 'shoulders', kit: 'dumbbell' },
  'lean-lateral': { family: 'shoulders', kit: 'dumbbell' },
  'seated-lateral': { family: 'shoulders', kit: 'dumbbell' },
  'rear-delt': { family: 'shoulders', kit: 'dumbbell' },
  'rear-delt-1arm': { family: 'shoulders', kit: 'dumbbell' },
  'face-pull': { family: 'shoulders', kit: 'band' },
  'calf-raise': { family: 'calves', kit: 'dumbbell' },
  plank: { family: 'core', kit: 'bodyweight' },
  'side-plank': { family: 'core', kit: 'bodyweight' },
  'dead-bug': { family: 'core', kit: 'bodyweight' },
  'farmer-carry': { family: 'carry', kit: 'dumbbell' },
  'wrist-curl': { family: 'grip', kit: 'dumbbell' },
};

/** An exercise's tags: the plan's own first, then the coach's table, then what its load kind says. */
export function coachTags(ex: Pick<ExerciseDef, 'id' | 'family' | 'kit' | 'load' | 'replaces' | 'progressionOf'>): { family?: string; kit?: string; replaces?: string; progressionOf?: string } {
  const d = DEFAULT_TAGS[ex.id];
  const kitOf: Partial<Record<LoadKind, string>> = { pair: 'dumbbell', single: 'dumbbell', body: 'bodyweight', band: 'band', barbell: 'barbell', stack: 'machine', plates: 'machine', assist: 'machine' };
  return { family: ex.family ?? d?.family, kit: ex.kit ?? d?.kit ?? kitOf[ex.load], replaces: ex.replaces, progressionOf: ex.progressionOf };
}

export const SKIP_REASONS: { id: SkipReason; label: string }[] = [
  { id: 'pain', label: 'Pain' },
  { id: 'worried', label: 'Worried about injury' },
  { id: 'no-kit', label: 'No kit' },
  { id: 'time', label: 'Time' },
  { id: 'tired', label: 'Tired' },
];
export const skipLabel = (r: SkipReason | undefined) => SKIP_REASONS.find((x) => x.id === r)?.label;

export interface HeavyFirst {
  /** The heavy block's load and the light one's. */
  heavyKg: number;
  lightKg: number;
  /** The light work that comes before the heavy block in the plan: protected, so it can't be dropped quietly. */
  protect: string[];
}

/**
 * "Start with the 10 kg block?" (coach reply §1): offered when the plan starts on a lighter block and a heavier
 * one follows, so a night that starts with the handles already at the heavy load needs no plate change first.
 */
export function heavyFirstOffer(blocks: LoadBlock[]): HeavyFirst | undefined {
  const loaded = blocks.filter((b) => b.kg !== null);
  if (loaded.length < 2) return undefined;
  const first = blocks.findIndex((b) => b.kg !== null);
  const heavyKg = Math.max(...loaded.map((b) => b.kg!));
  const lightKg = blocks[first].kg!;
  if (lightKg >= heavyKg) return undefined;
  const heavyAt = blocks.findIndex((b) => b.kg === heavyKg);
  const protect = blocks.slice(0, heavyAt).flatMap((b) => b.exs.map((e) => e.id));
  return { heavyKg, lightKg, protect };
}

/** Tonight's order with the heavy block first; everything else keeps the plan's order. */
export function heavyFirstOrder(blocks: LoadBlock[], heavyKg: number): string[] {
  const at = blocks.findIndex((b) => b.kg === heavyKg);
  if (at <= 0) return blocks.flatMap((b) => b.exs.map((e) => e.id));
  return [blocks[at], ...blocks.slice(0, at), ...blocks.slice(at + 1)].flatMap((b) => b.exs.map((e) => e.id));
}

/** The protected exercises with nothing done yet tonight (skips count as done: a skip is a choice, with its reason). */
export function protectedLeft(protect: string[], mine: Pick<SetEntry, 'exerciseId'>[]): string[] {
  return protect.filter((id) => !mine.some((s) => s.exerciseId === id));
}

/** The overhead press warm-up when the light pair isn't on the handles yet (heavy block first): the lightest pair, 8 easy reps. */
export function lightWarmup(lightestKg: number | undefined): string {
  const pair = lightestKg !== undefined ? `the ${fmtKg(lightestKg)} kg pair` : 'the lightest pair';
  return `Warm up with ${pair}: 8 easy reps. Any pinch ends the exercise.`;
}

/** Overhead pressing: it gets the light warm-up when the heavy block goes first. */
export function isOverheadPress(ex: Pick<ExerciseDef, 'id' | 'family' | 'kit' | 'load' | 'replaces' | 'progressionOf'>): boolean {
  return coachTags(ex).family === 'push-vertical';
}

/** Where a body log entry can be: front and back, both sides named separately on the next step. */
export const BODY_PARTS = ['Neck', 'Shoulder', 'Elbow', 'Wrist', 'Upper back', 'Lower back', 'Chest', 'Hip', 'Knee', 'Ankle', 'Eyes or head', 'Other'];

/** The week's guide with home and gym rotations: the plan's target and what's done so far. A guide, not a rule. */
export function weekGuide(plan: PlanDef, sessions: Pick<TrainingSession, 'status' | 'date' | 'session' | 'place'>[], today: DayKey): string | undefined {
  const t = plan.weeklyTarget;
  const from = weekStart(today);
  const week = sessions.filter((s) => s.status === 'done' && s.date >= from && s.date <= today);
  const n = (p: Place) => week.filter((s) => (s.place ?? placeOfSession(plan, s.session)) === p).length;
  const done = `this week ${n('gym')} gym, ${n('home')} home`;
  if (!t || (t.gym === undefined && t.home === undefined)) return `So far ${done}.`;
  const aim = [t.gym !== undefined ? `${t.gym} gym` : '', t.home !== undefined ? `${t.home} home` : ''].filter(Boolean).join(' + ');
  return `Guide: ${aim} a week · ${done}. Every session counts.`;
}
