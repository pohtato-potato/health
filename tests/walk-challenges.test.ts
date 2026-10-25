import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DayKey } from '../src/domain/dates';
import type { RouteRun } from '../src/domain/types';
import { withCatalogue, type RouteDef } from '../src/walk/catalogue';
import { momentToday } from '../src/walk/moments';
import { gatherNews, roadNews } from '../src/walk/news';
import { chooseForMe, targetLine } from '../src/walk/shelf';
import { chaptersShown, storyState } from '../src/walk/story';

/** 10,000 steps is 7.4 km at the default stride. */
const steps = (days: [DayKey, number][]) => new Map(days);
const run = (id: string, extra: Partial<RouteRun> = {}): RouteRun => ({ id, spans: [{ from: '2026-03-01' }], ...extra });
const page = (km: number, title: string) => ({ km, title, line: `${title}, the line.`, page: [`${title}.`] });
const def = (id: string, km: number, extra: Partial<RouteDef> = {}): RouteDef =>
  ({ id, name: `Route ${id}`, era: '1900', hook: '', group: 'india', km, record: 'place', region: 'india', ink: '#88aacc', places: [], pages: [page(0, 'Start')], sources: [{ title: 's' }], ready: true, ...extra }) as RouteDef;

const book = def('b', 200, { group: 'books', record: 'story', book: { by: 'An Author', synopsis: 'No spoilers.', fullSynopsis: 'Everything.', chapters: [{ km: 5, text: 'One' }, { km: 12, text: 'Two' }, { km: 30, text: 'Three' }] } });
const ROUTES = [def('a', 100, { pages: [page(0, 'Start'), page(10, 'The river')] }), def('c', 300, { pages: [page(0, 'Start'), page(8, 'The hill')] }), def('x', 3000, { pages: [page(0, 'Start'), page(9, 'The pass'), page(14, 'The lake')] }), book];

describe('news from the road', () => {
  const s = steps([
    ['2026-03-01', 10000],
    ['2026-03-02', 10000],
  ]);

  it('finds the pages crossed today or yesterday, keyed by route and km', () =>
    withCatalogue(ROUTES, () => {
      const news = roadNews([run('a')], s, '2026-03-02', new Set());
      expect(news.map((n) => n.key)).toEqual(['walk-news:a:10']);
      expect(news[0]).toMatchObject({ routeId: 'a', kind: 'challenge', what: 'The river, the line.' });
      expect(roadNews([run('a')], s, '2026-03-02', new Set(['walk-news:a:10']))).toEqual([]);
    }));

  it('gathers two events on one day into one banner', () =>
    withCatalogue(ROUTES, () => {
      const b = gatherNews(roadNews([run('a'), run('c')], s, '2026-03-02', new Set()))!;
      expect(b.title).toBe('2 things happened on the road');
      expect(b.action).toBe('See both');
      expect(b.items).toHaveLength(2);
    }));

  it('joins a second expedition event to the first banner rather than adding one', () =>
    withCatalogue(ROUTES, () => {
      const news = roadNews([run('x')], s, '2026-03-02', new Set());
      expect(news.map((n) => n.km)).toEqual([9, 14]);
      const b = gatherNews(news)!;
      expect(b.items).toHaveLength(2);
      expect(b.title).toBe('2 things happened on the road');
    }));

  it('says one thing plainly, with one action', () =>
    withCatalogue(ROUTES, () => {
      const b = gatherNews(roadNews([run('a')], s, '2026-03-02', new Set()))!;
      expect(b.title).toBe('Challenge · Route a');
      expect(b.text).toBe('The river, the line.');
      expect(b.action).toBe('Read what happened');
      expect(gatherNews([])).toBeUndefined();
    }));

  it('says nothing of a route set down, or of days before yesterday', () =>
    withCatalogue(ROUTES, () => {
      expect(roadNews([run('a', { spans: [{ from: '2026-03-01', to: '2026-03-02' }] })], s, '2026-03-02', new Set()).map((n) => n.key)).toEqual([]);
      expect(roadNews([run('a')], s, '2026-03-05', new Set())).toEqual([]);
    }));

  it('brings book chapters only with the story on, and stops them at a pause', () =>
    withCatalogue(ROUTES, () => {
      expect(roadNews([run('b')], s, '2026-03-02', new Set()).map((n) => n.km)).toEqual([5, 12]);
      expect(roadNews([run('b', { story: 'places' })], s, '2026-03-02', new Set())).toEqual([]);
      expect(roadNews([run('b', { storyPauseKm: 8 })], s, '2026-03-02', new Set()).map((n) => n.km)).toEqual([5]);
    }));
});

