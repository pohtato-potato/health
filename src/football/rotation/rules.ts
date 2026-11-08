// The rotation's numbers (spec §3.2, §5, §9.1) in one place. Layer 3 changes them from techs, staff and boons by
// passing their effects to `rulesFrom`; nothing here knows about the tree.
import type { Effect } from '../content/types';

export interface RotationRules {
  /** Freshness lost for each back-to-back training day, %. */
  freshnessCost: number;
  /** Freshness back for each day off, %. */
  freshnessReturn: number;
  /** The lowest freshness, %. */
  freshnessFloor: number;
  /** Match days of the same starters for chemistry +1. */
  chemistryDays: number;
  /** Starters in a unit that must change before its chemistry drops. */
  chemistryChanges: number;
  /** Days of 30 a Fuel limit break needs. */
  fuelBreakDays: number;
  /** The captain's unit gets its morale nudge at Up, not only at High. */
  moraleCaptainUp: boolean;
}

export const BASE_RULES: RotationRules = {
  freshnessCost: 15,
  freshnessReturn: 20,
  freshnessFloor: 60,
  chemistryDays: 7,
  chemistryChanges: 2,
  fuelBreakDays: 25,
  moraleCaptainUp: false,
};

/** The rules with the club's rule effects applied (each names its new number; later effects win). */
export function rulesFrom(effects: Effect[] = []): RotationRules {
  const r = { ...BASE_RULES };
  for (const e of effects) {
    if (e.kind !== 'rule') continue;
    switch (e.rule) {
      case 'freshness-cost': if (e.value > 0) r.freshnessCost = e.value; break;
      case 'freshness-return': r.freshnessReturn = e.value; break;
      case 'freshness-floor': r.freshnessFloor = Math.max(r.freshnessFloor, e.value); break;
      case 'chemistry-days': r.chemistryDays = e.value; break;
      case 'chemistry-changes': r.chemistryChanges = e.value; break;
      case 'fuel-break-days': r.fuelBreakDays = e.value; break;
      case 'morale-captain-up': r.moraleCaptainUp = e.value > 0; break;
      default: break;
    }
  }
  return r;
}
