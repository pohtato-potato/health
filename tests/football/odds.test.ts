import { describe, expect, it } from 'vitest';
import { clubById, type ClubDef } from '../../src/football/data/load';
import { playMatch } from '../../src/football/engine';
import { opponentFor } from '../../src/football/opponent';
import { TIER_TYPICAL } from '../../src/football/ratings';
import { allAxes, type Tier } from '../../src/football/types';

const N = 10000;
function winRate(values: number, club: ClubDef, rating?: number) {
  const opp = opponentFor(club, { rating });
  let w = 0, d = 0, g = 0;
  for (let s = 1; s <= N; s++) {
    const ev = playMatch({ seed: s * 7919, values: allAxes(values), opp, home: s % 2 === 0, stack: 0, abilities: [], bench: [], pre: [], conds: [] });
    if (ev.score[0] > ev.score[1]) w++; else if (ev.score[0] === ev.score[1]) d++;
    g += ev.score[0] + ev.score[1];
  }
  return { w: w / N, d: d / N, g: g / N };
}
const plain = (rating: number, tier: Tier): ClubDef => ({ ...clubById('hul'), id: 'cal', rating, tier, known: [], hidden: undefined, shrinks: {}, presses: {}, style: 'grit' });

describe('odds calibration (10,000 matches a case)', () => {
  it('one tier apart, the weaker side wins 28–38%', () => {
    const r = winRate(TIER_TYPICAL[5], plain(56, 4));
    console.log('one tier apart', r);
    expect(r.w).toBeGreaterThanOrEqual(0.28);
    expect(r.w).toBeLessThanOrEqual(0.38);
  });
  it('Division Six against an elite club wins 1–3%', () => {
    const r = winRate(TIER_TYPICAL[6], clubById('bay'));
    console.log('six v elite', r);
    expect(r.w).toBeGreaterThanOrEqual(0.01);
    expect(r.w).toBeLessThanOrEqual(0.03);
  });
  it('an elite club loses 9–16% in its own tier', () => {
    const r = winRate(TIER_TYPICAL[1], clubById('bay'));
    console.log('crown v elite', r);
    expect(r.w).toBeGreaterThanOrEqual(0.09);
    expect(r.w).toBeLessThanOrEqual(0.16);
  });
  it('an even match is a contest at every tier, with real goals', () => {
    const mids: Record<Tier, number> = { 6: 37, 5: 48, 4: 56, 3: 66, 2: 76, 1: 86 };
    for (const t of [6, 5, 4, 3, 2, 1] as Tier[]) {
      const r = winRate(TIER_TYPICAL[t], plain(mids[t], t));
      expect(r.w).toBeGreaterThanOrEqual(0.3);
      expect(r.w).toBeLessThanOrEqual(0.52);
      expect(r.d).toBeLessThanOrEqual(0.34);
      expect(r.g).toBeGreaterThanOrEqual(1.8);
      expect(r.g).toBeLessThanOrEqual(4);
    }
  });
});
