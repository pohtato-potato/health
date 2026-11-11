// Cup runs, layer 1: penalties (spec §4.6).
import { describe, expect, it } from 'vitest';
import { habitsOf } from '../../../src/football/cup/clubs';
import { newMatch, type MatchState } from '../../../src/football/cup/match';
import { dive, kick, leanOf, pensWinner } from '../../../src/football/cup/pens';
import { SIDES } from '../../../src/football/cup/types';

function shootout(seed: number): MatchState {
  const s = newMatch({ seed, deck: [], club: { id: 'x', name: 'X', short: 'X', rating: 50, tier: 5, style: 'press', scouted: true, colours: [] } });
  s.phase = 'pens';
  s.pens = { us: [], them: [], turn: 'us', keeper: habitsOf('x').keeper, takers: habitsOf('x').takers, kicks: [] };
  return s;
}

describe('penalties', () => {
  it('decides early once one side cannot catch up', () => {
    expect(pensWinner([true, true, true], [false, false, false])).toBe('us');
    expect(pensWinner([true, true, true], [false, false])).toBeUndefined();
    expect(pensWinner([false, false, false], [true, true, true])).toBe('them');
  });
  it('goes to sudden death after five each', () => {
    const five = [true, true, false, true, true];
    expect(pensWinner(five, five)).toBeUndefined();
    expect(pensWinner([...five, true], [...five, false])).toBe('us');
    expect(pensWinner([...five, true], [...five])).toBeUndefined();
  });
  it('alternates kicks and always ends with a winner', () => {
    for (let seed = 1; seed < 60; seed++) {
      let s = shootout(seed);
      for (let k = 0; k < 60 && s.phase === 'pens'; k++) s = s.pens!.turn === 'us' ? kick(s, SIDES[k % 3]) : dive(s, SIDES[(k + 1) % 3]);
      expect(s.phase).toBe('done');
      expect(s.pens!.winner).toBeDefined();
      const p = s.pens!;
      expect(Math.abs(p.us.length - p.them.length)).toBeLessThanOrEqual(1);
    }
  });
  it('the keeper saves when it dives the way you aim; you save when you guess the taker', () => {
    let s = shootout(5);
    s = kick(s, 'left');
    const k = s.pens!.kicks[0];
    if (k.dive === 'left') expect(k.scored).toBe(false);
    s = dive(s, 'right');
    const t = s.pens!.kicks[1];
    expect(t.scored).toBe(t.aim !== 'right');
  });
  it('a habit leans to one side, and reading it helps', () => {
    const h = habitsOf('some-club');
    expect(SIDES).toContain(leanOf(h.keeper));
    let readIt = 0, against = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const lean = leanOf(shootout(seed).pens!.keeper);
      const away = lean === 'left' ? 'right' : 'left';
      if (kick(shootout(seed), away).pens!.us[0]) readIt++;
      if (kick(shootout(seed), lean).pens!.us[0]) against++;
    }
    expect(readIt).toBeGreaterThan(against);
  });
  it('kicks out of turn change nothing', () => {
    const s = shootout(2);
    expect(dive(s, 'left')).toBe(s);
  });
});
