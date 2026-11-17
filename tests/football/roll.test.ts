import { describe, expect, it } from 'vitest';
import { hexagon, inside } from '../../src/football/radar';
import { roll, rollSeed } from '../../src/screens/football/match/roll';

const TYPES = ['Through ball', 'Counter-attack', 'Set piece', 'Tap-in', 'Long shot', 'Cross into the box', 'Corner', 'Break through the middle', 'Scramble in the box', 'Long-range effort', 'Something new'];
const RIM = hexagon(1.0001);
const cases = Array.from({ length: 300 }, (_, i) => {
  const a = i * 2.39996, d = (i % 10) / 10;
  return { c: { type: TYPES[i % TYPES.length], side: (i % 2 ? 'def' : 'atk') as 'atk' | 'def' }, land: [Math.cos(a) * d * 0.95, Math.sin(a) * d * 0.95] as [number, number], seed: rollSeed(1000 + i, i % 14, i % 7 === 0), close: i % 3 === 0 };
});

describe('the roll (O44)', () => {
  it('ends exactly on the stored landing and never leaves the radar', () => {
    for (const k of cases) {
      const r = roll(k.c, k.land, k.seed, k.close);
      expect(r.path[r.path.length - 1]).toEqual(k.land);
      for (const p of r.path) expect(inside(p, RIM)).toBe(true);
    }
  });

  it('is the same every time for the same stored chance, and differs between chances', () => {
    const a = roll(cases[5].c, cases[5].land, cases[5].seed, false);
    const b = roll(cases[5].c, cases[5].land, cases[5].seed, false);
    expect(b).toEqual(a);
    expect(roll(cases[5].c, cases[5].land, rollSeed(1005, 6, false), false).path).not.toEqual(a.path);
    expect(rollSeed(7, 3, true)).not.toBe(rollSeed(7, 3, false));
  });

  it('ordinary rolls run 3.6 to 4.6 s, goal-line ones 5 to 6 s, and both bounce', () => {
    const hits: number[] = [];
    for (const k of cases) {
      const r = roll(k.c, k.land, k.seed, k.close);
      if (k.close) { expect(r.ms).toBeGreaterThanOrEqual(5000); expect(r.ms).toBeLessThanOrEqual(6000); }
      else { expect(r.ms).toBeGreaterThanOrEqual(3600); expect(r.ms).toBeLessThanOrEqual(4600); }
      expect(r.hits.length).toBeGreaterThanOrEqual(3);
      hits.push(r.hits.length);
    }
    const mean = hits.reduce((a, b) => a + b, 0) / hits.length;
    expect(mean).toBeGreaterThanOrEqual(4);
  });
});
