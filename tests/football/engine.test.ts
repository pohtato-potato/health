import { describe, expect, it } from 'vitest';
import { chanceCount, finishMatch, FOG, HOME_EDGE, KINDS, matchup, MIN_SIDE, nextChance, pctOf, playMatch, splitChances, startMatch, typicalFor, TYPICAL_MIN, type MatchInput } from '../../src/football/engine';
import { CAL } from '../../src/football/opponent';
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
  it('plays ten to twelve chances, split by both averages alike', () => {
    expect([0, 0.34, 0.99].map((c) => chanceCount(c))).toEqual([10, 11, 12]);
    for (const ev of many((s) => input({ seed: s }), 100)) { expect(ev.chances.length).toBeGreaterThanOrEqual(10); expect(ev.chances.length).toBeLessThanOrEqual(12); }
    // a better defence leaves them fewer chances, exactly as a better attack makes you more
    expect(splitChances(11, 12, 18, 0.7)).toBe(splitChances(11, 18, 12, 0.7));
    expect(splitChances(11, 12, 18, 0.7)).toBeGreaterThan(splitChances(11, 12, 6, 0.7));
    for (const t of [10, 11, 12]) for (const a of [1, 10, 20]) for (const d of [1, 10, 20]) for (const r of [0.4, 0.9]) {
      const y = splitChances(t, a, d, r);
      expect(y).toBeGreaterThanOrEqual(MIN_SIDE);
      expect(t - y).toBeGreaterThanOrEqual(MIN_SIDE);
    }
  });
  it('chance kinds really differ: a tap-in goes in far more often than a long shot', () => {
    const by = new Map<string, number[]>();
    for (const ev of many((s) => input({ seed: s, opp: opp({ rating: 56 }) }), 300)) for (const c of ev.chances) by.set(c.type, [...(by.get(c.type) ?? []), c.pct]);
    const avg = (t: string) => { const xs = by.get(t)!; return xs.reduce((a, b) => a + b, 0) / xs.length; };
    expect(avg('Tap-in')).toBeGreaterThan(55);
    expect(avg('Long shot')).toBeLessThan(18);
    expect(avg('Scramble in the box')).toBeLessThan(35); // your chance to save it
    expect(avg('Long-range effort')).toBeGreaterThan(80);
    for (const side of ['atk', 'def'] as const) expect(KINDS[side].reduce((t, k) => t + k.w, 0)).toBeCloseTo(1, 6);
  });
  it('can stop between chances: chance by chance plays the same match', () => {
    const st = startMatch(input({ seed: 9 }));
    const seen = [];
    for (let c = nextChance(st); c; c = nextChance(st)) seen.push(c.minute);
    expect(finishMatch(st)).toEqual(playMatch(input({ seed: 9 })));
    expect(seen.length).toBe(st.total);
  });
  it('defence counts: a better defensive average concedes less', () => {
    const conceded = (rest: number) => many((s) => input({ seed: s, values: { ...allAxes(12), Rest: rest, Routine: rest, Shape: rest } }), 400).reduce((t, e) => t + e.score[1], 0);
    expect(conceded(17)).toBeLessThan(conceded(7) * 0.7);
  });
  it('sizes chances against your typical shape, so a better night than usual scores more', () => {
    const typical = allAxes(12);
    const mean = (v: AxisValues, t?: AxisValues) => { const xs = many((s) => input({ seed: s, values: v, typical: t }), 150).flatMap((e) => e.chances.filter((c) => c.side === 'atk').map((c) => c.pct)); return xs.reduce((a, b) => a + b, 0) / xs.length; };
    const better = { ...typical, Pace: 17, Power: 17, Fuel: 17 };
    expect(mean(better, typical)).toBeGreaterThan(mean(better) + 5); // without history it is sized to itself
    expect(typicalFor(Array(TYPICAL_MIN - 1).fill(typical))).toBeUndefined();
    expect(typicalFor([allAxes(4), allAxes(9), allAxes(15), allAxes(10), allAxes(20), allAxes(1), allAxes(12)])).toEqual(allAxes(10));
  });
  it('fog: an unlogged axis plays low and shifts from chance to chance', () => {
    const evs = many((s) => input({ seed: s, values: { ...allAxes(12), Rest: 2 }, fog: ['Rest'] }), 60);
    const draws = new Set<number>();
    for (const c of evs.flatMap((e) => e.chances)) {
      const fog = c.mods.find((m) => m.kind === 'fog');
      const v = 2 + (fog?.d ?? 0);
      expect(v).toBeGreaterThanOrEqual(FOG[0]);
      expect(v).toBeLessThanOrEqual(FOG[1]);
      draws.add(v);
    }
    expect(draws.size).toBeGreaterThan(3);
    // fogged is worse on average than the same axis honestly logged at a bad value
    const conceded = (f: MatchInput['fog'], rest: number) => many((s) => input({ seed: s, values: { ...allAxes(12), Rest: rest }, fog: f }), 400).reduce((t, e) => t + e.score[1], 0);
    expect(conceded(['Rest'], 2)).toBeGreaterThan(conceded(undefined, 4));
    // and never applies to an axis not in the list
    expect(many((s) => input({ seed: s }), 30).every((e) => e.chances.every((c) => !c.mods.some((m) => m.kind === 'fog')))).toBe(true);
  });
  it('every club keeps its character, even when you are much stronger', () => {
    expect(matchup(allAxes(18), opp({ rating: 30 })).k).toBe(CAL.floor);
    const ev = playMatch(input({ values: allAxes(18), opp: opp({ rating: 30 }) }));
    expect(ev.chances.some((c) => c.mods.some((m) => m.kind === 'opp' && m.why === 'TST'))).toBe(true);
  });
  it('the stack and a captain lift defence too, and the home side has a small edge', () => {
    const cs = many((s) => input({ seed: s, captain: 'Rest', stack: 2, values: allAxes(10) }), 20).flatMap((e) => e.chances);
    for (const c of cs) {
      expect(c.mods.some((m) => m.kind === 'captain')).toBe(c.side === 'def');
      expect(c.mods.filter((m) => m.kind === 'home').every((m) => m.d === HOME_EDGE)).toBe(true);
    }
    expect(cs.some((c) => c.side === 'def' && c.mods.some((m) => m.kind === 'stack' && m.axis === 'Shape'))).toBe(true);
    const away = playMatch(input({ home: false })).chances[0];
    expect(away.mods.filter((m) => m.kind === 'home').every((m) => m.d === -HOME_EDGE)).toBe(true);
    expect(playMatch(input({ neutral: true })).chances.some((c) => c.mods.some((m) => m.kind === 'home'))).toBe(false);
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
    const order = ['fog', 'type', 'captain', 'home', 'sub', 'opp', 'hidden', 'rival', 'tired', 'stack'];
    const rival = { id: 'r', name: 'Bad blood', text: '', mods: () => [{ axis: 'Pace' as const, d: -1, why: 'Bad blood', kind: 'rival' as const }] };
    for (const ev of many((s) => input({ seed: s, captain: 'Pace', bench: [{ axis: 'Fuel', plus: 2 }], stack: 2, rival, values: { ...allAxes(12), Rest: 10 } }), 60)) {
      for (const c of ev.chances.filter((x) => x.side === 'atk')) {
        const idx = c.mods.map((m) => order.indexOf(m.kind)).filter((x) => x >= 0);
        expect([...idx].sort((a, b) => a - b)).toEqual(idx);
      }
    }
  });
  it('tires lit axes from 75 unless Rest is 15', () => {
    const late = (rest: number) => many((s) => input({ seed: s, values: { ...allAxes(12), Rest: rest }, neutral: true }), 80).flatMap((e) => e.chances.filter((c) => c.minute >= 80));
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
