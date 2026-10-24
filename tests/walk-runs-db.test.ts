import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { exportData, restoreData } from '../src/db/backup';
import { HealthDB, db, setDatabase } from '../src/db/db';
import { joinRoute, markRouteDone, pauseStory, pickRouteUp, setRouteDown, setRouteStory, setRouteTarget } from '../src/db/walkRoutes';
import { withCatalogue, type RouteDef } from '../src/walk/catalogue';

const route = (id: string, km: number) => ({ id, km, name: id, places: [], pages: [], sources: [] }) as unknown as RouteDef;
const ROUTES = [route('a', 100), route('b', 100), route('c', 100), route('x', 3000)];

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`walk-runs-${++n}`));
  await db.open();
});

// Each test runs inside the test catalogue.
const inCatalogue = (fn: () => Promise<void>) => () => withCatalogue(ROUTES, fn);

describe('walking a route, saved', () => {
  it(
    'joins, sets down, picks up and resumes without resetting',
    inCatalogue(async () => {
      expect(await joinRoute('a', '2026-01-01')).toBe('joined');
      await setRouteDown('a', '2026-01-05');
      expect(await joinRoute('a', '2026-01-09')).toBe('resumed');
      expect((await db.routes.get('a'))!.spans).toEqual([{ from: '2026-01-01', to: '2026-01-05' }, { from: '2026-01-09' }]);
    }),
  );

  it(
    'picks up a set-down route, and does nothing to one already walking',
    inCatalogue(async () => {
      await joinRoute('a', '2026-01-01');
      expect(await pickRouteUp('a', '2026-01-02')).toBe('picked up');
      expect((await db.routes.get('a'))!.spans).toHaveLength(1);
      await setRouteDown('a', '2026-01-03');
      expect(await pickRouteUp('a', '2026-01-04')).toBe('picked up');
      expect((await db.routes.get('a'))!.spans).toEqual([{ from: '2026-01-01', to: '2026-01-03' }, { from: '2026-01-04' }]);
    }),
  );

  it(
    'refuses a third challenge, but not an expedition',
    inCatalogue(async () => {
      await joinRoute('a', '2026-01-01');
      await joinRoute('b', '2026-01-01');
      expect(await joinRoute('c', '2026-01-01')).toBe('no place');
      expect(await joinRoute('x', '2026-01-01')).toBe('joined');
      await setRouteDown('b', '2026-01-02');
      expect(await joinRoute('c', '2026-01-02')).toBe('joined');
      expect(await pickRouteUp('b', '2026-01-03')).toBe('no place');
    }),
  );

  it(
    'refuses to rejoin a finished route',
    inCatalogue(async () => {
      await joinRoute('a', '2026-01-01');
      await db.days.put({ date: '2026-01-10', steps: 200000 } as never);
      await markRouteDone('a', '2026-01-20');
      expect(await joinRoute('a', '2026-02-01')).toBe('finished');
      expect((await db.routes.get('a'))!.doneOn).toBe('2026-01-20');
    }),
  );

  it(
    'keeps the story choice, a pause and a target',
    inCatalogue(async () => {
      await joinRoute('a', '2026-01-01', 'places');
      await pauseStory('a', 42);
      await setRouteTarget('a', '2026-03-01');
      expect(await db.routes.get('a')).toMatchObject({ story: 'places', storyPauseKm: 42, target: '2026-03-01' });
      await pauseStory('a', undefined);
      await setRouteTarget('a', undefined);
      const r = (await db.routes.get('a'))!;
      expect(r.storyPauseKm).toBeUndefined();
      expect(r.target).toBeUndefined();
    }),
  );

  it(
    'backs up and restores routes, and restores an old backup without them',
    inCatalogue(async () => {
      await joinRoute('a', '2026-01-01');
      const b = await exportData();
      expect(b.tables.routes).toHaveLength(1);
      await restoreData(b);
      expect(await db.routes.count()).toBe(1);
      const old = { ...b, tables: { ...b.tables } };
      delete (old.tables as Record<string, unknown>).routes;
      await restoreData(old);
      expect(await db.routes.count()).toBe(0);
    }),
  );

  it('ignores a route the catalogue doesn’t have', async () => {
    expect(await joinRoute('nowhere', '2026-01-01')).toBe('no place');
    expect(await db.routes.count()).toBe(0);
  });

  it(
    'saves how a book route is walked, story or places',
    inCatalogue(async () => {
      await joinRoute('a', '2026-01-01');
      await setRouteStory('a', 'places');
      expect((await db.routes.get('a'))!.story).toBe('places');
      await setRouteStory('a', 'story');
      expect((await db.routes.get('a'))!.story).toBe('story');
      await setRouteStory('missing', 'places');
      expect(await db.routes.get('missing')).toBeUndefined();
    }),
  );

  it(
    'never marks a route done that has not reached its length',
    inCatalogue(async () => {
      await joinRoute('a', '2026-01-01');
      await markRouteDone('a', '2026-01-02');
      expect((await db.routes.get('a'))!.doneOn).toBeUndefined();
      await db.days.put({ date: '2026-01-01', steps: 200000 } as never);
      await markRouteDone('a', '2026-01-02');
      expect((await db.routes.get('a'))!.doneOn).toBe('2026-01-02');
    }),
  );
});
