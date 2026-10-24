import 'fake-indexeddb/auto';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HealthDB, db, setDatabase } from '../src/db/db';
import { joinRoute } from '../src/db/walkRoutes';
import { setStride } from '../src/domain/walk';
import { CATALOGUE, withCatalogue, type RouteDef } from '../src/walk/catalogue';
import { lineProblems } from '../src/walk/catalogue/checks';
import { ROUTE_LINES } from '../src/walk/geo';
import { RouteArt } from '../src/walk/ui/RouteArt';
import { RouteMap } from '../src/walk/ui/RouteMap';

const route = (id: string, km: number) => ({ id, km, name: id, places: [], pages: [], sources: [] }) as unknown as RouteDef;
let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`walk-p1-review-${++n}`));
  await db.open();
});
afterEach(() => setStride(undefined));

describe('part 1 review fixes', () => {
  it('writes the finish day as soon as a route reaches its length, so a shorter stride can’t unfinish it', () =>
    withCatalogue([route('a', 20), route('b', 100), route('c', 100)], async () => {
      await db.days.bulkPut([
        { date: '2026-01-01', steps: 10_000 },
        { date: '2026-01-02', steps: 10_000 },
        { date: '2026-01-03', steps: 10_000 },
      ] as never);
      await joinRoute('a', '2026-01-01'); // 22.2 km by the 3rd at 0.74 m: finished
      expect(await joinRoute('b', '2026-01-04')).toBe('joined');
      expect((await db.routes.get('a'))!.doneOn).toBe('2026-01-03');
      setStride(0.5); // now 15 km: under the length, but it stays finished
      expect(await joinRoute('c', '2026-01-04')).toBe('joined');
      expect(await joinRoute('a', '2026-01-04')).toBe('finished');
    }));

  it('gives only one of two quick joins the last place', () =>
    withCatalogue([route('a', 100), route('b', 100), route('c', 100)], async () => {
      await joinRoute('a', '2026-01-01');
      const both = await Promise.all([joinRoute('b', '2026-01-01'), joinRoute('c', '2026-01-01')]);
      expect(both.sort()).toEqual(['joined', 'no place']);
    }));

  it('catches places out of line order, a last place off the line’s end, an unmatched turn and a wrong region', () => {
    const line = { region: 'india' as const, ends: ['A', 'C'] as [string, string], line: [[0, 0], [10, 0], [10, 30]] as [number, number][] };
    const good = { id: 'g', km: 400, region: 'india', places: [{ name: 'A', km: 0, at: 0 }, { name: 'B', km: 300, at: 1 }, { name: 'C', km: 400, at: 2 }] } as unknown as RouteDef;
    expect(lineProblems(good, line)).toEqual([]);
    expect(lineProblems({ ...good, places: [good.places[0], { ...good.places[1], at: 2 }, { ...good.places[2], at: 1 }] }, line)).toContain('places out of line order');
    expect(lineProblems({ ...good, places: [good.places[0], good.places[1], { ...good.places[2], at: 1.5 }] }, line)).toContain('place at a point that isn’t on the line: C');
    expect(lineProblems({ ...good, places: [good.places[0], { ...good.places[1], at: 2 }, { ...good.places[2], km: 400, at: 1 }] }, line).length).toBeGreaterThan(0);
    expect(lineProblems({ ...good, places: [good.places[0], good.places[1]], km: 300 }, line)).toContain('the last km isn’t at the end of the line');
    expect(lineProblems({ ...good, turn: 250 }, line)).toContain('turn isn’t at a place');
    expect(lineProblems({ ...good, region: 'asia' }, line)).toContain('region differs from its line');
  });

  it('every route in the catalogue passes the line checks', () => {
    for (const r of CATALOGUE) expect(lineProblems(r, ROUTE_LINES[r.id]), r.id).toEqual([]);
  });

  it('keeps names at their size on screen at the width the drawing is shown', () => {
    for (const width of [328, 360]) {
      for (const html of [renderToStaticMarkup(<RouteMap id="xuanzang" km={10} width={width} />), renderToStaticMarkup(<RouteArt id="tokaido" km={10} width={width} />)]) {
        const vbW = Number(html.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+)/)![1]);
        const scale = Number(html.match(/scale\(([\d.e-]+)\)"><text/)![1]);
        // map units per screen px is vbW / width, so a label scaled by `scale` is drawn at its font-size times this:
        expect((scale * width) / vbW, `${width}`).toBeCloseTo(1, 3);
      }
    }
  });
});
