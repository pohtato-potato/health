// The one place the fog's words come from (club lore and the scout's lines).
//
// The writing chat's files (joined 12 Nov) are `src/football/content/desk/lore.ts`
// (CLUB_LORE) and `src/football/content/desk/scouting.ts` (SCOUT_REPORT, DIVISION_REPORTS, STILL_HIDDEN, SCOUT_THIN),
// with their shapes in `content/desk/types.ts`. Every screen and rule reads them through this file.
export { CLUB_LORE, SCOUT_REPORT, DIVISION_REPORTS, STILL_HIDDEN, SCOUT_THIN } from '../content/desk';
export type { ClubLore, Finding, Manager, ScoutLines } from '../content/desk/types';
import { CLUB_LORE as LORE_1 } from '../content/desk';
import type { ClubLore } from '../content/desk/types';
import { clubWorld } from '../data/load';
import { worldClub } from '../data/world';
/**
 * A club's lore in the world being played. World 2 (LG-4) reads LG-2's world.json: an invented manager, a short
 * history, the scout's tease, and `lines`, true facts from the club's history. Brabo's Old Selves keep theirs.
 */
export function loreOf(id: string): (ClubLore & { lines?: string[] }) | undefined {
  const w = clubWorld() === 2 ? worldClub(id) : undefined;
  if (w) return { manager: w.lore.manager, history: w.lore.history, hiddenTease: w.lore.hiddenTease, lines: w.lore.lines };
  return LORE_1[id];
}
