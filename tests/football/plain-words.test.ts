// Finding 10: no ability the owner can read says "reach" in the engine's numbers.
import { describe, expect, it } from 'vitest';
import { plainWords } from '../../src/football/data/plain';
import { CLUBS } from '../../src/football/data/load';
import { WORLD_CLUBS } from '../../src/football/data/world';

describe('abilities in plain words (O40)', () => {
  it('rewrites the engine numbers', () => {
    expect(plainWords('headers against you get +.05 reach')).toBe('headers against you are 5 in 100 more likely to go in');
    expect(plainWords('their chances after 85\' get +.05 reach')).toBe('their chances after 85\' are 5 in 100 more likely to go in');
    expect(plainWords('when leading after 80\', their reach drops .05')).toBe('when leading after 80\', their chances are 5 in 100 less likely to go in');
    expect(plainWords('they shelter: long shots against them get −.05 reach')).toBe('they shelter: long shots against them are 5 in 100 less likely to go in');
  });
  it('every ability in both worlds reads without engine numbers', () => {
    const all = [...CLUBS, ...WORLD_CLUBS].flatMap((c) => [...c.known, ...(c.hidden ? [c.hidden] : [])]);
    expect(all.length).toBeGreaterThan(0);
    for (const a of all) expect(a.text, a.text).not.toMatch(/reach|(^|[^\d])\.\d/);
  });
});
