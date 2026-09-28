import type { DayKey } from './dates';
import { lowerFirst } from './format';
import { fmtKg, isBigJump, nextLoad } from './loads';
import { bandLevel, bottomOfRange, exerciseName, topOfRange, type ExerciseDef, type PlanState, type TriggerDef } from './plan';
import type { Equipment, SetEntry } from './types';

export type AdviceKind = 'heavier' | 'tempo-first' | 'needs-plates' | 'maxed' | 'variant' | 'add-load' | 'band';

export interface Advice {
  kind: AdviceKind;
  title: string;
  /** The full reason, for Train. */
  text: string;
  /** What to do tonight, for the session screen. */
  tonight: string;
  toKg?: number;
  toVariant?: number;
  toBand?: number;
}

export interface LastTime {
  sessionId: string;
  date: DayKey;
  sets: SetEntry[];
}

export interface ExerciseStatus {
  name: string;
  last?: LastTime;
  /** The load to set up for tonight. Null for bodyweight and band work. */
  loadKg: number | null;
  band?: string;
  /** Start with the slow lowering switched on. */
  tempo: boolean;
  topHit: boolean;
  advice?: Advice;
}

/** Working sets (not drop sets) of this exercise and its current variant. */
export function historyFor(ex: ExerciseDef, state: PlanState | undefined, sets: SetEntry[]): SetEntry[] {
  const name = exerciseName(ex, state);
  return sets
    .filter((s) => s.exerciseId === ex.id && !s.drop && (!ex.variants?.length || s.exercise === name))
    .sort((a, b) => a.at - b.at);
}

export function lastTime(history: SetEntry[], excludeSessionId?: string): LastTime | undefined {
  const done = history.filter((s) => s.sessionId !== excludeSessionId);
  if (!done.length) return undefined;
  const latest = done[done.length - 1];
  const sets = done.filter((s) => s.sessionId === latest.sessionId);
  return { sessionId: latest.sessionId, date: latest.date, sets };
}

const valueOf = (s: Pick<SetEntry, 'reps' | 'seconds'>) => s.reps ?? s.seconds ?? 0;

export function workingLoad(sets: SetEntry[]): number | null {
  const loads = sets.map((s) => s.loadKg).filter((kg): kg is number => kg !== null && kg !== undefined);
  return loads.length ? Math.max(...loads) : null;
}

/** Every planned set, on every side, reached the top of the range at one load. */
export function hitTop(ex: ExerciseDef, sets: SetEntry[]): boolean {
  const top = topOfRange(ex);
  if (top === undefined || !sets.length) return false;
  const rows = ex.sets * (ex.perSide ? 2 : 1);
  if (sets.length < rows) return false;
  const load = workingLoad(sets);
  return sets.every((s) => (s.loadKg ?? null) === load && valueOf(s) >= top);
}

