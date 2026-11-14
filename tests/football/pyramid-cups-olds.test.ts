// LG-3 (ledger O38, spec 2026-11-14 §5, §6, §8): seeding world 2, its season, the Big Cup drawn up, the pair cup,
// and the Old Selves of real months.
import { describe, expect, it } from 'vitest';
import { advance } from '../../src/football/cups';
import { allAxes, type AxisValues } from '../../src/football/types';
import { rng } from '../../src/football/rng';
import { BIGCUP_SIZE, drawUp, pairOf, PAIRCUP_ID, redrawUp } from '../../src/football/pyramid/cups';
import { OLD_MAX, oldSelfFrom2, rollOldSelves2, seatOldSelves } from '../../src/football/pyramid/oldSelves';
import { POOL } from '../../src/football/pyramid/shape';
import { seedWorld2 } from '../../src/football/pyramid/world';
import { newSeason2, OWN } from '../../src/football/store/season';
import type { FbClub } from '../../src/football/store/tables';
import { FIXTURE_SEEDS } from './fixtures/pyramidClubs';

const BRA = { id: OWN, style: 'press', rating: 40 };
const month = (m: string, v: number, n = 10) => ({ month: m, values: Array.from({ length: n }, () => allAxes(v) as AxisValues) });

describe('seeding world 2', () => {
  const clubs = seedWorld2(FIXTURE_SEEDS, BRA, 3, []) as FbClub[];
  it('eight divisions of 12, Brabo where placing put it, the rest in the pool', () => {
    for (let d = 1; d <= 8; d++) expect(clubs.filter((c) => !c.pool && !c.folded && c.tier === d)).toHaveLength(12);
    expect(clubs.find((c) => c.id === OWN)!.tier).toBe(3);
    expect(clubs.filter((c) => c.pool).length).toBe(94 + 30 - 95); // 94 pyramid clubs and Brabo: the pool's best fills the 96th place
    expect(clubs.find((c) => c.id === 'pc00')!.pool).toBeFalsy();
    expect(clubs.filter((c) => c.folded)).toHaveLength(7); // no Old Selves yet: their seats wait, folded
  });
  it('every real club inside its band', () => {
    for (const c of clubs.filter((x) => !x.pool && !x.folded && x.id !== OWN)) {
      const band = [[99, 104], [94, 99], [88, 93], [83, 88], [77, 82], [72, 77], [67, 72], [62, 67]][c.tier - 1];
      expect(c.rating).toBeGreaterThanOrEqual(band[0]);
      expect(c.rating).toBeLessThanOrEqual(band[1]);
    }
  });
  it('an Old Self takes a place in its division', () => {
    const o = oldSelfFrom2(month('2026-10', 15), 'x')!;
    const w = seedWorld2(FIXTURE_SEEDS, BRA, 3, [o]);
    expect(w.filter((c) => !c.pool && !c.folded && c.tier === o.tier)).toHaveLength(12);
    expect(w.find((c) => c.id === 'os1')!.old!.month).toBe('2026-10');
  });
});

describe('a world-2 season', () => {
  const clubs = seedWorld2(FIXTURE_SEEDS, BRA, 5, []) as FbClub[];
  const s = newSeason2(1, '2026-12-01', clubs);
  it('is marked world 2, with 22 rounds of 6 in every division', () => {
    expect(s.world).toBe(2);
    for (let d = 1; d <= 8; d++) { expect(s.fixtures[d as 1]).toHaveLength(22); expect(s.fixtures[d as 1][0]).toHaveLength(6); }
    expect(Object.keys(s.tierOf)).toHaveLength(96);
  });
  it('the Big Cup fills 128 from the 96 and the pool, with byes when the pool is short', () => {
    const r1 = s.bigcup.rounds[0];
    const entrants = r1.ties.flatMap((t) => [t.home, t.away]).filter(Boolean);
    expect(entrants).toHaveLength(96 + 29);
    expect(r1.ties.filter((t) => t.away === null)).toHaveLength(3);
    expect(s.bigcup.size).toBe(BIGCUP_SIZE);
    expect(s.bigcup.rounds.map((r) => [r.name, r.day])).toEqual([['Last 128', 3], ['Last 64', 7], ['Last 32', 7], ['Last 16', 19], ['Quarter-final', 19], ['Semi-final', 25], ['Final', 27]]);
  });
  it('Brabo are drawn up', () => {
    const t = s.bigcup.rounds[0].ties.find((x) => x.home === OWN || x.away === OWN)!;
    const opp = t.home === OWN ? t.away! : t.home;
    expect(s.tierOf[opp]).toBeLessThan(5);
  });
  it('the pair cup: Brabo\'s division and the one above, 24 clubs, the top eight with byes', () => {
    const p = s.tiercups[PAIRCUP_ID];
    const ids = p.rounds[0].ties.flatMap((t) => [t.home, t.away]).filter(Boolean) as string[];
    expect(ids).toHaveLength(24);
    expect(new Set(ids.map((id) => s.tierOf[id]))).toEqual(new Set([4, 5]));
    expect(p.rounds[0].ties.filter((t) => t.away === null)).toHaveLength(8);
    expect(p.name).toBe('The Pair Cup: Division Four and Division Five');
    expect(pairOf(1)).toEqual([1, 2]);
  });
  it('the continental cup: the Crown League\'s top four and twelve from the pool', () => {
    const f = s.continental!.field;
    expect(f).toHaveLength(16);
    expect(f.slice(0, 4).every((id) => s.tierOf[id] === 1)).toBe(true);
    expect(f.slice(4).every((id) => clubs.find((c) => c.id === id)!.pool)).toBe(true);
  });
});

