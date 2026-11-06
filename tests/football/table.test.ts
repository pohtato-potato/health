import { describe, expect, it } from 'vitest';
import { applyMoves, playoffPairs, seasonEnd } from '../../src/football/promotion';
import { standings, type Row } from '../../src/football/table';
import { TIERS, type Tier } from '../../src/football/types';

describe('tables', () => {
  it('sorts by points, then goal difference', () => {
    const t = standings([
      { home: 'a', away: 'b', score: [1, 0] }, { home: 'c', away: 'd', score: [4, 0] },
      { home: 'b', away: 'c', score: [0, 0] }, { home: 'd', away: 'a', score: [0, 0] },
    ], ['a', 'b', 'c', 'd']);
    expect(t.map((r) => r.id)).toEqual(['c', 'a', 'b', 'd']);
    expect(t[0].pts).toBe(4);
  });
  it('keeps the last five results as form, and takes deductions off', () => {
    const res = Array.from({ length: 7 }, (_, i) => ({ home: 'a', away: 'b', score: [i % 2, 0] as [number, number] }));
    const t = standings(res, ['a', 'b'], { a: 6 });
    const a = t.find((r) => r.id === 'a')!;
    expect(a.form).toEqual(['D', 'W', 'D', 'W', 'D']);
    expect(a.pts).toBe(3 * 3 + 4 - 6);
  });
});
describe('promotion and relegation', () => {
  const tierOf: Record<string, Tier> = {};
  const tables = {} as Record<Tier, Row[]>;
  for (const t of TIERS) {
    tables[t] = Array.from({ length: 18 }, (_, i) => ({ id: `t${t}c${i}`, p: 34, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 60 - i, form: [] }));
    for (const r of tables[t]) tierOf[r.id] = t;
  }
  it('pairs the playoffs 3v6 and 4v5', () => {
    expect(playoffPairs(tables[6])).toEqual([['t6c2', 't6c5'], ['t6c3', 't6c4']]);
  });
  it('sends the top two and the playoff winner up, the bottom three down, and keeps 18 a tier', () => {
    const moves = seasonEnd(tables, { 6: 't6c4' });
    expect(moves.up[6]).toEqual(['t6c0', 't6c1', 't6c4']);
    expect(moves.up[1]).toBeUndefined();
    expect(moves.down[6]).toBeUndefined();
    expect(moves.down[1]).toEqual(['t1c15', 't1c16', 't1c17']);
    const after = applyMoves(tierOf, moves);
    for (const t of TIERS) expect(Object.values(after).filter((x) => x === t)).toHaveLength(18);
    expect(after.t6c0).toBe(5);
  });
});
