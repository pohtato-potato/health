import { describe, expect, it } from 'vitest';
import { ALL_STATES, CITIES } from '../src/domain/walk';
import { CITY_FACTS } from '../src/walk/content/cities';
import { CITY_POINTS, REGIONS } from '../src/walk/geo';
import { SOUVENIRS } from '../src/walk/souvenirs';

describe('every city on the walk', () => {
  const [x0, y0, x1, y1] = REGIONS.india.box;
  for (const c of CITIES)
    it(`${c}: on the map, with a height`, () => {
      const p = CITY_POINTS[c];
      expect(p, c).toBeTruthy();
      expect(p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1, c).toBe(true);
      expect(CITY_FACTS[c]?.heightM, c).toBeGreaterThanOrEqual(0);
    });

  it('has a map shape and a souvenir for every state and territory on the walk', () => {
    const shapes = new Set(REGIONS.india.states!.map((s) => s.name));
    for (const s of new Set(ALL_STATES.map((x) => x.name))) {
      expect(shapes.has(s), s).toBe(true);
      expect(SOUVENIRS[s], s).toBeTruthy();
    }
  });

  it('puts Leh high and Chennai low', () => {
    expect(CITY_FACTS.Leh.heightM).toBeGreaterThan(3000);
    expect(CITY_FACTS.Chennai.heightM).toBeLessThan(20);
  });
});
