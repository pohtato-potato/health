// The one place the fog's words come from (club lore and the scout's lines).
//
// The writing chat's files (joined 12 Nov) are `src/football/content/desk/lore.ts`
// (CLUB_LORE) and `src/football/content/desk/scouting.ts` (SCOUT_REPORT, DIVISION_REPORTS, STILL_HIDDEN, SCOUT_THIN),
// with their shapes in `content/desk/types.ts`. Every screen and rule reads them through this file.
export { CLUB_LORE, SCOUT_REPORT, DIVISION_REPORTS, STILL_HIDDEN, SCOUT_THIN } from '../content/desk';
export type { ClubLore, Finding, Manager, ScoutLines } from '../content/desk/types';
