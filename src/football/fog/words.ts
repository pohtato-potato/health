// The one place the fog's words come from (club lore and the scout's lines).
//
// PLACEHOLDER until `feat/desk-content` is joined: the writing chat's files are `src/football/content/desk/lore.ts`
// (CLUB_LORE) and `src/football/content/desk/scouting.ts` (SCOUT_REPORT, DIVISION_REPORTS, STILL_HIDDEN, SCOUT_THIN),
// with these same shapes in `content/desk/types.ts`. To plug them in, replace everything from "---- placeholder" down
// with:
//   export { CLUB_LORE, SCOUT_REPORT, DIVISION_REPORTS, STILL_HIDDEN, SCOUT_THIN } from '../content/desk';
//   export type { ClubLore, Finding, Manager, ScoutLines } from '../content/desk/types';
// Nothing else changes: every screen and rule reads the words through this file.
import type { AbilityDef } from '../data/load';

export type Finding = 'rating' | 'style' | 'weak-side' | 'manager' | 'hidden' | 'history' | 'kit' | 'loan-target' | 'nothing-new';
/** Placeholders: `{club}`, `{found}`, `{division}`, `{before}`, `{after}`, `{manager}`, `{player}`. */
export type ScoutLines = Record<Finding, string[]>;
export interface Manager { name: string; nation: string; line: string }
export interface ClubLore {
  manager: Manager;
  history: string;
  /** What a scout says before the hidden ability is known. */
  hiddenTease: string;
  /** A hidden ability for clubs whose data has none. */
  hiddenNew?: AbilityDef;
}

// ---- placeholder (a few generic lines in the same shapes; the real ones cover every club)
export const CLUB_LORE: Record<string, ClubLore> = {};

export const SCOUT_REPORT: ScoutLines = {
  rating: ['Watched {club} twice. About as good as their table says.'],
  style: ['{club} play one way, and now we know which.'],
  'weak-side': ['Found the side {club} would rather not defend.'],
  manager: ['Met {manager}. Polite, quick, gave nothing away.'],
  hidden: ['Found what {club} keep up their sleeve.'],
  history: ['Spent an afternoon in {club}’s history. Worth it.'],
  kit: ['Saw {club}’s shirts up close. Noted.'],
  'loan-target': ['Found someone at {club}: {player}. Worth a closer look.'],
  'nothing-new': ['Nothing new at {club}. Sometimes that is the finding.'],
};
export const DIVISION_REPORTS: string[] = ['Did all of {division}. {before}% to {after}%.'];
export const STILL_HIDDEN: string[] = ['Still hidden: {found}. Another trip should do it.'];
export const SCOUT_THIN: string[] = ['Rough trip. Got a little, not a lot.'];
