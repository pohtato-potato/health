// Nations (spec §9.4): a player whose name carries a nation plays for it (Romanian deadlift for Romania). Everyone
// else is given one nation from the pool, once and for good: the first nation a player is seen with is kept forever,
// even if the pool changes later.
import { NATION_POOL, nationByCode, nationInName } from '../content/nations';
import { hashSeed } from '../rng';

/** The nation a player plays for: its name's, else one drawn from the pool by its id. */
export function nationFor(id: string, name: string): { code: string; fromName: boolean } {
  const n = nationInName(name);
  if (n) return { code: n, fromName: true };
  return { code: NATION_POOL[hashSeed('nation', id) % NATION_POOL.length], fromName: false };
}

/** Gives every player without a nation its nation, keeping every nation already given. */
export function assignNations(known: Record<string, string>, players: Iterable<{ id: string; name: string }>): Record<string, string> {
  let out = known;
  for (const p of players) {
    if (out[p.id]) continue;
    if (out === known) out = { ...known };
    out[p.id] = nationFor(p.id, p.name).code;
  }
  return out;
}

export const nationName = (code: string | undefined) => (code ? nationByCode(code)?.name ?? code : '');
/** True when the name itself carries the nation (shown as "for Romania"), not a draw ("drawn for good"). */
export const fromName = (name: string, code: string) => nationInName(name) === code;
