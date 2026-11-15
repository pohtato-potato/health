// Ledger O40, letter 1a: the chance shown before a match is tonight played out on fixed seeds of its own. It agrees with
// a long run within a few points, never flickers, and never touches the real match's seed or result.
import { describe, expect, it } from 'vitest';
import { chanceOf, chancePercents, chanceSeed, CHANCE_SEEDS } from '../../src/football/chance';
import { playMatch, type MatchInput } from '../../src/football/engine';
import type { Opponent } from '../../src/football/opponent';
import { allAxes } from '../../src/football/types';

const opp = (over: Partial<Opponent> = {}): Opponent => ({ id: 'tst', rating: 50, reach: 0.65, shrinks: { Pace: -1 }, presses: { Rest: -1 }, abilities: [], ...over });
const input = (over: Partial<MatchInput> = {}): MatchInput => ({
  seed: 42, values: allAxes(12), opp: opp(), home: true, stack: 0, abilities: [], bench: [], pre: [], conds: [], ...over,
});
const long = (i: MatchInput, n: number) => {
  let w = 0, d = 0, l = 0;
  for (let k = 0; k < n; k++) { const [a, b] = playMatch({ ...i, seed: 1_000_000 + k }).score; if (a > b) w++; else if (a === b) d++; else l++; }
  return { w: w / n, d: d / n, l: l / n };
};

describe('the chance (O40)', () => {
  for (const [name, i] of [
    ['an even night at home', input()],
    ['a strong night away to a bigger club', input({ values: allAxes(16), home: false, opp: opp({ rating: 80, reach: 0.8 }) })],
    ['a poor night against a smaller club', input({ values: allAxes(7), opp: opp({ rating: 30, reach: 0.5 }) })],
  ] as const) {
    it(`${name}: within a few points of 4000 played out`, () => {
      const c = chanceOf(i), ref = long(i, 4000);
      expect(c.n).toBe(CHANCE_SEEDS);
      for (const k of ['w', 'd', 'l'] as const) expect(Math.abs(c[k] - ref[k])).toBeLessThan(0.06);
    });
  }
  it('the same night gives the same figure, and the real match is untouched', () => {
    const i = input({ seed: 7 });
    const real = playMatch(i);
    expect(chanceOf(i)).toEqual(chanceOf(i));
    expect(playMatch(i)).toEqual(real);
    expect(Array.from({ length: CHANCE_SEEDS }, (_, k) => chanceSeed(k))).not.toContain(7);
  });
  it('shows three whole parts that add up to 100', () => {
    expect(chancePercents({ w: 1 / 3, d: 1 / 3, l: 1 / 3 }).reduce((a, b) => a + b)).toBe(100);
    expect(chancePercents({ w: 0.365, d: 0.284, l: 0.351 })).toEqual([37, 28, 35]);
  });
});