describe('the up draw', () => {
  const div = (id: string) => Number(id.slice(1, 2));
  const ids = ['a8x', 'a8y', 'a7x', 'a6x', 'a3x', 'a2x', 'a1x', 'a1y'].map((x) => `d${x[1]}${x.slice(2)}`);
  it('every lower club meets a higher one while one is left; the lower side at home', () => {
    for (let seed = 1; seed < 30; seed++) {
      const ties = drawUp(ids, div, rng(seed));
      expect(ties).toHaveLength(4);
      for (const t of ties) expect(div(t.away!)).toBeLessThanOrEqual(div(t.home));
      // Both Division Eight clubs meet a higher club: four clubs sit above them.
      for (const t of ties.filter((x) => div(x.home) === 8)) expect(div(t.away!)).toBeLessThan(8);
    }
  });
  it('Brabo are drawn first, and up', () => {
    for (let seed = 1; seed < 30; seed++) {
      const t = drawUp([...ids, 'd5bra'], div, rng(seed), 'd5bra').find((x) => x.home === 'd5bra')!;
      expect(div(t.away!)).toBeLessThan(5);
    }
  });
  it('the next round is drawn again by the same rule', () => {
    let b = { id: 'bigcup', name: 'x', size: 8, rounds: [{ name: 'QF', day: 1, ties: drawUp(ids, div, rng(3)) }, { name: 'SF', day: 2, ties: [] }, { name: 'F', day: 3, ties: [] }] };
    const res = Object.fromEntries(b.rounds[0].ties.map((t) => [`${t.home}-${t.away}`, { score: [1, 0] as [number, number] }]));
    b = advance(b, 0, res);
    const again = redrawUp(b, 1, div, rng(9), 'nobody');
    expect(again.rounds[1].ties).toHaveLength(2);
    for (const t of again.rounds[1].ties) expect(div(t.away!)).toBeLessThanOrEqual(div(t.home));
  });
});

describe('Old Selves in world 2', () => {
  it('only months with at least 7 real nights; rated by the median night; placed where the rating falls', () => {
    expect(oldSelfFrom2(month('2026-09', 15, 6), 'x')).toBeUndefined();
    const o = oldSelfFrom2(month('2026-10', 15), 'x')!;
    expect(o.standIn).toBe(false);
    expect(o.name).toBe('AFC October 2026');
    expect(o.tier).toBeGreaterThanOrEqual(1);
    expect(o.tier).toBeLessThanOrEqual(8);
  });
  it('at most seven; the weakest retires, the older on a tie; months seen before never come back', () => {
    const cur = Array.from({ length: 7 }, (_, i) => ({ ...oldSelfFrom2(month(`2025-0${i + 1}`, 14 + (i % 3)), `os${i + 1}`)! }));
    const t = rollOldSelves2(cur, [month('2026-10', 18), month('2024-01', 20)], ['2024-01']);
    expect(t.joined.map((o) => o.month)).toEqual(['2026-10']);
    expect(t.retired).toHaveLength(1);
    expect(t.retired[0].month).toBe('2025-01');
    expect(t.joined[0].id).toBe('os1');
    expect(t.kept.length + t.joined.length).toBe(OLD_MAX);
  });
  it('seated: a newcomer displaces the nearest-rated real club to the pool; a retiree\'s place goes to the pool club nearest the band', () => {
    const base = seedWorld2(FIXTURE_SEEDS, BRA, 5, []) as FbClub[];
    const o = { ...oldSelfFrom2(month('2026-10', 15), 'os1')! };
    const isReal = (c: FbClub) => c.id !== OWN && !c.id.startsWith('os');
    const after = seatOldSelves(base, { joined: [o], retired: [] }, isReal, POOL);
    const d = o.tier;
    expect(after.filter((c) => !c.pool && !c.folded && c.tier === d)).toHaveLength(12);
    expect(after.find((c) => c.id === 'os1')).toMatchObject({ tier: d, folded: false, rating: o.rating });
    const back = seatOldSelves(after, { joined: [], retired: [after.find((c) => c.id === 'os1')!.old!] }, isReal, POOL);
    expect(back.filter((c) => !c.pool && !c.folded && c.tier === d)).toHaveLength(12);
    expect(back.find((c) => c.id === 'os1')!.folded).toBe(true);
  });
});
