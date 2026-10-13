import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS, readinessScore, refitWeights, type ReadinessInputs } from '../src/domain/readiness';

describe('readiness v2', () => {
  it('missing inputs drop out without NaN', () => {
    const r = readinessScore({ sleepNeed: 420 });
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.parts).toEqual([]);
    expect(r.known).toBe(false);
    const partial = readinessScore({ sleepNeed: 420, energy: 4, restDays: 2 });
    expect(partial.parts.map((p) => p.key).sort()).toEqual(['energy', 'restDays']);
    for (const p of partial.parts) expect(Number.isFinite(p.delta)).toBe(true);
  });

  it('reasons sorted by |delta|, with plain labels', () => {
    const input: ReadinessInputs = { sleepNeed: 420, sleepMin: 370, office: true, restDays: 2, energy: 3, soreness: { quads: 3 } };
    const r = readinessScore(input);
    const d = r.parts.map((p) => Math.abs(p.delta));
    expect(d).toEqual([...d].sort((a, b) => b - a));
    expect(r.parts.find((p) => p.key === 'office')?.label).toBe('Office day');
    expect(r.parts.find((p) => p.key === 'restDays')?.delta).toBeGreaterThan(0);
    expect(r.parts.find((p) => p.key === 'sleep')?.delta).toBeLessThan(0);
    expect(r.parts.find((p) => p.key === 'soreness')?.label).toBe('Quads sore');
    expect(r.score).toBe(Math.max(0, Math.min(100, 75 + r.parts.reduce((n, p) => n + p.delta, 0))));
  });

  it('refit stays within caps', () => {
    // Quality tracks sleep very strongly and ignores energy entirely.
    const history = Array.from({ length: 25 }, (_, i) => {
      const sleep = (i % 5) / 2 - 1;
      const energy = Math.floor(i / 5) / 2 - 1;
      return { x: { sleep, energy }, quality: 60 + sleep * 80 };
    });
    const w = refitWeights(history);
    expect(w.sleep).toBeLessThanOrEqual(DEFAULT_WEIGHTS.sleep * 1.5);
    expect(w.sleep).toBeGreaterThan(DEFAULT_WEIGHTS.sleep);
    expect(w.energy).toBeGreaterThanOrEqual(DEFAULT_WEIGHTS.energy * 0.5);
    expect(w.energy).toBeLessThan(DEFAULT_WEIGHTS.energy);
    expect(refitWeights(history.slice(0, 5))).toEqual(DEFAULT_WEIGHTS);
  });
});
