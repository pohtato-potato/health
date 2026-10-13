import type { DayKey } from './dates';
import { lowerFirst } from './format';
import { fmtKg, isBigJump, nextLoad } from './loads';
import { bandLevel, bottomOfRange, exerciseName, realSets, topOfRange, valueOfSet, type ExerciseDef, type PlanState, type TriggerDef } from './plan';
import { FORM_LABELS } from './quality';
import type { Equipment, SetEntry } from './types';

export type AdviceKind = 'form-first' | 'heavier' | 'tempo-first' | 'needs-plates' | 'maxed' | 'variant' | 'add-load' | 'band';

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
  return realSets(sets)
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

const valueOf = (s: Pick<SetEntry, 'reps' | 'seconds' | 'steps'>) => valueOfSet(s) ?? 0;

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
  const anyLast = last ?? lastTime(realSets(allSets).filter((s) => s.exerciseId === ex.id && !s.drop).sort((a, b) => a.at - b.at));
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
    return { ...base, advice: { kind: 'add-load', title: 'Ready for dumbbells', text, tonight: `Tonight: hold ${fmtKg(kg)} kg.`, toKg: kg } };
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
  // The form gate: heavier waits until every working set was solid with a rep in reserve.
  if (!formGate(last.sets)) {
    return {
      ...base,
      advice: {
        kind: 'form-first',
        title: 'Clean it up first',
        text: `${every}, but form slipped. Same weight until every set is solid (form 4+) with a rep in reserve; then ${fmtKg(next)} kg${one}.`,
        tonight: `${fmtKg(next)} kg is next, once every set is solid (form 4+) with a rep in reserve. Tonight, ${fmtKg(cur)} kg.`,
      },
    };
  }
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

/**
 * The form gate: going heavier is offered only when last session's working sets were
 * solid (form 4 or more) with a rep in reserve. Sets rated before v2 carry no form and pass.
 */
export function formGate(sets: SetEntry[]): boolean {
  const working = realSets(sets).filter((s) => !s.drop);
  return working.length > 0 && working.every((s) => (s.form === undefined || s.form >= 4) && (s.rir === undefined || s.rir >= 1));
}

export interface HeavierOffer {
  from: number;
  to: number;
  /** The case for it, line by line. */
  case: string[];
}

/** "Ready for 7.5 kg?" — shown full screen before the set; nothing changes until it is answered. */
export function heavierOffer(st: ExerciseStatus): HeavierOffer | undefined {
  const toKg = st.advice?.toKg;
  if (toKg === undefined || (st.advice?.kind !== 'heavier' && st.advice?.kind !== 'add-load') || !st.last) return undefined;
  if (!formGate(st.last.sets)) return undefined;
  const working = realSets(st.last.sets).filter((s) => !s.drop);
  const reps = working.map((s) => valueOfSet(s) ?? 0);
  const forms = working.map((s) => s.form).filter((f) => f !== undefined);
  const rirs = working.map((s) => s.rir).filter((r) => r !== undefined);
  const lines = [`Last time: ${reps.join(', ')}${st.loadKg !== null ? ` at ${fmtKg(st.loadKg)} kg` : ''}, every set at the top.`];
  if (forms.length) {
    const low = Math.min(...forms);
    lines.push(low === 5 ? 'Textbook form on every set.' : `Form ${FORM_LABELS[low - 1]} or better on every set.`);
  }
  if (rirs.length) lines.push(`${Math.min(...rirs)}${Math.min(...rirs) >= 3 ? '+' : ''} rep${Math.min(...rirs) === 1 ? '' : 's'} left in the tank.`);
  return { from: st.loadKg ?? 0, to: toKg, case: lines };
}

/** Tonight's load: the heavier one only once it has been accepted. */
export function loadTonight(st: ExerciseStatus, decision: 'yes' | 'no' | undefined): number | null {
  return decision === 'yes' && st.advice?.toKg !== undefined ? st.advice.toKg : st.loadKg;
}

/** Tonight's load so far for an exercise: the last set done (skips and drop sets ignored), else the fallback. */
export function loadSoFar(mine: SetEntry[], exerciseId: string, fallback: number | null): number | null {
  const done = realSets(mine).filter((s) => s.exerciseId === exerciseId && !s.drop);
  return done.length ? done.reduce((a, b) => (b.at > a.at ? b : a)).loadKg : fallback;
}

/** What to do tonight, after the heavier offer has been answered (or held back by the form gate). */
export function adviceTonight(st: ExerciseStatus, decision: 'yes' | 'no' | undefined): string | undefined {
  const a = st.advice;
  if (!a) return undefined;
  if ((a.kind !== 'heavier' && a.kind !== 'add-load') || a.toKg === undefined) return a.tonight;
  const now = st.loadKg !== null ? `${fmtKg(st.loadKg)} kg` : 'bodyweight';
  if (decision === 'yes') return a.tonight;
  if (decision === 'no') return `Staying at ${now} tonight. Heavier is offered again next time.`;
  if (!heavierOffer(st)) return `${fmtKg(a.toKg)} kg is next, once every set is solid (form 4+) with a rep in reserve. Tonight, ${now}.`;
  return a.tonight;
}

/** The rep ladder at the current load: each rung from the bottom of the range to the top, done once every working set of a session reached it. */
export function ladder(ex: ExerciseDef, sets: SetEntry[]): { load: number | null; rungs: { reps: number; done: boolean }[] } {
  const lo = bottomOfRange(ex);
  const hi = topOfRange(ex);
  const hist = realSets(sets).filter((s) => s.exerciseId === ex.id && !s.drop);
  const last = lastTime(hist.sort((a, b) => a.at - b.at));
  const load = last ? workingLoad(last.sets) : ex.startKg ?? null;
  if (lo === undefined || hi === undefined) return { load, rungs: [] };
  const atLoad = hist.filter((s) => (s.loadKg ?? null) === load);
  const bySession = new Map<string, SetEntry[]>();
  for (const s of atLoad) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s]);
  const best = Math.max(0, ...[...bySession.values()].map((xs) => Math.min(...xs.map((x) => valueOf(x)))));
  return { load, rungs: Array.from({ length: hi - lo + 1 }, (_, i) => ({ reps: lo + i, done: lo + i <= best })) };
}
