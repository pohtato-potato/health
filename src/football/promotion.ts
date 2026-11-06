// Season end (spec §9.1): the top two go up with the playoff winner; the bottom three go down.
import type { Row } from './table';
import { TIERS, type Tier } from './types';

/** Playoff semi-finals: 3rd v 6th and 4th v 5th (one match each, the higher finisher at home). */
export function playoffPairs(table: Row[]): [string, string][] {
  return [[table[2].id, table[5].id], [table[3].id, table[4].id]];
}
export interface SeasonMoves { up: Partial<Record<Tier, string[]>>; down: Partial<Record<Tier, string[]>> }
/** Who moves. `playoffWinners[t]` is the club that won tier t's playoff final. Tier 1 has no promotion; tier 6 no relegation. */
export function seasonEnd(tables: Record<Tier, Row[]>, playoffWinners: Partial<Record<Tier, string>>): SeasonMoves {
  const up: SeasonMoves['up'] = {}, down: SeasonMoves['down'] = {};
  for (const t of TIERS) {
    const tb = tables[t];
    if (t > 1) up[t] = [tb[0].id, tb[1].id, playoffWinners[t] ?? tb[2].id];
    if (t < 6) down[t] = tb.slice(-3).map((r) => r.id);
  }
  return { up, down };
}
/** Apply the moves to a tier map. Every tier keeps 18 clubs. */
export function applyMoves(tierOf: Record<string, Tier>, moves: SeasonMoves): Record<string, Tier> {
  const out = { ...tierOf };
  for (const [t, ids] of Object.entries(moves.up)) for (const id of ids!) out[id] = (Number(t) - 1) as Tier;
  for (const [t, ids] of Object.entries(moves.down)) for (const id of ids!) out[id] = (Number(t) + 1) as Tier;
  return out;
}
