// Congress and the cast in the rebuilt league (ledger O34 and O38): world 2's real clubs take their seats from
// world.json; "four up, four down" plays in eight divisions of 12; solidarity money counts the real division sizes;
// the motions say what they do. World 1 reads exactly what it did. Rules only; made-up tables.
import { describe, expect, it } from 'vitest';
import { BALLOT_POOL, seatLean, solidarityMoney, sitCongress } from '../src/football/congress/congress';
import { MOTIONS, REGIONS, SEATS, seatOf } from '../src/football/content/desk';
import { WORLD, WORLD_CLUBS } from '../src/football/data/world';
import { playoffPairs } from '../src/football/promotion';
import { applyMoves2, seasonEnd2 } from '../src/football/pyramid/movement';
import { DIVISION_SIZE, PYRAMID } from '../src/football/pyramid/shape';
import type { Row } from '../src/football/table';

const row = (id: string, i: number): Row => ({ id, p: 22, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 100 - i, form: [] });
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
const POOL = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, rating: 50 + i * 3 }));

describe('seats in world 2', () => {
  it('every real club has a seat from world.json, and its region is listed', () => {
    const regions = new Set(REGIONS.map((r) => r.id));
    for (const c of WORLD_CLUBS) {
      expect(seatOf(c.id)).toEqual(c.seat);
      expect(regions.has(c.seat.region)).toBe(true);
    }
    for (const r of WORLD.newRegions) expect(regions.has(r.id)).toBe(true);
  });

  it('world 1 reads its old seats unchanged', () => {
    for (const [id, seat] of Object.entries(SEATS)) expect(seatOf(id)).toBe(seat);
  });

  it('a real club only world 2 has (Royal Antwerp) leans by its seat; an unknown club sits neutral', () => {
    expect(SEATS.rafc).toBeUndefined();
    const m = MOTIONS.find((x) => x.id === 'solidarity')!;
    expect(seatOf('rafc')).toBeDefined();
    expect(seatLean(m, 'rafc')).toBe(m.leans[seatOf('rafc')!.owner] ?? 0);
    for (const x of BALLOT_POOL) expect(seatLean(x, 'no-such-club')).toBe(0);
  });

  it('the congress seats world 2’s clubs and counts every one', () => {
    const clubs = WORLD_CLUBS.filter((c) => c.place === 'pyramid').map((c) => c.id);
    const rec = sitCongress(3, '2030-06-01', ['bra', ...clubs], () => 0, {}, []);
    for (const r of rec.motions) expect(r.for + r.against + r.abstain).toBe(clubs.length + 1);
  });
});

describe('four up, four down in the league of twelves', () => {
  it('is on the ballot', () => {
    expect(BALLOT_POOL.some((m) => m.twist.key === 'four-up')).toBe(true);
  });

  it('top three and the 4th-to-7th playoff winner up, bottom four down, every division keeps 12', () => {
    const { tables, tierOf } = world(5, 7);
    expect(playoffPairs(tables[4], 4)).toEqual([['d4-4', 'd4-7'], ['d4-5', 'd4-6']]);
    const m = seasonEnd2(tables, { 4: 'd4-6' }, { own: 'bra', pool: POOL, upDown: 4 });
    expect(m.up[4]).toEqual(['d4-1', 'd4-2', 'd4-3', 'd4-6']);
    expect(m.down[3]).toEqual(['d3-9', 'd3-10', 'd3-11', 'd3-12']);
    expect(m.pool.out).toEqual(['d8-9', 'd8-10', 'd8-11', 'd8-12']);
    expect(m.pool.in.length).toBe(4);
    const next = applyMoves2(tierOf, m);
    const n: Record<number, number> = {};
    for (const d of Object.values(next)) n[d] = (n[d] ?? 0) + 1;
    for (const p of PYRAMID) expect(n[p.no]).toBe(DIVISION_SIZE);
  });

  it('without the motion, the usual three', () => {
    const { tables } = world(5, 7);
    const m = seasonEnd2(tables, {}, { own: 'bra', pool: POOL });
    expect(m.up[4]!.length).toBe(3);
    expect(m.down[3]!.length).toBe(3);
  });

  it('Brabo never leave the pyramid under four down: the club above them goes instead', () => {
    const { tables } = world(8, 12);
    const m = seasonEnd2(tables, {}, { own: 'bra', pool: POOL, upDown: 4 });
    expect(m.pool.out).toEqual(['d8-8', 'd8-9', 'd8-10', 'd8-11']);
  });

  it('the level check still moves Brabo one more step, with room made just above the drop', () => {
    const { tables } = world(5, 1);
    const m = seasonEnd2(tables, {}, { own: 'bra', pool: POOL, upDown: 4, rateIn: () => 0.9 });
    expect(m.level).toMatchObject({ id: 'bra', from: 5, to: 3, dir: 'up', swap: 'd3-8' });
  });
});

describe('solidarity money by the real sizes', () => {
  const tierOf = (sizes: number[], pool = 0) => {
    const out: Record<string, number> = {};
    sizes.forEach((n, i) => { for (let k = 0; k < n; k++) out[`d${i + 1}-${k}`] = i + 1; });
    for (let k = 0; k < pool; k++) out[`p${k}`] = sizes.length + 1;
    return out;
  };
  it('world 2: 12 Crown League clubs share with the 84 below; the outside pool never shares', () => {
    const t = tierOf(Array(8).fill(12), 30);
    expect(solidarityMoney(1, 10, t, 8, 120)).toBeCloseTo(-12);
    expect(solidarityMoney(3, 10, t, 8, 120)).toBeCloseTo((12 * 12) / 84);
  });
  it('world 1: 18 share with the 90 below', () => {
    const t = tierOf(Array(6).fill(18));
    expect(solidarityMoney(4, 10, t, 6, 120)).toBeCloseTo((12 * 18) / 90);
    expect(solidarityMoney(4, 0, t, 6, 120)).toBe(0);
  });
});

describe('the motions say what they do', () => {
  it('spend what you earn: financial trouble, never Brabo, no "lose points" promise', () => {
    const m = MOTIONS.find((x) => x.id === 'spending-rule')!;
    expect(m.text).not.toMatch(/lose points/i);
    expect(m.plays).toMatch(/financial trouble/i);
    expect(m.plays).toMatch(/never lands on Brabo/);
  });
  it('four up, four down names the playoff and the level check', () => {
    const m = MOTIONS.find((x) => x.id === 'four-up')!;
    expect(m.plays).toMatch(/4th and 7th/);
    expect(m.plays).toMatch(/level check/);
  });
});
