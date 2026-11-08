// Named goals and saves (spec §8): each goal and stop goes to a real player, with a line from the content commentary.
import { GOAL_LINES, SAVE_LINES } from '../content/words';
import { TYPES } from '../engine';
import { hashSeed, rng } from '../rng';
import type { MatchEvents } from '../types';
import type { Credit, Unit, XiPlace } from './types';

/** A pick among starters, weighted by match rating (stronger players score more, everyone can). */
function weighted(xs: XiPlace[], r: () => number): XiPlace | undefined {
  const total = xs.reduce((t, x) => t + Math.max(1, x.rating), 0);
  let k = r() * total;
  for (const x of xs) { k -= Math.max(1, x.rating); if (k <= 0) return x; }
  return xs[xs.length - 1];
}
const fill = (line: string, v: Record<string, string>) => line.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);

/**
 * Credits for one match. Goals from Pace, Power and Fuel chances go to that unit's starters (set pieces to the Power
 * starter, the set-piece taker until the team sheet picks one); long shots to any outfield starter. Saves on crosses
 * and long-range efforts go to the keeper; blocks on corners and breaks to the Routine and Shape starters.
 */
export function creditsFor(events: MatchEvents, xi: XiPlace[], opp: string, club = 'Brabo United', setPieceTaker?: string): Credit[] {
  const out: Credit[] = [];
  if (!xi.length) return out;
  const r = rng(hashSeed(String(events.seed), 'credit'));
  const keeper = xi.find((x) => x.unit === 'Rest' && x.place === 'Keeper') ?? xi.find((x) => x.unit === 'Rest');
  events.chances.forEach((c, i) => {
    const axis = TYPES[c.side].find(([t]) => t === c.type)?.[1] ?? null;
    if (c.side === 'atk' && c.ok) {
      let who: XiPlace | undefined;
      if (axis === 'Power' && c.type === 'Set piece') who = xi.find((x) => x.player === setPieceTaker) ?? weighted(xi.filter((x) => x.unit === 'Power'), r);
      else if (axis) who = weighted(xi.filter((x) => x.unit === axis), r);
      who ??= weighted(xi.filter((x) => x !== keeper), r) ?? weighted(xi, r);
      if (!who) return;
      const lines = GOAL_LINES[who.unit];
      out.push({ i, kind: 'goal', player: who.player, name: who.name, unit: who.unit, line: fill(lines[Math.floor(r() * lines.length)], { player: who.name, minute: String(c.minute), opp, club }) });
    } else if (c.side === 'def' && c.ok) {
      const unit: Unit = axis === 'Routine' || axis === 'Shape' ? axis : 'Rest';
      const who = unit === 'Rest' ? keeper : weighted(xi.filter((x) => x.unit === unit), r);
      if (!who) return;
      const lines = SAVE_LINES[unit as 'Rest' | 'Shape' | 'Routine'];
      out.push({ i, kind: 'save', player: who.player, name: who.name, unit: who.unit, line: fill(lines[Math.floor(r() * lines.length)], { player: who.name, minute: String(c.minute), opp, club }) });
    }
  });
  return out;
}
