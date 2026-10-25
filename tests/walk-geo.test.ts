import { describe, expect, it } from 'vitest';
import { INDIA_AREA_KM2, REGIONS, ROUTE_LINES } from '../src/walk/geo';

describe('generated land and route lines', () => {
  it('draws all 36 states and union territories of India', () => {
    expect(REGIONS.india.states).toHaveLength(36);
    expect(REGIONS.india.states!.filter((s) => s.ut)).toHaveLength(8);
  });

  it("adds up India's area within 5% of 3.29 million km²", () => {
    expect(INDIA_AREA_KM2).toBeGreaterThan(3.12e6);
    expect(INDIA_AREA_KM2).toBeLessThan(3.45e6);
  });

  it('keeps every route line on its region, with at least two points', () => {
    for (const [id, r] of Object.entries(ROUTE_LINES)) {
      const [x0, y0, x1, y1] = REGIONS[r.region].box;
      expect(r.line.length, id).toBeGreaterThanOrEqual(2);
      for (const [x, y] of r.line) expect(x >= x0 - 20 && x <= x1 + 20 && y >= y0 - 20 && y <= y1 + 20, id).toBe(true);
    }
  });

  it('draws the states the first road crosses, so their shared borders (the Chambal line) are on the map', () => {
    expect(REGIONS.india.states!.map((s) => s.name)).toEqual(expect.arrayContaining(['Rajasthan', 'Madhya Pradesh', 'Uttar Pradesh']));
  });
});
