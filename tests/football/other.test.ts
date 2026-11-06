import { describe, expect, it } from 'vitest';
import { simResult } from '../../src/football/otherMatches';
import { rng } from '../../src/football/rng';

describe('the rest of the world', () => {
  it('is deterministic for a generator', () => {
    expect(simResult({ rating: 60 }, { rating: 55 }, rng(9))).toEqual(simResult({ rating: 60 }, { rating: 55 }, rng(9)));
  });
  it('equal clubs: home wins 40–50%, draws 22–30%', () => {
    const r = rng(1); let h = 0, d = 0;
    for (let i = 0; i < 5000; i++) { const [a, b] = simResult({ rating: 60 }, { rating: 60 }, r); if (a > b) h++; else if (a === b) d++; }
    expect(h / 5000).toBeGreaterThanOrEqual(0.4); expect(h / 5000).toBeLessThanOrEqual(0.5);
    expect(d / 5000).toBeGreaterThanOrEqual(0.22); expect(d / 5000).toBeLessThanOrEqual(0.3);
  });
  it('a 90 beats a 40 at least 85% of the time', () => {
    const r = rng(2); let w = 0;
    for (let i = 0; i < 5000; i++) { const [a, b] = simResult({ rating: 90 }, { rating: 40 }, r, i % 2 ? 3 : -3); if (a > b) w++; }
    expect(w / 5000).toBeGreaterThanOrEqual(0.85);
  });
});
