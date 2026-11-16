// Ledger O40 (16 Nov): the tree's unlocks that did nothing are wired. Each test is one tech's promise, kept from the
// day a save owns the tech; none of them reads a match's chance or result.
import { describe, expect, it } from 'vitest';
import { addDays, type DayKey } from '../../src/domain/dates';
import type { Day, Settings } from '../../src/domain/types';
import { ALBUM } from '../../src/football/content/album';
import { STAFF } from '../../src/football/content/staff';
import { TECHS } from '../../src/football/content/tree';
import { expectedPoints } from '../../src/football/chance';
import { CLASSICS, kitEntry, launchOptions } from '../../src/football/kits';
import { papersDue, papersLines, papersNews, playerOfMatch } from '../../src/football/papers';
import { parcelResearch, parcelTiles } from '../../src/football/parcel';
import type { Health } from '../../src/football/store/gather';
import { kitFor } from '../../src/football/store/kitWall';
import type { FbNews, FbSave, FbSeason } from '../../src/football/store/tables';
import { treeDay, treeLegends, type TreeCtx } from '../../src/football/store/tree';
import { tapeOf } from '../../src/football/tape';
import { NOT_RUN_YET, techReach } from '../../src/football/tree/reach';
import { emptyEngine, emptyUser, type TreeUser } from '../../src/football/tree/types';
import { WHY_WORDS } from '../../src/football/tree/words';
import type { AxisValues, ChanceEvent } from '../../src/football/types';

const MON = '2026-10-05'; // a Monday
const settings = { targets: [{ from: '2026-01-01', targets: { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 } }], checklist: [] } as unknown as Settings;
const health = (dates: DayKey[]): Health => ({ settings, days: new Map(dates.map((d) => [d, { date: d, steps: 9000 } as Day])), sessions: [], kcal: new Map(), measures: [], sets: [], meals: new Map(), walks: [], routes: [] });
const user = (researched: string[], extra: Partial<TreeUser> = {}): TreeUser => ({ ...emptyUser(), researched: researched.map((id) => ({ id, on: MON, cost: 0 })), ...extra });
const season = { id: 1, tierOf: { bra: 6, x1: 6 }, tiercups: {}, playoffs: {}, bigcup: { id: 'b', name: 'B', size: 2, rounds: [] } } as unknown as FbSeason;
const ctx = (h: Health, save: Partial<FbSave>): TreeCtx => ({
  h, save: { id: 'save', season: 1, phase: 'season', day: 1, budget: 0, moved: false, ...save } as FbSave, season, bundles: new Map(), news: [],
  matches: () => [], clubs: new Map([['bra', { id: 'bra', tier: 6, rating: 50 }]]),
});
const gainsOf = (c: TreeCtx, why: string) => (c.save.tree?.gains ?? []).filter((g) => g.why === why);

describe('the tech pages (O40)', () => {
  it('only the playing philosophy is still labelled "Not running in the game yet"', () => {
    expect(NOT_RUN_YET).toEqual({ rule: [], unlock: ['philosophy'] });
    const waiting = TECHS.filter((t) => techReach(t).some((r) => r.waiting)).map((t) => t.id);
    expect(waiting).toEqual(['n-gegenpress']);
  });
  it('each wired tech says what it changed in words', () => {
    const lines = (id: string) => techReach(TECHS.find((t) => t.id === id)!).map((r) => r.line);
    expect(lines('n-tour')).toContain('Each logged day between seasons: +2 research');
    expect(lines('n-museum')).toContain('Each finished album set: +1 research every Monday');
    expect(lines('r-pressoffice')).toContain('After big nights: the line for the papers, at full time');
    expect(lines('n-testimonials')).toContain('A testimonial night and a pack for each new Club legend');
    expect(lines('n-classickit')).toContain('Classic designs in the kit maker: now open');
    expect(STAFF.find((s) => s.id === 'head-of-data')!.text).toMatch(/expected points/);
  });
  it('research from the tour and the museum has words of its own', () => {
    expect(WHY_WORDS.tour).toBe('The pre-season tour');
    expect(WHY_WORDS.museum).toBe('The museum');
  });
});