describe('the story', () => {
  it('is story, paused or places, and only for books', () => {
    expect(storyState(run('b'), book)).toBe('story');
    expect(storyState(run('b', { story: 'places' }), book)).toBe('places');
    expect(storyState(run('b', { storyPauseKm: 4 }), book)).toBe('paused');
    expect(storyState(run('a'), ROUTES[0])).toBeUndefined();
  });

  it('shows the chapters reached, up to the pause, and none with places only', () => {
    expect(chaptersShown(run('b'), book, 20).map((c) => c.text)).toEqual(['One', 'Two']);
    expect(chaptersShown(run('b', { storyPauseKm: 8 }), book, 40).map((c) => c.text)).toEqual(['One']);
    expect(chaptersShown(run('b', { story: 'places' }), book, 40)).toEqual([]);
  });
});

describe('the day’s one full-screen moment', () => {
  const finish = { kind: 'finish' as const, key: 'walk-finish:a', path: '/finish?id=a' };
  const arrival = { kind: 'arrival' as const, key: 'city:Agra', path: '/arrive?c=Agra&ch=1' };
  const line = { kind: 'state' as const, key: 'state:Rajasthan', path: '/arrive?s=Rajasthan' };

  it('plays a finish over an arrival, and the arrival becomes a banner', () => {
    const m = momentToday([arrival, finish], new Set(), '2026-03-02');
    expect(m.play).toBe(finish);
    expect(m.later).toEqual([arrival]);
  });

  it('plays an arrival over a state line', () => {
    expect(momentToday([line, arrival], new Set(), '2026-03-02')).toEqual({ play: arrival, later: [line] });
  });

  it('plays nothing once the day has had its moment', () => {
    expect(momentToday([arrival], new Set(['walk-moment:2026-03-02']), '2026-03-02')).toEqual({ play: undefined, later: [arrival] });
  });
});

describe('the shelf’s rules', () => {
  it('says what you are aiming for, and nothing once the day has passed', () => {
    expect(targetLine('2026-03-14', '2026-03-02')).toBe('aiming for 14 March');
    expect(targetLine('2026-03-14', '2026-03-14')).toBe('aiming for 14 March');
    expect(targetLine('2026-03-14', '2026-03-15')).toBeUndefined();
    expect(targetLine(undefined, '2026-03-15')).toBeUndefined();
  });

  it('chooses a pinned route first, then the shortest challenge, never a full kind or one joined', () =>
    withCatalogue(ROUTES, () => {
      expect(chooseForMe(ROUTES, [], new Set(['c']), new Map())?.id).toBe('c');
      expect(chooseForMe(ROUTES, [], new Set(), new Map())?.id).toBe('a');
      // Two challenges walking: only the expedition is left to offer.
      const two = [run('a'), run('c')];
      expect(chooseForMe(ROUTES, two, new Set(['b']), new Map())?.id).toBe('x');
    }));

  it('leans to the group you have finished most', () =>
    withCatalogue(ROUTES, () => {
      const done = [run('a', { doneOn: '2026-03-10' })];
      const more = [...ROUTES, def('w1', 500, { group: 'world' }), def('b2', 900, { group: 'books' })];
      withCatalogue(more, () => {
        const finishedBook = [...done, run('b', { doneOn: '2026-03-11' })];
        expect(chooseForMe(more, finishedBook, new Set(), new Map([['a', 100], ['b', 200]]))?.id).toBe('b2');
      });
    }));
});

describe('the walk’s words', () => {
  it('never says "behind" (comments aside)', () => {
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
    for (const f of [...files('src/walk'), ...files('src/screens/walk')].filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes('/content/') && !f.includes('/catalogue/routes/'))) expect(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), f).not.toMatch(/\bbehind\b/i);
  });
});
