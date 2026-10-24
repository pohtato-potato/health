import { describe, expect, it } from 'vitest';
import { ALL_STATES, ALL_STOPS, FINAL_KM, STRIDE_M } from '../src/domain/walk';
import { arrivalFor, arrivalToPlay, areaShare, passportCounts, passportPages, stateLineToPlay } from '../src/walk/arrivals';

const steps = (km: number) => Math.round((km * 1000) / STRIDE_M);
// The real road: Delhi 0, Agra 230, Gwalior 350; Haryana 25, Uttar Pradesh 85, Rajasthan 255, Madhya Pradesh 285.
const road = new Map([
  ['2026-01-01', steps(100)],
  ['2026-01-02', steps(140)], // 240: Agra
  ['2026-01-03', steps(115)], // 355: Rajasthan, Madhya Pradesh, Gwalior
]);

describe('what an arrival shows', () => {
  it('gives the day, the steps, the state, the height and the stamp number', () => {
    const a = arrivalFor('Agra', road, '2026-01-01')!;
    expect(a.date).toBe('2026-01-02');
    expect(a.dayN).toBe(2);
    expect(a.steps).toBe(steps(100) + steps(140));
    expect(a.state).toBe('Uttar Pradesh');
    expect(a.ut).toBe(false);
    expect(a.n).toBe(2); // Delhi is the first stamp
    expect(a.heightM).toBe(170);
    expect(a.next).toEqual({ name: 'Gwalior', km: 120 });
    expect(a.reached).toEqual(['Delhi', 'Haryana', 'Uttar Pradesh']);
    expect(a.trail).toHaveLength(2);
  });

  it('knows nothing of a city not yet reached, or not on the walk', () => {
    expect(arrivalFor('Bhopal', road, '2026-01-01')).toBeUndefined();
    expect(arrivalFor('Atlantis', road, '2026-01-01')).toBeUndefined();
  });

  it('keeps the first date for a city reached again later in the walk', () => {
    const all = new Map([['2026-01-01', steps(FINAL_KM + 1)]]);
    const delhiAgain = ALL_STOPS.filter((s) => s.name === 'Delhi')[1];
    expect(arrivalFor('Delhi', all, '2026-01-01')!.km).toBe(0);
    expect(arrivalFor('Delhi', all, '2026-01-01', delhiAgain.chapter)!.km).toBe(delhiAgain.km);
  });
});

describe('which arrival plays', () => {
  it('plays the farthest new city saved today or yesterday, and stamps the rest quietly', () => {
    const p = arrivalToPlay(road, '2026-01-03', new Set());
    expect(p.city?.name).toBe('Gwalior');
    expect(p.city?.key).toBe('city:Gwalior');
    expect(p.quiet).toEqual(['city:Agra']); // Agra was yesterday: still new, but only one plays
  });

  it('plays nothing for a day saved three days ago, and nothing already seen', () => {
    expect(arrivalToPlay(road, '2026-01-06', new Set()).city).toBeUndefined();
    expect(arrivalToPlay(road, '2026-01-03', new Set(['city:Gwalior', 'city:Agra'])).city).toBeUndefined();
  });

  it('never plays the start', () => {
    expect(arrivalToPlay(new Map([['2026-01-01', 10]]), '2026-01-01', new Set()).city).toBeUndefined();
  });

  it('keys a later chapter’s revisit apart from the first', () => {
    const delhiAgain = ALL_STOPS.filter((s) => s.name === 'Delhi')[1];
    const s = new Map([['2026-01-01', steps(delhiAgain.km - 1)], ['2026-01-02', steps(2)]]);
    expect(arrivalToPlay(s, '2026-01-02', new Set()).city?.key).toBe(`city:${delhiAgain.chapter}:Delhi`);
  });

  it('plays the latest new state line', () => {
    expect(stateLineToPlay(road, '2026-01-03', new Set())).toEqual({ state: 'Madhya Pradesh', key: 'state:Madhya Pradesh' });
    expect(stateLineToPlay(road, '2026-01-03', new Set(['state:Madhya Pradesh'])).state).toBe('Rajasthan');
  });
});

describe('the passport', () => {
  it('has a page per state reached, in order, with its cities stamped', () => {
    const pages = passportPages(road);
    expect(pages.map((p) => p.state)).toEqual(['Delhi', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh']);
    expect(pages[0].cities.map((c) => c.name)).toEqual(['Delhi']);
    expect(pages[2].cities.map((c) => c.name)).toEqual(['Agra']);
    expect(pages[4].cities.map((c) => c.name)).toEqual(['Gwalior']);
    expect(pages[1].cities).toEqual([]);
  });

  it('counts states and union territories apart', () => {
    expect(passportCounts(passportPages(road))).toEqual({ states: 4, uts: 1 });
  });

  it('shares India’s area out: nothing at the start, all of it with every state', () => {
    expect(areaShare([])).toBe(0);
    expect(areaShare(passportPages(new Map([['2026-01-01', steps(FINAL_KM + 1)]])))).toBeCloseTo(1, 5);
    expect(new Set(ALL_STATES.map((s) => s.name)).size).toBe(36);
  });
});