describe('expected points (Data team)', () => {
  it('is three a win and one a draw, over the played-out chance', () => {
    expect(expectedPoints({ w: 0.36, d: 0.28 })).toBe(1.4);
    expect(expectedPoints({ w: 1, d: 0 })).toBe(3);
    expect(expectedPoints({ w: 0, d: 0 })).toBe(0);
  });
});

describe('the pre-season tour', () => {
  it('pays 2 research a logged day between seasons, only with the tech', () => {
    const h = health([MON]);
    const owned = ctx(h, { phase: 'event', treeUser: user(['n-tour']) });
    treeDay(owned, MON, 0);
    expect(gainsOf(owned, 'tour')).toEqual([{ on: MON, n: 2, why: 'tour', note: 'A day on tour' }]);
    expect(owned.save.tree!.earned).toBe(3); // the logged day's 1, plus the tour's 2
    const without = ctx(h, { phase: 'event', treeUser: user([]) });
    treeDay(without, MON, 0);
    expect(gainsOf(without, 'tour')).toEqual([]);
  });
  it('pays nothing during the season or on an unlogged day', () => {
    const inSeason = ctx(health([MON]), { phase: 'season', treeUser: user(['n-tour']) });
    treeDay(inSeason, MON, 0);
    expect(gainsOf(inSeason, 'tour')).toEqual([]);
    const empty = ctx(health([]), { phase: 'event', treeUser: user(['n-tour']) });
    treeDay(empty, MON, 0);
    expect(gainsOf(empty, 'tour')).toEqual([]);
  });
});

describe('the museum', () => {
  const finished = (n: number): TreeUser['opened'] => [{ id: 'p', on: MON, items: ALBUM.slice(0, n).flatMap((s) => s.cards.map((c) => ({ kind: 'album' as const, id: c.id }))) }];
  it('pays 1 research a finished set, once a week on Monday, from the day the tech is owned', () => {
    const c = ctx(health([]), { treeUser: user(['n-museum'], { opened: finished(2) }) });
    for (let i = 0; i < 8; i++) treeDay(c, addDays(MON, i), 0);
    expect(gainsOf(c, 'museum')).toEqual([
      { on: MON, n: 2, why: 'museum', note: '2 finished album sets' },
      { on: addDays(MON, 7), n: 2, why: 'museum', note: '2 finished album sets' },
    ]);
  });
  it('pays nothing without the tech or without a finished set', () => {
    const without = ctx(health([]), { treeUser: user([], { opened: finished(2) }) });
    treeDay(without, MON, 0);
    expect(gainsOf(without, 'museum')).toEqual([]);
    const none = ctx(health([]), { treeUser: user(['n-museum']) });
    treeDay(none, MON, 0);
    expect(gainsOf(none, 'museum')).toEqual([]);
  });
});

describe('the morning parcel shows the research', () => {
  it('a research tile for the tour or museum paid on the day just played', () => {
    const gains = [{ on: MON, n: 1, why: 'logged' }, { on: MON, n: 2, why: 'tour' }, { on: addDays(MON, -1), n: 3, why: 'museum' }];
    expect(parcelResearch(gains, MON)).toEqual([{ on: MON, n: 2, why: 'tour' }]);
    expect(parcelTiles({ result: true, research: true, pack: true })).toEqual(['result', 'research', 'pack']);
  });
});

