import { afterEach, describe, expect, it } from 'vitest';
import { setStride } from '../src/domain/walk';
import { withCatalogue, type RouteDef } from '../src/walk/catalogue';
import { finishedOn, placesFree, routeKm, runState, stepsByDay } from '../src/walk/runs';

const def = { id: 't', km: 100 } as RouteDef;
// 7.4 km a day at the default 0.74 m stride
const steps = new Map([
  ['2026-01-01', 10_000],
  ['2026-01-02', 10_000],
  ['2026-01-03', 10_000],
  ['2026-01-04', 10_000],
]);
const route = (id: string, km: number) => ({ id, km, name: id, places: [], pages: [], sources: [] }) as unknown as RouteDef;

describe('walking a route', () => {
  afterEach(() => setStride(undefined));

  it('counts days from joining', () => {
    expect(routeKm({ id: 't', spans: [{ from: '2026-01-02' }] }, def, steps)).toBeCloseTo(22.2, 5);
  });

  it("doesn't count the day it was set down, or the days while down", () => {
    expect(routeKm({ id: 't', spans: [{ from: '2026-01-01', to: '2026-01-02' }, { from: '2026-01-04' }] }, def, steps)).toBeCloseTo(14.8, 5);
  });

  it('counts a day once when set down and picked up the same day', () => {
    expect(routeKm({ id: 't', spans: [{ from: '2026-01-01', to: '2026-01-02' }, { from: '2026-01-02' }] }, def, steps)).toBeCloseTo(29.6, 5);
  });

  it('never counts a day twice when spans overlap', () => {
    expect(routeKm({ id: 't', spans: [{ from: '2026-01-01' }, { from: '2026-01-03' }] }, def, steps)).toBeCloseTo(29.6, 5);
  });

  it('caps at the route’s length and finishes', () => {
    const short = { id: 's', km: 20 } as RouteDef;
    const run = { id: 's', spans: [{ from: '2026-01-01' }] };
    expect(routeKm(run, short, steps)).toBe(20);
    expect(finishedOn(run, short, steps)).toBe('2026-01-03');
    expect(runState(run, short, 20)).toBe('finished');
    expect(finishedOn({ id: 't', spans: [{ from: '2026-01-01' }] }, def, steps)).toBeUndefined();
  });

  it('stays finished when a shorter stride lowers the km', () => {
    setStride(0.5);
    expect(runState({ id: 's', spans: [{ from: '2026-01-01' }], doneOn: '2026-01-03' }, { id: 's', km: 20 } as RouteDef, 15)).toBe('finished');
  });

  it('says walking or set down in words', () => {
    expect(runState({ id: 't', spans: [{ from: '2026-01-01' }] }, def, 5)).toBe('walking');
    expect(runState({ id: 't', spans: [{ from: '2026-01-01', to: '2026-01-03' }] }, def, 5)).toBe('set down');
  });

  it('frees a place when a route is set down', () => {
    withCatalogue([route('a', 100), route('b', 100), route('x', 3000)], () => {
      const runs = [
        { id: 'a', spans: [{ from: '2026-01-01' }] },
        { id: 'b', spans: [{ from: '2026-01-01', to: '2026-01-03' }] },
        { id: 'x', spans: [{ from: '2026-01-01' }] },
      ];
      expect(placesFree(runs, new Map([['a', 5], ['b', 5], ['x', 5]]))).toEqual({ challenge: 1, expedition: 1 });
    });
  });

  it('frees a place when a route is finished', () => {
    withCatalogue([route('a', 100)], () => {
      expect(placesFree([{ id: 'a', spans: [{ from: '2026-01-01' }], doneOn: '2026-01-09' }], new Map([['a', 100]]))).toEqual({ challenge: 2, expedition: 2 });
    });
  });

  it('reads steps by day, skipping days with none saved', () => {
    expect(stepsByDay([{ date: '2026-01-01', steps: 5 }, { date: '2026-01-02' }])).toEqual(new Map([['2026-01-01', 5]]));
  });
});
