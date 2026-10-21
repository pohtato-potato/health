import type { DayKey } from './dates';
import { groupExercises, type ExerciseDef } from './plan';
import { loggedLater, movementKind } from './trainingChecks';
import type { SetEntry, Settings, TrainingSession } from './types';

type Setups = NonNullable<Settings['setups']>;

/** The setup in force on a day: the latest personal version from then or before, else the plan's. */
export function setupOn(settings: Pick<Settings, 'setups'>, ex: Pick<ExerciseDef, 'id' | 'setup'>, day: DayKey): { text: string; from?: DayKey } | undefined {
  const mine = (settings.setups?.[ex.id] ?? []).filter((v) => v.from <= day).sort((a, b) => a.from.localeCompare(b.from));
  const last = mine[mine.length - 1];
  if (last) return { text: last.text, from: last.from };
  return ex.setup ? { text: ex.setup } : undefined;
}

/** A changed setup starts a new version from today; a second change today replaces today's. */
export function addSetup(setups: Setups | undefined, exId: string, day: DayKey, text: string): Setups {
  const list = (setups?.[exId] ?? []).filter((v) => v.from !== day);
  return { ...setups, [exId]: [...list, { from: day, text }] };
}

/** Sore legs (4–5) take every leg exercise down to one set tonight. Never to none. */
export function legSets(ex: ExerciseDef, soreness: number | undefined): number {
  return soreness !== undefined && soreness >= 4 && movementKind(ex) === 'legs' ? 1 : ex.sets;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** How long this session usually takes: the median of the last five, leaving out ones logged afterwards. */
export function usualLength(sessions: TrainingSession[], sets: SetEntry[], sessionId: string, fallbackMin: number): { min: number; fromHistory: boolean } {
  const done = sessions
    .filter((s) => s.session === sessionId && s.status === 'done' && s.endedAt !== undefined)
    .filter((s) => !loggedLater(sets.filter((x) => x.sessionId === s.id)))
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 5);
  if (done.length < 2) return { min: fallbackMin, fromHistory: false };
  return { min: Math.round(median(done.map((s) => (s.endedAt! - s.startedAt) / 60_000))), fromHistory: true };
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Rest follows last time: reps that fell off across sets earn 15 s more per 20% lost (up to 45 s);
 * reps that held within 10% take 10 s off, and reps that didn't drop at all 20 s.
 */
export function adaptiveRest(base: number, last: SetEntry[]): { sec: number; why?: string } {
  const working = last.filter((s) => !s.drop && !s.skipped && s.reps !== undefined);
  // Each side on its own: the side that fell off most decides.
  const runs = (['both', 'L', 'R'] as const)
    .map((side) => working.filter((s) => s.side === side).sort((x, y) => x.setNo - y.setNo))
    .filter((r) => r.length >= 2)
    .map((r) => ({ first: r[0].reps!, end: r[r.length - 1].reps! }))
    .sort((x, y) => (y.first - y.end) / y.first - (x.first - x.end) / x.first);
  const worst = runs[0];
  if (!worst || worst.first <= 0) return { sec: base };
  const { first, end } = worst;
  const lost = first - end;
  // Whole numbers, so a 60% drop is exactly three steps.
  if (lost * 5 > first) {
    const sec = base + 15 * Math.min(3, Math.floor((lost * 5) / first));
    return { sec, why: `Rest is ${mmss(sec)} here: your reps dropped from ${first} to ${end} across sets last time.` };
  }
  if (lost * 10 <= first) {
    const sec = Math.max(15, base - (lost <= 0 ? 20 : 10));
    return { sec, why: lost <= 0 ? `Rest is ${mmss(sec)} here: your reps held at ${first} last time.` : `Rest is ${mmss(sec)} here: your reps held from ${first} to ${end} last time.` };
  }
  return { sec: base };
}

export interface LoadBlock {
  kg: number | null;
  exs: ExerciseDef[];
}

/** Tonight in load blocks, in the plan's order: a superset stays whole, bodyweight work joins the block it sits in. */
export function loadBlocks(exs: ExerciseDef[], kgOf: (ex: ExerciseDef) => number | null): LoadBlock[] {
  const blocks: LoadBlock[] = [];
  for (const group of groupExercises(exs)) {
    const kg = kgOf(group[0]) ?? group.map(kgOf).find((k) => k !== null) ?? null;
    const last = blocks[blocks.length - 1];
    if (last && (kg === null || last.kg === null || last.kg === kg)) {
      last.exs.push(...group);
      if (last.kg === null) last.kg = kg;
    } else blocks.push({ kg, exs: [...group] });
  }
  return blocks;
}

/** How many times the plates change through the session. */
export function plateChanges(blocks: LoadBlock[]): number {
  return blocks.filter((b, i) => i > 0 && b.kg !== null && blocks[i - 1].kg !== null && b.kg !== blocks[i - 1].kg).length;
}

/** A change of dumbbell load between two sets; none to or from bodyweight. */
export function plateChange(prevKg: number | null | undefined, kg: number | null): { from: number; to: number } | undefined {
  return prevKg == null || kg === null || prevKg === kg ? undefined : { from: prevKg, to: kg };
}

/** What follows a saved set: a record's moment comes first; then a rest after the round, or straight on. */
export function afterSave(mark: string | undefined, after: 'rest' | 'glide' | 'none'): 'record' | 'rest' | 'next' {
  if (mark === '!!') return 'record';
  return after === 'rest' ? 'rest' : 'next';
}

/** The load of the last set tonight that had a dumbbell, for the plate change: bodyweight in between doesn't count. */
export function lastLoad(sets: Pick<SetEntry, 'loadKg' | 'at' | 'skipped'>[]): number | undefined {
  return [...sets].filter((s) => !s.skipped && s.loadKg !== null).sort((a, b) => b.at - a.at)[0]?.loadKg ?? undefined;
}
