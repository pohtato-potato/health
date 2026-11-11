// Penalties (spec §4.6): five kicks each, then sudden death. You pick where to shoot against a keeper with a habit,
// and where to dive against takers with a favourite side. A scouted club shows both habits.
import { habitsOf } from './clubs';
import type { MatchState } from './match';
import { next } from './match';
import { SIDES, type Side } from './types';

export interface Kick { who: 'us' | 'them'; aim: Side; dive: Side; scored: boolean }
export interface Pens {
  us: boolean[]; them: boolean[]; turn: 'us' | 'them';
  keeper: [number, number, number]; takers: [number, number, number];
  kicks: Kick[];
  winner?: 'us' | 'them';
}
/** A shot at a side the keeper did not go to still misses this often (tune); the middle never misses the target. */
export const PEN_TUNE = { wide: 0.06 };

export function newPens(clubId: string): Pens {
  const h = habitsOf(clubId);
  return { us: [], them: [], turn: 'us', keeper: h.keeper, takers: h.takers, kicks: [] };
}
function weighted(s: MatchState, w: [number, number, number]): Side {
  const r = next(s) * (w[0] + w[1] + w[2]);
  return r < w[0] ? 'left' : r < w[0] + w[1] ? 'centre' : 'right';
}
const goals = (xs: boolean[]) => xs.filter(Boolean).length;

/** Who has won, once it is decided. */
export function pensWinner(us: boolean[], them: boolean[]): 'us' | 'them' | undefined {
  const u = goals(us), t = goals(them);
  if (us.length <= 5 && them.length <= 5) {
    if (u + (5 - us.length) < t) return 'them';
    if (t + (5 - them.length) < u) return 'us';
  }
  if (us.length >= 5 && us.length === them.length && u !== t) return u > t ? 'us' : 'them';
  return undefined;
}

const copy = (s: MatchState): MatchState => JSON.parse(JSON.stringify(s)) as MatchState;
function settle(s: MatchState) {
  const p = s.pens!;
  p.winner = pensWinner(p.us, p.them);
  if (p.winner) {
    s.phase = 'done';
    const f = { kind: 'full' as const, text: `${p.winner === 'us' ? 'You win' : 'They win'} ${goals(p.us)}–${goals(p.them)} on penalties.`, spell: s.spell };
    s.feed.push(f); s.last.push(f);
  }
}

/** Your kick: where you aim. */
export function kick(s0: MatchState, aim: Side): MatchState {
  if (s0.phase !== 'pens' || s0.pens?.turn !== 'us') return s0;
  const s = copy(s0);
  s.last = [];
  const p = s.pens!;
  const dive = weighted(s, p.keeper);
  const scored = dive !== aim && !(aim !== 'centre' && next(s) < PEN_TUNE.wide);
  p.us.push(scored);
  p.kicks.push({ who: 'us', aim, dive, scored });
  p.turn = 'them';
  const f = { kind: 'pens' as const, text: scored ? 'You score.' : dive === aim ? 'Saved.' : 'Wide.', spell: s.spell };
  s.feed.push(f); s.last.push(f);
  settle(s);
  return s;
}

/** Their kick: where you dive. */
export function dive(s0: MatchState, side: Side): MatchState {
  if (s0.phase !== 'pens' || s0.pens?.turn !== 'them') return s0;
  const s = copy(s0);
  s.last = [];
  const p = s.pens!;
  const aim = weighted(s, p.takers);
  const scored = aim !== side;
  p.them.push(scored);
  p.kicks.push({ who: 'them', aim, dive: side, scored });
  p.turn = 'us';
  const f = { kind: 'pens' as const, text: scored ? 'They score.' : 'You save it!', spell: s.spell };
  s.feed.push(f); s.last.push(f);
  settle(s);
  return s;
}

/** The side a habit leans to, for a scouted club. */
export const leanOf = (w: [number, number, number]): Side => SIDES[w.indexOf(Math.max(...w))];
