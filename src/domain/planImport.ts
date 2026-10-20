import { allExercises, nextInLoop, rotationOf, type FlagDef, type LoadKind, type PlanDef } from './plan';
import { exerciseStatus } from './progression';
import type { Settings, SetEntry, TrainingSession } from './types';

/** An undo stays on offer this long after an import. */
export const UNDO_DAYS = 7;

export interface LoadChange {
  id: string;
  name: string;
  /** The load history would set tonight, without a reset. */
  fromKg: number | null;
  /** The plan's start load. */
  toKg: number | null;
  /** Set when the plan changes how the exercise is loaded, e.g. bodyweight → one dumbbell. */
  kind?: { from: LoadKind; to: LoadKind };
  /** A kind change always starts fresh: old sets measure something else. */
  forced: boolean;
}

export interface PlanDiff {
  kept: string[];
  renamed: { id: string; from: string; to: string }[];
  added: { id: string; name: string }[];
  removed: { id: string; name: string }[];
  newFlags: FlagDef[];
  loads: LoadChange[];
  /** Where the loop would carry on without a pick. */
  next: string;
}

const KIND_NAMES: Record<LoadKind, string> = { pair: 'a pair', single: 'one dumbbell', body: 'bodyweight', band: 'band' };
export const kindName = (k: LoadKind) => KIND_NAMES[k];

/** What a plan import changes: exercises kept, renamed, new and gone, new flags, and every load that moves. */
export function diffPlans(old: PlanDef | undefined, next: PlanDef, ctx: Pick<Settings, 'planState' | 'equipment' | 'rotationStart'> & { sets: SetEntry[]; sessions: TrainingSession[] }): PlanDiff {
  const oldExs = old ? allExercises(old) : [];
  const oldById = new Map(oldExs.map((e) => [e.id, e]));
  const newExs = allExercises(next);
  const newIds = new Set(newExs.map((e) => e.id));
  const kept = newExs.filter((e) => oldById.has(e.id)).map((e) => e.id);
  const renamed = newExs.filter((e) => oldById.has(e.id) && oldById.get(e.id)!.name !== e.name).map((e) => ({ id: e.id, from: oldById.get(e.id)!.name, to: e.name }));
  const added = newExs.filter((e) => !oldById.has(e.id)).map((e) => ({ id: e.id, name: e.name }));
  const removed = oldExs.filter((e) => !newIds.has(e.id)).map((e) => ({ id: e.id, name: e.name }));
  const oldFlags = new Set(old?.flags.map((f) => f.id));
  const newFlags = next.flags.filter((f) => !oldFlags.has(f.id));

  const loads: LoadChange[] = [];
  for (const ex of newExs) {
    const mine = ctx.sets.filter((s) => s.exerciseId === ex.id && !s.skipped);
    if (!mine.length) continue;
    const before = oldById.get(ex.id);
    const kind = before && before.load !== ex.load ? { from: before.load, to: ex.load } : undefined;
    const { loadFrom: _ignored, ...plain } = ex;
    const fromKg = exerciseStatus(plain, ctx.planState, ctx.equipment, ctx.sets, next.bigJump).loadKg;
    const toKg = ex.load === 'body' || ex.load === 'band' ? null : ex.startKg ?? null;
    if (kind || ex.resetLoad || (fromKg !== null && toKg !== null && fromKg !== toKg)) {
      loads.push({ id: ex.id, name: ex.name, fromKg, toKg, kind, forced: !!kind });
    }
  }

  const done = ctx.sessions.filter((s) => s.status === 'done');
  return { kept, renamed, added, removed, newFlags, loads, next: nextInLoop(next, done, ctx.rotationStart) };
}

/** The settings after an import: the new plan with its load resets, the loop's start, and an undo copy of what it replaced. */
export function applyImport(s: Pick<Settings, 'plan' | 'planState' | 'rotationStart'>, next: PlanDef, opts: { resets: string[]; start: string; at: number }): Pick<Settings, 'plan' | 'planState' | 'rotationStart' | 'planUndo'> {
  const resets = new Set(opts.resets);
  const plan: PlanDef = {
    ...next,
    sessions: next.sessions.map((sess) => ({ ...sess, exercises: sess.exercises.map((e) => (resets.has(e.id) ? { ...e, loadFrom: opts.at } : e)) })),
  };
  // A fresh start also starts the variant and band ladder again.
  const drop = (r: Record<string, number>) => Object.fromEntries(Object.entries(r).filter(([id]) => !resets.has(id)));
  return {
    plan,
    planState: { variants: drop(s.planState.variants), band: drop(s.planState.band) },
    rotationStart: rotationOf(next).includes(opts.start) ? { session: opts.start, at: opts.at } : undefined,
    planUndo: { at: opts.at, name: next.name, plan: s.plan, planState: s.planState, rotationStart: s.rotationStart },
  };
}

/** The undo on offer, if the last import was under a week ago. */
export function undoOnOffer(s: Pick<Settings, 'planUndo'>, now = Date.now()): Settings['planUndo'] | undefined {
  return s.planUndo && now - s.planUndo.at < UNDO_DAYS * 86_400_000 ? s.planUndo : undefined;
}

/** The settings put back as they were before the import. */
export function undoImport(s: Pick<Settings, 'planUndo'>): Pick<Settings, 'plan' | 'planState' | 'rotationStart' | 'planUndo'> | undefined {
  const u = s.planUndo;
  if (!u) return undefined;
  return { plan: u.plan, planState: u.planState, rotationStart: u.rotationStart, planUndo: undefined };
}

/** "OHP: 5 → 10 kg", "Split squat: bodyweight → one dumbbell, 10 kg". */
export function loadChangeText(c: LoadChange, fmt: (kg: number) => string): string {
  const kg = (v: number | null) => (v === null ? 'no load' : `${fmt(v)} kg`);
  if (c.kind) return `${kindName(c.kind.from)} → ${kindName(c.kind.to)}${c.toKg !== null ? `, ${fmt(c.toKg)} kg` : ''}; starts fresh`;
  return `${kg(c.fromKg)} → ${kg(c.toKg)}`;
}
