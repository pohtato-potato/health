// The tree's hand on the rotation (layer 2): techs, staff, boons and projects that change the rotation's numbers,
// open formations and give each unit a captain. Pure; play.ts, the Tonight read and the team sheet all use it.
import type { RuleKey } from '../content/types';
import type { Formation } from '../players/eleven';
import { BASE_RULES, rulesFrom, type RotationRules } from '../rotation/rules';
import type { TeamSheet } from '../rotation/night';
import { formationsOpen, ruleValue, unlocked, type Active } from './research';

const RULE_KEYS: [RuleKey, keyof RotationRules][] = [
  ['freshness-cost', 'freshnessCost'], ['freshness-return', 'freshnessReturn'], ['freshness-floor', 'freshnessFloor'],
  ['chemistry-days', 'chemistryDays'], ['chemistry-changes', 'chemistryChanges'], ['fuel-break-days', 'fuelBreakDays'],
];

export interface TreeRotation {
  rules: RotationRules;
  /** Formations open: 4-3-3 always, the rest from the tree. */
  formations: Formation[];
  /** Unit captains, from the Sunday-league tech. Without it, no unit has a captain. */
  captains: boolean;
}

/**
 * Every active effect folded into one number per rule first (the best one wins: lowest days and costs, highest
 * floors and returns), then handed to layer 2's `rulesFrom`, so two sources never undo each other by order.
 */
export function treeRotation(a: Active): TreeRotation {
  const effects = RULE_KEYS.map(([k, f]) => ({ kind: 'rule' as const, rule: k, value: ruleValue(a, k, BASE_RULES[f] as number) }));
  effects.push({ kind: 'rule', rule: 'morale-captain-up', value: ruleValue(a, 'morale-captain-up', 0) > 0 ? 1 : 0 });
  return { rules: rulesFrom(effects), formations: formationsOpen(a), captains: unlocked(a, 'unit-captains') };
}
/** The base game with nothing researched (layer 2's numbers, 4-3-3, captains on as layer 2 shipped them). */
export const NO_TREE: TreeRotation = { rules: BASE_RULES, formations: ['4-3-3'], captains: true };

/** Tonight's formation: the sheet's pick while it's open, else 4-3-3. */
export const formationFor = (sheet: TeamSheet | undefined, r: TreeRotation): Formation =>
  sheet?.formation && r.formations.includes(sheet.formation) ? sheet.formation : '4-3-3';
/** The sheet as tonight plays it: a formation that isn't open falls back to 4-3-3. */
export const sheetFor = (sheet: TeamSheet | undefined, r: TreeRotation): TeamSheet | undefined =>
  sheet ? { ...sheet, formation: formationFor(sheet, r) } : sheet;
