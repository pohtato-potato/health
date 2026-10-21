import { describe, expect, it } from 'vitest';
import { PEOPLE_ON_THE_ROAD, peopleMet } from '../src/walk/people';

const days = (n: number, steps = 12000) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 8, 27 + i, 12);
    return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, steps };
  });

describe('people met on the road', () => {
  it('meets someone every three to five walking days', () => {
    const met = peopleMet(days(30));
    expect(met.length).toBeGreaterThanOrEqual(6);
    expect(met.length).toBeLessThanOrEqual(10);
    for (let i = 1; i < met.length; i++) {
      const gap = (Date.parse(met[i].date) - Date.parse(met[i - 1].date)) / 86_400_000;
      expect(gap).toBeGreaterThanOrEqual(3);
      expect(gap).toBeLessThanOrEqual(5);
    }
  });

  it('is the same every time for the same days, and nobody twice in a row', () => {
    const a = peopleMet(days(30));
    expect(peopleMet(days(30))).toEqual(a);
    for (let i = 1; i < a.length; i++) expect(a[i].who.name).not.toBe(a[i - 1].who.name);
  });

  it('only meets people from the region you are walking through', () => {
    const met = peopleMet(days(20));
    for (const m of met) expect(PEOPLE_ON_THE_ROAD.find((p) => p.name === m.who.name)?.region).toBe(m.region);
  });

  it('meets nobody on days without steps', () => {
    expect(peopleMet(days(20, 0))).toEqual([]);
  });
});

describe('map zoom', () => {
  it('zooms about a point, keeping that point still, within 1x to 4x', async () => {
    const { zoomAbout, clampView } = await import('../src/walk/zoom');
    const v = zoomAbout({ k: 1, x: 0, y: 0 }, 2, 100, 50, 300, 322);
    expect(v.k).toBe(2);
    // The point under the fingers stays under the fingers.
    expect(100 * v.k + v.x).toBeCloseTo(100);
    expect(50 * v.k + v.y).toBeCloseTo(50);
    expect(zoomAbout({ k: 3, x: 0, y: 0 }, 5, 0, 0, 300, 322).k).toBe(4);
    expect(zoomAbout({ k: 1.2, x: 0, y: 0 }, 0.1, 0, 0, 300, 322)).toEqual({ k: 1, x: 0, y: 0 });
    // Panning never leaves blank space past the map's edge.
    expect(clampView({ k: 2, x: 50, y: -900 }, 300, 322)).toEqual({ k: 2, x: 0, y: -322 });
  });
});
