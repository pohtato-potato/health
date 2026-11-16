// The press office (ledger O40; tech "Press office": "After big nights you choose the line the papers run"). Pure.
// After a big night (a derby, a cup or event tie, the season's last matchday; or, once the press box is built, any
// home win) the owner picks one of three plain lines and Story prints it. Words only: no research, money or chance.
import { AXES, type Axis, type AxisValues } from './types';

export const PRESS_OFFICE_TECH = 'r-pressoffice';
export const PRESS_BOX = 'kaai-pressbox';

export interface PapersMatch { result: 'W' | 'D' | 'L'; big?: boolean; braboHome: boolean; rotation: boolean; values: AxisValues }

/** Whether the papers wait for Brabo's line after this match. */
export function papersDue(m: PapersMatch, o: { office: boolean; box: boolean }): boolean {
  if (!o.office || m.rotation) return false;
  return Boolean(m.big) || (o.box && m.braboHome && m.result === 'W');
}

const best = (v: AxisValues): Axis => AXES.reduce((b, a) => (v[a] > v[b] ? a : b), AXES[0]);

/** The three lines on offer, plain and kind: nothing blames a player or a habit. */
export function papersLines(m: PapersMatch, f: { opp: string; potm?: string }): [string, string, string] {
  const who = f.potm ?? 'The whole eleven';
  if (m.result === 'W') return [`${who} made the difference tonight.`, `${best(m.values)} won this one for us.`, `That one is for everyone who came ${m.braboHome ? 'to the ground' : 'with us'}.`];
  if (m.result === 'D') return [`${who} kept us in it.`, `${best(m.values)} earned us the point.`, 'A fair point, and we take it.'];
  return [`${f.opp} were the better side tonight.`, `${who} kept going to the end.`, 'We watch it back and go again.'];
}

/** Story's line once the owner has picked. */
export const papersNews = (line: string) => `The papers run Brabo’s line: “${line}”`;

/** The night's best player: goals count three, saves one (the same pick as full time's "Player of the match"). */
export function playerOfMatch(credits: { kind: 'goal' | 'save'; name: string }[] | undefined): string | undefined {
  if (!credits?.length) return undefined;
  const score = new Map<string, number>();
  for (const c of credits) score.set(c.name, (score.get(c.name) ?? 0) + (c.kind === 'goal' ? 3 : 1));
  return [...score].sort((a, b) => b[1] - a[1])[0][0];
}
