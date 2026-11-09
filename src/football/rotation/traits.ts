// Traits on players (spec §9.3): small named effects, each limited to one situation. A player holds up to 3.
// Layer 2 gives them out at limit breaks and plays them while their player starts. Only traits the match engine can
// play are given out; the rest (extra chances, retakes) wait for the layer that teaches the engine them.
import { TRAITS, traitById } from '../content/traits';
import type { TraitDef } from '../content/types';
import { LIT } from '../radar';
import { hashSeed } from '../rng';
import type { BraboAbility } from '../types';
import type { FbPlayer, Unit, XiPlace } from '../players/types';

export const MAX_TRAITS = 3;
/** The situations the match engine plays (engine.ts braboOk). */
export const PLAYABLE_WHEN = new Set(['long', 'late', 'home', 'away', 'first-half', 'after-concede', 'level', 'own-type', 'home-late', 'second-half', 'behind', 'ahead', 'set-piece', 'vs-higher', 'auto', 'derby', 'cup']);

/** A trait does something tonight only if the engine can play it. */
export function playable(t: TraitDef): boolean {
  const e = t.effect;
  if (e.kind === 'axis') return PLAYABLE_WHEN.has(e.when) && (e.side === 'both' || LIT[e.side].includes(e.axis));
  if (e.kind === 'rule') return e.rule === 'freshness-cost';
  if (e.kind === 'chemistry') return e.when === 'always';
  return false;
}

/** A player's traits, from its limit breaks, oldest first, at most three. */
export const traitsOf = (p: Pick<FbPlayer, 'limitBreaks'>): string[] => [...new Set(p.limitBreaks.map((l) => l.trait).filter((t): t is string => Boolean(t)))].slice(0, MAX_TRAITS);

/** The trait a limit break gives: one for its unit (or any unit) the player doesn't hold yet, picked by its seed. */
export function pickTrait(p: Pick<FbPlayer, 'id' | 'unit' | 'limitBreaks'>, on: string, from: 'limit-break' | 'gym' = 'limit-break'): string | undefined {
  const held = traitsOf(p);
  if (held.length >= MAX_TRAITS) return undefined;
  const pool = TRAITS.filter((t) => t.from.includes(from) && (t.unit === p.unit || t.unit === 'any') && !held.includes(t.id) && playable(t));
  if (!pool.length) return undefined;
  return pool[hashSeed(p.id, on, 'trait') % pool.length].id;
}

/** Freshness cost scale from traits (Engine: half). */
export function freshnessScale(p: Pick<FbPlayer, 'limitBreaks'>): number {
  let k = 1;
  for (const id of traitsOf(p)) { const e = traitById(id)?.effect; if (e?.kind === 'rule' && e.rule === 'freshness-cost') k *= 1 + e.value / 100; }
  return Math.max(0, k);
}

/** Tonight's abilities from the traits of the players who start. */
export function traitAbilities(xi: XiPlace[], roster: Map<string, FbPlayer>): BraboAbility[] {
  const out: BraboAbility[] = [];
  for (const id of new Set(xi.map((x) => x.player))) {
    const p = roster.get(id);
    if (!p) continue;
    for (const tid of traitsOf(p)) {
      const t = traitById(tid);
      if (!t || t.effect.kind !== 'axis' || !playable(t)) continue;
      out.push({ id: `trait:${tid}:${id}`, name: `${t.name} (${p.name})`, axis: t.effect.axis, d: t.effect.d, when: t.effect.when as BraboAbility['when'], side: t.effect.side });
    }
  }
  return out;
}

/** Chemistry +1 from a captain holding Captain's armband (spec §9.3), by unit. */
export function captainChemistry(captains: Partial<Record<Unit, string>>, roster: Map<string, FbPlayer>): Partial<Record<Unit, number>> {
  const out: Partial<Record<Unit, number>> = {};
  for (const [u, id] of Object.entries(captains) as [Unit, string][]) {
    const p = id ? roster.get(id) : undefined;
    if (p && traitsOf(p).some((t) => { const e = traitById(t)?.effect; return e?.kind === 'chemistry' && e.when === 'always'; })) out[u] = 1;
  }
  return out;
}
