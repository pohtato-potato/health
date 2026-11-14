// LG-3 (ledger O38, spec 2026-11-14 §7 "Moving"): top two up, playoff 3rd to 6th, bottom three down, Brabo included;
// the level check; the room-making swap; Division Eight's bottom three swapping with the outside pool.
import { describe, expect, it } from 'vitest';
import { applyMoves2, landsIn2, LEVEL_DOWN, LEVEL_UP, poolSwapIn, seasonEnd2 } from '../../src/football/pyramid/movement';
import type { Row } from '../../src/football/table';

const row = (id: string, i: number): Row => ({ id, p: 22, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 100 - i, form: [] });
/** Eight tables of 12; `own` sits at `pos` (1-based) in division `div`. */
function world(div: number, pos: number) {
  const tables: Record<number, Row[]> = {};
  const tierOf: Record<string, number> = {};
  for (let d = 1; d <= 8; d++) {
    const ids = Array.from({ length: 12 }, (_, i) => `d${d}-${i + 1}`);
    if (d === div) ids.splice(pos - 1, 1, 'bra');
    tables[d] = ids.map(row);
    for (const id of ids) tierOf[id] = d;
  }
  return { tables, tierOf };
}
const POOL = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, rating: 50 + i * 3 })); // 50 53 56 59 62 65
const count = (t: Record<string, number>) => { const n: Record<number, number> = {}; for (const d of Object.values(t)) n[d] = (n[d] ?? 0) + 1; return n; };
const twelveEach = (t: Record<string, number>) => expect(count(t)).toEqual({ 1: 12, 2: 12, 3: 12, 4: 12, 5: 12, 6: 12, 7: 12, 8: 12 });

describe('moving at a season end', () => {
  it('top two and the playoff winner up, bottom three down, every division keeps 12', () => {
    const { tables, tierOf } = world(5, 7);
    const m = seasonEnd2(tables, { 4: 'd4-5' }, { own: 'bra', pool: POOL });
    expect(m.up[4]).toEqual(['d4-1', 'd4-2', 'd4-5']);
    expect(m.up[1]).toBeUndefined();
    expect(m.down[3]).toEqual(['d3-10', 'd3-11', 'd3-12']);
    expect(m.down[8]).toBeUndefined();
    const after = applyMoves2(tierOf, m);
    twelveEach(after);
    expect(after['d4-5']).toBe(3);
    expect(after.bra).toBe(5);
  });
  it('without a playoff result, third goes up', () => {
    const { tables } = world(5, 7);
    expect(seasonEnd2(tables, {}, { own: 'bra', pool: POOL }).up[6]).toEqual(['d6-1', 'd6-2', 'd6-3']);
  });
  it('Brabo go down from the bottom three like anyone', () => {
    const { tables, tierOf } = world(3, 11);
    const m = seasonEnd2(tables, {}, { own: 'bra', pool: POOL });
    expect(m.down[3]).toContain('bra');
    expect(applyMoves2(tierOf, m).bra).toBe(4);
    expect(landsIn2(m, 'bra', 3)).toBe(4);
  });
  it("Division Eight's bottom three swap with the three pool clubs rated nearest its band", () => {
    const { tables, tierOf } = world(5, 7);
    const m = seasonEnd2(tables, {}, { own: 'bra', pool: POOL });
    expect(m.pool.out).toEqual(['d8-10', 'd8-11', 'd8-12']);
    expect(m.pool.in).toEqual(['p5', 'p4', 'p3']); // 65 and 62 inside the band, then 59 (3 below)
    const after = applyMoves2(tierOf, m);
    twelveEach(after);
    expect(after['d8-12']).toBeUndefined();
    expect(after.p5).toBe(8);
  });
  it('pool ties go to the higher rating, then the id', () => {
    expect(poolSwapIn([{ id: 'b', rating: 60 }, { id: 'a', rating: 60 }, { id: 'c', rating: 69 }], [62, 67], 2)).toEqual(['c', 'a']); // 69 and 60 are both 2 from the band: the higher first, then a before b
  });
  it('Brabo never leave the pyramid: bottom three of Division Eight, the club fourth from bottom goes instead', () => {
    const { tables, tierOf } = world(8, 12);
    const m = seasonEnd2(tables, {}, { own: 'bra', pool: POOL });
    expect(m.pool.out).toEqual(['d8-9', 'd8-10', 'd8-11']);
    const after = applyMoves2(tierOf, m);
    expect(after.bra).toBe(8);
    twelveEach(after);
  });
});

describe('the level check (Brabo only)', () => {
  it('after a title, over 55% in the division above the landing one: up two, and the club fourth from bottom there makes room', () => {
    const { tables, tierOf } = world(5, 1);
    const m = seasonEnd2(tables, {}, { own: 'bra', pool: POOL, rateIn: (d) => (d === 3 ? 0.6 : 0.8) });
    expect(m.level).toMatchObject({ id: 'bra', from: 5, to: 3, swap: 'd3-9', dir: 'up' });
    expect(m.level!.rate).toBeCloseTo(0.6);
    const after = applyMoves2(tierOf, m);
    expect(after.bra).toBe(3);
    expect(after['d3-9']).toBe(4);
    twelveEach(after);
    expect(landsIn2(m, 'bra', 5)).toBe(3);
  });
  it('exactly 55% is not over: one step only', () => {
    const { tables } = world(5, 1);
    expect(seasonEnd2(tables, {}, { own: 'bra', pool: POOL, rateIn: () => LEVEL_UP }).level).toBeUndefined();
  });
  it('only after a title: second place with a high rate goes up one', () => {
    const { tables } = world(5, 2);
    expect(seasonEnd2(tables, {}, { own: 'bra', pool: POOL, rateIn: () => 0.9 }).level).toBeUndefined();
  });
  it('after relegation, under 25% in the division below the landing one: down two, the best finisher not promoted there makes room', () => {
    const { tables, tierOf } = world(3, 12);
    const m = seasonEnd2(tables, { 5: 'd5-4' }, { own: 'bra', pool: POOL, rateIn: (d) => (d === 5 ? 0.2 : 0.5) });
    expect(m.level).toMatchObject({ id: 'bra', from: 3, to: 5, swap: 'd5-3', dir: 'down' });
    const after = applyMoves2(tierOf, m);
    expect(after.bra).toBe(5);
    expect(after['d5-3']).toBe(4);
    twelveEach(after);
  });
  it('never past the top or the bottom: a title in Division Two, relegation into Division Eight', () => {
    expect(seasonEnd2(world(2, 1).tables, {}, { own: 'bra', pool: POOL, rateIn: () => 0.99 }).level).toBeUndefined();
    expect(seasonEnd2(world(7, 12).tables, {}, { own: 'bra', pool: POOL, rateIn: () => 0 }).level).toBeUndefined();
  });
  it('the thresholds are the spec\'s: over 55% and under 25%', () => {
    expect(LEVEL_UP).toBe(0.55);
    expect(LEVEL_DOWN).toBe(0.25);
  });
  it('the Crown League has no promotion; its top four are read for the continental cup by the caller', () => {
    const { tables } = world(1, 1);
    const m = seasonEnd2(tables, {}, { own: 'bra', pool: POOL, rateIn: () => 0.99 });
    expect(m.up[1]).toBeUndefined();
    expect(m.level).toBeUndefined();
  });
});
