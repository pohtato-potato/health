import { describe, expect, it } from 'vitest';
import { PASSES, passAhead } from '../src/walk/passes';
import { SOUVENIRS, souvenirFor } from '../src/walk/souvenirs';
import { ALL_STATES, kmFromSteps, positionAt, setStride, strideM } from '../src/domain/walk';

describe('passes are places on the road', () => {
  it('names the next pass when it comes before the next stop, and never holds the walk back', () => {
    const p = PASSES[0];
    const next = positionAt(p.km - 10).to!.km;
    expect(passAhead(p.km - 10, next)?.id).toBe(p.id);
    expect(passAhead(p.km + 1, positionAt(p.km + 1).to?.km)?.id).not.toBe(p.id);
    expect(passAhead(500, positionAt(500).to!.km)).toBeUndefined();
    expect(positionAt(p.km + 100).km).toBe(p.km + 100);
  });
});

describe('stride', () => {
  it('uses the setting for every distance, and 0.74 m when unset or out of range', () => {
    expect(kmFromSteps(10000)).toBeCloseTo(7.4);
    setStride(0.8);
    expect(strideM()).toBe(0.8);
    expect(kmFromSteps(10000)).toBeCloseTo(8);
    setStride(5);
    expect(strideM()).toBe(0.74);
    setStride(undefined);
    expect(kmFromSteps(10000)).toBeCloseTo(7.4);
  });
});

describe('souvenirs', () => {
  it('every state and territory still has one named, for the passport round', () => {
    for (const s of new Set(ALL_STATES.map((x) => x.name))) expect(souvenirFor(s), s).toBeTruthy();
    expect(Object.keys(SOUVENIRS).length).toBeGreaterThanOrEqual(36);
  });
});
