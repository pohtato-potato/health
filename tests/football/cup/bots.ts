// Simple players for the cup simulation: a careless one (random cards) and a sensible one (builds the move, then
// finishes, and covers when the attack would score). Not tests themselves.
import { ROLE, actsAs } from '../../../src/football/cup/cards';
import { canPlay, canRecycle, coverNow, endSpell, play, preview, recycle, threatNow, TUNE, type MatchState } from '../../../src/football/cup/match';
import { dive, kick, leanOf } from '../../../src/football/cup/pens';
import { SIDES, type CardKind } from '../../../src/football/cup/types';

type Bot = (s: MatchState, r: () => number) => MatchState;

function pens(s: MatchState, r: () => number, smart: boolean): MatchState {
  const p = s.pens!;
  if (p.turn === 'us') {
    const lean = leanOf(p.keeper);
    const aim = smart && s.club.scouted ? (lean === 'left' ? 'right' : 'left') : SIDES[Math.floor(r() * 3)];
    return kick(s, aim);
  }
  return dive(s, smart && s.club.scouted ? leanOf(p.takers) : SIDES[Math.floor(r() * 3)]);
}

/** Plays whatever it can at random, never recycles, and ends the spell now and then. */
export const careless: Bot = (s, r) => {
  if (s.phase === 'pens') return pens(s, r, false);
  for (let k = 0; k < 30; k++) {
    const opts: [string, CardKind | undefined][] = s.hand.flatMap((c): [string, CardKind | undefined][] => (c.kind === 'total' ? s.basics.map((k) => [c.id, k]) : [[c.id, undefined]]))
      .filter(([id, as]) => canPlay(s, id, as));
    if (!opts.length || r() < 0.15) break;
    const [id, as] = opts[Math.floor(r() * opts.length)];
    s = play(s, id, as);
  }
  return endSpell(s);
};

const isRole = (s: MatchState, id: string, role: string, as?: CardKind) => { const c = s.hand.find((x) => x.id === id)!; return ROLE[actsAs(c, as).kind] === role; };
const ids = (s: MatchState, kinds: CardKind[]) => s.hand.filter((c) => kinds.includes(actsAs(c).kind)).map((c) => c.id);
const LV = { basic: 0, good: 1, great: 2 } as const;

/** Builds the move with passes and carries, finishes once the chance beats the line (or nothing more helps), covers first when the attack would score. */
export const sensible: Bot = (s, r) => {
  if (s.phase === 'pens') return pens(s, r, true);
  const try1 = (id: string | undefined, as?: CardKind) => { if (id && canPlay(s, id, as)) { s = play(s, id, as); return true; } return false; };
  const finishers = () => s.hand.filter((c) => ROLE[actsAs(c).kind] === 'finish' && actsAs(c).kind !== 'punt').length;
  // Wild cards: copy a One-two while building, a finish when one is needed.
  const wild = () => s.hand.find((c) => c.kind === 'total');
  for (let guard = 0; guard < 40; guard++) {
    const danger = threatNow(s) - coverNow(s);
    // 1. Free stamina and the system first.
    if (try1(ids(s, ['second-wind'])[0])) continue;
    if (s.spell <= 3 && s.stamina >= 2 && try1(ids(s, ['system'])[0])) continue;
    // 2. If their attack would score, cover first (keep one stamina for a finish when there is one to hit).
    if (danger > TUNE.shortMax) {
      const cov = s.hand.filter((c) => ROLE[actsAs(c).kind] === 'cover').sort((a, b) => LV[b.level] - LV[a.level]);
      if (cov[0] && try1(cov[0].id)) continue;
    }
    // 3. The best finish, if it scores or nothing can build further.
    const fins = s.hand.map((c) => ({ c, p: preview(s, c.id) })).filter((x) => x.p).sort((a, b) => b.p!.chance - a.p!.chance);
    const canBuild = ids(s, ['one-two']).length > 0 || (ids(s, ['overlap']).length > 0 && s.stamina >= 2 && s.zone < 2);
    if (fins[0] && (fins[0].p!.kind === 'goal' || !canBuild || (fins[0].p!.kind === 'near' && s.stamina <= 1))) { s = play(s, fins[0].c.id); continue; }
    // 4. Build: passes are free; a carry when there is stamina left to finish.
    if (try1(ids(s, ['one-two'])[0])) continue;
    if (s.zone < 2 && s.stamina >= (finishers() ? 2 : 1) && try1(ids(s, ['overlap'])[0])) continue;
    const w = wild();
    if (w && s.zone < 2 && s.basics.includes('one-two') && try1(w.id, 'one-two')) continue;
    if (w && s.zone === 2 && !finishers() && try1(w.id, 'strike')) continue;
    // 5. Dig for a finisher in the final third, or for passes, with drilled or spare stamina.
    if (try1(ids(s, ['drilled'])[0])) continue;
    if (!finishers() && canRecycle(s) && (s.freeRecycles > 0 || s.stamina >= 2)) {
      const junk = s.hand.find((c) => ['hold', 'fresh-legs', 'punt', 'fuelled'].includes(c.kind) && !(danger > 0 && ROLE[c.kind] === 'cover')) ?? s.hand.find((c) => !isRole(s, c.id, 'finish'));
      if (junk) { s = recycle(s, junk.id); continue; }
    }
    // 6. A punt only from the final third with a build-up worth it.
    const punt = ids(s, ['punt'])[0];
    if (punt && s.zone === 2 && !finishers() && try1(punt)) continue;
    // 7. Spare stamina: cover, then fuel for next spell.
    if (danger > 0) { const cov = s.hand.find((c) => ROLE[actsAs(c).kind] === 'cover'); if (cov && try1(cov.id)) continue; }
    if (try1(ids(s, ['fuelled'])[0])) continue;
    break;
  }
  return endSpell(s);
};

export function playOut(s: MatchState, bot: Bot, r: () => number): MatchState {
  for (let k = 0; k < 200 && s.phase !== 'done'; k++) s = bot(s, r);
  return s;
}
