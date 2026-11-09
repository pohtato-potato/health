// Close the day seals tonight's shape (R5 c-lock, the full-time whistle). The engine plays the sealed shape the
// next morning. Steps confirmed later only ever lift Pace: the app keeps the highest count (G g-steps).
import type { DaySeal } from '../domain/types';
import { AXES, type AxisFlags, type AxisValues } from './types';

export function sealedNight(live: { values: AxisValues; flags: AxisFlags }, seal?: DaySeal): { values: AxisValues; flags: AxisFlags } {
  if (!seal) return live;
  const values = {} as AxisValues;
  const flags: AxisFlags = {};
  for (const a of AXES) {
    values[a] = seal.values[a] ?? live.values[a];
    const f = seal.flags[a];
    if (f) flags[a] = f;
  }
  // Pace may only rise after the whistle, from a later, higher step count.
  if (!live.flags.Pace && live.values.Pace > values.Pace) {
    values.Pace = live.values.Pace;
    delete flags.Pace;
  }
  return { values, flags };
}
