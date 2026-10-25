import type { DayKey } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { realSets } from '../domain/plan';
import type { SetEntry } from '../domain/types';

/** Steps carried each day, from farmer-carry sets measured in steps. */
export function loadedSteps(sets: Pick<SetEntry, 'date' | 'steps' | 'skipped'>[]): Map<DayKey, number> {
  const out = new Map<DayKey, number>();
  for (const s of realSets(sets)) if (s.steps) out.set(s.date, (out.get(s.date) ?? 0) + s.steps);
  return out;
}

/** Day closed's walk line: "Agra tomorrow" when a typical day gets you there, otherwise how far. */
export function nextStopLine(name: string, kmLeft: number, typicalKm: number | undefined): string {
  return typicalKm && kmLeft <= typicalKm ? `${name} tomorrow` : `${name} in ${fmtInt(Math.ceil(kmLeft))} km`;
}
