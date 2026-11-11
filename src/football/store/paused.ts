// Matchday depth (spec 2026-11-12 §2.1): rebuilding the waiting league match from stored data. Pure, so the live
// screen and the store finish the same match: the same input and the same calls always give the same events.
import type { DayKey } from '../../domain/dates';
import type { MatchInput } from '../engine';
import { assistantTactic, type Tactic } from '../rotation/night';
import { ANTIGOON, rivalTwist, twistOf } from '../rivals';
import { enginePlan, readOf, type MatchdayPlan, type Read } from '../matchday';
import type { CallPick } from '../types';
import type { FbSave, PausedMatch } from './tables';

/** Scouted: met before, or named by a scouting lead (until the desk exists, spec §2.5). */
export const isScouted = (save: Pick<FbSave, 'met' | 'scouted'>, clubId: string) => save.met.includes(clubId) || Boolean(save.scouted?.includes(clubId));

/** The plan for a day: the tactic (yours, or the assistant's from tonight's numbers), tempo, width and a card. */
export function planFor(save: Pick<FbSave, 'tactics' | 'plans'>, date: DayKey, fallback: Tactic): MatchdayPlan {
  return { tempo: 'normal', width: 'middle', ...save.plans?.[date], tactic: save.tactics?.[date] ?? fallback };
}

/** The read for a waiting match, with the plan as it stands now (it can change until kick-off). */
export function readFor(p: PausedMatch, save: FbSave): Read {
  return readOf(planFor(save, p.date, p.prep.tactic.pick), { id: p.prep.oppId, style: p.style }, p.scouted || isScouted(save, p.prep.oppId));
}

/**
 * The engine's input for a waiting match: as set up at 4 am, plus the plan as it stands (a tactic changed after 4 am
 * plays as a change from the one in the night's numbers), the owner's calls and the half-time change.
 */
export function pausedInput(p: PausedMatch, save: FbSave, o: { watch: boolean; picks?: CallPick[]; half2?: Tactic; halfSeen?: boolean }): MatchInput {
  const plan = planFor(save, p.date, p.prep.tactic.pick);
  const card = plan.card && (save.tacticCards ?? []).includes(plan.card) ? plan.card : undefined;
  const rival = p.rivalTwist === 'rival' ? save.rivals.find((r) => r.clubId === p.prep.oppId) : undefined;
  return {
    ...p.input,
    rival: rival ? twistOf(rival) : p.rivalTwist === 'antigoon' ? rivalTwist(ANTIGOON, 'legend') : undefined,
    plan: enginePlan({ baked: p.prep.tactic.pick, plan: { ...plan, card }, half2: o.half2 ?? p.half2, read: readFor(p, save).mods }),
    calls: o.picks ?? p.picks,
    watch: o.watch, halfSeen: o.halfSeen ?? p.halfSeen,
  };
}

/** The assistant's plan when you set none: its tactic from tonight's numbers, tempo Normal, width Middle. */
export const assistantPlan = (today: Parameters<typeof assistantTactic>[0]): MatchdayPlan => ({ tactic: assistantTactic(today), tempo: 'normal', width: 'middle' });
