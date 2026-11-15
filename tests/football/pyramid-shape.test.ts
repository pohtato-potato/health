// LG-3 (ledger O38, spec 2026-11-14 §5, §6, §9): the shape of world 2 and its calendar.
import { describe, expect, it } from 'vitest';
import { daysOf, leagueFixtures, leagueMatchdays, seasonDays, seasonLength } from '../../src/football/calendar';
import { contNight } from '../../src/football/continental';
import { clipToBand, divisionForRating, DIVISION_SIZE, PYRAMID, shapeOf, stageIn, stageOf, worldOf } from '../../src/football/pyramid/shape';

describe('the world switch', () => {
  it('absent or 1 is the old world; 2 is the new one', () => {
    expect(worldOf(undefined)).toBe(1);
    expect(worldOf({})).toBe(1);
    expect(worldOf({ world: 1 })).toBe(1);
    expect(worldOf({ world: 2 })).toBe(2);
    expect(shapeOf({}).divisions).toEqual([1, 2, 3, 4, 5, 6]);
    expect(shapeOf({}).size).toBe(18);
    expect(shapeOf({ world: 2 }).divisions).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(shapeOf({ world: 2 }).size).toBe(12);
  });
  it('names the divisions as decided (2a)', () => {
    const s = shapeOf({ world: 2 });
    expect(s.name(1)).toBe('The Crown League');
    expect(s.name(2)).toBe('Division Two');
    expect(s.name(8)).toBe('Division Eight');
    expect(shapeOf({}).name(1)).toBe('The Crown League');
  });
});

describe('bands and stages (spec §5, §9)', () => {
  it('eight bands of about 5 points, 62 to 104, top first', () => {
    expect(PYRAMID).toHaveLength(8);
    expect(PYRAMID[0].band).toEqual([99, 104]);
    expect(PYRAMID[7].band).toEqual([62, 67]);
    for (const p of PYRAMID) expect(p.band[1] - p.band[0]).toBeLessThanOrEqual(5);
    for (let i = 1; i < 8; i++) expect(PYRAMID[i].band[1]).toBeLessThanOrEqual(PYRAMID[i - 1].band[0]);
  });
  it('a rating falls in the highest division whose band starts at or below it', () => {
    expect(divisionForRating(104)).toBe(1);
    expect(divisionForRating(99)).toBe(1);
    expect(divisionForRating(98.9)).toBe(2);
    expect(divisionForRating(93.5)).toBe(3);
    expect(divisionForRating(62)).toBe(8);
    expect(divisionForRating(50)).toBe(8);
  });
  it('clips a club to its band', () => {
    expect(clipToBand(90, 2)).toBe(94);
    expect(clipToBand(106, 1)).toBe(104);
    expect(clipToBand(64, 8)).toBe(64);
  });
  it('maps divisions to the six old stages as in §9', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(stageOf)).toEqual([1, 2, 2, 3, 4, 5, 6, 6]);
    expect(stageIn({}, 4)).toBe(4);
    expect(stageIn({ world: 2 }, 4)).toBe(3);
  });
});

describe('the 28-day season (spec §6)', () => {
  const days = daysOf(2);
  it('22 league days, Big Cup days 7 and 19, pair-cup days 12 and 23, finals on 27 and 28', () => {
    expect(days).toHaveLength(28);
    expect(seasonLength(2)).toBe(28);
    expect(leagueMatchdays(2)).toBe(22);
    expect(days.filter((d) => d.kind === 'league').map((d) => d.matchday)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
    expect(days.filter((d) => d.kind === 'bigcup').map((d) => d.day)).toEqual([7, 19]);
    expect(days.filter((d) => d.kind === 'tiercup').map((d) => d.day)).toEqual([12, 23]);
    expect(days[26].kind).toBe('finals1');
    expect(days[27].kind).toBe('finals2');
    expect(days[27].round).toContain('pair-cup');
  });
  it('every Big Cup round is on some day, the early and the semi-final on league nights', () => {
    const rounds = days.flatMap((d) => [...(d.kind === 'bigcup' ? d.round!.split(' and ') : []), ...(d.cup ? [d.cup] : [])]);
    expect(rounds).toEqual(['Last 128', 'Last 64', 'Last 32', 'Last 16', 'Quarter-final', 'Semi-final']);
    expect(days[2]).toMatchObject({ kind: 'league', cup: 'Last 128' });
    expect(days[24]).toMatchObject({ kind: 'league', cup: 'Semi-final' });
  });
  it('the continental cup keeps eight phase nights and three knockout nights, all on league nights, none beside a Big Cup round', () => {
    const cont = days.filter((d) => d.cont);
    expect(cont).toHaveLength(11);
    for (const d of cont) { expect(d.kind).toBe('league'); expect(d.cup).toBeUndefined(); }
    expect(contNight(21, 2)).toEqual({ stage: 'qf', round: 0 });
    expect(contNight(26, 2)).toEqual({ stage: 'final', round: 0 });
  });
  it('the transfer window sits in the same place, rescaled: days 14 to 16', () => {
    expect(days.filter((d) => d.window).map((d) => d.day)).toEqual([14, 15, 16]);
  });
  it('the old calendar is untouched', () => {
    expect(daysOf()).toEqual(seasonDays());
    expect(daysOf(1)).toHaveLength(42);
    expect(contNight(26)).toEqual({ stage: 'qf', round: 0 });
  });
  it('fixtures for 12: 22 rounds of 6, each pair home and away', () => {
    const ids = Array.from({ length: DIVISION_SIZE }, (_, i) => `c${i}`);
    const fx = leagueFixtures(ids, 11);
    expect(fx).toHaveLength(22);
    const seen = new Set<string>();
    for (const rd of fx) { expect(rd).toHaveLength(6); expect(new Set(rd.flat()).size).toBe(12); for (const [h, a] of rd) seen.add(`${h}>${a}`); }
    expect(seen.size).toBe(12 * 11);
  });
});
