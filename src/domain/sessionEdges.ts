import type { DayKey } from './dates';
import type { ExerciseDef } from './plan';
import { movementKind } from './trainingChecks';
import type { Settings } from './types';

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
