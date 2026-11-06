import { describe, expect, it } from 'vitest';
import { kitSvg } from '../../src/football/art/kit';
import { anniversaryKit, CATALOGUE, crestStepFor, dataKit, launchOptions, levelUpOptions, patchFor, slotsOpen, type Week } from '../../src/football/kits';
import { kitWall } from '../../src/football/store/kitWall';
import type { FbSave, StoredMatch } from '../../src/football/store/tables';

const weeks: Week[] = [
  { avg: 12, result: 'W', numbers: '12.0' }, { avg: 8, result: 'D', numbers: '8.0' }, { avg: 10, result: 'L', numbers: '10.0' },
  { avg: 14, result: 'W', numbers: '14.0' }, { avg: 6, result: 'L', numbers: '6.0' }, { avg: 11, result: 'D', numbers: '11.0' },
];

describe('The data kit', () => {
  it('has six stripes: width from the week’s average radar, tone from its result', () => {
    const { kit } = dataKit(weeks);
    const s = kit.a as [string, number, boolean][];
    expect(kit.pattern).toBe('weeks');
    expect(s).toHaveLength(6);
    expect(s[3][1]).toBeGreaterThan(s[0][1]);
    expect(s[0][1]).toBeGreaterThan(s[4][1]);
    expect(s[0][1] / s[1][1]).toBeCloseTo(12 / 8);
    expect(s.map((x) => x[0])).toEqual(['#ff7a1a', '#6c3fc4', '#141414', '#ff7a1a', '#141414', '#6c3fc4']);
    expect(s.map((x) => x[2])).toEqual([false, false, true, false, true, false]);
    expect(s.reduce((t, x) => t + x[1], 0)).toBeCloseTo(96);
  });
  it('prints the weekly numbers in the collar', () => {
    const { kit, collar } = dataKit(weeks);
    for (const w of weeks) expect(collar).toContain(w.numbers);
    expect(kitSvg(kit, 'back', 100, { name: collar })).toContain('12.0 8.0 10.0 14.0 6.0 11.0');
  });
  it('joins the third-kit options from season 2', () => {
    expect(launchOptions('third', 1)).not.toContain('DATA');
    expect(launchOptions('third', 2)).toContain('DATA');
    expect(launchOptions('home', 1)).toHaveLength(6);
    expect(CATALOGUE).toHaveLength(18);
  });
});

describe('Other kits', () => {
  it('the anniversary kit comes only in seasons 5, 10 and so on', () => {
    for (let s = 1; s <= 20; s++) expect(Boolean(anniversaryKit(s))).toBe(s % 5 === 0);
    expect(launchOptions('third', 10)).toContain('ANNIV');
    expect(launchOptions('third', 9)).not.toContain('ANNIV');
  });
  it('the third kit opens in Division Four', () => {
    expect(slotsOpen(5)).toEqual(['home', 'away']);
    expect(slotsOpen(4)).toContain('third');
  });
});

describe('The one-night patch', () => {
  const m = (o: Partial<StoredMatch>): StoredMatch => ({ id: 'x', date: '2026-11-14', season: 1, day: 8, comp: 'league', home: 'bra', away: 'ant', opp: 'ant', braboHome: true, values: {} as never, flags: {}, events: {} as never, score: [1, 0], result: 'W', watched: true, rotation: false, auto: false, ...o });
  it('appears on finals and derbies only', () => {
    expect(patchFor(m({ derby: true }))).toEqual({ text: '14' });
    expect(patchFor(m({ comp: 'bigcup', round: 'Big Cup, Final' }))).toBeTruthy();
    expect(patchFor(m({ comp: 'playoff', round: 'Playoff final' }))).toBeTruthy();
    expect(patchFor(m({ comp: 'bigcup', round: 'Big Cup, Semi-final' }))).toBeUndefined();
    expect(patchFor(m({}))).toBeUndefined();
  });
  it('stays on that shirt on the kit wall', () => {
    const save = { season: 2, shirt: 'A1', kits: [{ season: 2, slot: 'home', id: 'H3' }] } as unknown as FbSave;
    const wall = kitWall(save, [m({ derby: true }), m({ id: 'y', date: '2026-11-15', derby: false }), m({ id: 'z', season: 2, date: '2026-12-20' })]);
    const s1home = wall.find((k) => k.season === 1 && k.slot === 'home')!;
    expect(s1home.patches).toEqual([{ date: '2026-11-14', text: '14', round: undefined }]);
    expect(s1home.record).toEqual({ W: 2, D: 0, L: 0 });
    expect(wall.find((k) => k.season === 2 && k.slot === 'home')!.patches).toEqual([]);
    expect(wall.find((k) => k.season === 2 && k.slot === 'home')!.id).toBe('H3');
  });
});

describe('The crest level-up', () => {
  it('offers five options plus keep from step 2, and none at step 1', () => {
    expect(levelUpOptions(1)).toEqual([]);
    for (const s of [2, 3, 4, 5] as const) expect(levelUpOptions(s)).toEqual(['a', 'b', 'c', 'd', 'e', 'keep']);
  });
  it('comes with promotion through Division Two', () => {
    expect([5, 4, 3, 2, 1].map((t) => crestStepFor(t as 1))).toEqual([2, 3, 4, 5, 5]);
  });
});
