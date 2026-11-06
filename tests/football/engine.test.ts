import { describe, expect, it } from 'vitest';
import { chanceCount, pctOf, playMatch, splitChances, type MatchInput } from '../../src/football/engine';
import type { Opponent } from '../../src/football/opponent';
import { allAxes, type AxisValues } from '../../src/football/types';

const opp = (over: Partial<Opponent> = {}): Opponent => ({ id: 'tst', rating: 50, reach: 0.65, shrinks: { Pace: -1 }, presses: { Rest: -1 }, abilities: [], ...over });
const input = (over: Partial<MatchInput> = {}): MatchInput => ({
  seed: 42, values: allAxes(12), opp: opp(), home: true, stack: 0, abilities: [], bench: [], pre: [], conds: [], ...over,
});
const many = (f: (seed: number) => MatchInput, n = 300) => Array.from({ length: n }, (_, i) => playMatch(f(i + 1)));

describe('match engine', () => {
  it('is deterministic for a seed', () => {
    expect(playMatch(input())).toEqual(playMatch(input()));
    expect(playMatch(input({ seed: 43 })).chances[0].land).not.toEqual(playMatch(input()).chances[0].land);
  });
  it('counts and splits chances', () => {
    expect(chanceCount(10, 0)).toBe(5);
    expect(chanceCount(18, 1)).toBe(8);
    expect(chanceCount(30, 1)).toBe(8);
    expect([2, 3]).toContain(splitChances(5, 13, 0.75));
    for (const t of [5, 6, 7, 8]) for (const a of [1, 10, 20]) for (const r of [0.4, 0.9]) {
      const y = splitChances(t, a, r);
      expect(y).toBeGreaterThanOrEqual(2);
      expect(t - y).toBeGreaterThanOrEqual(2);
    }
  });
  it('puts chances at distinct sorted minutes from 3 to 89', () => {
    for (const ev of many((s) => input({ seed: s }), 100)) {
      const ms = ev.chances.map((c) => c.minute);
      expect(new Set(ms).size).toBe(ms.length);
      expect([...ms].sort((a, b) => a - b)).toEqual(ms);
      for (const x of ms) { expect(x).toBeGreaterThanOrEqual(3); expect(x).toBeLessThanOrEqual(89); }
    }
  });
  it('applies modifiers in the spec order', () => {
    const order = ['type', 'captain', 'sub', 'opp', 'hidden', 'rival', 'tired', 'stack'];
    const rival = { id: 'r', name: 'Bad blood', text: '', mods: () => [{ axis: 'Pace' as const, d: -1, why: 'Bad blood', kind: 'rival' as const }] };
    for (const ev of many((s) => input({ seed: s, captain: 'Pace', bench: [{ axis: 'Fuel', plus: 2 }], stack: 2, rival, values: { ...allAxes(12), Rest: 10 } }), 60)) {
      for (const c of ev.chances.filter((x) => x.side === 'atk')) {
        const idx = c.mods.map((m) => order.indexOf(m.kind)).filter((x) => x >= 0);
        expect([...idx].sort((a, b) => a - b)).toEqual(idx);
      }
    }
  });
  it('tires lit axes from 75 unless Rest is 15', () => {
    const late = (rest: number) => many((s) => input({ seed: s, values: { ...allAxes(12), Rest: rest } }), 80).flatMap((e) => e.chances.filter((c) => c.minute >= 80));
    expect(late(14).every((c) => c.mods.some((m) => m.kind === 'tired'))).toBe(true);
    expect(late(15).some((c) => c.mods.some((m) => m.kind === 'tired'))).toBe(false);
  });
  it('caps the weekly stack at 15 points', () => {
    for (const ev of many((s) => input({ seed: s, stack: 4, values: allAxes(14) }), 80)) {
      for (const c of ev.chances.filter((x) => x.side === 'atk')) {
        const lift = c.mods.find((m) => m.kind === 'stack')?.d ?? 0;
        const without: AxisValues = { ...c.values, Pace: c.values.Pace - lift, Power: c.values.Power - lift, Fuel: c.values.Fuel - lift };
        expect(pctOf(c.values, 'atk', null) - pctOf(without, 'atk', null)).toBeLessThanOrEqual(0.15 + 1e-9);
      }
    }
  });
  it('second wind retakes one missed chance of 30% or more', () => {
    const evs = many((s) => input({ seed: s, abilities: [{ id: 'second-wind', name: 'Second wind' }], values: allAxes(14) }), 150);
    const retakes = evs.map((e) => e.chances.filter((c) => c.retake?.why === 'Second wind'));
    expect(retakes.some((x) => x.length === 1)).toBe(true);
    for (const r of retakes) { expect(r.length).toBeLessThanOrEqual(1); for (const c of r) expect(c.pct).toBeGreaterThanOrEqual(30); }
  });
  it('tags moments by the percentage', () => {
    for (const ev of many((s) => input({ seed: s, values: allAxes(8) }), 200)) for (const c of ev.chances) {
      if (c.tag === 'SCREAMER') expect(c.side === 'atk' && c.ok && c.pct <= 20).toBe(true);
      if (c.tag === 'HEARTBREAK') expect(c.side === 'atk' && !c.ok && c.pct >= 70).toBe(true);
      if (c.tag === 'WONDER SAVE') expect(c.side === 'def' && c.ok && c.pct <= 25).toBe(true);
    }
  });
  it('sets the goal-line distance only near the edge, and the score from the chances', () => {
    let near = 0;
    for (const ev of many((s) => input({ seed: s }), 200)) {
      for (const c of ev.chances) if (c.glDist != null) { near++; expect(c.glDist).toBeLessThan(7 / 112); }
      const mine = ev.chances.filter((c) => c.side === 'atk' && c.ok).length;
      const theirs = ev.chances.filter((c) => c.side === 'def' && !c.ok).length;
      expect(ev.score).toEqual([mine, theirs]);
      expect(ev.moments.length).toBe(ev.chances.filter((c) => c.tag).length + ev.chances.filter((c) => c.side === 'def' && !c.ok && c.pct >= 70).length);
    }
    expect(near).toBeGreaterThan(0);
  });
  it('reveals a hidden ability at the first meeting only', () => {
    const o = opp({ abilities: [{ name: 'Mussel Bed', text: 'your Pace shrinks a further 1.5', trigger: 'all match', data: false, fx: { when: 'always', mods: [{ axis: 'Pace', d: -1.5 }], reach: 0 } }], hidden: 'Mussel Bed' });
    expect(playMatch(input({ opp: o, ctx: { firstMeeting: true } })).revealed).toBe('Mussel Bed');
    expect(playMatch(input({ opp: o })).revealed).toBeUndefined();
    const atk = playMatch(input({ opp: o })).chances.find((c) => c.side === 'atk')!;
    expect(atk.mods.some((m) => m.kind === 'hidden' && m.axis === 'Pace')).toBe(true);
  });
});