describe('Testimonials', () => {
  const legend = [{ id: 'p1', name: 'Morning walk', why: 'apps' as const }];
  it('a new Club legend is in Story; with the tech the night brings one pack, never twice', () => {
    const news: FbNews[] = [];
    const c = { save: { id: 'save', season: 2, treeUser: user(['n-testimonials']) } as FbSave, news };
    treeLegends(c, MON, legend);
    treeLegends(c, addDays(MON, 1), legend);
    expect(c.save.tree!.packs).toEqual([{ id: 'testimonial:p1', on: MON, source: 'testimonial', size: 'normal', season: 2 }]);
    expect(news.map((n) => n.text)).toContain('Morning walk is a Club legend: 100 appearances.');
    expect(news.some((n) => n.text.startsWith('A testimonial night for Morning walk') && n.text.includes('no league points'))).toBe(true);
  });
  it('without the tech: the legend is told, and no pack', () => {
    const news: FbNews[] = [];
    const c = { save: { id: 'save', season: 2, treeUser: user([]), tree: emptyEngine() } as FbSave, news };
    treeLegends(c, MON, legend);
    expect(c.save.tree!.packs).toEqual([]);
    expect(news).toHaveLength(1);
  });
});

describe('the classic kit', () => {
  it('opens one classic design in each slot of the kit maker, only with the tech', () => {
    for (const slot of ['home', 'away', 'third'] as const) {
      const id = CLASSICS.find((k) => k.slot === slot)!.id;
      expect(launchOptions(slot, 3, 0, true)).toContain(id);
      expect(launchOptions(slot, 3, 0, false)).not.toContain(id);
      expect(kitFor(id, 3, [])?.name).toMatch(/^Classic/);
      expect(kitEntry(id)?.slot).toBe(slot);
    }
  });
});

const V: AxisValues = { Pace: 12, Power: 10, Fuel: 9, Rest: 6, Routine: 11, Shape: 13 };
const ch = (side: 'atk' | 'def', type: string, ok: boolean, minute: number) => ({ side, type, ok, minute }) as ChanceEvent;

describe('the video room tape', () => {
  it('a loss names the unit most goals against leaned on', () => {
    const t = tapeOf({ result: 'L', values: V, events: { chances: [ch('def', 'Cross into the box', false, 20), ch('def', 'Scramble in the box', false, 70), ch('def', 'Corner', true, 80), ch('atk', 'Corner', true, 50)] } });
    expect(t.goals.map((g) => g.minute)).toEqual([20, 70]);
    expect(t.turnedOn).toBe('Rest');
  });
  it('long-range goals point to the night’s lowest unit; a win names none', () => {
    expect(tapeOf({ result: 'L', values: V, events: { chances: [ch('def', 'Long-range effort', false, 33)] } }).turnedOn).toBe('Rest');
    expect(tapeOf({ result: 'W', values: V, events: { chances: [ch('def', 'Corner', false, 10)] } }).turnedOn).toBeUndefined();
  });
});

describe('the press office: the line for the papers', () => {
  const m = { result: 'W' as const, braboHome: true, rotation: false, values: V };
  it('waits after big nights, and after home wins once the press box is built', () => {
    expect(papersDue({ ...m, big: true }, { office: true, box: false })).toBe(true);
    expect(papersDue(m, { office: true, box: false })).toBe(false);
    expect(papersDue(m, { office: true, box: true })).toBe(true);
    expect(papersDue({ ...m, braboHome: false }, { office: true, box: true })).toBe(false);
    expect(papersDue({ ...m, big: true }, { office: false, box: true })).toBe(false);
    expect(papersDue({ ...m, big: true, rotation: true }, { office: true, box: true })).toBe(false);
  });
  it('offers three plain lines that never blame a habit', () => {
    const potm = playerOfMatch([{ kind: 'save', name: 'Sleep' }, { kind: 'goal', name: 'Walk' }]);
    expect(potm).toBe('Walk');
    expect(papersLines(m, { opp: 'Stuttgart', potm })[0]).toBe('Walk made the difference tonight.');
    const loss = papersLines({ ...m, result: 'L' }, { opp: 'Stuttgart' });
    expect(loss).toEqual(['Stuttgart were the better side tonight.', 'The whole eleven kept going to the end.', 'We watch it back and go again.']);
    for (const l of loss) expect(l).not.toMatch(/fault|blame|let us down|failed/i);
    expect(papersNews('A fair point, and we take it.')).toBe('The papers run Brabo’s line: “A fair point, and we take it.”');
  });
});
