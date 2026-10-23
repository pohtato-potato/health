import { afterEach, describe, expect, it } from 'vitest';
import { kmFromSteps, setStride } from '../src/domain/walk';
import { grepSrc } from './helpers/grepSrc';

describe('one kilometre figure', () => {
  afterEach(() => setStride(undefined));

  it('Today and the Walk tab use the same stride', () => {
    setStride(0.8);
    expect(kmFromSteps(10_000)).toBeCloseTo(8, 5);
    setStride(undefined);
    expect(kmFromSteps(10_000)).toBeCloseTo(7.4, 5);
    setStride(2); // outside 0.3–1.5 m
    expect(kmFromSteps(10_000)).toBeCloseTo(7.4, 5);
  });

  it('no screen turns steps into km on its own', () => {
    const hits = grepSrc(/STRIDE_M|\*\s*0\.74/).filter((f) => !f.endsWith('src/domain/walk.ts'));
    expect(hits).toEqual([]);
  });
});
