// LG-3 (ledger O38, spec 2026-11-14 §7): Brabo's level and placing, and how other clubs drift.
import { describe, expect, it } from 'vitest';
import { LEVEL_MIN_NIGHTS, placeBrabo, placeDivision, typicalNight, winRate, type LevelNight, type SimClub } from '../../src/football/pyramid/level';
import { finishDrift, settle2, tableDrift } from '../../src/football/pyramid/drift';
import { PYRAMID } from '../../src/football/pyramid/shape';
import { worldTurn } from '../../src/football/world';
import { rng } from '../../src/football/rng';
import { allAxes, type AxisValues } from '../../src/football/types';

const V = (Pace: number, Power: number, Fuel: number, Rest: number, Routine: number, Shape: number): AxisValues => ({ Pace, Power, Fuel, Rest, Routine, Shape });
const STYLES = ['press', 'possession', 'low-block', 'direct', 'counter', 'grit'];
const band = (lo: number, hi: number, tag: string): SimClub[] => Array.from({ length: 11 }, (_, i) => ({ id: `${tag}${i}`, rating: lo + ((hi - lo) * i) / 10, style: STYLES[i % 6] }));
const DIVS = Object.fromEntries(PYRAMID.map((p) => [p.no, band(p.band[0], p.band[1], `d${p.no}-`)]));
const night = (values: AxisValues, nights = 20): LevelNight => ({ values, nights, captain: 'Pace', stack: 4, abilities: [] });

describe('the typical night', () => {
  it('is the median of each value, odd or even', () => {
    expect(typicalNight([V(1, 2, 3, 4, 5, 6), V(3, 2, 1, 4, 5, 6), V(2, 9, 2, 4, 5, 6)])).toEqual(V(2, 2, 2, 4, 5, 6));
    expect(typicalNight([V(1, 1, 1, 1, 1, 1), V(4, 4, 4, 4, 4, 4)])).toEqual(allAxes(2.5));
    expect(typicalNight([])).toBeUndefined();
  });
});

describe('placing', () => {
  it('nearest 40% wins', () => {
    expect(placeDivision({ 2: 0.32, 3: 0.45, 4: 0.57 })).toBe(3);
    expect(placeDivision({ 2: 0.38, 3: 0.45 })).toBe(2);
  });
  it('on a tie, the lower division', () => {
    expect(placeDivision({ 2: 0.35, 3: 0.45 })).toBe(3);
    expect(placeDivision({ 7: 0.45, 6: 0.35, 5: 0.2 })).toBe(7);
  });
  it('the same night and clubs always give the same rate (fixed seeds)', () => {
    const n = night(allAxes(15));
    expect(winRate(n, DIVS[4], 6)).toEqual(winRate(n, DIVS[4], 6));
  });
  it('a stronger division is harder: win rate falls from Eight to the Crown', () => {
    const n = night(allAxes(16));
    const rates = [8, 5, 1].map((d) => winRate(n, DIVS[d], 10).w);
    expect(rates[0]).toBeGreaterThan(rates[1]);
    expect(rates[1]).toBeGreaterThan(rates[2]);
  });
  it('a better night is placed at least as high', () => {
    const lo = placeBrabo(night(allAxes(13)), DIVS, 6).division;
    const hi = placeBrabo(night(allAxes(18)), DIVS, 6).division;
    expect(hi).toBeLessThanOrEqual(lo);
  });
  it('fewer than 7 real nights: placed on the nights there are, and flagged', () => {
    const p = placeBrabo(night(allAxes(15), 4), DIVS, 4);
    expect(p.short).toBe(true);
    expect(p.nights).toBe(4);
    expect(LEVEL_MIN_NIGHTS).toBe(7);
    expect(placeBrabo(night(allAxes(15), 9), DIVS, 4).short).toBe(false);
  });
  it('no real night at all: the bottom, flagged', () => {
    expect(placeBrabo(undefined, DIVS)).toMatchObject({ division: 8, short: true, nights: 0 });
  });
});

describe('club drift', () => {
  it('by finish, at most 2 either way: top three up, bottom three down, the middle still', () => {
    expect(Array.from({ length: 12 }, (_, i) => finishDrift(i + 1, 12))).toEqual([2, 1, 1, 0, 0, 0, 0, 0, 0, -1, -1, -2]);
  });
  it('skips Brabo and the Old Selves', () => {
    const ch = tableDrift({ 3: [{ id: 'bra' }, ...Array.from({ length: 11 }, (_, i) => ({ id: `c${i}` }))] }, (id) => id === 'bra');
    expect(ch.find((c) => c.id === 'bra')).toBeUndefined();
    expect(ch.find((c) => c.id === 'c0')).toEqual({ id: 'c0', d: 1, why: 'finish' });
  });
  it('clipped to the band of the division it plays in next', () => {
    const clubs = [{ id: 'a', rating: 92 }, { id: 'b', rating: 89 }, { id: 'c', rating: 60 }, { id: 'bra', rating: 0 }];
    const out = settle2(clubs, [{ id: 'a', d: 4, why: 'takeover' }, { id: 'b', d: -2, why: 'finish' }, { id: 'c', d: 3, why: 'x' }, { id: 'bra', d: 5, why: 'x' }],
      (id) => ({ a: 3, b: 3, bra: 3 } as Record<string, number>)[id], (id) => id === 'bra');
    expect(out.map((c) => c.rating)).toEqual([93, 88, 63, 0]);
  });
  it('the lore events stay; the old random form drift is off in world 2', () => {
    const clubs = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, name: `C${i}`, rating: 80, tier: 4 as const, kind: 'real' }));
    const t = worldTurn(clubs, rng(5), { form: false });
    expect(t.changes.some((c) => c.why === 'form')).toBe(false);
    expect(t.changes.some((c) => c.why === 'takeover')).toBe(true);
    expect(worldTurn(clubs, rng(5)).changes.some((c) => c.why === 'form')).toBe(true);
  });
});