export function exerciseStatus(
  ex: ExerciseDef,
  state: PlanState | undefined,
  eq: Equipment,
  allSets: SetEntry[],
  bigJump = 0.25,
): ExerciseStatus {
  const name = exerciseName(ex, state);
  const last = lastTime(historyFor(ex, state, allSets));
  const band = bandLevel(ex, state);
  // A new variant starts from the load used on the old one.
  const anyLast = last ?? lastTime(allSets.filter((s) => s.exerciseId === ex.id && !s.drop).sort((a, b) => a.at - b.at));
  const lastLoad = anyLast ? workingLoad(anyLast.sets) : null;
  const base: ExerciseStatus = {
    name,
    last,
    loadKg: ex.load === 'band' ? null : lastLoad ?? (ex.load === 'body' ? null : ex.startKg ?? null),
    band,
    tempo: !!ex.tempo,
    topHit: false,
  };
  if (!last || !hitTop(ex, last.sets)) return base;
  base.topHit = true;

  const top = topOfRange(ex)!;
  const every = `Every set hit ${top}${ex.seconds ? ' s' : ''}`;
  const variantIdx = state?.variants[ex.id] ?? 0;

  // 1. A harder variant comes before more load.
  if (ex.variants && variantIdx < ex.variants.length) {
    const v = ex.variants[variantIdx];
    const text = `${every}. Switch to ${lower(v.name)}${v.note ? ` (${v.note})` : ''}.`;
    return { ...base, advice: { kind: 'variant', title: 'Ready for the next step', text, tonight: `Switch to ${lower(v.name)} tonight.`, toVariant: variantIdx + 1 } };
  }

  // 2. Band work moves up a band.
  if (ex.load === 'band') {
    const levels = ex.bandLevels ?? [];
    const i = state?.band[ex.id] ?? 0;
    if (i + 1 < levels.length) {
      const next = levels[i + 1];
      return {
        ...base,
        band: next,
        advice: { kind: 'band', title: 'Ready for more band', text: `${every}. Next is the ${lower(next)}.`, tonight: `Tonight: the ${lower(next)}.`, toBand: i + 1 },
      };
    }
    return base;
  }

  // 3. Bodyweight work that picks up dumbbells.
  if (ex.load === 'body' && lastLoad === null) {
    if (!ex.thenLoad) return base;
    const kg = ex.thenLoad.kg;
    const lo = bottomOfRange(ex);
    const text = `${every}. Next time, hold ${fmtKg(kg)} kg dumbbells${lo ? ` and start again at ${lo}` : ''}.`;
    return { ...base, loadKg: kg, advice: { kind: 'add-load', title: 'Ready for dumbbells', text, tonight: `Tonight: hold ${fmtKg(kg)} kg.`, toKg: kg } };
  }

  // 4. Loaded work goes heavier, from the loading table.
  const kind = ex.load === 'body' ? ex.thenLoad?.load ?? 'pair' : (ex.load as 'pair' | 'single');
  const cur = lastLoad ?? ex.startKg ?? 0;
  const tempoDone = last.sets.every((s) => s.tempo);
  const nl = nextLoad(eq, kind, cur);
  const one = kind === 'single' ? ' on one dumbbell' : '';

  if (nl.smaller && !(tempoDone && nl.next !== undefined)) {
    const { kg, plateKg } = nl.smaller;
    return {
      ...base,
      tempo: true,
      advice: {
        kind: 'needs-plates',
        title: 'Ready to go heavier',
        text: `${every}. Next is ${fmtKg(kg)} kg, which needs the ${fmtKg(plateKg)} kg plates. Until they arrive, slow the lowering to 3 seconds.`,
        tonight: `${fmtKg(kg)} kg needs the ${fmtKg(plateKg)} kg plates. Tonight, ${fmtKg(cur)} kg with a 3-second lowering.`,
      },
    };
  }
  if (nl.next === undefined) {
    return {
      ...base,
      tempo: true,
      advice: {
        kind: 'maxed',
        title: 'At your heaviest',
        text: `${every} at ${fmtKg(cur)} kg, the most your plates make. Slow the lowering or add a pause to keep it hard.`,
        tonight: `Tonight, ${fmtKg(cur)} kg with a 3-second lowering.`,
      },
    };
  }
  const next = nl.next;
  const big = isBigJump(cur, next, bigJump);
  if (big && !tempoDone) {
    return {
      ...base,
      tempo: true,
      advice: {
        kind: 'tempo-first',
        title: 'Ready to go heavier',
        text: `${every}. Next is ${fmtKg(next)} kg${one}, a big jump, so try a 3-second lowering at ${fmtKg(cur)} kg first.`,
        tonight: `Next is ${fmtKg(next)} kg, a big jump. Tonight, ${fmtKg(cur)} kg with a 3-second lowering.`,
      },
    };
  }
  const why = tempoDone && big ? `, with the slow lowering too` : '';
  const plates = nl.smaller ? ` The ${fmtKg(nl.smaller.plateKg)} kg plates would make a smaller step.` : '';
  return {
    ...base,
    loadKg: next,
    tempo: !!ex.tempo,
    advice: {
      kind: 'heavier',
      title: 'Ready to go heavier',
      text: `${every}${why}. Next is ${fmtKg(next)} kg${one}.${plates}`,
      tonight: `Tonight: ${fmtKg(next)} kg, up from ${fmtKg(cur)}.`,
      toKg: next,
    },
  };
}

const lower = lowerFirst;

/** For example: rows at 20 kg for 3 × 12, every set, on both sides. */
export function triggerMet(t: TriggerDef, sets: SetEntry[]): boolean {
  const mine = sets.filter((s) => s.exerciseId === t.exercise && !s.drop);
  const last = lastTime(mine);
  if (!last) return false;
  for (const side of ['L', 'R', 'both'] as const) {
    const onSide = last.sets.filter((s) => s.side === side);
    if (!onSide.length) continue;
    const good = onSide.filter((s) => (s.loadKg ?? 0) >= t.kg && (s.reps ?? 0) >= t.reps);
    if (good.length < t.sets) return false;
  }
  return true;
}
